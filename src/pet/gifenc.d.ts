declare module 'gifenc' {
  const api: { GIFEncoder: typeof GIFEncoder; quantize: typeof quantize; applyPalette: typeof applyPalette };
  export default api;
  export function quantize(data: Uint8ClampedArray, colors: number): number[][];
  export function applyPalette(data: Uint8ClampedArray, palette: number[][]): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(data: Uint8Array, width: number, height: number, options: {
      palette: number[][]; delay: number; repeat: number; transparent: boolean;
      transparentIndex: number; dispose: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array<ArrayBuffer>;
  };
}
