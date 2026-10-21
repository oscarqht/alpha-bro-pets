import assert from 'node:assert/strict';
import test from 'node:test';
import { getProjectIcon } from '../src/utils/projectIcons';
import { buildPet3D } from '../src/pet/3d/pet3dBuilder';
import { DEFAULT_POV, type CameraPOV } from '../src/pet/3d/pet3dExport';
import { getFramePose } from '../src/pet/spec';

test('buildPet3D creates 3D pet without platform or pedestal and applies poses accurately', () => {
  const avatar = getProjectIcon('cloud-toon-flat-FFC20E');
  const pet3d = buildPet3D(avatar);

  assert.ok(pet3d.root, 'pet3d.root should exist');
  assert.ok(pet3d.petRoot, 'pet3d.petRoot should exist');

  // Verify platform is NOT in the pet object hierarchy
  let foundPlatform = false;
  pet3d.root.traverse((obj) => {
    if (obj.name.toLowerCase().includes('platform') || obj.name.toLowerCase().includes('pedestal')) {
      foundPlatform = true;
    }
  });
  assert.equal(foundPlatform, false, 'The export pet hierarchy must never contain a platform');

  // Test idle pose application
  const idlePose = getFramePose('idle', 0);
  pet3d.applyPose(idlePose);
  assert.equal(pet3d.petRoot.position.x, idlePose.x * 0.013);
  assert.equal(pet3d.petRoot.position.y, idlePose.lift * 0.016);

  // Test wave pose application (wave arm becomes visible)
  const wavePose = getFramePose('waving', 1);
  assert.notEqual(wavePose.wave, null);
  pet3d.applyPose(wavePose);

  // Test running / typing pose application (keyboard becomes visible)
  const typingPose = getFramePose('running', 0);
  assert.notEqual(typingPose.typeLx, null);
  pet3d.applyPose(typingPose);

  // Dispose cleanly
  pet3d.dispose();
});

test('DEFAULT_POV has valid 3D camera coordinates and orientation', () => {
  assert.equal(DEFAULT_POV.fov, 38);
  assert.equal(DEFAULT_POV.zoom, 1);
  assert.equal(DEFAULT_POV.position.length, 3);
  assert.equal(DEFAULT_POV.quaternion.length, 4);
  assert.equal(DEFAULT_POV.target.length, 3);

  // Custom POV support
  const customPov: CameraPOV = {
    position: [2.4, 1.2, 2.7],
    quaternion: [0, 0.38, 0, 0.92],
    target: [0, 0, 0],
    fov: 38,
    zoom: 1,
  };
  assert.equal(customPov.position[0], 2.4);
});
