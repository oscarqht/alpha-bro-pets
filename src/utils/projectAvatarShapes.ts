import type { ProjectAvatarHandle, ProjectAvatarShapeDefinition } from './projectIconTypes';

const PI = Math.PI;
const TAU = Math.PI * 2;

function superE(n: number, a: number, b: number, N: number): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const t = (TAU * i) / N;
    const c = Math.cos(t);
    const s = Math.sin(t);
    p.push([
      a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
      b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
    ]);
  }
  return p;
}

function param(N: number, f: (t: number) => [number, number]): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    p.push(f((TAU * i) / N));
  }
  return p;
}

function polar(N: number, f: (a: number) => number): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (TAU * i) / N;
    const r = f(a);
    p.push([r * Math.sin(a), -r * Math.cos(a)]);
  }
  return p;
}

function rpoly(V: [number, number][], t: number, n = 18): [number, number][] {
  const p: [number, number][] = [];
  const L = V.length;
  for (let i = 0; i < L; i++) {
    const P = V[(i - 1 + L) % L];
    const Q = V[i];
    const R = V[(i + 1) % L];
    const A: [number, number] = [Q[0] + (P[0] - Q[0]) * t, Q[1] + (P[1] - Q[1]) * t];
    const B: [number, number] = [Q[0] + (R[0] - Q[0]) * t, Q[1] + (R[1] - Q[1]) * t];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const m = 1 - u;
      p.push([
        m * m * A[0] + 2 * m * u * Q[0] + u * u * B[0],
        m * m * A[1] + 2 * m * u * Q[1] + u * u * B[1],
      ]);
    }
  }
  return p;
}

function discs(C: [number, number, number][], N: number): [number, number][] {
  return polar(N, (a) => {
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    let r = 0;
    for (const [x, y, R] of C) {
      const b = dx * x + dy * y;
      const d = b * b - (x * x + y * y) + R * R;
      if (d >= 0) r = Math.max(r, b + Math.sqrt(d));
    }
    return r;
  });
}

function gauss(a: number, c: number, w: number): number {
  const d = Math.atan2(Math.sin(a - c), Math.cos(a - c));
  return Math.exp(-(d / w) * (d / w));
}

function smooth(pts: [number, number][], iterations: number): [number, number][] {
  let p = pts;
  for (let k = 0; k < iterations; k++) {
    const L = p.length;
    p = p.map((q, i) => {
      const a = p[(i - 1 + L) % L];
      const b = p[(i + 1) % L];
      return [(a[0] + 2 * q[0] + b[0]) / 4, (a[1] + 2 * q[1] + b[1]) / 4];
    });
  }
  return p;
}

