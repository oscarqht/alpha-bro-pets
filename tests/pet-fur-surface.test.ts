import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getShape3D } from '../src/pet/3d/pet3dShapes';
import { createFurShellSystem } from '../src/pet/3d/petFurShader';

for (const shapeId of ['cloud', 'star', 'heart']) {
test(`fur grows continuously across ${shapeId} cap/bevel vertices`, () => {
  const source = new THREE.ExtrudeGeometry(getShape3D(shapeId).shape, {
    depth: 0.38, bevelEnabled: true, bevelSegments: 8, steps: 1,
    bevelSize: 0.11, bevelThickness: 0.11, curveSegments: 28,
  });
  source.center();
  const originalNormals = Array.from(source.getAttribute('normal').array);
  const fur = createFurShellSystem(source, '#C4B5FD');
  try {
    const shell = fur.mesh.children[0] as THREE.Mesh;
    const positions = shell.geometry.getAttribute('position');
    const normals = shell.geometry.getAttribute('normal');
    let faceInterior = 0;
    const byPosition = new Map<string, THREE.Vector3>();
    for (let i = 0; i < positions.count; i++) {
      if (positions.getZ(i) > 0.29 && Math.hypot(positions.getX(i), positions.getY(i)) < 0.2) faceInterior++;
      const key = [positions.getX(i), positions.getY(i), positions.getZ(i)].map(v => v.toFixed(5)).join(',');
      const normal = new THREE.Vector3().fromBufferAttribute(normals, i);
      assert.ok(Number.isFinite(normal.length()) && Math.abs(normal.length() - 1) < 1e-5);
      const previous = byPosition.get(key);
      if (previous) assert.ok(previous.distanceTo(normal) < 1e-4, `fur direction jumps at ${key}`);
      else byPosition.set(key, normal);
    }
    assert.ok(faceInterior > 0, 'the shell must sample the face interior so its coat tapers continuously');
    const strands = fur.mesh.children[1] as THREE.Mesh;
    const offsets = strands.geometry.getAttribute('aClumpOffset');
    for (let i = 0; i < offsets.count; i++) {
      assert.ok(Math.hypot(offsets.getX(i), offsets.getY(i), offsets.getZ(i)) < 0.35,
        'tufts must attract nearby hairs, rather than pulling rows across the body');
    }
    assert.deepEqual(Array.from(source.getAttribute('normal').array), originalNormals, 'smoothing fur must preserve the body material geometry');
  } finally {
    fur.dispose();
    source.dispose();
  }
});
}
