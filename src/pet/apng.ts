import { loadAvatarLayers, renderPetPreview } from './renderer';
import { CELL_HEIGHT, CELL_WIDTH, type PetState } from './spec';

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});

function chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < bytes.length - 4; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  view.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}

/** Lossless RGBA APNG. Full frames replace the canvas, including transparent pixels. */
export function createApngEncoder(width: number, height: number, frames: number, delayMs = 20) {
  if (typeof CompressionStream === 'undefined') throw new Error('Animated PNG export requires a newer browser. Please update Chrome, Edge, Firefox, or Safari.');
  if (![width, height, frames, delayMs].every(value => Number.isInteger(value) && value > 0) || delayMs > 65535) {
    throw new Error('Invalid animated PNG dimensions, frame count, or delay.');
  }
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8; // 8 bits per channel
  header[9] = 6; // RGBA
  const animation = new Uint8Array(8);
  new DataView(animation.buffer).setUint32(0, frames); // zero plays = loop forever
  const parts: BlobPart[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('acTL', animation)];
  let index = 0;
  let sequence = 0;
  return {
    async addFrame(rgba: Uint8ClampedArray) {
      if (index >= frames || rgba.length !== width * height * 4) throw new Error('Invalid animated PNG frame.');
      const stride = width * 4;
      const scanlines = new Uint8Array((stride + 1) * height);
      for (let row = 0; row < height; row++) {
        // PNG filter 0 (None), followed by unmodified RGBA bytes.
        scanlines.set(rgba.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
      }
      const compressed = new Uint8Array(await new Response(
        new Blob([scanlines]).stream().pipeThrough(new CompressionStream('deflate')),
      ).arrayBuffer());
      const control = new Uint8Array(26);
      const view = new DataView(control.buffer);
      view.setUint32(0, sequence++);
      view.setUint32(4, width);
      view.setUint32(8, height);
      view.setUint16(20, delayMs);
      view.setUint16(22, 1000);
      // dispose=NONE, blend=SOURCE: no alpha accumulation or trails between frames.
      parts.push(chunk('fcTL', control));
      if (index === 0) parts.push(chunk('IDAT', compressed));
      else {
        const data = new Uint8Array(compressed.length + 4);
        new DataView(data.buffer).setUint32(0, sequence++);
        data.set(compressed, 4);
        parts.push(chunk('fdAT', data));
      }
      index++;
    },
    finish() {
      if (index !== frames) throw new Error('The animation export is incomplete. Please try again.');
      return new Blob([...parts, chunk('IEND', new Uint8Array())], { type: 'image/apng' });
    },
  };
}

export async function createPetApng(icon: string, state: PetState, onProgress?: (percent: number) => void): Promise<Blob> {
  const { gifTimeline } = await import('./gif');
  const layers = await loadAvatarLayers(icon);
  const timeline = gifTimeline(state);
  const encoder = createApngEncoder(CELL_WIDTH, CELL_HEIGHT, timeline.length);
  const canvas = document.createElement('canvas');
  canvas.width = CELL_WIDTH;
  canvas.height = CELL_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Your browser does not support canvas export.');
  for (let i = 0; i < timeline.length; i++) {
    context.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
    renderPetPreview(context, layers, state, timeline[i]);
    await encoder.addFrame(context.getImageData(0, 0, CELL_WIDTH, CELL_HEIGHT).data);
    onProgress?.(Math.round((i + 1) / timeline.length * 100));
    if (i % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return encoder.finish();
}
