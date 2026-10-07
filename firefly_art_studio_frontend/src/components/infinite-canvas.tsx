import type Konva from "konva";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Layer, Stage, Image, Transformer, Shape, Rect } from "react-konva";
import useImage from "use-image";
import type { InfiniteCanvasContextMenu } from "./infinit-canvas-context-menu";
import InfiniteCanvasContextMenuComponent from "./infinit-canvas-context-menu";
import type { CanvasImageData } from "@/types/CanvasObject";

type InfiniteCanvasProps = {
    images: Record<string, CanvasImageData>;
    stageRef: RefObject<Konva.Stage | null>;
    updateCanvasObj: (id: string, type: "create" | "change", data: CanvasImageData) => void;
};

type CanvasImage = {
    data: CanvasImageData
    id: string
    isSelected: boolean
    onSelect: () => void
    onChange: (newAttrs: CanvasImageData) => void
    nodeRef: (node: Konva.Image | null) => void;
}

const CanvasImage = ({
    data,
    isSelected,
    id,
    onSelect,
    onChange,
    nodeRef,
}: CanvasImage) => {
    const [image] = useImage(data.src, "anonymous");

    const [isHovered, setIsHovered] = useState(false);

    return (
        <Image
            image={image}
            ref={nodeRef}
            stroke="#00AEEF"
            strokeWidth={2}
            strokeScaleEnabled={false}
            strokeEnabled={isHovered || isSelected}

            {...(data.width != null && { width: data.width })}
            {...(data.height != null && { height: data.height })}

            x={data.x}
            y={data.y}
            id={id}
            rotation={data.rotation}
            draggable

            onClick={(e) => {
                if (e.evt.button === 0) {
                    onSelect();
                }
            }}

            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}

            onDragEnd={(e) => {
                onChange({
                    ...data,
                    x: e.target.x(),
                    y: e.target.y(),
                });
                if (!isSelected) {
                    onSelect();
                }
            }}

            onTransformEnd={(e) => {
                const node = e.target;

                const scaleX = node.scaleX();
                const scaleY = node.scaleY();

                node.scaleX(1);
                node.scaleY(1);

                onChange({
                    ...data,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * scaleX),
                    height: Math.max(5, node.height() * scaleY),
                    rotation: node.rotation(),
                });
            }}
        />
    );
};