function resample(p: [number, number][], N: number): [number, number][] {
  const L = p.length;
  const d = [0];
  for (let i = 1; i <= L; i++) {
    const a = p[i - 1];
    const b = p[i % L];
    d.push(d[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const tot = d[L];
  const o: [number, number][] = [];
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = (tot * i) / N;
    while (j + 1 < d.length && d[j + 1] < s) j++;
    const seg = d[j + 1] - d[j] || 1;
    const u = (s - d[j]) / seg;
    const a = p[j];
    const b = p[(j + 1) % L];
    o.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return o;
}

function buildNormalizedShape(opts: {
  id: string;
  name: string;
  label: string;
  shapeIndex: number;
  gen: (N: number) => [number, number][];
  fy: number;
  fs: number;
  smooth?: number;
  handle?: boolean;
  k?: number;
}): ProjectAvatarShapeDefinition {
  let p = resample(smooth(opts.gen(180), opts.smooth ?? 2), 140);
  let x0 = 1e9;
  let x1 = -1e9;
  let y0 = 1e9;
  let y1 = -1e9;
  for (const [x, y] of p) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const s = (opts.k || 1) / Math.max((x1 - x0) / 2, (y1 - y0) / 2);
  p = p.map(([x, y]) => [(x - cx) * s, (y - cy) * s]);
  let top = 0;
  for (const [, y] of p) {
    top = Math.min(top, y);
  }
  const handle: ProjectAvatarHandle | null = opts.handle
    ? { x: -0.34, y: top - 0.3, w: 0.68, h: 0.5, r: 0.16, lw: 0.13 }
    : null;
  const svgPath =
    p.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(4)} ${y.toFixed(4)}`).join(' ') + ' Z';

  return {
    id: opts.id,
    name: opts.name,
    label: opts.label,
    shapeIndex: opts.shapeIndex,
    fy: opts.fy,
    fs: opts.fs,
    svgPath,
    handle,
  };
}

/**
 * All supported avatar shapes in the dots-lab style carousel order.
 * Note: The original 6 shapes preserve their exact shapeIndex (0..5) and shapeName
 * so existing project sorting and grouping tests remain 100% compatible.
 */
export const PROJECT_AVATAR_SHAPES: readonly ProjectAvatarShapeDefinition[] = [
  buildNormalizedShape({
    id: 'circle',
    name: 'Circle',
    label: 'Round',
    shapeIndex: 2,
    gen: (N) => superE(2, 1, 1, N),
    fy: 0,
    fs: 1,
  }),
  buildNormalizedShape({
    id: 'pebble',
    name: 'Pebble',
    label: 'Pebble',
    shapeIndex: 6,
    gen: (N) => superE(2.3, 1, 0.88, N),
    fy: 0,
    fs: 1,
  }),
  buildNormalizedShape({
    id: 'pill',
    name: 'Capsule',
    label: 'Capsule',
    shapeIndex: 7,
    gen: (N) => superE(3.2, 1, 0.6, N),
    fy: 0,
    fs: 0.8,
  }),
  buildNormalizedShape({
    id: 'drop',
    name: 'Drop',
    label: 'Drop',
    shapeIndex: 8,
    gen: (N) => param(N, (t) => [1.1 * Math.sin(t) * Math.pow(Math.sin(t / 2), 0.9), -Math.cos(t)]),
    fy: 0.26,
    fs: 0.82,
    smooth: 12,
  }),
  buildNormalizedShape({
    id: 'flame',
    name: 'Flame',
    label: 'Flame',
    shapeIndex: 9,
    gen: (N) =>
      polar(N, (a) => 0.72 + 0.52 * gauss(a, -0.22, 0.36) + 0.2 * gauss(a, 0.5, 0.16)).map(
        ([x, y]) => [x, y > 0 ? y * 0.92 : y],
      ),
    fy: 0.2,
    fs: 0.84,
    smooth: 10,
  }),
  buildNormalizedShape({
    id: 'triangle',
    name: 'Triangle',
    label: 'Triangle',
    shapeIndex: 0,
    gen: () => rpoly([[0, -1], [1, 0.72], [-1, 0.72]], 0.3),
    fy: 0.3,
    fs: 0.74,
    smooth: 6,
  }),
  buildNormalizedShape({
    id: 'square',
    name: 'Square',
    label: 'Square',
    shapeIndex: 1,
    gen: () => rpoly([[-0.94, -0.9], [0.96, -0.95], [0.93, 0.92], [-0.95, 0.94]], 0.26),
    fy: 0.02,
    fs: 0.95,
    smooth: 4,
  }),
  buildNormalizedShape({
    id: 'bag',
    name: 'Briefcase',
    label: 'Briefcase',
    shapeIndex: 10,
    gen: () => rpoly([[-1, -0.56], [1, -0.56], [1, 0.72], [-1, 0.72]], 0.16),
    fy: 0.12,
    fs: 0.9,
    smooth: 4,
    handle: true,
    k: 0.94,
  }),
  buildNormalizedShape({
    id: 'diamond',
    name: 'Diamond',
    label: 'Diamond',
    shapeIndex: 3,
    gen: () => rpoly([[0, -1], [1, 0], [0, 1], [-1, 0]], 0.26),
    fy: 0.04,
    fs: 0.82,
    smooth: 5,
  }),
  buildNormalizedShape({
    id: 'hexagon',
    name: 'Hexagon',
    label: 'Hexagon',
    shapeIndex: 5,
    gen: () =>
      rpoly(
        Array.from({ length: 6 }, (_, i) => {
          const a = (i * PI) / 3 + PI / 6;
          return [Math.sin(a), -Math.cos(a)];
        }),
        0.26,
      ),
    fy: 0.02,
    fs: 0.88,
    smooth: 5,
  }),
  buildNormalizedShape({
    id: 'star',
    name: 'Star',
    label: 'Star',
    shapeIndex: 4,
    gen: () =>
      rpoly(
        Array.from({ length: 10 }, (_, i) => {
          const a = (i * PI) / 5;
          const r = i % 2 ? 0.54 : 1;
          return [r * Math.sin(a), -r * Math.cos(a)];
        }),
        0.26,
      ),
    fy: 0.08,
    fs: 0.76,
    smooth: 6,
  }),
  buildNormalizedShape({
    id: 'heart',
    name: 'Heart',
    label: 'Heart',
    shapeIndex: 11,
    gen: (N) =>
      param(N, (t) => {
        const s = Math.sin(t);
        return [
          16 * s * s * s,
          -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
        ];
      }),
    fy: -0.1,
    fs: 0.88,
    smooth: 10,
  }),
  buildNormalizedShape({
    id: 'cloud',
    name: 'Cloud',
    label: 'Cloud',
    shapeIndex: 12,
    gen: (N) =>
      discs(
        [
          [-0.62, 0.1, 0.4],
          [-0.26, -0.2, 0.46],
          [0.24, -0.22, 0.44],
          [0.62, 0.08, 0.4],
          [0.24, 0.3, 0.4],
          [-0.24, 0.3, 0.4],
        ],
        N,
      ),
    fy: 0.04,
    fs: 0.8,
    smooth: 3,
  }),
  buildNormalizedShape({
    id: 'clover',
    name: 'Clover',
    label: 'Clover',
    shapeIndex: 13,
    gen: (N) =>
      discs(
        [
          [-0.36, -0.36, 0.46],
          [0.36, -0.36, 0.46],
          [-0.36, 0.36, 0.46],
          [0.36, 0.36, 0.46],
        ],
        N,
      ),
    fy: 0.02,
    fs: 0.88,
    smooth: 3,
  }),
];
