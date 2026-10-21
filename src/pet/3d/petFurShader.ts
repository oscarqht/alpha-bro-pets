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

// 42 shells on GPU gives ultra-rich, continuous soft plushie fur with zero lag in 1 draw call.
// 24 shells on software WebGL ensures fast execution without compromise.
export const DEFAULT_SHELL_COUNT = isSoftwareGl ? 24 : 42;

// Default fur length: thick, plush, and long
export const DEFAULT_FUR_LENGTH = 0.24;

// Default messiness: organic chaotic tangle for authentic plush doll look
export const DEFAULT_MESSINESS = 0.18;

let cachedFurTexture: THREE.CanvasTexture | null = null;

/**
 * Generates an organic, non-grid, continuous fleece & tangled micro-fiber texture.
 * Completely eliminates any repeating grid, lattice, or fish-scale shingle patterns.
 * Red channel: Tangled fiber density (chaotic soft tufts).
 * Green channel: Subtle fiber depth & shading.
 * Blue channel: Organic strand length variation for fuzzy stray hairs.
 */
export function getOrCreateFurTexture(): THREE.CanvasTexture {
  if (cachedFurTexture) return cachedFurTexture;

  const size = 256;

  // In Node.js testing / SSR environments where document is not defined
  if (typeof document === 'undefined') {
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 220;
      data[i + 1] = 128;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
    const dt = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    dt.wrapS = THREE.RepeatWrapping;
    dt.wrapT = THREE.RepeatWrapping;
    dt.needsUpdate = true;
    cachedFurTexture = dt as unknown as THREE.CanvasTexture;
    return cachedFurTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const data = new Uint8Array(size * size * 4);
    data.fill(220);
    const dt = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    dt.needsUpdate = true;
    return dt as unknown as THREE.CanvasTexture;
  }

  // 1. Generate randomly scattered irregular fiber points (Zero Grid Alignment)
  // Using golden ratio sequence and chaotic random walk so there are NO grid rows or columns
  const fiberCount = 420;
  interface FiberSeed {
    x: number;
    y: number;
    radius: number;
    swirl: number;
    tint: number;
    length: number;
  }
  const seeds: FiberSeed[] = [];

  // Deterministic high-entropy pseudorandom generator
  let seed = 1337;
  function rnd() {
    seed = (seed * 16807 + 7) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < fiberCount; i++) {
    // Pure irregular distribution with toroidal wrapping
    const x = rnd() * size;
    const y = rnd() * size;
    seeds.push({
      x,
      y,
      radius: 4.5 + rnd() * 6.5,
      swirl: (rnd() - 0.5) * 2.5,
      tint: 0.35 + rnd() * 0.65,
      length: 0.70 + rnd() * 0.60,
    });
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Spatial bucket grid for fast neighbor lookup
  const bucketSize = 24;
  const bucketCount = Math.ceil(size / bucketSize);
  const buckets: FiberSeed[][][] = Array.from({ length: bucketCount }, () =>
    Array.from({ length: bucketCount }, () => [])
  );

  for (const s of seeds) {
    const bx = Math.floor(s.x / bucketSize) % bucketCount;
    const by = Math.floor(s.y / bucketSize) % bucketCount;
    buckets[by][bx].push(s);
  }

  for (let py = 0; py < size; py++) {
    const by = Math.floor(py / bucketSize);
    for (let px = 0; px < size; px++) {
      const bx = Math.floor(px / bucketSize);

      let maxVal = 0;
      let bestTint = 0.5;
      let bestLength = 1.0;

      // Check 3x3 neighboring buckets with toroidal wrapping
      for (let dy = -1; dy <= 1; dy++) {
        const ny = (by + dy + bucketCount) % bucketCount;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = (bx + dx + bucketCount) % bucketCount;
          const bucket = buckets[ny][nx];

          for (let k = 0; k < bucket.length; k++) {
            const s = bucket[k];
            let distSq = 0;

            let ox = Math.abs(px - s.x);
            if (ox > size * 0.5) ox = size - ox;
            let oy = Math.abs(py - s.y);
            if (oy > size * 0.5) oy = size - oy;

            // Curved ribbon distance for curly plushie strands
            const angle = Math.atan2(oy, ox);
            const curlMod = 1.0 + 0.3 * Math.sin(angle * 2.0 + s.swirl);
            distSq = (ox * ox + oy * oy) * curlMod;

            const radSq = s.radius * s.radius;
            if (distSq < radSq) {
              const val = 1.0 - Math.sqrt(distSq) / s.radius;
              if (val > maxVal) {
                maxVal = val;
                bestTint = s.tint;
                bestLength = s.length;
              }
            }
          }
        }
      }

      // Add high-frequency fractal fleece micro-grain
      const grain = (rnd() - 0.5) * 0.12;
      const finalDensity = Math.max(0, Math.min(1, maxVal + grain));

      const idx = (py * size + px) * 4;
      data[idx] = Math.floor(finalDensity * 255);
      data[idx + 1] = Math.floor(bestTint * 255);
      data[idx + 2] = Math.floor(((bestLength - 0.6) / 0.8) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  cachedFurTexture = texture;
  return texture;
}

/**
 * Tracks camera rotation and view movement to drive reactive fur physics.
 * Simulates soft plush inertia with spring-damper equations so long messy plush fur
 * bends and sways dynamically when rotating the view, then bounces gently back.
 */
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

const FUR_VERTEX_SHADER = /* glsl */ `
  attribute float aShellHeight; // 0.0 at skin, 1.0 at outer tips

  uniform float uFurLength;
  uniform float uMessiness;
  uniform vec3 uFurDisplacement;
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;
  varying vec3 vLocalNormal;
  varying float vShellHeight;
  varying vec3 vViewDir;

  // Aperiodic non-grid 3D hash vector function
  vec3 hash33(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
  }

  // Authentic plush doll chaotic fur curl and tangling (ZERO grid / checkerboard patterns)
  vec3 getPlushieMessiness(vec3 p, vec3 norm, float h) {
    // Non-rational coordinate rotation frames to ensure zero planar alignment
    const mat3 rot1 = mat3(
       0.54, -0.68,  0.49,
       0.81,  0.57, -0.10,
      -0.21,  0.46,  0.86
    );
    const mat3 rot2 = mat3(
      -0.42,  0.89,  0.18,
      -0.62, -0.14, -0.77,
      -0.66, -0.43,  0.61
    );

    vec3 p1 = rot1 * (p * 8.5 + vec3(1.7, 4.2, 8.9));
    vec3 p2 = rot2 * (p * 18.2 + vec3(9.1, 2.3, 5.8));
    vec3 p3 = rot1 * (p * 34.0 + vec3(3.4, 7.8, 1.2));

    // Continuous chaotic vector field
    vec3 w1 = vec3(
      sin(p1.y * 1.3) + cos(p1.z * 1.1),
      sin(p1.z * 1.2) + cos(p1.x * 1.3),
      sin(p1.x * 1.1) + cos(p1.y * 1.2)
    );
    vec3 w2 = vec3(
      cos(p2.y * 1.4) - sin(p2.z * 1.2),
      cos(p2.z * 1.3) - sin(p2.x * 1.4),
      cos(p2.x * 1.2) - sin(p2.y * 1.3)
    );
    vec3 w3 = vec3(
      sin(p3.z * 1.6),
      cos(p3.x * 1.6),
      sin(p3.y * 1.6)
    );

    vec3 chaoticDir = w1 * 0.52 + w2 * 0.34 + w3 * 0.14;

    // Project tangentially along the surface so strands lie down and mat together like wool fleece
    vec3 tangentCurl = chaoticDir - norm * (dot(chaoticDir, norm) * 0.42);

    // Tangled swirl along the surface
    vec3 swirl = cross(norm, chaoticDir) * 0.38;

    // High-frequency per-strand fuzz
    float randJitter = fract(sin(dot(p.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453) - 0.5;
    vec3 strayFuzz = cross(norm, vec3(0.0, 1.0, 0.0)) * (randJitter * 0.45);

    return (tangentCurl + swirl + strayFuzz) * pow(h, 1.35);
  }

  void main() {
    vShellHeight = aShellHeight;
    float h = aShellHeight;

    vec3 norm = normalize(normal);
    vLocalNormal = norm;

    // Per-strand natural length variation (fuzzy plush doll silhouette)
    float lengthJitter = 0.80 + 0.40 * fract(sin(dot(position.xyz * 14.0, vec3(27.168, 51.923, 83.419))) * 43758.5453);
    float activeLength = uFurLength * lengthJitter;

    // Soft eye socket clearance on the front face so plush button eyes stay clean
    if (position.z > 0.08 && abs(position.x) < 0.36 && abs(position.y) < 0.28) {
      float distToEyeCenter = min(
        length(position.xy - vec2(-0.16, -0.02)),
        length(position.xy - vec2(0.16, -0.02))
      );
      if (distToEyeCenter < 0.22) {
        float eyeClearance = smoothstep(0.08, 0.22, distToEyeCenter);
        activeLength *= mix(0.50, 1.0, eyeClearance);
      }
    }

    // 1. Primary shell expansion
    vec3 displacedPos = position + norm * (h * activeLength);

    // 2. Chaotic plush doll curl and tangling (No regular grid pattern)
    vec3 curl = getPlushieMessiness(position, norm, h) * (uMessiness * activeLength);
    displacedPos += curl;

    // 3. Dynamic reaction to view rotation & movement:
    // Quadratic (h^2) so roots stay anchored, outer shaggy fur swooshes and lags
    vec3 dynamicReaction = uFurDisplacement * (h * h);

    // 4. Subtle living breathing wind wave across fur body
    float breathWave = sin(uTime * 2.8 + position.y * 3.8 + position.x * 3.2) * 0.009 * (h * h);
    dynamicReaction += norm * breathWave;

    displacedPos += dynamicReaction;
    vLocalPos = displacedPos;

    // World-space transformation
    vec4 worldPos4 = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPos = worldPos4.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * norm);
    vViewDir = normalize(cameraPosition - vWorldPos);

    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`;

const FUR_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uFurTexture;
  uniform float uFurDensity;
  uniform vec3 uBaseColor;
  uniform float uFurLength;
  uniform vec3 uKeyLightDir;
  uniform vec3 uKeyLightColor;
  uniform vec3 uFillLightDir;
  uniform vec3 uFillLightColor;
  uniform vec3 uRimLightDir;
  uniform vec3 uRimLightColor;
  uniform vec3 uAmbientColor;
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;
  varying vec3 vLocalNormal;
  varying float vShellHeight;
  varying vec3 vViewDir;

  void main() {
    float h = vShellHeight;

    // Triplanar mapping with organic non-grid projection
    vec3 blending = abs(normalize(vLocalNormal));
    blending = pow(blending, vec3(2.8));
    blending /= (blending.x + blending.y + blending.z);

    vec2 uvX = vLocalPos.yz * uFurDensity;
    vec2 uvY = vLocalPos.xz * uFurDensity;
    vec2 uvZ = vLocalPos.xy * uFurDensity;

    vec4 colX = texture2D(uFurTexture, uvX);
    vec4 colY = texture2D(uFurTexture, uvY);
    vec4 colZ = texture2D(uFurTexture, uvZ);

    vec4 strand = colX * blending.x + colY * blending.y + colZ * blending.z;

    // Root shell (h == 0.0) is solid base skin; higher shells discard non-strand pixels
    if (h > 0.003) {
      float strandVal = strand.r;
      float lengthMod = (strand.b - 0.5) * 0.46;
      
      // Smooth plushie tapering: soft clusters with wispy messy fiber tips
      float threshold = pow(h, 1.18) * (1.12 - lengthMod);
      if (strandVal < threshold) {
        discard;
      }
    }

    // --- LIGHTING & PLUSH SOFTNESS ---
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);

    // Deep ambient occlusion in the valleys between messy wool fibers
    float ao = mix(0.24, 1.0, pow(h, 0.60));
    ao *= (0.82 + 0.18 * strand.g);

    // Wrap diffuse lighting: simulates soft light diffusion through plush fibers
    vec3 keyDir = normalize(uKeyLightDir);
    float wrapKey = max(0.0, (dot(N, keyDir) + 0.40) / 1.40);

    vec3 fillDir = normalize(uFillLightDir);
    float diffFill = max(0.0, dot(N, fillDir));

    vec3 rimDir = normalize(uRimLightDir);
    float diffRim = max(0.0, dot(N, rimDir));

    vec3 lighting = uAmbientColor * 0.70;
    lighting += uKeyLightColor * (wrapKey * 1.45 + 0.12);
    lighting += uFillLightColor * (diffFill * 0.65);
    lighting += uRimLightColor * (diffRim * 0.50);
    lighting *= ao;

    // Dual-tone fur color: Richer / deeper roots, soft vibrant pastel highlighted tips
    vec3 rootColor = uBaseColor * 0.68;
    vec3 tipColor = mix(uBaseColor, vec3(1.0, 0.98, 0.92), 0.36);
    vec3 furColor = mix(rootColor, tipColor, pow(h, 0.82));

    // Subtle individual fiber variation
    furColor *= (0.86 + 0.28 * strand.g);

    // Velvet / Peach Fuzz Rim Sheen on outer tips
    float fresnel = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 2.2);
    vec3 rimSheen = vec3(1.0, 0.98, 0.92) * fresnel * 0.65 * pow(h, 0.48);

    vec3 finalColor = furColor * lighting + rimSheen;

    // Soft tip fade on the outermost shells for feathery edges
    float alpha = 1.0;
    if (h > 0.88) {
      alpha = mix(1.0, 0.68, (h - 0.88) / 0.12);
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export interface FurShellSystem {
  mesh: THREE.InstancedMesh;
  physics: FurPhysicsTracker;
  updatePhysics: (delta: number, camera: THREE.Camera, boopOffset?: number) => void;
  setTime: (time: number) => void;
  setDisplacement: (x: number, y: number, z: number) => void;
  setFurLength: (length: number) => void;
  setMessiness: (messiness: number) => void;
  dispose: () => void;
}

/**
 * Creates an instanced shell fur system on the pet body geometry.
 * All shells are rendered in a SINGLE hardware instanced draw call!
 */
export function createFurShellSystem(
  sourceGeometry: THREE.BufferGeometry,
  baseColorHex: string,
  options?: {
    shellCount?: number;
    furLength?: number;
    furDensity?: number;
    messiness?: number;
  }
): FurShellSystem {
  const shellCount = options?.shellCount ?? DEFAULT_SHELL_COUNT;
  const furLength = options?.furLength ?? DEFAULT_FUR_LENGTH;
  const furDensity = options?.furDensity ?? 4.4;
  const messiness = options?.messiness ?? DEFAULT_MESSINESS;

  const furGeometry = sourceGeometry.clone();

  // Create an instanced float attribute for shell height (0.0 at skin, 1.0 at tip)
  const shellHeights = new Float32Array(shellCount);
  for (let i = 0; i < shellCount; i++) {
    shellHeights[i] = i / Math.max(1, shellCount - 1);
  }
  furGeometry.setAttribute('aShellHeight', new THREE.InstancedBufferAttribute(shellHeights, 1));

  const furTexture = getOrCreateFurTexture();
  const baseColor = new THREE.Color(baseColorHex);

  const uniforms = {
    uFurTexture: { value: furTexture },
    uFurDensity: { value: furDensity },
    uBaseColor: { value: baseColor },
    uFurLength: { value: furLength },
    uMessiness: { value: messiness },
    uFurDisplacement: { value: new THREE.Vector3(0, -0.016, 0) },
    uTime: { value: 0 },
    uKeyLightDir: { value: new THREE.Vector3(4, 6, 5) },
    uKeyLightColor: { value: new THREE.Color('#ffffff') },
    uFillLightDir: { value: new THREE.Vector3(-4, 3, 3) },
    uFillLightColor: { value: new THREE.Color('#dbeafe') },
    uRimLightDir: { value: new THREE.Vector3(0, 4, -4) },
    uRimLightColor: { value: new THREE.Color('#fef3c7') },
    uAmbientColor: { value: new THREE.Color('#f0f2ea') },
  };

  const furMaterial = new THREE.ShaderMaterial({
    vertexShader: FUR_VERTEX_SHADER,
    fragmentShader: FUR_FRAGMENT_SHADER,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
  });

  const mesh = new THREE.InstancedMesh(furGeometry, furMaterial, shellCount);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Initialize identity matrices for all shell instances
  const identityMat = new THREE.Matrix4();
  for (let i = 0; i < shellCount; i++) {
    mesh.setMatrixAt(i, identityMat);
  }
  mesh.instanceMatrix.needsUpdate = true;

  const physics = new FurPhysicsTracker();

  function updatePhysics(delta: number, camera: THREE.Camera, boopOffset: number = 0) {
    if (boopOffset !== 0) {
      physics.addImpulse(0, boopOffset * 0.45, 0);
    }
    const disp = physics.update(delta, camera);
    uniforms.uFurDisplacement.value.copy(disp);
    uniforms.uTime.value += delta;
  }

  function setTime(time: number) {
    uniforms.uTime.value = time;
  }

  function setDisplacement(x: number, y: number, z: number) {
    uniforms.uFurDisplacement.value.set(x, y, z);
  }

  function setFurLength(length: number) {
    uniforms.uFurLength.value = length;
  }

  function setMessiness(m: number) {
    uniforms.uMessiness.value = m;
  }

  function dispose() {
    furGeometry.dispose();
    furMaterial.dispose();
  }

  return {
    mesh,
    physics,
    updatePhysics,
    setTime,
    setDisplacement,
    setFurLength,
    setMessiness,
    dispose,
  };
}
