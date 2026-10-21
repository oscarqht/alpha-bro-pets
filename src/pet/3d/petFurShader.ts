import * as THREE from 'three';

/**
 * Detects software WebGL (SwiftShader, llvmpipe, WARP) to scale shell count.
 */
export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

import { createGPUFurSystem } from './petFurSystem';
import { createGPUFurPhysics } from './petFurPhysics';
import { evaluateGroomFlow } from './petFurGroom';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';

export const DEFAULT_SHELL_COUNT = isSoftwareGl ? 32 : 64;
export const DEFAULT_FUR_LENGTH = 0.26;
export const DEFAULT_MESSINESS = 0.14;

export class FurPhysicsTracker {
  public displacement = new THREE.Vector3(0, -0.016, 0);
  private velocity = new THREE.Vector3(0, 0, 0);
  private target = new THREE.Vector3(0, -0.016, 0);

  private prevCamPos = new THREE.Vector3();
  private hasPrevCam = false;

  private stiffness = 125.0;
  private damping = 8.5;
  private mass = 1.0;

  private impulse = new THREE.Vector3();

  public addImpulse(x: number, y: number, z: number) {
    this.impulse.add(new THREE.Vector3(x, y, z));
  }

  public update(delta: number, camera: THREE.Camera): THREE.Vector3 {
    const dt = Math.max(0.001, Math.min(delta, 0.05));

    if (!this.hasPrevCam) {
      this.prevCamPos.copy(camera.position);
      this.hasPrevCam = true;
      return this.displacement;
    }

    const prevDist = Math.max(0.001, this.prevCamPos.length());
    const currDist = Math.max(0.001, camera.position.length());

    const prevAzimuth = Math.atan2(this.prevCamPos.x, this.prevCamPos.z);
    const currAzimuth = Math.atan2(camera.position.x, camera.position.z);
    let deltaAzimuth = currAzimuth - prevAzimuth;
    if (deltaAzimuth > Math.PI) deltaAzimuth -= Math.PI * 2;
    if (deltaAzimuth < -Math.PI) deltaAzimuth += Math.PI * 2;

    const prevPolar = Math.asin(Math.max(-1, Math.min(1, this.prevCamPos.y / prevDist)));
    const currPolar = Math.asin(Math.max(-1, Math.min(1, camera.position.y / currDist)));
    const deltaPolar = currPolar - prevPolar;

    const rotSpeedX = deltaAzimuth / dt;
    const rotSpeedY = deltaPolar / dt;

    const rotInertiaX = -rotSpeedX * 0.048;
    const rotInertiaY = -rotSpeedY * 0.040;
    const rotInertiaZ = -Math.abs(rotSpeedX) * 0.025;

    const gravityY = -0.018;

    this.target.set(rotInertiaX, gravityY + rotInertiaY, rotInertiaZ);
    this.target.add(this.impulse);
    this.target.clampLength(0, 0.22);

    this.impulse.multiplyScalar(Math.exp(-dt * 10.0));

    const springForce = this.target.clone().sub(this.displacement).multiplyScalar(this.stiffness);
    const dampForce = this.velocity.clone().multiplyScalar(-this.damping);
    const accel = springForce.add(dampForce).divideScalar(this.mass);

    this.velocity.addScaledVector(accel, dt);
    this.displacement.addScaledVector(this.velocity, dt);
    this.displacement.clampLength(0, 0.20);

    this.prevCamPos.copy(camera.position);

    return this.displacement;
  }
}


export interface FurShellSystem {
  mesh: THREE.Group;
  physics: FurPhysicsTracker;
  updatePhysics: (delta: number, camera: THREE.Camera, boopOffset?: number, renderer?: THREE.WebGLRenderer) => void;
  setTime: (time: number) => void;
  setDisplacement: (x: number, y: number, z: number) => void;
  setFurLength: (length: number) => void;
  setMessiness: (messiness: number) => void;
  setPointer: (position: THREE.Vector3 | null) => void;
  dispose: () => void;
}

