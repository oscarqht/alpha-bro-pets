import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnimatedSvg } from '../src/pet/svg';
import { gifTimeline } from '../src/pet/gif';
import { CELL_WIDTH, CELL_HEIGHT, PET_STATES } from '../src/pet/spec';

test('portable SVG covers every frame for exactly one selected action and loops at the original timing', () => {
  for (const state of PET_STATES) {
    const frames = gifTimeline(state.id).length;
    const svg = buildAnimatedSvg('data:image/png;base64,AAAA', state.id, frames, 'Triangle <blue> & "happy"');
    const animations = [...svg.matchAll(/<animate attributeName="(x|y)" values="([^"]+)" keyTimes="([^"]+)" dur="(\d+)ms"/g)];
    assert.equal(animations.length, 2);
    const x = animations[0][2].split(';').map(Number);
    const y = animations[1][2].split(';').map(Number);
    for (let index = 0; index < frames; index++) {
      assert.equal(x[index] || 0, -(index % 8) * CELL_WIDTH || 0);
      assert.equal(y[index] || 0, -Math.floor(index / 8) * CELL_HEIGHT || 0);
    }
    assert.equal(x[frames], 0);
    assert.equal(y[frames], 0);
    assert.equal(Number(animations[0][4]), state.durations.reduce<number>((sum, ms) => sum + ms, 0));
    const times = animations[0][3].split(';').map(Number);
    assert.equal(times.length, frames + 1);
    assert.equal(times[0], 0);
    assert.equal(times.at(-1), 1);
    assert.ok(times.every((time, index) => index === 0 || time > times[index - 1]));
    assert.ok(svg.includes('calcMode="discrete" repeatCount="indefinite"'));
    assert.ok(svg.includes('prefers-reduced-motion:reduce'));
    assert.ok(svg.includes('Triangle &lt;blue&gt; &amp; &quot;happy&quot;'));
    assert.ok(svg.includes('href="data:image/png;base64,AAAA"'));
    assert.ok(!svg.includes('<script'));
  }
});
