import * as THREE from 'three';
import type { Shape3DData } from './pet3dShapes';

/** Inflate the selected outline into a closed, sphere-like volume. Latitude
 * rings shrink towards two curved poles, rather than ending in flat caps.
 * A circle becomes a ball; clouds, hearts and stars keep their equatorial shape.
 */
export function createPetGlassGeometry(shape: Shape3DData) {
  const segments = 256;
  const latitudes = 64;
  const contour = shape.shape.getPoints();
  const depth = Math.min(shape.width, shape.height) * 0.5;
  const radii = new Float64Array(segments);
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * Math.PI * 2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let radius = Infinity;
    // Ray/segment intersections preserve concave outlines as well as round ones.
    // All catalog silhouettes contain the origin and are radial about it.
    for (let j = 0; j < contour.length; j++) {
      const a = contour[j], b = contour[(j + 1) % contour.length];
      const ex = b.x - a.x, ey = b.y - a.y;
      const cross = dx * ey - dy * ex;
      if (Math.abs(cross) < 1e-10) continue;
      const t = (a.x * ey - a.y * ex) / cross;
      const u = (a.x * dy - a.y * dx) / cross;
      if (t > 0 && u >= -1e-8 && u <= 1 + 1e-8) radius = Math.min(radius, t);
    }
    if (!Number.isFinite(radius)) throw new Error('Pet outline cannot be inflated.');
    radii[i] = radius;
  }
  // Fade lobes into a smooth circular core near each pole. Scaling the entire
  // outline uniformly would pinch all the cloud/star lobes into its forehead.
  const coreRadius = Math.min(...radii);

  const positions: number[] = [0, 0, -depth];
  const indices: number[] = [];
  for (let ring = 1; ring < latitudes; ring++) {
    const latitude = -Math.PI / 2 + ring / latitudes * Math.PI;
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const ringScale = Math.cos(latitude);
      const radius = ringScale * (coreRadius + (radii[i] - coreRadius) * ringScale * ringScale);
      positions.push(radius * Math.cos(angle), radius * Math.sin(angle), depth * Math.sin(latitude));
    }
  }
  const frontPole = positions.length / 3;
  positions.push(0, 0, depth);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, 1 + next, 1 + i);
    for (let ring = 0; ring < latitudes - 2; ring++) {
      const a = 1 + ring * segments + i;
      const b = 1 + ring * segments + next;
      indices.push(a, b, a + segments, b, b + segments, a + segments);
    }
    const last = 1 + (latitudes - 2) * segments;
    indices.push(last + i, last + next, frontPole);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // The same surface function places the eyes, brows and sweat on the new body.
  function frontZ(x: number, y: number) {
    const angle = ((Math.atan2(y, x) / (2 * Math.PI)) % 1 + 1) % 1 * segments;
    const i = Math.floor(angle);
    const radius = THREE.MathUtils.lerp(radii[i], radii[(i + 1) % segments], angle - i);
    const distance = Math.hypot(x, y);
    // Invert the monotone ring-radius function to locate this point's latitude.
    let low = 0, high = 1;
    for (let step = 0; step < 20; step++) {
      const s = (low + high) * 0.5;
      if (s * (coreRadius + (radius - coreRadius) * s * s) < distance) low = s;
      else high = s;
    }
    const s = (low + high) * 0.5;
    return distance >= radius ? 0 : depth * Math.sqrt(Math.max(0, 1 - s * s));
  }
  return { geometry, depth, frontZ };
}
