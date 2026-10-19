import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectIcon } from '../components/ProjectIcon';
import { getProjectIcon } from '../utils/projectIcons';
import { CELL_HEIGHT, CELL_WIDTH, PET_STATES, getFramePose, getPreviewPose, type FramePose, type PetState, type PetVersion } from './spec';

interface AvatarLayers {
  body: HTMLImageElement;
  face: HTMLImageElement;
  color: string;
  waveAnchorX: number;
  bodyRadius: number;
}

const imageCache = new Map<string, Promise<AvatarLayers>>();

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not render this avatar. Please try another avatar.')); };
    image.src = url;
  });
}

export function loadAvatarLayers(icon: string): Promise<AvatarLayers> {
  const cached = imageCache.get(icon);
  if (cached) return cached;
  const promise = (async () => {
    const props = { icon, width: 432, height: 432, className: '' };
    const fullMarkup = renderToStaticMarkup(createElement(ProjectIcon, props));
    const bodyMarkup = renderToStaticMarkup(createElement(ProjectIcon, { ...props, showFace: false }));
    const svgDocument = new DOMParser().parseFromString(fullMarkup, 'image/svg+xml');
    const svg = svgDocument.documentElement;
    // Raft's last root group contains its original eyes and brows. Keep those exact vectors.
    const face = Array.from(svg.children).reverse().find((child) => child.tagName === 'g');
    for (const child of Array.from(svg.children)) {
      if (child !== face) child.remove();
    }
    const faceMarkup = new XMLSerializer().serializeToString(svg);
    const [bodyImage, faceImage] = await Promise.all([loadSvg(bodyMarkup), loadSvg(faceMarkup)]);
    // Measure the actual silhouette once, at the same size used by every renderer.
    // A fixed shoulder lets the raised hand disappear inside wide or lobed bodies.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 144;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser does not support canvas rendering.');
    context.drawImage(bodyImage, 0, 0, 144, 144);
    const pixels = context.getImageData(0, 0, 144, 144).data;
    let right = 0;
    for (let y = 0; y < 144; y++) {
      for (let x = right; x < 144; x++) {
        if (pixels[(y * 144 + x) * 4 + 3] > 0) right = x;
      }
    }
    const bodyRadius = right - 72;
    return { body: bodyImage, face: faceImage, color: getProjectIcon(icon).color, waveAnchorX: bodyRadius + 15, bodyRadius };
  })();
  imageCache.set(icon, promise);
  // A failed image must be retryable. Limit retained variants during long editing sessions.
  void promise.catch(() => imageCache.delete(icon));
  if (imageCache.size > 24) imageCache.delete(imageCache.keys().next().value!);
  return promise;
}

function drawRoundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(x, y, w, h, r);
  } else {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }
}

