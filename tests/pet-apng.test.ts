import assert from 'node:assert/strict';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import { createApngEncoder } from '../src/pet/apng';

// Independent bitwise CRC check, rather than the encoder's table implementation.
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

test('APNG decodes lossless RGBA frames, loops forever at 50fps, and replaces transparent pixels', async () => {
  const frames = [
    new Uint8ClampedArray([0, 0, 0, 255, 255, 31, 63, 93, 0, 0, 0, 0, 12, 34, 56, 128]),
    new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255, 22, 44, 66, 1, 255, 255, 255, 254]),
  ];
  const encoder = createApngEncoder(2, 2, frames.length);
  for (const frame of frames) await encoder.addFrame(frame);
  const blob = encoder.finish();
  assert.equal(blob.type, 'image/apng');
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks: { type: string; data: Buffer }[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    assert.equal(bytes.readUInt32BE(offset + 8 + length), crc32(bytes.subarray(offset + 4, offset + 8 + length)), `${type} checksum`);
    chunks.push({ type, data });
    offset += length + 12;
  }
  assert.deepEqual(chunks.map(c => c.type), ['IHDR', 'acTL', 'fcTL', 'IDAT', 'fcTL', 'fdAT', 'IEND']);
  assert.equal(chunks[0].data.readUInt32BE(0), 2);
  assert.equal(chunks[0].data.readUInt32BE(4), 2);
  assert.equal(chunks[0].data[8], 8);
  assert.equal(chunks[0].data[9], 6);
  assert.equal(chunks[1].data.readUInt32BE(0), frames.length);
  assert.equal(chunks[1].data.readUInt32BE(4), 0);
  assert.deepEqual([chunks[2], chunks[4], chunks[5]].map(c => c.data.readUInt32BE(0)), [0, 1, 2]);
  for (const control of chunks.filter(c => c.type === 'fcTL')) {
    assert.equal(control.data.readUInt32BE(4), 2);
    assert.equal(control.data.readUInt32BE(8), 2);
    assert.equal(control.data.readUInt32BE(12), 0);
    assert.equal(control.data.readUInt32BE(16), 0);
    assert.equal(control.data.readUInt16BE(20) / control.data.readUInt16BE(22), 0.02);
    assert.equal(control.data[24], 0);
    assert.equal(control.data[25], 0, 'SOURCE replaces old pixels, even where the next frame is transparent');
  }
  const compressedFrames = [chunks[3].data, chunks[5].data.subarray(4)];
  compressedFrames.forEach((compressed, index) => {
    const scanlines = inflateSync(compressed);
    assert.equal(scanlines.length, 18);
    assert.equal(scanlines[0], 0);
    assert.equal(scanlines[9], 0);
    assert.deepEqual(Buffer.concat([scanlines.subarray(1, 9), scanlines.subarray(10)]), Buffer.from(frames[index]));
  });
});

test('APNG refuses incomplete exports and invalid frame buffers', async () => {
  const encoder = createApngEncoder(1, 1, 2);
  assert.throws(() => encoder.finish(), /incomplete/);
  await assert.rejects(encoder.addFrame(new Uint8ClampedArray(3)), /Invalid/);
  await encoder.addFrame(new Uint8ClampedArray(4));
  assert.throws(() => encoder.finish(), /incomplete/);
  await encoder.addFrame(new Uint8ClampedArray(4));
  await assert.rejects(encoder.addFrame(new Uint8ClampedArray(4)), /Invalid/);
  assert.ok(encoder.finish().size > 0);
});
