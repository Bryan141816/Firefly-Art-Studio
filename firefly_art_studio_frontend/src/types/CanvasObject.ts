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