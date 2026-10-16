// Run against Vite in a browser:
// await (await import('/tests/browser/wave-visibility.ts')).checkWaveVisibility()
import { loadAvatarLayers, renderPetFrame, renderPetPreview, createPetSheet } from '../../src/pet/renderer';
import { formatProjectIconId, PROJECT_AVATAR_SHAPES } from '../../src/utils/projectIcons';
import { CELL_WIDTH, CELL_HEIGHT, PET_STATES } from '../../src/pet/spec';

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function checkWaveVisibility() {
  const padding = 32;
  const width = CELL_WIDTH + padding * 2;
  const height = CELL_HEIGHT + padding * 2;
  const makeContext = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d', { willReadFrequently: true })!;
  };
  const full = makeContext();
  const body = makeContext();
  const results = [];
  for (const shape of PROJECT_AVATAR_SHAPES) {
    const icon = formatProjectIconId({ shapeId: shape.id, expressionId: 'dot-none', color: '#9461FF' });
    const layers = await loadAvatarLayers(icon);
    let minVisibleArmPixels = Infinity;
    // Check the entire interpolated loop, including both extremes of the hand.
    for (let time = 0; time < 700; time += 10) {
      for (const [context, color] of [[full, layers.color], [body, 'transparent']] as const) {
        context.clearRect(0, 0, width, height);
        context.save();
        context.translate(padding, padding);
        renderPetPreview(context, { ...layers, color }, 'waving', time);
        context.restore();
      }
      const pixels = full.getImageData(0, 0, width, height).data;
      const silhouette = body.getImageData(0, 0, width, height).data;
      let visible = 0;
      let occupied = 0;
      let seed = -1;
      const mask = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          if (pixels[index * 4 + 3] <= 128) continue;
          check(x >= padding && x < padding + CELL_WIDTH && y >= padding && y < padding + CELL_HEIGHT,
            `${shape.id} at ${time}ms: waving clips the export cell`);
          if (silhouette[index * 4 + 3] < 10) visible++;
          mask[index] = 1;
          seed = index;
          occupied++;
        }
      }
      check(visible >= 250, `${shape.id} at ${time}ms: only ${visible} arm pixels visible`);
      minVisibleArmPixels = Math.min(minVisibleArmPixels, visible);
      // The raised hand must remain connected to the body, even for tapered shapes.
      const queue = [seed];
      mask[seed] = 0;
      for (let i = 0; i < queue.length; i++) {
        const pixel = queue[i];
        for (const next of [pixel - width, pixel + width, pixel - 1, pixel + 1]) {
          if (mask[next]) { mask[next] = 0; queue.push(next); }
        }
      }
      check(queue.length === occupied, `${shape.id} at ${time}ms: detached arm`);
    }
    // Confirm PNG exports use the same visible wave at all four keyframes.
    const bitmap = await createImageBitmap(await createPetSheet(icon));
    const sheet = document.createElement('canvas');
    sheet.width = bitmap.width;
    sheet.height = bitmap.height;
    const context = sheet.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const native = document.createElement('canvas');
    native.width = CELL_WIDTH;
    native.height = CELL_HEIGHT;
    const nativeContext = native.getContext('2d')!;
    let elapsed = 0;
    const wave = PET_STATES.find(state => state.id === 'waving')!;
    for (let frame = 0; frame < wave.frames; frame++) {
      nativeContext.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
      renderPetPreview(nativeContext, layers, 'waving', elapsed);
      const preview = nativeContext.getImageData(0, 0, CELL_WIDTH, CELL_HEIGHT).data;
      nativeContext.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
      renderPetFrame(nativeContext, layers, 'waving', frame);
      const discrete = nativeContext.getImageData(0, 0, CELL_WIDTH, CELL_HEIGHT).data;
      const exported = context.getImageData(frame * CELL_WIDTH, 3 * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT).data;
      check(preview.every((value, index) => value === discrete[index]),
        `${shape.id}: discrete and preview disagree at frame ${frame}`);
      // Canvas backends can round scaled SVG edges differently after readback.
      // Compare occupied silhouettes rather than exact antialiased RGB values.
      let differentPixels = 0;
      let occupiedPixels = 0;
      for (let pixel = 3; pixel < preview.length; pixel += 4) {
        const live = preview[pixel] > 128;
        const png = exported[pixel] > 128;
        if (live || png) occupiedPixels++;
        if (live !== png) differentPixels++;
      }
      check(differentPixels / occupiedPixels < 0.015,
        `${shape.id}: PNG and preview silhouettes disagree at frame ${frame}`);
      elapsed += wave.durations[frame];
    }
    bitmap.close();
    results.push({ shape: shape.id, samples: 70, minVisibleArmPixels });
  }
  return results;
}