function paintTyping(context: CanvasRenderingContext2D, layers: AvatarLayers, pose: FramePose): void {
  const typeLx = pose.typeLx!;
  const typeLy = pose.typeLy!;
  const typeRx = pose.typeRx!;
  const typeRy = pose.typeRy!;

  // 1. Keyboard subtle drop shadow
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.16)';
  context.beginPath();
  context.ellipse(0, -1, 35, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // 2. Keyboard casing (sleek dark mechanical keyboard)
  const kbX = -32;
  const kbY = -18;
  const kbW = 64;
  const kbH = 16;
  const kbR = 3.5;

  context.save();
  // Chassis outer edge
  context.fillStyle = '#181a22';
  drawRoundRect(context, kbX, kbY, kbW, kbH, kbR);
  context.fill();

  // Chassis inner plate
  context.fillStyle = '#222530';
  drawRoundRect(context, kbX + 1, kbY + 1, kbW - 2, kbH - 2, kbR - 1);
  context.fill();

  // Top metallic highlight rim
  context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(kbX + 3, kbY + 1.2);
  context.lineTo(kbX + kbW - 3, kbY + 1.2);
  context.stroke();

  // 3. Keycaps layout
  const keys = [
    // Top row
    { x: -28, y: -15.5, w: 9.5, h: 5 },
    { x: -17, y: -15.5, w: 9.5, h: 5 },
    { x: -6, y: -15.5, w: 12, h: 5 },
    { x: 7.5, y: -15.5, w: 9.5, h: 5 },
    { x: 18.5, y: -15.5, w: 9.5, h: 5 },
    // Bottom row
    { x: -28, y: -9, w: 11, h: 5 },
    { x: -15.5, y: -9, w: 31, h: 5 }, // Spacebar
    { x: 17, y: -9, w: 11, h: 5 },
  ];

  for (const k of keys) {
    const hitL = typeLy >= -11 && Math.abs(typeLx - (k.x + k.w / 2)) < k.w / 2 + 2.5;
    const hitR = typeRy >= -11 && Math.abs(typeRx - (k.x + k.w / 2)) < k.w / 2 + 2.5;
    const isHit = hitL || hitR;

    const ky = isHit ? k.y + 0.8 : k.y;
    context.fillStyle = isHit ? '#38bdf8' : '#333748';
    drawRoundRect(context, k.x, ky, k.w, k.h, 1.2);
    context.fill();

    if (!isHit) {
      context.fillStyle = '#454c60';
      context.fillRect(k.x + 0.8, ky + 0.5, k.w - 1.6, 1);
    } else {
      context.fillStyle = '#ffffff';
      context.fillRect(k.x + 1, ky + 0.8, k.w - 2, 1.2);
    }
  }
  context.restore();

  // 4. Arms & Paws
  const shoulderDist = Math.max(26, Math.min(40, layers.bodyRadius * 0.72));
  const shoulderY = -34;

  // Frantic motion blur afterimages (ghost paws)
  context.save();
  context.globalAlpha = 0.28;
  context.strokeStyle = layers.color;
  context.fillStyle = layers.color;
  context.lineWidth = 6;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const ghostLy = typeLy < -15 ? typeLy + 6 : typeLy - 6;
  context.beginPath();
  context.moveTo(-shoulderDist, shoulderY);
  context.quadraticCurveTo(-shoulderDist - 8, (shoulderY + ghostLy) / 2, typeLx - 2, ghostLy);
  context.stroke();
  context.beginPath();
  context.arc(typeLx - 2, ghostLy, 4.5, 0, Math.PI * 2);
  context.fill();

  const ghostRy = typeRy < -15 ? typeRy + 6 : typeRy - 6;
  context.beginPath();
  context.moveTo(shoulderDist, shoulderY);
  context.quadraticCurveTo(shoulderDist + 8, (shoulderY + ghostRy) / 2, typeRx + 2, ghostRy);
  context.stroke();
  context.beginPath();
  context.arc(typeRx + 2, ghostRy, 4.5, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // Primary Arms
  context.save();
  context.strokeStyle = layers.color;
  context.fillStyle = layers.color;
  context.lineWidth = 8;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  // Left arm
  context.beginPath();
  context.moveTo(-shoulderDist, shoulderY);
  context.quadraticCurveTo(-shoulderDist - 6, (shoulderY + typeLy) / 2 - 2, typeLx, typeLy);
  context.stroke();
  context.beginPath();
  context.arc(typeLx, typeLy, 5.5, 0, Math.PI * 2);
  context.fill();

  // Right arm
  context.beginPath();
  context.moveTo(shoulderDist, shoulderY);
  context.quadraticCurveTo(shoulderDist + 6, (shoulderY + typeRy) / 2 - 2, typeRx, typeRy);
  context.stroke();
  context.beginPath();
  context.arc(typeRx, typeRy, 5.5, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // 5. Frantic impact sparks & speed lines
  context.save();
  if (typeLy >= -11) {
    // Left hand strike sparks
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(typeLx - 4, -13);
    context.lineTo(typeLx - 7, -18);
    context.moveTo(typeLx, -14);
    context.lineTo(typeLx, -20);
    context.moveTo(typeLx + 4, -13);
    context.lineTo(typeLx + 7, -18);
    context.stroke();
  } else {
    // Upward motion speed lines
    context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    context.lineWidth = 1.2;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(typeLx - 2, typeLy - 7);
    context.lineTo(typeLx - 2, typeLy - 13);
    context.moveTo(typeLx + 2, typeLy - 6);
    context.lineTo(typeLx + 2, typeLy - 11);
    context.stroke();
  }

  if (typeRy >= -11) {
    // Right hand strike sparks
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(typeRx - 4, -13);
    context.lineTo(typeRx - 7, -18);
    context.moveTo(typeRx, -14);
    context.lineTo(typeRx, -20);
    context.moveTo(typeRx + 4, -13);
    context.lineTo(typeRx + 7, -18);
    context.stroke();
  } else {
    // Upward motion speed lines
    context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    context.lineWidth = 1.2;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(typeRx - 2, typeRy - 7);
    context.lineTo(typeRx - 2, typeRy - 13);
    context.moveTo(typeRx + 2, typeRy - 6);
    context.lineTo(typeRx + 2, typeRy - 11);
    context.stroke();
  }

  // Intense exertion sweat droplet flying off
  if (typeLy <= -20 || typeRy <= -20) {
    const sweatX = shoulderDist + 6;
    const sweatY = -56;
    context.fillStyle = '#38bdf8';
    context.beginPath();
    context.arc(sweatX, sweatY, 2.5, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(sweatX - 1.8, sweatY - 0.5);
    context.lineTo(sweatX + 1.8, sweatY - 0.5);
    context.lineTo(sweatX, sweatY - 4.5);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function paintPose(context: CanvasRenderingContext2D, layers: AvatarLayers, pose: FramePose): void {
  context.save();
  // At the 40px jump apex the full 144px SVG viewport still has 1px of top padding.
  context.translate(CELL_WIDTH / 2 + pose.x, 185 - pose.lift);
  context.rotate(pose.tilt);
  context.scale(pose.sx, pose.sy);
  if (pose.wave !== null) {
    context.save();
    context.translate(layers.waveAnchorX, -59);
    context.rotate(pose.wave);
    context.strokeStyle = layers.color;
    context.lineWidth = 10;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(8, -16, 0, -32);
    context.stroke();
    context.restore();
  }
  context.drawImage(layers.body, -72, -144, 144, 144);
  context.save();
  context.translate(pose.faceX, -72 + pose.faceY);
  context.scale(1, pose.faceScaleY);
  context.drawImage(layers.face, -72, -72, 144, 144);
  context.restore();
  if (pose.typeLx !== null && pose.typeLy !== null && pose.typeRx !== null && pose.typeRy !== null) {
    paintTyping(context, layers, pose);
  }
  context.restore();
}

/** Paint one native-size cell. Callers own clearing so atlas cells and previews use the same pixels. */
export function renderPetFrame(context: CanvasRenderingContext2D, layers: AvatarLayers, state: PetState, frame: number): void {
  paintPose(context, layers, getFramePose(state, frame));
}

/** Draw continuously interpolated live motion at the browser refresh rate. */
export function renderPetPreview(context: CanvasRenderingContext2D, layers: AvatarLayers, state: PetState, elapsed: number): void {
  paintPose(context, layers, getPreviewPose(state, elapsed));
}

export async function createPetSheet(icon: string, version: PetVersion = 'v1'): Promise<Blob> {
  const layers = await loadAvatarLayers(icon);
  const canvas = document.createElement('canvas');
  canvas.width = CELL_WIDTH * 8;
  canvas.height = CELL_HEIGHT * (version === 'v2' ? 11 : 9);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser does not support canvas export.');
  PET_STATES.forEach((state, row) => {
    for (let frame = 0; frame < state.frames; frame++) {
      context.save();
      context.translate(frame * CELL_WIDTH, row * CELL_HEIGHT);
      context.beginPath();
      context.rect(0, 0, CELL_WIDTH, CELL_HEIGHT);
      context.clip();
      renderPetFrame(context, layers, state.id, frame);
      context.restore();
    }
  });
  if (version === 'v2') {
    for (let direction = 0; direction < 16; direction++) {
      const angle = direction * Math.PI / 8;
      const pose = getFramePose('idle', 0);
      pose.faceX = Math.sin(angle) * 12;
      pose.faceY = -Math.cos(angle) * 10;
      context.save();
      context.translate((direction % 8) * CELL_WIDTH, (9 + Math.floor(direction / 8)) * CELL_HEIGHT);
      paintPose(context, layers, pose);
      context.restore();
    }
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG export failed. Please try again.')), 'image/png');
  });
  if (blob.size > 20 * 1024 * 1024) throw new Error('The sprite sheet exceeds the 20 MiB ChatGPT limit.');
  return blob;
}

/** Export one complete loop of the selected move using the live interpolated poses. */
export async function createPetGif(icon: string, state: PetState, onProgress?: (percent: number) => void): Promise<Blob> {
  const { createGifEncoder, gifTimeline } = await import('./gif');
  const layers = await loadAvatarLayers(icon);
  const canvas = document.createElement('canvas');
  canvas.width = CELL_WIDTH;
  canvas.height = CELL_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Your browser does not support canvas export.');
  const encoder = createGifEncoder(CELL_WIDTH, CELL_HEIGHT);
  const timeline = gifTimeline(state);
  for (let i = 0; i < timeline.length; i++) {
    context.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
    renderPetPreview(context, layers, state, timeline[i]);
    encoder.addFrame(context.getImageData(0, 0, CELL_WIDTH, CELL_HEIGHT).data);
    onProgress?.(Math.round((i + 1) / timeline.length * 100));
    // Yield between small batches so the preview, spinner and progress stay responsive.
    if (i % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return encoder.finish();
}
