import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePetHash,
  buildPetHash,
  getPetIconFromHash,
  resolveShapeId,
  resolveExpressionId,
  resolveColorHex,
} from '../src/utils/petHash';
import { getProjectIcon, formatProjectIconId } from '../src/utils/projectIcons';
import { PET_STATES } from '../src/pet/spec';

test('resolveShapeId matches standard shapes, aliases, and labels', () => {
  assert.equal(resolveShapeId('triangle'), 'triangle');
  assert.equal(resolveShapeId('TRIANGLE'), 'triangle');
  assert.equal(resolveShapeId('cloud'), 'cloud');
  assert.equal(resolveShapeId('round'), 'circle');
  assert.equal(resolveShapeId('circle'), 'circle');
  assert.equal(resolveShapeId('capsule'), 'pill');
  assert.equal(resolveShapeId('briefcase'), 'bag');
  assert.equal(resolveShapeId('heart'), 'heart');
  assert.equal(resolveShapeId('star'), 'star');
  assert.equal(resolveShapeId('unknown-xyz'), null);
});

test('resolveExpressionId matches eye types and expressions with brows', () => {
  assert.equal(resolveExpressionId('toon'), 'toon-none');
  assert.equal(resolveExpressionId('toon-flat'), 'toon-flat');
  assert.equal(resolveExpressionId('toon', 'flat'), 'toon-flat');
  assert.equal(resolveExpressionId('toon', 'straight'), 'toon-flat');
  assert.equal(resolveExpressionId('happy'), 'happy-none');
  assert.equal(resolveExpressionId('smile'), 'happy-none');
  assert.equal(resolveExpressionId('happy-flat'), 'happy-flat');
  assert.equal(resolveExpressionId('wink'), 'wink-none');
  assert.equal(resolveExpressionId('dots'), 'dot-none');
  assert.equal(resolveExpressionId('rings'), 'ring-none');
  assert.equal(resolveExpressionId('unknown-xyz'), null);
});

test('resolveColorHex handles raw hex, prefixed hex, 3-digit hex, and named colors', () => {
  assert.equal(resolveColorHex('FFC20E'), '#FFC20E');
  assert.equal(resolveColorHex('#FFC20E'), '#FFC20E');
  assert.equal(resolveColorHex('%23FFC20E'), '#FFC20E');
  assert.equal(resolveColorHex('ffc20e'), '#FFC20E');
  assert.equal(resolveColorHex('fc0'), '#FFCC00');
  assert.equal(resolveColorHex('yellow'), '#FFC20E');
  assert.equal(resolveColorHex('Sun'), '#FFC20E');
  assert.equal(resolveColorHex('blue'), '#3F95F5');
  assert.equal(resolveColorHex('mint'), '#5CCB77');
  assert.equal(resolveColorHex('pink'), '#FF5AA5');
  assert.equal(resolveColorHex('unknown'), null);
});

test('parsePetHash extracts shape, eyes, color, and name correctly', () => {
  const parsed = parsePetHash('#shape=triangle&eyes=toon&color=FFC20E');
  assert.deepEqual(parsed, {
    shapeId: 'triangle',
    expressionId: 'toon-none',
    color: '#FFC20E',
    name: undefined,
  });

  const withBrows = parsePetHash('#shape=cloud&eyes=toon-flat&color=%233F95F5&name=Nimbus');
  assert.deepEqual(withBrows, {
    shapeId: 'cloud',
    expressionId: 'toon-flat',
    color: '#3F95F5',
    name: 'Nimbus',
  });
});

test('buildPetHash formats URL hash correctly', () => {
  const icon1 = getProjectIcon(
    formatProjectIconId({
      shapeId: 'triangle',
      expressionId: 'toon-none',
      color: '#FFC20E',
    }),
  );
  assert.equal(buildPetHash(icon1), '#shape=triangle&eyes=toon&color=FFC20E');

  const icon2 = getProjectIcon(
    formatProjectIconId({
      shapeId: 'cloud',
      expressionId: 'toon-flat',
      color: '#3F95F5',
    }),
  );
  assert.equal(buildPetHash(icon2), '#shape=cloud&eyes=toon-flat&color=3F95F5');
});

