import { loadAvatarLayers, renderPetPreview } from './renderer';
import { CELL_HEIGHT, CELL_WIDTH, PET_STATES, type PetState } from './spec';

const COLUMNS = 8;
const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

/** A script-free SVG containing a lossless PNG atlas, so every preview mode is portable. */
export function buildAnimatedSvg(atlas: string, state: PetState, frames: number, title: string): string {
  const duration = PET_STATES.find(item => item.id === state)!.durations.reduce<number>((sum, ms) => sum + ms, 0);
  const indices = Array.from({ length: frames + 1 }, (_, index) => index % frames);
  const x = indices.map(index => -(index % COLUMNS) * CELL_WIDTH).join(';');
  const y = indices.map(index => -Math.floor(index / COLUMNS) * CELL_HEIGHT).join(';');
  const times = indices.map((_, index) => index / frames).join(';');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" viewBox="0 0 ${CELL_WIDTH} ${CELL_HEIGHT}" overflow="hidden" role="img" aria-labelledby="pet-title">
<title id="pet-title">${escapeXml(title)}</title>
<desc>One looping ${escapeXml(state)} animation. Self-contained PNG frames; no scripts, fonts, or external assets. Embed with an img tag. Captured at ${CELL_WIDTH} × ${CELL_HEIGHT} pixels.</desc>
<style>.still{display:none}@media(prefers-reduced-motion:reduce){.motion{display:none}.still{display:inline}}</style>
<defs><image id="frames" width="${COLUMNS * CELL_WIDTH}" height="${Math.ceil(frames / COLUMNS) * CELL_HEIGHT}" href="${atlas}"/></defs>
<use class="motion" href="#frames"><animate attributeName="x" values="${x}" keyTimes="${times}" dur="${duration}ms" calcMode="discrete" repeatCount="indefinite"/><animate attributeName="y" values="${y}" keyTimes="${times}" dur="${duration}ms" calcMode="discrete" repeatCount="indefinite"/></use>
<use class="still" href="#frames"/>
</svg>`;
}

export function createSvgEncoder(state: PetState, frames: number, title: string) {
  const canvas = document.createElement('canvas');
  canvas.width = COLUMNS * CELL_WIDTH;
  canvas.height = Math.ceil(frames / COLUMNS) * CELL_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser does not support SVG animation export.');
  let index = 0;
  return {
    addFrame(source: CanvasImageSource) {
      context.drawImage(source, (index % COLUMNS) * CELL_WIDTH, Math.floor(index / COLUMNS) * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
      index++;
    },
    finish() {
      if (index !== frames) throw new Error('The animation export is incomplete. Please try again.');
      return new Blob([buildAnimatedSvg(canvas.toDataURL('image/png'), state, frames, title)], { type: 'image/svg+xml' });
    },
  };
}

export async function createPetSvg(icon: string, state: PetState, onProgress?: (percent: number) => void): Promise<Blob> {
  const { gifTimeline } = await import('./gif');
  const layers = await loadAvatarLayers(icon);
  const timeline = gifTimeline(state);
  const encoder = createSvgEncoder(state, timeline.length, `${icon}: ${state}`);
  const canvas = document.createElement('canvas');
  canvas.width = CELL_WIDTH;
  canvas.height = CELL_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser does not support canvas export.');
  for (let i = 0; i < timeline.length; i++) {
    context.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
    renderPetPreview(context, layers, state, timeline[i]);
    encoder.addFrame(canvas);
    onProgress?.(Math.round((i + 1) / timeline.length * 100));
    if (i % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return encoder.finish();
}
