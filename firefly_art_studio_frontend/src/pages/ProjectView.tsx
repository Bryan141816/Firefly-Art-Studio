import InfiniteCanvas from "@/components/infinite-canvas";
import type Konva from "konva";
import { useEffect, useRef, useState } from "react";

export type CanvasImageData = {
  assetId?: string | null;
  src: string;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation?: number;
  active: boolean ; 
};

type Position = {
  x: number,
  y: number
}

type DeltaSystem = {
  id: string
  type: "create" | "change"
  oldData: CanvasImageData | null;
  newData: CanvasImageData | null;
}

export default function ProjectView() {
  
  const [images, setImages] = useState<Record<string, CanvasImageData>>({});
  
  const containerRef = useRef<HTMLDivElement>(null);

  const stageRef = useRef<Konva.Stage>(null);

  const undoStack = useRef<DeltaSystem[]>([])
  const redoStack = useRef<DeltaSystem[]>([])

  const convertToWorldCoordinate = (position: Position) => {
    const stage = stageRef.current;

    if (!stage) return null;

    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();

    return {
      x: (position.x - stage.x()) / scaleX,
      y: (position.y - stage.y()) / scaleY,
    };
  };

  const createHistory = (id: string, type: "create"|"change", oldData: CanvasImageData | null, newData: CanvasImageData | null) => {
    const newHistory:DeltaSystem = {
      id,
      type,
      oldData,
      newData
    }
    undoStack.current.push(newHistory);
    redoStack.current = [];
  }

  const handleUndo = () => {
    const history = undoStack.current.pop();
    if(!history) return;
    redoStack.current.push(history);
    if(history.type == "create"){
      setImages((prev) => ({
        ...prev,
        [history.id]: {...prev[history.id], active: false},
      }));
    }
    else {      
      const data = history.oldData;
      if(data != null){
        setImages((prev) => ({
          ...prev,
          [history.id]: data,
        }));
      }
    }
  };

  const handleRedo = () => {
    console.log(redoStack);
    const history = redoStack.current.pop();
    if(!history) return;
    undoStack.current.push(history);
    if(history.type == "create"){
      setImages((prev) => ({
        ...prev,
        [history.id]: {...prev[history.id], active: true},
      }));
    }
    else {      
      const data = history.newData;
      if(data != null){
        setImages((prev) => ({
          ...prev,
          [history.id]: data,
        }));
      }
    }
  };

  const addImages = (
    imageFiles: File[],
    position: Position
  ) => {
    const newImages: Record<string, CanvasImageData> = {};
    let newId:string[] = [];
    imageFiles.forEach((file, index) => {
      const id = crypto.randomUUID();
      newId.push(id);
      newImages[id] = {
        src: URL.createObjectURL(file),
        x: position.x,
        y: position.y,
        active: true
      };
    });

    setImages((prev) => ({
      ...prev,
      ...newImages,
    }));
    Object.entries(newImages).map(([id, obj]) => { 
      createHistory(id, "create", null, obj);
    })
  };

  

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    const hasImage = Array.from(
      event.dataTransfer.items
    ).some(
      (item) =>
        item.kind === "file" &&
        item.type.startsWith("image/")
    );

    if (hasImage) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    } else {
      event.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const imageFiles = Array.from(
      event.dataTransfer.files
    ).filter((file) =>
      file.type.startsWith("image/")
    );
    if (imageFiles.length === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;


    const position = convertToWorldCoordinate({x,y})
    if(!position) return;
    addImages(imageFiles,position);
  };

  const handlePaste = (event: ClipboardEvent) => {
    const imageFiles: File[] = [];

    for (const item of event.clipboardData?.items ?? []) {
      if (
        item.kind === "file" &&
        item.type.startsWith("image/")
      ) {
        const file = item.getAsFile();

        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length === 0) return;

    event.preventDefault();
    if(!containerRef.current) return;
    const x = containerRef.current.clientWidth / 2;
    const y = containerRef.current.clientHeight / 2;

    const position = convertToWorldCoordinate({x, y})
    if(!position) return;
    addImages(imageFiles, position);
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

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const updateObjData = (id: string, type: "create"|"change", data: CanvasImageData) => {
    setImages((prev) => ({
      ...prev,
      [id]: data,
    }));
    createHistory(id, type, images[id], data);
  };


  return (
    <div
      className="w-full h-full overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={containerRef}
    >
      <InfiniteCanvas
        stageRef={stageRef}
        images={images}
        updateCanvasObj={updateObjData}
      />
    </div>
  );
}