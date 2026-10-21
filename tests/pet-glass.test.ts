import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildPet3D } from '../src/pet/3d/pet3dBuilder';
import { createPetGlassMaterial } from '../src/pet/3d/petGlass';
import { createPetGlassGeometry } from '../src/pet/3d/petGlassGeometry';
import { getShape3D } from '../src/pet/3d/pet3dShapes';
import { formatProjectIconId, getProjectIcon, PROJECT_AVATAR_SHAPES } from '../src/utils/projectIcons';
import { getFramePose, PET_STATES } from '../src/pet/spec';

test('glass retains every pet silhouette and animation, including transparent colored limbs', () => {
  for (const shape of PROJECT_AVATAR_SHAPES) {
    const avatar = getProjectIcon(formatProjectIconId({
      shapeId: shape.id, expressionId: 'toon-flat', color: '#8844EE',
    }));
    const glass = buildPet3D(avatar, { glass: true });
    const solid = buildPet3D(avatar);
    const body = glass.petRoot.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
    const solidBody = solid.petRoot.children[0] as THREE.Mesh;
    body.geometry.computeBoundingBox();
    solidBody.geometry.computeBoundingBox();
    const bounds = body.geometry.boundingBox!;
    assert.ok(bounds.max.z - bounds.min.z > 0.9, `${shape.id} must be inflated, not a thin extrusion`);
    assert.ok(solidBody.geometry instanceof THREE.ExtrudeGeometry, 'Regular 3D geometry stays unchanged');
    assert.ok(Math.abs(solidBody.geometry.boundingBox!.max.z - 0.3) < 1e-5);
    assert.ok(body.material.transmission > 0.9);
    assert.ok(body.material.dispersion > 0);
    assert.equal(body.material.attenuationColor.getHexString(), '8844ee');
    assert.equal(glass.isFurry, false);
    for (const state of PET_STATES) {
      for (let frame = 0; frame < state.frames; frame++) {
        const pose = getFramePose(state.id, frame);
        glass.applyPose(pose);
        solid.applyPose(pose);
        assert.deepEqual(glass.petRoot.position, solid.petRoot.position);
        assert.deepEqual(glass.petRoot.scale, solid.petRoot.scale);
      }
    }
    glass.dispose();
    solid.dispose();
  }
});

test('inflated surfaces form closed meshes with curved front and back normals for every shape', () => {
  for (const shape of PROJECT_AVATAR_SHAPES) {
    const data = getShape3D(shape.id);
    const { geometry, depth, frontZ } = createPetGlassGeometry(data);
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const edges = new Map<string, number>();
    const index = geometry.index!;
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3];
        const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    assert.ok([...edges.values()].every((count) => count === 2), `${shape.id} must have no holes or seams`);
    let curvedFront = 0, curvedBack = 0;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
      assert.ok([x, y, z, nx, ny, nz].every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(nx, ny, nz) - 1) < 1e-5);
      if (z > depth * 0.3 && z < depth * 0.9 && Math.hypot(nx, ny) > 0.1) curvedFront++;
      if (z < -depth * 0.3 && z > -depth * 0.9 && Math.hypot(nx, ny) > 0.1) curvedBack++;
      if (Math.abs(z) < 1e-7) {
        // The equator must reach the original shape outline, with no bulging past it.
        assert.ok(frontZ(x * 0.999, y * 0.999) < depth * 0.06);
      }
    }
    assert.ok(curvedFront > 1000 && curvedBack > 1000, `${shape.id} needs broad curved surfaces on both sides`);
    assert.ok(Math.abs(frontZ(0, 0) - depth) < 1e-10);
    geometry.dispose();
  }
});

test('round glass pet is a ball and animated facial anchors follow its surface', () => {
  const { geometry, depth } = createPetGlassGeometry(getShape3D('circle'));
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    assert.ok(Math.abs(Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)) - depth) < 0.002);
  }
  geometry.dispose();
  const avatar = getProjectIcon(formatProjectIconId({shapeId: 'circle', expressionId: 'toon-angry', color: '#FFC20E'}));
  const pet = buildPet3D(avatar, { glass: true });
  const face = pet.root.getObjectByName('pet-face')!;
  for (const state of PET_STATES) {
    for (let frame = 0; frame < state.frames; frame++) {
      pet.applyPose(getFramePose(state.id, frame));
      for (const eye of face.children.slice(0, 2)) {
        assert.ok(eye.position.z > 0.7, 'Eyes must sit on the round front instead of inside the body');
        assert.ok(eye.quaternion.toArray().every(Number.isFinite));
      }
    }
  }
  pet.dispose();
});

test('glass material disposes normally and keeps the selected tint for dark and pale colors', () => {
  for (const color of ['#161618', '#E4E4E1', '#FFC20E']) {
    const material = createPetGlassMaterial(color);
    assert.equal(material.attenuationColor.getHexString(), color.slice(1).toLowerCase());
    assert.equal(material.ior, 1.5);
    let disposed = false;
    material.addEventListener('dispose', () => { disposed = true; });
    material.dispose();
    assert.ok(disposed);
  }
});

test('glass face is drawn once after transmission and does not cast ghost shadows', () => {
  const avatar = getProjectIcon(formatProjectIconId({
    shapeId: 'cloud', expressionId: 'toon-flat', color: '#FFC20E',
  }));
  for (const glass of [false, true]) {
    const pet = buildPet3D(avatar, { glass });
    const face = pet.root.getObjectByName('pet-face')!;
    assert.ok(face);
    let meshes = 0;
    face.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      const material = object.material as THREE.MeshStandardMaterial;
      assert.equal(material.transparent, glass, 'Only glass faces should skip the opaque transmission capture');
      assert.equal(material.opacity, 1, 'The actual face must remain fully visible');
      if (glass) assert.equal(object.castShadow, false);
    });
    assert.ok(meshes >= 8, 'Check eyes, pupils, catchlights, and brows');
    assert.equal((pet.petRoot.children[0] as THREE.Mesh).receiveShadow, !glass);
    assert.equal(pet.root.getObjectByName('glass-preview-backdrop'), undefined, 'Exports must stay transparent');
    pet.dispose();
  }
});
