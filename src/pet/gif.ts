import * as gifenc from 'gifenc';
// The package exposes ESM in bundlers and a CommonJS default in Node.
const { GIFEncoder, quantize, applyPalette } = { ...gifenc.default, ...gifenc };
import { PET_STATES, type PetState } from './spec';

// GIF uses centiseconds. 20ms is an exact, widely supported 50fps delay.
export const GIF_FRAME_DELAY = 20;
export function gifTimeline(state: PetState): number[] {
  const duration = PET_STATES.find(item => item.id === state)!.durations.reduce<number>((sum, ms) => sum + ms, 0);
  const frames = Math.round(duration / GIF_FRAME_DELAY);
  return Array.from({ length: frames }, (_, i) => i * duration / frames);
}

export function createGifEncoder(width: number, height: number) {
  const encoder = GIFEncoder();
  return {
    addFrame(rgba: Uint8ClampedArray) {
      // Quantize only visible pixels and reserve a separate transparent entry.
      // Opaque black (eyes) must never share the transparent palette index.
      const visible = new Uint8ClampedArray(rgba.length);
      let length = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] < 128) continue;
        visible.set(rgba.subarray(i, i + 4), length);
        length += 4;
      }
      const colors = length ? quantize(visible.subarray(0, length), 255) : [[0, 0, 0]];
      const indexed = applyPalette(rgba, colors);
      const transparentIndex = colors.length;
      for (let i = 0; i < indexed.length; i++) {
        if (rgba[i * 4 + 3] < 128) indexed[i] = transparentIndex;
      }
      encoder.writeFrame(indexed, width, height, {
        palette: [...colors, [0, 0, 0]], transparent: true, transparentIndex,
        delay: GIF_FRAME_DELAY, repeat: 0, dispose: 2,
      });
    },
    finish() {
      encoder.finish();
      return new Blob([encoder.bytes()], { type: 'image/gif' });
    },
  };
}