/** Hybrid volumetric undercoat and 60k tapered hairs from 3d-gpu-fur-simulation. */
export function createFurShellSystem(
  sourceGeometry: THREE.BufferGeometry,
  baseColorHex: string,
  options?: { furLength?: number; messiness?: number; faceY?: number },
): FurShellSystem {
  const faceY = options?.faceY ?? 0;
  // Keep all eye/brow/mouth variants readable, with short velvet around the face.
  const mask = (x: number, y: number, z: number) => {
    const d = Math.hypot(x / 0.46, (y - faceY) / 0.46);
    const faceLength = THREE.MathUtils.lerp(0.28, 1, THREE.MathUtils.smoothstep(d, 0.75, 1.45));
    return THREE.MathUtils.lerp(1, faceLength, THREE.MathUtils.smoothstep(z, 0.12, 0.28));
  };
  // ExtrudeGeometry duplicates vertices at every triangle. Weld by position so
  // both fur passes expand continuously across the cap and bevel boundaries.
  const unwelded = sourceGeometry.clone();
  unwelded.deleteAttribute('normal');
  unwelded.deleteAttribute('uv');
  const smooth = mergeVertices(unwelded, 1e-5);
  unwelded.dispose();
  smooth.computeVertexNormals();
  // Caps have only boundary vertices. Add interior samples so shell length and
  // grooming can follow the same smooth facial taper as the individual hairs.
  const tessellated = new TessellateModifier(0.12, 10).modify(smooth);
  smooth.dispose();
  tessellated.normalizeNormals();
  const geometry = mergeVertices(tessellated, 1e-5);
  tessellated.dispose();
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const masks = new Float32Array(positions.count);
  const groom = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    masks[i] = mask(x, y, z);
    groom.set(evaluateGroomFlow(x, y - faceY, z, normals.getX(i), normals.getY(i), normals.getZ(i)), i * 3);
  }
  geometry.setAttribute('aFollicleMask', new THREE.BufferAttribute(masks, 1));
  geometry.setAttribute('aGroomTangent', new THREE.BufferAttribute(groom, 3));
  const tipColor = new THREE.Color(baseColorHex).lerp(new THREE.Color('#fff6e8'), 0.22);
  const fur = createGPUFurSystem(geometry, {
    gpuFurEnabled: false,
    furLength: options?.furLength ?? DEFAULT_FUR_LENGTH,
    furDensity: 0.92, clumping: 0.48,
    curliness: (options?.messiness ?? DEFAULT_MESSINESS) * 3,
    baseColor: baseColorHex, tipColor: `#${tipColor.getHexString()}`,
    // Broad, faint highlights give the fibers a soft matte finish.
    roughness: 0.94, specular: 0.14,
    lightIntensity: 1.65, rimIntensity: 0.40, windStrength: 0.25,
  }, mask, faceY);
  const uniforms = fur.sharedUniforms;
  // Render exports at the same density as the preview, using stateless shader motion.
  fur.setGPUFurEnabled(!isSoftwareGl);
  uniforms.uGpuFurMode.value = 0;
  const mesh = new THREE.Group();
  mesh.name = 'Hybrid GPU Fur';
  mesh.add(fur.shellMesh, fur.strandMesh);
  const physics = new FurPhysicsTracker();
  let gpuPhysics: ReturnType<typeof createGPUFurPhysics> | undefined;
  let pointerActive = false;
  let lastPointerTime = -Infinity;
  const pointerVelocity = new THREE.Vector3();
  const zero = new THREE.Vector3();
  const angularVelocity = new THREE.Vector3();
  let shockwave = 0;

  function updatePhysics(delta: number, camera: THREE.Camera, boopOffset = 0, renderer?: THREE.WebGLRenderer) {
    const dt = Math.min(Math.max(delta, 0.001), 1 / 30);
    if (!gpuPhysics && renderer && !isSoftwareGl) {
      gpuPhysics = createGPUFurPhysics(renderer);
      fur.setGPUFurEnabled(gpuPhysics.isGPGPUActive);
    }
    if (boopOffset !== 0) physics.addImpulse(0, boopOffset * 0.45, 0);
    const displacement = physics.update(dt, camera);
    uniforms.uWebGLInertia.value.copy(displacement).multiplyScalar(4);
    uniforms.uTime.value += dt;
    if (uniforms.uTime.value - lastPointerTime > 0.12) pointerActive = false;
    uniforms.uPointerActive.value = pointerActive ? 1 : 0;
    shockwave *= Math.exp(-dt * 5);
    uniforms.uBoopShockwave.value = shockwave;
    angularVelocity.copy(displacement).multiplyScalar(8);
    if (gpuPhysics?.isGPGPUActive) {
      uniforms.uPhysicsTex.value = gpuPhysics.step({
        time: uniforms.uTime.value, dt, windStrength: uniforms.uWindStrength.value,
        creatureVelocity: zero, creatureAngularVel: angularVelocity,
        pointerLocalPos: uniforms.uPointerLocalPos.value, pointerVelocity,
        pointerActive, boopShockwave: shockwave,
      });
    }
    pointerVelocity.multiplyScalar(Math.exp(-dt * 12));
  }
  function setPointer(position: THREE.Vector3 | null) {
    if (position) {
      if (pointerActive) pointerVelocity.subVectors(position, uniforms.uPointerLocalPos.value).multiplyScalar(30).clampLength(0, 4);
      uniforms.uPointerLocalPos.value.copy(position);
      pointerActive = true;
      lastPointerTime = uniforms.uTime.value;
    } else {
      pointerActive = false;
      pointerVelocity.set(0, 0, 0);
    }
    uniforms.uPointerActive.value = pointerActive ? 1 : 0;
  }
  const addImpulse = physics.addImpulse.bind(physics);
  physics.addImpulse = (x, y, z) => {
    addImpulse(x, y, z);
    shockwave = Math.min(1, shockwave + Math.hypot(x, y, z) * 4);
  };
  return {
    mesh, physics, updatePhysics, setPointer,
    setTime: (time) => { uniforms.uTime.value = time; },
    setDisplacement: (x, y, z) => { uniforms.uWebGLInertia.value.set(x, y, z); },
    setFurLength: (length) => { uniforms.uFurLength.value = THREE.MathUtils.clamp(length, 0.02, 0.4); },
    setMessiness: (value) => { uniforms.uCurliness.value = THREE.MathUtils.clamp(value * 3, 0, 1); },
    dispose: () => { gpuPhysics?.dispose(); fur.dispose(); geometry.dispose(); },
  };
}
