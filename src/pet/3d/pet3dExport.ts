import * as THREE from 'three';
import { createSvgEncoder } from '../svg';
import { createApngEncoder } from '../apng';
import { getProjectIcon } from '../../utils/projectIcons';
import { CELL_HEIGHT, CELL_WIDTH, PET_STATES, getFramePose, getPreviewPose, type PetState, type PetVersion } from '../spec';
import { buildPet3D } from './pet3dBuilder';
import { createPetGlassEnvironment } from './petGlass';

export interface CameraPOV {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  target: [number, number, number];
  fov: number;
  zoom: number;
}

export const DEFAULT_POV: CameraPOV = {
  position: [0, 0.25, 4.6],
  quaternion: [0, 0, 0, 1],
  target: [0, 0, 0],
  fov: 38,
  zoom: 1,
};

interface FurSettings { furLength: number; messiness: number }

function setupExportScene(icon: string, pov: CameraPOV, furry: boolean = false, furSettings?: FurSettings, glass = false) {
  const avatar = getProjectIcon(icon);
  const scene = new THREE.Scene();

  // Studio Lighting Setup (matched with 3D preview)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8fa382, 0.55);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
  dirLight.position.set(4, 6, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 512;
  dirLight.shadow.mapSize.height = 512;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.65);
  fillLight.position.set(-4, 3, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xfef3c7, 0.8);
  rimLight.position.set(0, 4, -4);
  scene.add(rimLight);

  // Exclude the stage platform completely from the export.
  // Only the 3D pet character is added.
  const pet = buildPet3D(avatar, { furry, glass });
  scene.add(pet.root);
  if (furSettings) {
    pet.setFurLength?.(furSettings.furLength);
    pet.setMessiness?.(furSettings.messiness);
  }

  // Setup camera at the exact user POV with cell aspect ratio
  const camera = new THREE.PerspectiveCamera(pov.fov, CELL_WIDTH / CELL_HEIGHT, 0.1, 50);
  camera.position.set(pov.position[0], pov.position[1], pov.position[2]);
  camera.quaternion.set(pov.quaternion[0], pov.quaternion[1], pov.quaternion[2], pov.quaternion[3]);
  camera.zoom = pov.zoom;
  camera.updateProjectionMatrix();

  return { scene, camera, pet };
}

/**
 * Exports all animations of the 3D pet rendered from the current POV
 * onto a transparent PNG sprite sheet (1536 × 1872 for v1) ready for ChatGPT.
 * The ground platform is excluded.
 */
