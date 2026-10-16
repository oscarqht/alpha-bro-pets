import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectIcon } from '../components/ProjectIcon';
import { getProjectIcon } from '../utils/projectIcons';
import { CELL_HEIGHT, CELL_WIDTH, PET_STATES, getFramePose, getPreviewPose, type FramePose, type PetState, type PetVersion } from './spec';

interface AvatarLayers {
  body: HTMLImageElement;
  face: HTMLImageElement;
  color: string;
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
    const document = new DOMParser().parseFromString(fullMarkup, 'image/svg+xml');
    const svg = document.documentElement;
    // Raft's last root group contains its original eyes and brows. Keep those exact vectors.
    const face = Array.from(svg.children).reverse().find((child) => child.tagName === 'g');
    for (const child of Array.from(svg.children)) {
      if (child !== face) child.remove();
    }
    const faceMarkup = new XMLSerializer().serializeToString(svg);
    const [bodyImage, faceImage] = await Promise.all([loadSvg(bodyMarkup), loadSvg(faceMarkup)]);
    return { body: bodyImage, face: faceImage, color: getProjectIcon(icon).color };
  })();
  imageCache.set(icon, promise);
  // A failed image must be retryable. Limit retained variants during long editing sessions.
  void promise.catch(() => imageCache.delete(icon));
  if (imageCache.size > 24) imageCache.delete(imageCache.keys().next().value!);
  return promise;
}

function paintPose(context: CanvasRenderingContext2D, layers: AvatarLayers, pose: FramePose): void {
  context.save();
  // At the 40px jump apex the full 144px SVG viewport still has 1px of top padding.
  context.translate(CELL_WIDTH / 2 + pose.x, 185 - pose.lift);
  context.rotate(pose.tilt);
  context.scale(pose.sx, pose.sy);
  if (pose.wave !== null) {
    // A matching-color attached arm gives the original geometric avatar a readable greeting.
    // Start behind the body center so slender or tapered shapes never leave a floating arm.
    context.strokeStyle = layers.color;
    context.lineWidth = 12;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(0, -59);
    context.lineTo(41, -59);
    context.stroke();
    context.save();
    context.translate(41, -59);
    context.rotate(pose.wave);
    context.strokeStyle = layers.color;
    context.lineWidth = 12;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-3, 3);
    context.quadraticCurveTo(19, 3, 28, -19);
    context.stroke();
    context.restore();
  }
  context.drawImage(layers.body, -72, -144, 144, 144);
  context.save();
  context.translate(pose.faceX, -72 + pose.faceY);
  context.scale(1, pose.faceScaleY);
  context.drawImage(layers.face, -72, -72, 144, 144);
  context.restore();
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
