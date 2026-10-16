import assert from 'node:assert/strict';
import test from 'node:test';
import { GifReader } from 'omggif';
import { createGifEncoder, gifTimeline, GIF_FRAME_DELAY } from '../src/pet/gif';
import { PET_STATES } from '../src/pet/spec';

test('each move exports a full loop at 50fps without a duplicate endpoint', () => {
  for (const state of PET_STATES) {
    const timeline = gifTimeline(state.id);
    const duration = state.durations.reduce<number>((sum, ms) => sum + ms, 0);
    assert.ok(Math.abs(timeline.length * GIF_FRAME_DELAY - duration) <= 10);
    assert.equal(timeline[0], 0);
    assert.equal(timeline.at(-1), (timeline.length - 1) * duration / timeline.length);
  }
});

test('decoded GIF preserves transparent background, black eyes, timing and clears moving frames', async () => {
  const encoder = createGifEncoder(3, 1);
  encoder.addFrame(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255, 255, 194, 14, 255]));
  encoder.addFrame(new Uint8ClampedArray([255, 194, 14, 255, 0, 0, 0, 127, 0, 0, 0, 0]));
  const blob = encoder.finish();
  assert.equal(blob.type, 'image/gif');
  const reader = new GifReader(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(reader.numFrames(), 2);
  assert.equal(reader.loopCount(), 0);
  for (let frame = 0; frame < 2; frame++) {
    const info = reader.frameInfo(frame);
    assert.equal(info.delay, 2);
    assert.equal(info.disposal, 2);
    assert.notEqual(info.transparent_index, null);
  }
  const first = new Uint8Array(12);
  reader.decodeAndBlitFrameRGBA(0, first);
  assert.equal(first[3], 0);
  assert.deepEqual([...first.slice(4, 8)], [0, 0, 0, 255]);
  const second = new Uint8Array(12);
  reader.decodeAndBlitFrameRGBA(1, second);
  assert.equal(second[3], 255);
  assert.equal(second[7], 0);
  assert.equal(second[11], 0);
});