export async function createPetSheet3D(
  icon: string,
  pov: CameraPOV,
  version: PetVersion = 'v1',
  onProgress?: (percent: number) => void,
  furry: boolean = false,
  furSettings?: FurSettings,
  glass: boolean = false,
): Promise<Blob> {
  const rows = version === 'v2' ? 11 : 9;
  const cols = 8;
  const sheetWidth = CELL_WIDTH * cols;
  const sheetHeight = CELL_HEIGHT * rows;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser does not support canvas export.');

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  if (furry || glass) renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setSize(CELL_WIDTH, CELL_HEIGHT, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0); // Transparent background
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const { scene, camera, pet } = setupExportScene(icon, pov, furry, furSettings, glass);
  const environment = glass ? createPetGlassEnvironment(renderer) : null;
  if (environment) scene.environment = environment.texture;

  try {
    let totalFrames = 0;
    PET_STATES.forEach((s) => {
      totalFrames += s.frames;
    });
    if (version === 'v2') totalFrames += 16;
    let completedFrames = 0;

    for (let row = 0; row < PET_STATES.length; row++) {
      const stateDef = PET_STATES[row];
      for (let frame = 0; frame < stateDef.frames; frame++) {
        const pose = getFramePose(stateDef.id, frame);
        pet.applyPose(pose);
        pet.setFurTime?.(frame / 12);

        renderer.clear();
        renderer.render(scene, camera);

        context.drawImage(renderer.domElement, frame * CELL_WIDTH, row * CELL_HEIGHT);
        completedFrames++;
        onProgress?.(Math.round((completedFrames / totalFrames) * 100));

        if (completedFrames % 4 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    if (version === 'v2') {
      for (let direction = 0; direction < 16; direction++) {
        const angle = (direction * Math.PI) / 8;
        const pose = getFramePose('idle', 0);
        pose.faceX = Math.sin(angle) * 12;
        pose.faceY = -Math.cos(angle) * 10;
        pet.applyPose(pose);
        pet.setFurTime?.(0);

        renderer.clear();
        renderer.render(scene, camera);

        const col = direction % 8;
        const r = 9 + Math.floor(direction / 8);
        context.drawImage(renderer.domElement, col * CELL_WIDTH, r * CELL_HEIGHT);
        completedFrames++;
        onProgress?.(Math.round((completedFrames / totalFrames) * 100));

        if (completedFrames % 4 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('PNG export failed. Please try again.'))),
        'image/png'
      );
    });

    if (blob.size > 20 * 1024 * 1024) {
      throw new Error('The sprite sheet exceeds the 20 MiB ChatGPT limit.');
    }
    return blob;
  } finally {
    pet.dispose();
    environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }
}

/**
 * Capture one complete loop of the selected 3D move for a transparent GIF, SVG, or APNG.
 * The ground platform is excluded.
 */
async function createPetAnimation3D(
  icon: string,
  state: PetState,
  pov: CameraPOV,
  onProgress?: (percent: number) => void,
  furry: boolean = false,
  furSettings?: FurSettings,
  glass: boolean = false,
  format: 'gif' | 'svg' | 'apng' = 'gif',
): Promise<Blob> {
  const { createGifEncoder, gifTimeline } = await import('../gif');

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  if (furry || glass) renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setSize(CELL_WIDTH, CELL_HEIGHT, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0); // Transparent background
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const helperCanvas = document.createElement('canvas');
  helperCanvas.width = CELL_WIDTH;
  helperCanvas.height = CELL_HEIGHT;
  const helperCtx = helperCanvas.getContext('2d', { willReadFrequently: true });
  if (!helperCtx) throw new Error('Your browser does not support canvas export.');

  const { scene, camera, pet } = setupExportScene(icon, pov, furry, furSettings, glass);
  const environment = glass ? createPetGlassEnvironment(renderer) : null;
  if (environment) scene.environment = environment.texture;
  const timeline = gifTimeline(state);
  const gifEncoder = format === 'gif' ? createGifEncoder(CELL_WIDTH, CELL_HEIGHT) : null;
  const svgEncoder = format === 'svg' ? createSvgEncoder(state, timeline.length, `${icon}: ${state}`) : null;

  const apngEncoder = format === 'apng' ? createApngEncoder(CELL_WIDTH, CELL_HEIGHT, timeline.length) : null;

  try {
    for (let i = 0; i < timeline.length; i++) {
      const pose = getPreviewPose(state, timeline[i]);
      pet.applyPose(pose);
      if (furry && pet.setFurTime) {
        pet.setFurTime(timeline[i] / 1000);
      }

      renderer.clear();
      renderer.render(scene, camera);

      helperCtx.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
      helperCtx.drawImage(renderer.domElement, 0, 0);
      if (svgEncoder) svgEncoder.addFrame(helperCanvas);
      else if (apngEncoder) await apngEncoder.addFrame(helperCtx.getImageData(0, 0, CELL_WIDTH, CELL_HEIGHT).data);
      else gifEncoder!.addFrame(helperCtx.getImageData(0, 0, CELL_WIDTH, CELL_HEIGHT).data);

      onProgress?.(Math.round(((i + 1) / timeline.length) * 100));

      if (i % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    return svgEncoder ? svgEncoder.finish() : apngEncoder ? apngEncoder.finish() : gifEncoder!.finish();
  } finally {
    pet.dispose();
    environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }
}

export function createPetGif3D(icon: string, state: PetState, pov: CameraPOV, onProgress?: (percent: number) => void, furry = false, furSettings?: FurSettings, glass = false): Promise<Blob> {
  return createPetAnimation3D(icon, state, pov, onProgress, furry, furSettings, glass, 'gif');
}

/** Capture the selected mode, camera, fur settings and action in a portable animated SVG. */
export function createPetSvg3D(icon: string, state: PetState, pov: CameraPOV, onProgress?: (percent: number) => void, furry = false, furSettings?: FurSettings, glass = false): Promise<Blob> {
  return createPetAnimation3D(icon, state, pov, onProgress, furry, furSettings, glass, 'svg');
}

/** Capture the selected look and camera with lossless, full-alpha animation. */
export function createPetApng3D(icon: string, state: PetState, pov: CameraPOV, onProgress?: (percent: number) => void, furry = false, furSettings?: FurSettings, glass = false): Promise<Blob> {
  return createPetAnimation3D(icon, state, pov, onProgress, furry, furSettings, glass, 'apng');
}
