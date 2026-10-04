import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Layer, Stage, Image, Transformer, Shape } from "react-konva";
import useImage from "use-image";
import type { InfiniteCanvasContextMenu } from "./infinit-canvas-context-menu";
import InfiniteCanvasContextMenuComponent from "./infinit-canvas-context-menu";

type CanvasImageData = {
  id: string;
  src: string;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation?: number;
};
type InfiniteCanvasProps = {
  images?: CanvasImageData[];
};

type CanvasImage = {
    data: CanvasImageData
    isSelected: boolean
    onSelect: ()=>void
    onChange: (newAttrs: CanvasImageData) => void
    onContextMenu: (id: string, x: number, y: number) => void;
}

const CanvasImage = ({
    data,
    isSelected,
    onSelect,
    onChange,
    onContextMenu,
}: CanvasImage) => {
    const [image] = useImage(data.src, 'anonymous');

    const [isHovered, setIsHovered] = useState(false);

    const shapeRef = useRef<Konva.Image | null>(null);
    const trRef = useRef<Konva.Transformer | null>(null);

    useEffect(() => {
        if (!isSelected) return;

        const transformer = trRef.current;
        const shape = shapeRef.current;

        if (transformer && shape) {
            transformer.nodes([shape]);
        }
    }, [isSelected]);

    return (
        <>
            <Image
                image={image}
                stroke="#00AEEF"
                strokeWidth={1}
                ref={shapeRef}
                strokeScaleEnabled={false}
                strokeEnabled={isHovered && !isSelected}

                {...(data.width != null && { width: data.width })}
                {...(data.height != null && { height: data.height })}

                x={data.x}
                y={data.y}
                id={data.id}
                rotation={data.rotation}
                draggable

                onClick={onSelect}

                onContextMenu={(e) => {
                    e.evt.preventDefault();
                    e.cancelBubble = true;

                    const stage = e.target.getStage();

                    if (!stage) return;

                    const pointerPosition = stage.getPointerPosition();

                    if (!pointerPosition) return;

                    const containerRect =
                        stage.container().getBoundingClientRect();

                    onContextMenu(
                        data.id,
                        containerRect.left + pointerPosition.x + 4,
                        containerRect.top + pointerPosition.y + 4
                    );
                }}

                onMouseEnter={() => {
                    setIsHovered(true);
                }}

                onMouseLeave={() => {
                    setIsHovered(false);
                }}

                onDragEnd={(e) => {
                    onChange({
                        ...data,
                        x: e.target.x(),
                        y: e.target.y(),
                    });

                    onSelect();
                }}

                

                onTransformEnd={() => {
                    const node = shapeRef.current;

                    if (!node) return;

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

            {isSelected && (
                <Transformer
                    ref={trRef}
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
        </>
    );
};



export default function InfiniteCanvas({
    images = [],
}:InfiniteCanvasProps){

    const canvsObjRef = useRef(images);
    const [canvasObj, setCanvasObj] = useState<CanvasImageData[]>(images) 
    const [selectedObj, setSelectedObj] = useState<string | null>(null);

    const [contextMenu, setContextMenu] = useState<InfiniteCanvasContextMenu>({
        show: false,
        x: 0,
        y:0,
        id: null
    });
    
    const childRef = useRef<HTMLDivElement>(null);
    const [childDimenstion, setChildDimenstion] = useState<{width: number, height: number}>({width: 0, height: 0});
    const stageRef = useRef<Konva.Stage>(null);
    
    const [scale, setScale] = useState(1);
    
    const [isPanning, setIsPanning] = useState(false);
    
    const history = useRef([images]);
    const historyStep = useRef(0);
    const [isHistoryChanging, setIsHistoryChanging] = useState(false);
    useEffect(() => {
        setCanvasObj((current) => {
            const currentIds = new Set(current.map((item) => item.id));

            const newImages = images.filter(
                (item) => !currentIds.has(item.id)
            );

            return [...current, ...newImages];
        });
    }, [images]);
    useEffect(() => {
        const previous = canvsObjRef.current;
        if(!isHistoryChanging){
            history.current = history.current.slice(0, historyStep.current + 1);
    
            history.current = [...history.current, canvasObj];
            historyStep.current += 1;
        }
        else {
            setIsHistoryChanging(false);
        }

        const changed = canvasObj.filter((current) => {
            const old = previous.find(
                (item) => item.id === current.id
            );

            // New item
            if (!old) {
                return true;
            }

            return (
                old.x !== current.x ||
                old.y !== current.y ||
                old.width !== current.width ||
                old.height !== current.height ||
                old.rotation !== current.rotation
            );
        });

        // Nothing changed
        if (changed.length === 0) {
            return;
        }


        const timer = setTimeout(() => {
            canvsObjRef.current = canvasObj;
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [canvasObj]);



    const MIN_SCALE = 0.05;
    const MAX_SCALE = 5;
    const ZOOM_FACTOR = 1.05;

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
            // Ctrl + Shift + Z → Redo
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                handleRedo();
                return;
            }

            // Ctrl + Z → Undo
            if (e.ctrlKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                handleUndo();
            }
        };

        updateDimensions();

        window.addEventListener("resize", updateDimensions);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("resize", updateDimensions);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        if(contextMenu.show){
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

        setScale(clampedScale);

        stage.scale({
            x: clampedScale,
            y: clampedScale,
        });

        stage.position(newPos);
        stage.batchDraw();
    };
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // deselect when clicked on empty area
        if(e.evt.button === 0){
            if(selectedObj){
                if(contextMenu.id === selectedObj){
                    setContextMenu({
                        show: false,
                        x:0,
                        y:0,
                        id:null,
                    });
                }
                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                    setContextMenu({
                        show: false,
                        x:0,
                        y:0,
                        id:null,
                    });
                    setSelectedObj(null);
                }
            }
        }
        else if(e.evt.button === 1){
            if(contextMenu.show){
                return
            }

            setIsPanning(true);
            stageRef.current?.startDrag();
        }
    };
    const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if(e.evt.button === 1){
            setIsPanning(false);
            stageRef.current?.stopDrag();
        }
    };

    const handleUndo = () => {
        if (historyStep.current === 0) {
        return;
        }
        historyStep.current -= 1;
        const previous = history.current[historyStep.current];
        setIsHistoryChanging(true)
        setCanvasObj(previous);
    };

    const handleRedo = () => {
        if (historyStep.current === history.current.length - 1) {
        return;
        }
        historyStep.current += 1;
        const next = history.current[historyStep.current];
        setIsHistoryChanging(true)
        setCanvasObj(next);
    };

    const handleContextMenu = (
        id: string,
        x: number,
        y: number
    ) => {
        setSelectedObj(id);

        setContextMenu({
            show: true,
            x,
            y,
            id,
        });
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
            style={{
                cursor: isPanning ? "grabbing" : "default"
            }}
            >
            <Layer>
                {canvasObj.map((obj, i)=>{
                    return(
                        <CanvasImage
                            isSelected={selectedObj === obj.id}
                            onSelect={()=>{
                                setSelectedObj(obj.id);
                            }}
                            data={obj} 
                            key={i}
                            onChange={(newAttrs: CanvasImageData)=>{
                                const objs = canvasObj.slice();
                                objs[i] = newAttrs;
                                setCanvasObj(objs);
                            }}
                            onContextMenu={handleContextMenu}
                        />
                    )
                })}
            </Layer>
        </Stage>

        {contextMenu.show && (
            <InfiniteCanvasContextMenuComponent contextMenu={contextMenu} setContextMenu={setContextMenu}/ >    
        )}
    </div>
}