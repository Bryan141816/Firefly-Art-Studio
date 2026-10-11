import type Konva from "konva";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Layer, Stage, Image, Transformer, Rect } from "react-konva";
import useImage from "use-image";
import type { InfiniteCanvasContextMenu } from "./infinit-canvas-context-menu";
import InfiniteCanvasContextMenuComponent from "./infinit-canvas-context-menu";
import type { CanvasImageData } from "@/types/CanvasObject";

//This is a addition

type InfiniteCanvasProps = {
    images: Record<string, CanvasImageData>;
    imagesRef: React.RefObject<Record<string, CanvasImageData>>;
    stageRef: RefObject<Konva.Stage | null>;
    updateCanvasObj: (
        id: string,
        type: "create" | "change",
        data: CanvasImageData
    ) => void;
};

type CanvasImage = {
    data: CanvasImageData;
    id: string;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (newAttrs: CanvasImageData) => void;
    nodeRef: (node: Konva.Image | null) => void;
};

type CanvasState = "idle" |"selecting" | "panning" | "transforming"

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
    imagesRef,
    stageRef,
    updateCanvasObj,
}: InfiniteCanvasProps) {
    const [selectedObj, setSelectedObj] = useState<string[]>([]);

    const [contextMenu, setContextMenu] =
        useState<InfiniteCanvasContextMenu>({
            show: false,
            x: 0,
            y: 0,
        });

    const childRef = useRef<HTMLDivElement>(null);

    const [childDimenstion, setChildDimenstion] = useState<{
        width: number;
        height: number;
    }>({
        width: 0,
        height: 0,
    });

    const keyboardRef = useRef<string[]>([]);

    const transformerRef = useRef<Konva.Transformer | null>(null);

    const imageRefs = useRef<
        Record<string, Konva.Image | null>
    >({});

    const [selectionBox, setSelectionBox] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    const selectionBoxRef = useRef<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(selectionBox);

    const canvasState = useRef<CanvasState>("idle");

    const selectionStart = useRef<{
        x: number;
        y: number;
    } | null>(null);

    const [scale, setScale] = useState(1);
    const MIN_SCALE = 0.05;
    const MAX_SCALE = 5;
    const ZOOM_FACTOR = 1.05;

    const mousePositionRef = useRef<{
        x: number;
        y: number;
    } | null>(null);

    const autoPanAnimationRef = useRef<number | null>(null);

    const AUTO_PAN_EDGE = 50;
    const AUTO_PAN_SPEED = 10;



    const WORLD_PADDING = 500;

    const [worldBounds, setWorldBounds] = useState({
        minX: -WORLD_PADDING,
        minY: -WORLD_PADDING,
        maxX: childDimenstion.width + WORLD_PADDING,
        maxY: childDimenstion.height + WORLD_PADDING,
    });

    const [scrollPosition, setScrollPosition] = useState({
        x: 0,
        y: 0,
    });

    const scrollbarThickness = 10;
    const scrollbarPadding = 5;

    const updateWorldBounds = () => {
        const objects = Object.values(imagesRef.current)
            .filter((obj) => obj.active);

        const stage = stageRef.current;

        if (!stage) return;

        const scale = stage.scaleX();

        const viewportLeft =
            -stage.x() / scale;

        const viewportTop =
            -stage.y() / scale;

        const viewportRight =
            viewportLeft +
            stage.width() / scale;

        const viewportBottom =
            viewportTop +
            stage.height() / scale;

        let objectMinX = Infinity;
        let objectMinY = Infinity;
        let objectMaxX = -Infinity;
        let objectMaxY = -Infinity;

        for (const obj of objects) {
            const width = obj.width ?? 0;
            const height = obj.height ?? 0;

            objectMinX = Math.min(objectMinX, obj.x);
            objectMinY = Math.min(objectMinY, obj.y);

            objectMaxX = Math.max(
                objectMaxX,
                obj.x + width
            );

            objectMaxY = Math.max(
                objectMaxY,
                obj.y + height
            );
        }

        const minX = Math.min(
            objectMinX - WORLD_PADDING,
            viewportLeft
        );

        const minY = Math.min(
            objectMinY - WORLD_PADDING,
            viewportTop
        );

        const maxX = Math.max(
            objectMaxX + WORLD_PADDING,
            viewportRight
        );

        const maxY = Math.max(
            objectMaxY + WORLD_PADDING,
            viewportBottom
        );

        setWorldBounds({
            minX,
            minY,
            maxX,
            maxY,
        });
    };

    useEffect(() => {
        updateWorldBounds();
    }, [images, childDimenstion]);

    const updateScrollbarFromCamera = () => {
        const stage = stageRef.current;

        if (!stage) return;

        const scale = stage.scaleX();


        const cameraX = -stage.x() / scale;
        const cameraY = -stage.y() / scale;

        const viewportWidth =
            stage.width() / scale;

        const viewportHeight =
            stage.height() / scale;

        const worldWidth =
            worldBounds.maxX - worldBounds.minX;

        const worldHeight =
            worldBounds.maxY - worldBounds.minY;

        const maxScrollX =
            Math.max(0, worldWidth - viewportWidth);

        const maxScrollY =
            Math.max(0, worldHeight - viewportHeight);

        const scrollX =
            maxScrollX === 0
                ? 0
                : ((cameraX - worldBounds.minX) /
                    maxScrollX) *
                maxScrollX;

        const scrollY =
            maxScrollY === 0
                ? 0
                : ((cameraY - worldBounds.minY) /
                    maxScrollY) *
                maxScrollY;

        setScrollPosition({
            x: Math.max(0, scrollX),
            y: Math.max(0, scrollY),
        });
    };

    const updateCameraFromScroll = (
        x: number,
        y: number
    ) => {
        const stage = stageRef.current;

        if (!stage) return;

        const scale = stage.scaleX();

        const viewportWidth =
            stage.width() / scale;

        const viewportHeight =
            stage.height() / scale;

        const worldWidth =
            worldBounds.maxX - worldBounds.minX;

        const worldHeight =
            worldBounds.maxY - worldBounds.minY;

        const maxScrollX =
            Math.max(0, worldWidth - viewportWidth);

        const maxScrollY =
            Math.max(0, worldHeight - viewportHeight);

        const worldX =
            worldBounds.minX +
            (maxScrollX === 0
                ? 0
                : (x / maxScrollX) * maxScrollX);

        const worldY =
            worldBounds.minY +
            (maxScrollY === 0
                ? 0
                : (y / maxScrollY) * maxScrollY);

        stage.position({
            x: -worldX * scale,
            y: -worldY * scale,
        });

        stage.batchDraw();

        setScrollPosition({
            x,
            y,
        });
    };

    useEffect(() => {
        const updateDimensions = () => {
            const parent =
                childRef.current?.parentElement;

            if (!parent) return;

            setChildDimenstion({
                width: parent.offsetWidth,
                height: parent.offsetHeight,
            });
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!keyboardRef.current.includes(e.key)) {
                keyboardRef.current.push(e.key);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keyboardRef.current =
                keyboardRef.current.filter(
                    (key) => key !== e.key
                );
        };

        const handleWindowMouseMove = (
            e: MouseEvent
        ) => {
            if (canvasState.current !== "selecting" ) return;

            const stage = stageRef.current;

            if (!stage) return;

            const rect =
                stage.container().getBoundingClientRect();

            mousePositionRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        const handleWindowMouseUp = (
            e: MouseEvent
        ) => {
            if (e.button !== 0) return;

            finishSelection();
        };

        updateDimensions();

        window.addEventListener(
            "resize",
            updateDimensions
        );

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        window.addEventListener(
            "keyup",
            handleKeyUp
        );

        window.addEventListener(
            "mousemove",
            handleWindowMouseMove
        );

        window.addEventListener(
            "mouseup",
            handleWindowMouseUp
        );

        return () => {
            window.removeEventListener(
                "resize",
                updateDimensions
            );

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );

            window.removeEventListener(
                "keyup",
                handleKeyUp
            );

            window.removeEventListener(
                "mousemove",
                handleWindowMouseMove
            );

            window.removeEventListener(
                "mouseup",
                handleWindowMouseUp
            );
        };
    }, []);

    const finishSelection = () => {
        if (canvasState.current !== "selecting") return;

        canvasState.current = "idle";

        if (autoPanAnimationRef.current) {
            cancelAnimationFrame(
                autoPanAnimationRef.current
            );

            autoPanAnimationRef.current = null;
        }

        const box = selectionBoxRef.current;

        selectionStart.current = null;
        selectionBoxRef.current = null;
        mousePositionRef.current = null;

        setSelectionBox(null);

        if (!box) return;

        const selected: string[] = [];

        Object.entries(imagesRef.current).forEach(
            ([id, obj]) => {
                if (!obj.active) return;

                const node =
                    imageRefs.current[id];

                if (!node) return;

                const rect =
                    node.getClientRect({
                        relativeTo:
                            stageRef.current!,
                    });

                const intersects =
                    rect.x <
                    box.x + box.width &&
                    rect.x + rect.width >
                    box.x &&
                    rect.y <
                    box.y + box.height &&
                    rect.y + rect.height >
                    box.y;

                if (intersects) {
                    selected.push(id);
                }
            }
        );

        setSelectedObj(selected);
    };

    useEffect(() => {
        const transformer =
            transformerRef.current;

        if (!transformer) return;

        const nodes = selectedObj
            .map(
                (id) =>
                    imageRefs.current[id]
            )
            .filter(
                (
                    node
                ): node is Konva.Image =>
                    node !== null
            );

        transformer.nodes(nodes);

        transformer
            .getLayer()
            ?.batchDraw();
    }, [selectedObj, images]);

    const handleWheel = (
        e: Konva.KonvaEventObject<WheelEvent>
    ) => {
        e.evt.preventDefault();

        if (contextMenu.show) {
            return;
        }

        const stage = stageRef.current;

        if (!stage) return;

        const oldScale = stage.scaleX();

        const direction =
            e.evt.deltaY > 0 ? -1 : 1;

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

        setScale(clampedScale);

        updateWorldBounds();

        requestAnimationFrame(
            updateScrollbarFromCamera
        );
    };

    const getWorldPointer = () => {
        const stage = stageRef.current;

        if (!stage) return null;

        const pointer =
            stage.getPointerPosition();

        if (!pointer) return null;

        return {
            x:
                (pointer.x - stage.x()) /
                stage.scaleX(),

            y:
                (pointer.y - stage.y()) /
                stage.scaleY(),
        };
    };

    const handleMouseDown = (
        e: Konva.KonvaEventObject<MouseEvent>
    ) => {
        if (e.evt.button === 0) {
            const stage =
                stageRef.current;

            if (!stage) return;

            const clickedOnEmpty =
                e.target === stage;

            if (!clickedOnEmpty) {
                return;
            }

            const pointer =
                getWorldPointer();

            if (!pointer) return;

            canvasState.current = "selecting";

            selectionStart.current =
                pointer;

            if (!autoPanAnimationRef.current) {
                autoPanAnimationRef.current =
                    requestAnimationFrame(
                        updateAutoPan
                    );
            }

            const newBox = {
                x: pointer.x,
                y: pointer.y,
                width: 0,
                height: 0,
            };

            selectionBoxRef.current =
                newBox;

            setSelectionBox(newBox);

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

            stageRef.current?.startDrag();
        }
    };

    const updateAutoPan = () => {
        if (canvasState.current === "idle") {
            autoPanAnimationRef.current =
                null;
            return;
        }

        const stage =
            stageRef.current;

        const start =
            selectionStart.current;

        const pointer =
            mousePositionRef.current;

        if (
            !stage ||
            !start ||
            !pointer
        ) {
            autoPanAnimationRef.current =
                requestAnimationFrame(
                    updateAutoPan
                );

            return;
        }

        const width =
            stage.width();

        const height =
            stage.height();

        let dx = 0;
        let dy = 0;

        if (
            pointer.x <
            AUTO_PAN_EDGE
        ) {
            dx = AUTO_PAN_SPEED;
        }

        else if (
            pointer.x >
            width - AUTO_PAN_EDGE
        ) {
            dx = -AUTO_PAN_SPEED;
        }

        if (
            pointer.y <
            AUTO_PAN_EDGE
        ) {
            dy = AUTO_PAN_SPEED;
        }

        else if (
            pointer.y >
            height - AUTO_PAN_EDGE
        ) {
            dy = -AUTO_PAN_SPEED;
        }

        if (dx !== 0 || dy !== 0) {
            stage.position({
                x: stage.x() + dx,
                y: stage.y() + dy,
            });

            stage.batchDraw();

            updateWorldBounds();

            updateScrollbarFromCamera();
        }

        const current = {
            x:
                (pointer.x - stage.x()) /
                stage.scaleX(),

            y:
                (pointer.y - stage.y()) /
                stage.scaleY(),
        };

        const newBox = {
            x: Math.min(
                start.x,
                current.x
            ),

            y: Math.min(
                start.y,
                current.y
            ),

            width: Math.abs(
                current.x - start.x
            ),

            height: Math.abs(
                current.y - start.y
            ),
        };

        selectionBoxRef.current =
            newBox;

        setSelectionBox(newBox);

        autoPanAnimationRef.current =
            requestAnimationFrame(
                updateAutoPan
            );
    };

    const handleKonvaContextMenu = (
        e: Konva.KonvaEventObject<PointerEvent>
    ) => {
        e.evt.preventDefault();

        e.cancelBubble = true;

        if (selectedObj.length === 0) {
            return;
        }

        const stage =
            stageRef.current;

        const transformer =
            transformerRef.current;

        if (!stage || !transformer) {
            return;
        }

        const pointer =
            stage.getPointerPosition();

        if (!pointer) return;

        const transform =
            transformer
                .getAbsoluteTransform()
                .copy();

        transform.invert();

        const localPointer =
            transform.point(pointer);

        const width =
            transformer.width();

        const height =
            transformer.height();

        const insideTransformer =
            localPointer.x >= 0 &&
            localPointer.x <= width &&
            localPointer.y >= 0 &&
            localPointer.y <= height;

        if (!insideTransformer) {
            return;
        }

        const containerRect =
            stage
                .container()
                .getBoundingClientRect();

        handleContextMenu(
            containerRect.left +
            pointer.x +
            4,

            containerRect.top +
            pointer.y +
            4
        );
    };

    const handleContextMenu = (
        x: number,
        y: number,
        show: boolean = true
    ) => {
        setContextMenu({
            show,
            x,
            y,
        });
    };

    const handleDelete = () => {
        selectedObj.forEach(
            (id) => {
                updateCanvasObj(
                    id,
                    "change",
                    {
                        ...images[id],
                        active: false,
                    }
                );
            }
        );

        handleContextMenu(
            0,
            0,
            false
        );
    };

    const getCurrentScrollPosition = () => {
        const stage = stageRef.current;

        if (!stage) {
            return {
                x: 0,
                y: 0,
            };
        }

        const scale = stage.scaleX();

        const viewportWidth =
            stage.width() / scale;

        const viewportHeight =
            stage.height() / scale;

        const worldWidth =
            worldBounds.maxX - worldBounds.minX;

        const worldHeight =
            worldBounds.maxY - worldBounds.minY;

        const maxScrollX =
            Math.max(0, worldWidth - viewportWidth);

        const maxScrollY =
            Math.max(0, worldHeight - viewportHeight);

        const cameraX =
            -stage.x() / scale;

        const cameraY =
            -stage.y() / scale;

        return {
            x: Math.max(
                0,
                Math.min(
                    maxScrollX,
                    cameraX - worldBounds.minX
                )
            ),

            y: Math.max(
                0,
                Math.min(
                    maxScrollY,
                    cameraY - worldBounds.minY
                )
            ),
        };
    };

    const getScrollbarInfo = () => {
        const stage = stageRef.current;

        if (!stage) {
            return {
                horizontal: {
                    size: 100,
                    position: 0,
                    visible: false,
                },
                vertical: {
                    size: 100,
                    position: 0,
                    visible: false,
                },
            };
        }

        const scale = stage.scaleX();

        const viewportWidth =
            stage.width() / scale;

        const viewportHeight =
            stage.height() / scale;

        const worldWidth =
            worldBounds.maxX -
            worldBounds.minX;

        const worldHeight =
            worldBounds.maxY -
            worldBounds.minY;

        const canScrollHorizontal =
            worldWidth > viewportWidth;

        const canScrollVertical =
            worldHeight > viewportHeight;

        const horizontalAvailableWidth =
            childDimenstion.width -
            (canScrollVertical
                ? scrollbarThickness
                : 0);

        const verticalAvailableHeight =
            childDimenstion.height -
            (canScrollHorizontal
                ? scrollbarThickness
                : 0);

        const horizontalRatio =
            Math.min(
                1,
                viewportWidth / worldWidth
            );

        const verticalRatio =
            Math.min(
                1,
                viewportHeight / worldHeight
            );

        const horizontalSize =
            Math.max(
                30,
                horizontalRatio *
                horizontalAvailableWidth
            );

        const verticalSize =
            Math.max(
                30,
                verticalRatio *
                verticalAvailableHeight
            );

        const horizontalTrack =
            Math.max(
                0,
                horizontalAvailableWidth -
                horizontalSize
            );

        const verticalTrack =
            Math.max(
                0,
                verticalAvailableHeight -
                verticalSize
            );

        const maxScrollX =
            Math.max(
                0,
                worldWidth -
                viewportWidth
            );

        const maxScrollY =
            Math.max(
                0,
                worldHeight -
                viewportHeight
            );

        const cameraX =
            -stage.x() / scale;

        const cameraY =
            -stage.y() / scale;

        const horizontalPosition =
            maxScrollX === 0
                ? 0
                : ((cameraX -
                    worldBounds.minX) /
                    maxScrollX) *
                horizontalTrack;

        const verticalPosition =
            maxScrollY === 0
                ? 0
                : ((cameraY -
                    worldBounds.minY) /
                    maxScrollY) *
                verticalTrack;

        return {
            horizontal: {
                size: Math.min(
                    horizontalSize,
                    horizontalAvailableWidth
                ),
                position: Math.max(
                    0,
                    Math.min(
                        horizontalTrack,
                        horizontalPosition
                    )
                ),
                visible: canScrollHorizontal,
            },

            vertical: {
                size: Math.min(
                    verticalSize,
                    verticalAvailableHeight
                ),
                position: Math.max(
                    0,
                    Math.min(
                        verticalTrack,
                        verticalPosition
                    )
                ),
                visible: canScrollVertical,
            },
        };
    };

    const scrollbarInfo =
        getScrollbarInfo();


    return (
        <div
            ref={childRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <Stage
                ref={stageRef}
                width={childDimenstion.width}
                height={childDimenstion.height}
                onWheel={handleWheel}
                draggable={false}
                onMouseDown={handleMouseDown}
                onContextMenu={
                    handleKonvaContextMenu
                }
                onDragMove={() => {
                    updateWorldBounds();
                    updateScrollbarFromCamera();
                }}
            >
                <Layer>
                    {Object.entries(images).map(
                        ([id, obj]) => {
                            if (!obj.active) {
                                return null;
                            }

                            return (
                                <CanvasImage
                                    key={id}
                                    id={id}
                                    data={obj}
                                    isSelected={selectedObj.includes(
                                        id
                                    )}
                                    nodeRef={(node) => {
                                        imageRefs.current[
                                            id
                                        ] = node;
                                    }}
                                    onSelect={() => {
                                        if (
                                            keyboardRef.current.length ===
                                            1 &&
                                            keyboardRef.current[0] ===
                                            "Shift"
                                        ) {
                                            setSelectedObj(
                                                (prev) =>
                                                    prev.includes(id)
                                                        ? prev.filter(
                                                            (item) => item !== id)
                                                        : [
                                                            ...prev,
                                                            id,
                                                        ]
                                            );

                                            return;
                                        }

                                        setSelectedObj([
                                            id,
                                        ]);
                                    }}
                                    onChange={(
                                        newAttrs
                                    ) => {
                                        updateCanvasObj(
                                            id,
                                            "change",
                                            newAttrs
                                        );
                                    }}
                                />
                            );
                        }
                    )}

                    {selectionBox && (
                        <Rect
                            x={
                                selectionBox.x
                            }
                            y={
                                selectionBox.y
                            }
                            width={
                                selectionBox.width
                            }
                            height={
                                selectionBox.height
                            }
                            fill="rgba(0, 174, 239, 0.15)"
                            stroke="#00AEEF"
                            strokeWidth={1}
                            listening={false}
                        />
                    )}

                    {selectedObj.length >
                        0 && (
                            <Transformer
                                ref={
                                    transformerRef
                                }
                                flipEnabled={
                                    false
                                }
                                borderStroke="#00AEEF"
                                anchorFill="#00AEEF"
                                anchorStroke="#00AEEF"
                                boundBoxFunc={(
                                    oldBox,
                                    newBox
                                ) => {
                                    if (
                                        Math.abs(
                                            newBox.width
                                        ) < 5 ||
                                        Math.abs(
                                            newBox.height
                                        ) < 5
                                    ) {
                                        return oldBox;
                                    }

                                    return newBox;
                                }}
                            />
                        )}
                </Layer>
            </Stage>


            {scrollbarInfo.horizontal.visible && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: scrollbarInfo.vertical.visible
                            ? scrollbarThickness
                            : 0,
                        bottom: 0,
                        height: scrollbarThickness,
                        pointerEvents: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            left:
                                scrollbarInfo.horizontal.position +
                                scrollbarPadding,
                            width:
                                scrollbarInfo.horizontal.size -
                                scrollbarPadding * 2,
                            height: scrollbarThickness,
                            bottom: scrollbarPadding,
                            background: "#888",
                            borderRadius: 4,
                            cursor: "pointer",
                            pointerEvents: "auto",
                        }}
                        onPointerDown={(
                            e
                        ) => {
                            e.preventDefault();

                            const startX =
                                e.clientX;

                            const startScroll =
                                getCurrentScrollPosition().x;

                            const stage =
                                stageRef.current;

                            if (!stage)
                                return;

                            const scale =
                                stage.scaleX();

                            const viewportWidth =
                                stage.width() /
                                scale;

                            const worldWidth =
                                worldBounds.maxX -
                                worldBounds.minX;

                            const maxScroll =
                                Math.max(
                                    0,
                                    worldWidth -
                                    viewportWidth
                                );

                            const trackWidth =
                                childDimenstion.width -
                                (scrollbarInfo.vertical.visible ? scrollbarThickness : 0) -
                                scrollbarInfo.horizontal.size;

                            const handleMove =
                                (
                                    moveEvent: PointerEvent
                                ) => {
                                    const delta =
                                        moveEvent.clientX -
                                        startX;

                                    const worldDelta =
                                        trackWidth ===
                                            0
                                            ? 0
                                            : (delta /
                                                trackWidth) *
                                            maxScroll;

                                    const newScroll =
                                        Math.max(
                                            0,
                                            Math.min(
                                                maxScroll,
                                                startScroll +
                                                worldDelta
                                            )
                                        );

                                    updateCameraFromScroll(
                                        newScroll,
                                        scrollPosition.y
                                    );
                                };

                            const handleUp =
                                () => {
                                    window.removeEventListener(
                                        "pointermove",
                                        handleMove
                                    );

                                    window.removeEventListener(
                                        "pointerup",
                                        handleUp
                                    );
                                };

                            window.addEventListener(
                                "pointermove",
                                handleMove
                            );

                            window.addEventListener(
                                "pointerup",
                                handleUp
                            );
                        }}
                    />
                </div>
            )}

            {scrollbarInfo.vertical.visible && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: scrollbarInfo.horizontal.visible
                            ? scrollbarThickness
                            : 0,
                        width: scrollbarThickness,
                        pointerEvents: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",

                            top:
                                scrollbarInfo.vertical.position +
                                scrollbarPadding,

                            height:
                                scrollbarInfo.vertical.size -
                                scrollbarPadding * 2,

                            width: scrollbarThickness,
                            right: scrollbarPadding,

                            background: "#888",
                            borderRadius: 4,
                            cursor: "pointer",
                            pointerEvents: "auto",
                        }}

                        onPointerDown={(
                            e
                        ) => {
                            e.preventDefault();

                            const startY =
                                e.clientY;

                            const startScroll =
                                getCurrentScrollPosition().y;

                            const stage =
                                stageRef.current;

                            if (!stage)
                                return;

                            const scale =
                                stage.scaleX();

                            const viewportHeight =
                                stage.height() /
                                scale;

                            const worldHeight =
                                worldBounds.maxY -
                                worldBounds.minY;

                            const maxScroll =
                                Math.max(
                                    0,
                                    worldHeight -
                                    viewportHeight
                                );

                            const trackHeight =
                                childDimenstion.height -
                                (scrollbarInfo.horizontal.visible ? scrollbarThickness : 0) -
                                scrollbarInfo.vertical.size;

                            const handleMove =
                                (
                                    moveEvent: PointerEvent
                                ) => {
                                    const delta =
                                        moveEvent.clientY -
                                        startY;

                                    const worldDelta =
                                        trackHeight ===
                                            0
                                            ? 0
                                            : (delta /
                                                trackHeight) *
                                            maxScroll;

                                    const newScroll =
                                        Math.max(
                                            0,
                                            Math.min(
                                                maxScroll,
                                                startScroll +
                                                worldDelta
                                            )
                                        );

                                    updateCameraFromScroll(
                                        scrollPosition.x,
                                        newScroll
                                    );
                                };

                            const handleUp =
                                () => {
                                    window.removeEventListener(
                                        "pointermove",
                                        handleMove
                                    );

                                    window.removeEventListener(
                                        "pointerup",
                                        handleUp
                                    );
                                };

                            window.addEventListener(
                                "pointermove",
                                handleMove
                            );

                            window.addEventListener(
                                "pointerup",
                                handleUp
                            );
                        }}
                    />
                </div>
            )}

            {contextMenu.show && (
                <InfiniteCanvasContextMenuComponent
                    contextMenu={
                        contextMenu
                    }
                    setContextMenu={
                        setContextMenu
                    }
                    onDelete={
                        handleDelete
                    }
                />
            )}
        </div>
    );
}