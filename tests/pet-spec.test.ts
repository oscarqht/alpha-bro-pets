import assert from 'node:assert/strict';
import test from 'node:test';
import { PET_STATES, frameAtTime, getFramePose } from '../src/pet/spec';

test('ChatGPT v1 has 57 occupied and 15 unused cells in the required row order', () => {
  assert.deepEqual(PET_STATES.map((state) => state.frames), [6, 8, 8, 4, 5, 8, 6, 6, 6]);
  assert.equal(PET_STATES.reduce((count, state) => count + state.frames, 0), 57);
  assert.equal(8 * 9 - 57, 15);
  for (const state of PET_STATES) assert.equal(state.durations.length, state.frames);
});

test('player honors every frame duration boundary and loops to the first frame', () => {
  for (const state of PET_STATES) {
    let elapsed = 0;
    state.durations.forEach((duration, index) => {
      assert.equal(frameAtTime(state.id, elapsed), index);
      assert.equal(frameAtTime(state.id, elapsed + duration - 0.1), index);
      elapsed += duration;
    });
    assert.equal(frameAtTime(state.id, elapsed), 0);
  }
});

test('jump lifts the avatar and lands at its original baseline without scaling its peak', () => {
  const poses = Array.from({ length: 5 }, (_, frame) => getFramePose('jumping', frame));
  assert.equal(poses[0].lift, 0);
  assert.equal(poses[4].lift, 0);
  assert.ok(poses[2].lift >= 40);
  assert.ok(Math.abs(poses[2].sy - 1) < 0.05);
});

test('left and right locomotion face opposite screen directions and every state varies', () => {
  for (const state of PET_STATES) {
    const poses = Array.from({ length: state.frames }, (_, frame) => getFramePose(state.id, frame));
    assert.ok(new Set(poses.map((pose) => JSON.stringify(pose))).size > 1, state.id);
    for (const pose of poses) {
      assert.ok(Object.values(pose).every((value) => value === null || Number.isFinite(value)));
    }
  }
  assert.ok(getFramePose('running-right', 0).faceX > 0);
  assert.ok(getFramePose('running-left', 0).faceX < 0);
});