test('getPetIconFromHash resolves full icon and roundtrips with buildPetHash', () => {
  const hash = '#shape=triangle&eyes=happy&color=5CCB77';
  const resolved = getPetIconFromHash(hash);
  assert.ok(resolved);
  const avatar = getProjectIcon(resolved.icon);
  assert.equal(avatar.shapeId, 'triangle');
  assert.equal(avatar.eyes, 'happy');
  assert.equal(avatar.brows, 'none');
  assert.equal(avatar.color, '#5CCB77');

  const rebuiltHash = buildPetHash(avatar);
  assert.equal(rebuiltHash, '#shape=triangle&eyes=happy&color=5CCB77');
});

test('getPetIconFromHash handles empty or invalid hash with null', () => {
  assert.equal(getPetIconFromHash(''), null);
  assert.equal(getPetIconFromHash('#'), null);
  assert.equal(getPetIconFromHash('#foo=bar'), null);
});

test('getPetIconFromHash fills missing parameters from fallback icon', () => {
  const fallback = formatProjectIconId({
    shapeId: 'square',
    expressionId: 'wink-none',
    color: '#8844EE',
  });
  const partial = getPetIconFromHash('#shape=star', fallback);
  assert.ok(partial);
  const avatar = getProjectIcon(partial.icon);
  assert.equal(avatar.shapeId, 'star');
  assert.equal(avatar.expressionId, 'wink-none');
  assert.equal(avatar.color, '#8844EE');
});

test('shared hashes roundtrip every mode and action with the pet appearance', () => {
  const avatar = getProjectIcon(formatProjectIconId({
    shapeId: 'heart', expressionId: 'wink-flat', color: '#8844EE',
  }));
  for (const mode of ['2d', '3d', 'furry'] as const) {
    for (const { id: action } of PET_STATES) {
      const hash = buildPetHash(avatar, { mode, action });
      const params = new URLSearchParams(hash.slice(1));
      assert.equal(params.get('mode'), mode);
      assert.equal(params.get('action'), action);
      const resolved = getPetIconFromHash(hash);
      assert.ok(resolved);
      assert.equal(resolved.icon, avatar.id);
      assert.equal(resolved.mode, mode);
      assert.equal(resolved.action, action);
    }
  }
});

test('mode-only and action-only hashes preserve the fallback pet', () => {
  const fallback = formatProjectIconId({
    shapeId: 'star', expressionId: 'happy-none', color: '#5CCB77',
  });
  assert.deepEqual(getPetIconFromHash('#mode=furry', fallback), {
    icon: fallback, name: undefined, mode: 'furry',
  });
  assert.deepEqual(getPetIconFromHash('#action=running', fallback), {
    icon: fallback, name: undefined, action: 'running',
  });
  const normalized = parsePetHash('#mode=%202D%20&action=%20RUNNING-LEFT%20');
  assert.equal(normalized?.mode, '2d');
  assert.equal(normalized?.action, 'running-left');
});

test('invalid preview values are ignored without losing valid avatar or selection values', () => {
  assert.equal(parsePetHash('#mode=4d&action=unknown'), null);
  assert.equal(parsePetHash('#mode=&action='), null);
  const appearance = parsePetHash('#shape=cloud&mode=4d&action=unknown');
  assert.equal(appearance?.shapeId, 'cloud');
  assert.equal(appearance?.mode, undefined);
  assert.equal(appearance?.action, undefined);
  assert.equal(parsePetHash('#mode=furry&action=unknown')?.mode, 'furry');
  assert.equal(parsePetHash('#mode=unknown&action=waving')?.action, 'waving');
});

