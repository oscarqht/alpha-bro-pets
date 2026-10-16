import assert from 'node:assert/strict';
import test from 'node:test';
import { PET_STATES, getFramePose, getPreviewPose } from '../src/pet/spec';

const numericKeys = ['x', 'lift', 'sx', 'sy', 'tilt', 'faceX', 'faceY', 'faceScaleY'] as const;

test('live motion changes between sprite keyframes instead of holding for 110–320ms', () => {
  for (const state of PET_STATES) {
    const samples = Array.from({ length: 60 }, (_, tick) => getPreviewPose(state.id, tick * 1000 / 60));
    assert.ok(new Set(samples.map(pose => JSON.stringify(pose))).size >= 40, state.id);
    assert.notDeepEqual(samples[1], samples[2], state.id);
  }
});

test('live interpolation meets every export keyframe exactly and loops continuously', () => {
  for (const state of PET_STATES) {
    let elapsed = 0;
    for (let frame = 0; frame < state.frames; frame++) {
      assert.deepEqual(getPreviewPose(state.id, elapsed), getFramePose(state.id, frame), `${state.id}:${frame}`);
      const before = getPreviewPose(state.id, elapsed - 0.001);
      const after = getPreviewPose(state.id, elapsed + 0.001);
      for (const key of numericKeys) assert.ok(Math.abs(before[key] - after[key]) < 0.01, `${state.id}:${frame}:${key}`);
      elapsed += state.durations[frame];
    }
    assert.deepEqual(getPreviewPose(state.id, elapsed), getPreviewPose(state.id, 0));
  }
});

test('intermediate poses stay within the validated sprite motion bounds, including jump and waving', () => {
  for (const state of PET_STATES) {
    const keys = Array.from({ length: state.frames }, (_, frame) => getFramePose(state.id, frame));
    const duration = state.durations.reduce<number>((sum, value) => sum + value, 0);
    for (let elapsed = 0; elapsed < duration; elapsed += 7) {
      const pose = getPreviewPose(state.id, elapsed);
      for (const key of [...numericKeys, 'wave'] as const) {
        const values = keys.map(p => p[key]).filter((value): value is number => value !== null);
        if (!values.length) { assert.equal(pose[key], null); continue; }
        const value = pose[key] as number;
        assert.ok(Number.isFinite(value), `${state.id}:${key}`);
        assert.ok(value >= Math.min(...values) - 1e-9 && value <= Math.max(...values) + 1e-9, `${state.id}:${key}:${value}`);
      }
    }
  }
});
