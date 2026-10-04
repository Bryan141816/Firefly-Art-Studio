import InfiniteCanvas from "@/components/infinite-canvas";
import { useState } from "react";

type CanvasImageData = {
  id: string;
  src: string;
  x: number;
  y: number;
};

export default function ProjectView() {
  const [images, setImages] = useState<CanvasImageData[]>([]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const hasImage = Array.from(event.dataTransfer.items).some(
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

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const imageFiles = Array.from(event.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      return;
    }
    const newImages: CanvasImageData[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      src: URL.createObjectURL(file),
      x: 100,
      y: 100,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  return (
    <div
      className="w-full h-full overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <InfiniteCanvas images={images} />
    </div>
  );
}