export default function InfiniteCanvas({
    images,
    stageRef,
    updateCanvasObj
}: InfiniteCanvasProps) {

    const [selectedObj, setSelectedObj] = useState<string[]>([]);

    const [contextMenu, setContextMenu] = useState<InfiniteCanvasContextMenu>({
        show: false,
        x: 0,
        y: 0,
    });

    const childRef = useRef<HTMLDivElement>(null);
    const [childDimenstion, setChildDimenstion] = useState<{ width: number, height: number }>({ width: 0, height: 0 });


    const [isPanning, setIsPanning] = useState(false);
    const keyboardRef = useRef<string[]>([]);

    const transformerRef = useRef<Konva.Transformer | null>(null);

    const imageRefs = useRef<Record<string, Konva.Image | null>>({});

    const [selectionBox, setSelectionBox] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    const isSelecting = useRef(false);
    const selectionStart = useRef<{ x: number; y: number } | null>(null);

    const MIN_SCALE = 0.05;
    const MAX_SCALE = 5;
    const ZOOM_FACTOR = 1.05;

    useEffect(() => {
        const transformer = transformerRef.current;

        if (!transformer) return;

        const nodes = selectedObj
            .map(id => imageRefs.current[id])
            .filter((node): node is Konva.Image => node !== null);

        transformer.nodes(nodes);
        transformer.getLayer()?.batchDraw();
    }, [selectedObj, images]);

    useEffect(() => {

        const updateDimensions = () => {
            const parent = childRef.current?.parentElement;

            if (parent) {
                setChildDimenstion({
                    width: parent.offsetWidth,
                    height: parent.offsetHeight,
                });
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!keyboardRef.current.includes(e.key)) {
                keyboardRef.current.push(e.key);
            }

        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keyboardRef.current = keyboardRef.current.filter(
                (key) => key !== e.key
            );

        };

        updateDimensions();

        window.addEventListener("resize", updateDimensions);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("resize", updateDimensions);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        if (contextMenu.show) {
            return
        }

        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();

        const direction = e.evt.deltaY > 0 ? -1 : 1;

        const newScale =
            direction > 0
                ? oldScale * ZOOM_FACTOR
                : oldScale / ZOOM_FACTOR;

        const clampedScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, newScale)
        );

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        };


        stage.scale({
            x: clampedScale,
            y: clampedScale,
        });

        stage.position(newPos);
        stage.batchDraw();
    };
    const getWorldPointer = () => {
        const stage = stageRef.current;

        if (!stage) return null;

        const pointer = stage.getPointerPosition();

        if (!pointer) return null;

        return {
            x: (pointer.x - stage.x()) / stage.scaleX(),
            y: (pointer.y - stage.y()) / stage.scaleY(),
        };
    };
    const handleMouseDown = (
        e: Konva.KonvaEventObject<MouseEvent>
    ) => {
        if (e.evt.button === 0) {
            const stage = stageRef.current;

            if (!stage) return;

            const clickedOnEmpty = e.target === stage;

            if (!clickedOnEmpty) {
                return;
            }

            const pointer = getWorldPointer();

            if (!pointer) return;

            isSelecting.current = true;
            selectionStart.current = pointer;

            setSelectionBox({
                x: pointer.x,
                y: pointer.y,
                width: 0,
                height: 0,
            });

            setContextMenu({
                show: false,
                x: 0,
                y: 0,
            });
        }

        else if (e.evt.button === 1) {
            if (contextMenu.show) {
                return;
            }

            setIsPanning(true);
            stageRef.current?.startDrag();
        }
    };
    const handleMouseUp = (
        e: Konva.KonvaEventObject<MouseEvent>
    ) => {
        if (e.evt.button === 0 && isSelecting.current) {
            isSelecting.current = false;

            const box = selectionBox;

            selectionStart.current = null;
            setSelectionBox(null);

            if (!box) return;

            const selected: string[] = [];

            Object.entries(images).forEach(([id, obj]) => {
                if (!obj.active) return;

                const node = imageRefs.current[id];

                if (!node) return;

                const rect = node.getClientRect({
                    relativeTo: stageRef.current!,
                });

                const intersects =
                    rect.x < box.x + box.width &&
                    rect.x + rect.width > box.x &&
                    rect.y < box.y + box.height &&
                    rect.y + rect.height > box.y;

                if (intersects) {
                    selected.push(id);
                }
            });

            setSelectedObj(selected);
        }

        else if (e.evt.button === 1) {
            setIsPanning(false);
            stageRef.current?.stopDrag();
        }
    };
    const handleMouseMove = (
        e: Konva.KonvaEventObject<MouseEvent>
    ) => {
        if (!isSelecting.current) return;

        const start = selectionStart.current;

        if (!start) return;

        const current = getWorldPointer();

        if (!current) return;

        setSelectionBox({
            x: Math.min(start.x, current.x),
            y: Math.min(start.y, current.y),
            width: Math.abs(current.x - start.x),
            height: Math.abs(current.y - start.y),
        });
    };

    const handleKonvaContextMenu = (
        e: Konva.KonvaEventObject<PointerEvent>
    ) => {
        e.evt.preventDefault();
        e.cancelBubble = true;

        if (selectedObj.length === 0) return;

        const stage = stageRef.current;
        const transformer = transformerRef.current;

        if (!stage || !transformer) return;

        const pointer = stage.getPointerPosition();

        if (!pointer) return;

        const transform = transformer.getAbsoluteTransform().copy();
        transform.invert();

        const localPointer = transform.point(pointer);

        const width = transformer.width();
        const height = transformer.height();

        const insideTransformer =
            localPointer.x >= 0 &&
            localPointer.x <= width &&
            localPointer.y >= 0 &&
            localPointer.y <= height;

        if (!insideTransformer) {
            return;
        }

        const containerRect =
            stage.container().getBoundingClientRect();

        handleContextMenu(
            containerRect.left + pointer.x + 4,
            containerRect.top + pointer.y + 4
        );
    };
    const handleContextMenu = (x: number, y: number, show: boolean = true) => {
        setContextMenu({
            show,
            x,
            y
        })
    };

    const handleDelete = () => {
        selectedObj.map((id) => {
            updateCanvasObj(id, "change", { ...images[id], active: false })
        })
        handleContextMenu(0, 0, false);
    }
    return <div ref={childRef}>
        <Stage
            ref={stageRef}
            width={childDimenstion.width}
            height={childDimenstion.height}
            onWheel={handleWheel}
            draggable={false}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleKonvaContextMenu}
        >
            <Layer>

                {Object.entries(images).map(([id, obj]) => {
                    if (!obj.active) return null;

                    return (
                        <CanvasImage
                            key={id}
                            id={id}
                            data={obj}
                            isSelected={selectedObj.includes(id)}

                            nodeRef={(node) => {
                                imageRefs.current[id] = node;
                            }}

                            onSelect={() => {
                                if (
                                    keyboardRef.current.length === 1 &&
                                    keyboardRef.current[0] === "Shift"
                                ) {
                                    setSelectedObj(prev =>
                                        prev.includes(id)
                                            ? prev.filter(item => item !== id)
                                            : [...prev, id]
                                    );

                                    return;
                                }

                                setSelectedObj([id]);
                            }}

                            onChange={(newAttrs) => {
                                updateCanvasObj(id, "change", newAttrs);
                            }}

                        />
                    );
                })}
                {selectionBox && (
                    <Rect
                        x={selectionBox.x}
                        y={selectionBox.y}
                        width={selectionBox.width}
                        height={selectionBox.height}
                        fill="rgba(0, 174, 239, 0.15)"
                        stroke="#00AEEF"
                        strokeWidth={1}
                        listening={false}
                    />
                )}
                {selectedObj.length > 0 && (
                    <Transformer
                        ref={transformerRef}
                        flipEnabled={false}
                        borderStroke="#00AEEF"
                        anchorFill="#00AEEF"
                        anchorStroke="#00AEEF"
                        boundBoxFunc={(oldBox, newBox) => {
                            if (
                                Math.abs(newBox.width) < 5 ||
                                Math.abs(newBox.height) < 5
                            ) {
                                return oldBox;
                            }

                            return newBox;
                        }}
                    />
                )}
            </Layer>
        </Stage>

        {contextMenu.show && <InfiniteCanvasContextMenuComponent
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            onDelete={handleDelete}
        />
        }
    </div>
}