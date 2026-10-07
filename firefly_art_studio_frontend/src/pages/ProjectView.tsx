import InfiniteCanvas from "@/components/infinite-canvas";
import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { Update } from "vite/types/hmrPayload.js";

export type CanvasImageData = {
  assetId?: string | null;
  src: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  rotation: number | 0;
  active: boolean;
};

type CloudUploadData = {
  canvasId: string
  src: string
  x: number
  y: number
  width: number | null
  height: number | null
  rotation: number,
  active: boolean,
  id: string
}

type Position = {
  x: number,
  y: number
}

type Delta = {
  id: string
  oldData: CanvasImageData | null;
  newData: CanvasImageData | null;
}

type DeltaSystem = {
  type: "create" | "change"
  changes: Delta[]
}

type UploadQueueData = {
  id: string
  file: File
  data: CanvasImageData
}

type UpdateDelta = {
  id: string
  changes: CanvasImageData | null;
}

type ProjectResponse = {
  project_metadata: {
    id: string;
    name: string;
    untitledNo: number;
    description: string | null;
  };
  items: Record<string, CanvasImageData>;
};

export default function ProjectView() {

  const [images, setImages] = useState<Record<string, CanvasImageData>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  const stageRef = useRef<Konva.Stage>(null);

  const undoStack = useRef<DeltaSystem[]>([])
  const redoStack = useRef<DeltaSystem[]>([])

  const uploadQueue = useRef<UploadQueueData[]>([]);
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateQueue = useRef<UpdateDelta[]>([]);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HISTORY_GROUP_TIME = 300;

  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistory = useRef<DeltaSystem | null>(null);

  const { projectId } = useParams<{ projectId: string }>();

  const addUploadQueue = (id: string, file: File, data: CanvasImageData) => {
    uploadQueue.current.push({
      id,
      file,
      data
    });

    if (uploadTimer.current) {
      clearTimeout(uploadTimer.current);
    }

    uploadTimer.current = setTimeout(() => {
      uploadFiles();
    }, 2000);
  };

  const uploadFiles = async () => {
    const queue = uploadQueue.current;
    if (queue.length === 0 || !projectId) return;

    uploadQueue.current = [];
    uploadTimer.current = null;

    const data = queue.map((item) => {
      return {
        canvasId: item.id,
        x: item.data.x,
        y: item.data.y,
        width: item.data.width ?? null,
        height: item.data.height ?? null,
        rotation: item.data.rotation ?? 0,
        active: item.data.active,
      };
    });

    const formData = new FormData();

    formData.append(
      "data",
      new Blob(
        [JSON.stringify(data)],
        { type: "application/json" }
      )
    );

    queue.forEach((item) => {
      formData.append("files", item.file);
    });

    try {
      const response = await fetch(
        `http://localhost:8080/api/project/${projectId}/item/`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data: CloudUploadData[] = await response.json();
      setAssetIdAndCheckParity(data);
    } catch (error) {
      console.error("Upload failed:", error);

      uploadQueue.current.unshift(...queue);
    }
  };

  const setAssetIdAndCheckParity = (data: CloudUploadData[]) => {
    data.forEach((item) => {
      setImages((prev) => {
        const img = prev[item.canvasId];

        if (!img) {
          console.warn(
            "Image not found for canvasId:",
            item.canvasId
          );
          return prev;
        }

        const updatedImage: CanvasImageData = {
          ...img,
          assetId: item.id,
        };
        if (
          img.x !== item.x ||
          img.y !== item.y ||
          img.width !== item.width ||
          img.height !== item.height ||
          img.rotation !== item.rotation ||
          img.active !== item.active
        ) {
          const delta: UpdateDelta = {
            id: item.canvasId,
            changes: {
              ...updatedImage,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              rotation: item.rotation ?? 0,
              active: item.active,
            },
          };

          addUpdateQueue(delta);
        }

        return {
          ...prev,
          [item.canvasId]: updatedImage,
        };
      });
    });
  };

  const addUpdateQueue = (delta: UpdateDelta) => {
    updateQueue.current.push(delta);


    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    updateTimer.current = setTimeout(() => {
      cloudObjectSync();
    }, 2000);
  }

  const cloudObjectSync = async () => {
    const queue = updateQueue.current;

    if (queue.length === 0) return;

    const compressed: Record<string, CanvasImageData | null> = {};
    updateQueue.current = [];
    updateTimer.current = null;
    queue.map((item) => {
      if (item.changes?.assetId) {
        compressed[item.changes.assetId] = item.changes;
      }
    })

    try {
      const response = await fetch(
        `http://localhost:8080/api/project/item/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(compressed),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      console.log("Update successful");
    } catch (error) {
      console.error("Update failed:", error);

      updateQueue.current.unshift(...queue);
    }
  }


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

  const updateObjData = (id: string, type: "create" | "change", data: CanvasImageData) => {
    setImages((prev) => ({
      ...prev,
      [id]: data,
    }));
    const delta: Delta = {
      id,
      oldData: images[id],
      newData: data
    }
    createHistory(type, delta);

  };

  const createHistory = (
    type: "create" | "change",
    changes: Delta
  ) => {
    if (!pendingHistory.current) {
      pendingHistory.current = {
        type,
        changes: [changes]
      }
    }

    const existing = pendingHistory.current.changes.find(
      change => change.id === changes.id
    );

    if (existing) {
      existing.newData = changes.newData;
    } else {
      pendingHistory.current.changes.push(changes);
    }

    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
    }

    historyTimer.current = setTimeout(() => {
      if (pendingHistory.current) {
        undoStack.current.push(pendingHistory.current);
        redoStack.current = [];
        pendingHistory.current = null;
      }

      historyTimer.current = null;
    }, HISTORY_GROUP_TIME);
    addUpdateQueue({id: changes.id, changes: changes.newData})
  };

  const handleUndo = () => {
    const history = undoStack.current.pop();
    if (!history) return;
    redoStack.current.push(history);
    history.changes.map((change)=>{

      if (change.oldData?.assetId) {
        addUpdateQueue({id: change.id, changes: change.oldData});
      }
      if (history.type == "create") {
        setImages((prev) => ({
          ...prev,
          [change.id]: { ...prev[change.id], active: false },
        }));
      }
      else {
        const data = change.oldData;
        if (data != null) {
          setImages((prev) => ({
            ...prev,
            [change.id]: data,
          }));
        }
      }
    })
  };

  const handleRedo = () => {
    const history = redoStack.current.pop();
    if (!history) return;
    undoStack.current.push(history);
    history.changes.map((change)=>{

      if (change.oldData?.assetId) {
        addUpdateQueue({id: change.id, changes: change.newData});
      }
      if (history.type == "create") {
        setImages((prev) => ({
          ...prev,
          [change.id]: { ...prev[change.id], active: true },
        }));
      }
      else {
        const data = change.newData;
        if (data != null) {
          setImages((prev) => ({
            ...prev,
            [change.id]: data,
          }));
        }
      }
    })
  };

  const addImages = (
    imageFiles: File[],
    position: Position
  ) => {
    const newImages: Record<string, CanvasImageData> = {};
    imageFiles.forEach((file) => {
      const id = crypto.randomUUID();
      const createdImage: CanvasImageData = {
        src: URL.createObjectURL(file),
        x: position.x,
        y: position.y,
        active: true,
        width: null,
        height: null,
        rotation: 0,
      }
      newImages[id] = createdImage;

      const delta: Delta = {
        id,
        oldData: null,
        newData: createdImage
      }
      createHistory("create", delta);
      addUploadQueue(id, file, createdImage);
    });

    setImages((prev) => ({
      ...prev,
      ...newImages,
    }));
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


    const position = convertToWorldCoordinate({ x, y })
    if (!position) return;
    addImages(imageFiles, position);
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
    if (!containerRef.current) return;
    const x = containerRef.current.clientWidth / 2;
    const y = containerRef.current.clientHeight / 2;

    const position = convertToWorldCoordinate({ x, y })
    if (!position) return;
    addImages(imageFiles, position);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      handleUndo();
    }
  };
  const fetchData = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/project/${projectId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      const data: ProjectResponse = await response.json();

      setImages(data.items);

      console.log("fetch successful");
      setImages(data.items);

    } catch (error) {
      console.error("fetch failed:", error);
    }
  };

  useEffect(() => {

    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);
    fetchData();

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);



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