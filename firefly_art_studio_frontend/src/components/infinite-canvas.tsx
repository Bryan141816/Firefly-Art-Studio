import type Konva from "konva";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Layer, Stage, Image, Transformer, Shape } from "react-konva";
import useImage from "use-image";
import type { InfiniteCanvasContextMenu } from "./infinit-canvas-context-menu";
import InfiniteCanvasContextMenuComponent from "./infinit-canvas-context-menu";
import type { CanvasImageData } from "@/pages/ProjectEditor";

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

            // onContextMenu={(e) => {
            //     e.evt.preventDefault();
            //     e.cancelBubble = true;

            //     const stage = e.target.getStage();
            //     if (!stage) return;

            //     const pointerPosition = stage.getPointerPosition();
            //     if (!pointerPosition) return;

            //     const containerRect =
            //         stage.container().getBoundingClientRect();

            //     onContextMenu(
            //         containerRect.left + pointerPosition.x + 4,
            //         containerRect.top + pointerPosition.y + 4
            //     );
            // }}

            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}

            onDragEnd={(e) => {
                onChange({
                    ...data,
                    x: e.target.x(),
                    y: e.target.y(),
                });

                onSelect();
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

        // Scroll up = zoom in, scroll down = zoom out
        const direction = e.evt.deltaY > 0 ? -1 : 1;

        const newScale =
            direction > 0
                ? oldScale * ZOOM_FACTOR
                : oldScale / ZOOM_FACTOR;

        const clampedScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, newScale)
        );

        // Mouse position relative to the canvas
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Keep the point under the mouse in the same position
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
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.evt.button === 0) {
            if (selectedObj) {
                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                    setContextMenu({
                        show: false,
                        x: 0,
                        y: 0,
                    });
                    setSelectedObj([]);
                }
            }
        }
        else if (e.evt.button === 1) {
            if (contextMenu.show) {
                return
            }

            setIsPanning(true);
            stageRef.current?.startDrag();
        }
    };
    const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.evt.button === 1) {
            setIsPanning(false);
            stageRef.current?.stopDrag();
        }
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

    const handleContextMenu = (x: number, y: number) => {
        setContextMenu({
            show: true,
            x,
            y
        })
    };


    return <div ref={childRef}>
        <Stage
            ref={stageRef}
            width={childDimenstion.width}
            height={childDimenstion.height}
            onWheel={handleWheel}
            draggable={false}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={handleKonvaContextMenu}
            style={{
                cursor: isPanning ? "grabbing" : "default"
            }}
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
            onDelete={
                (id: string) => {
                    updateCanvasObj(id, "change", { ...images[id], active: false })
                }
            }
        />
        }
    </div>
}