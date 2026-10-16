export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;
export const SHEET_COLUMNS = 8;

export const PET_STATES = [
  { id: 'idle', label: 'Idle', frames: 6, durations: [280, 110, 110, 140, 140, 320] },
  { id: 'running-right', label: 'Run right', frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { id: 'running-left', label: 'Run left', frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { id: 'waving', label: 'Wave', frames: 4, durations: [140, 140, 140, 280] },
  { id: 'jumping', label: 'Jump', frames: 5, durations: [140, 140, 140, 140, 280] },
  { id: 'failed', label: 'Oops', frames: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  { id: 'waiting', label: 'Waiting', frames: 6, durations: [150, 150, 150, 150, 150, 260] },
  { id: 'running', label: 'Working', frames: 6, durations: [120, 120, 120, 120, 120, 220] },
  { id: 'review', label: 'Review', frames: 6, durations: [150, 150, 150, 150, 150, 280] },
] as const;

export type PetState = typeof PET_STATES[number]['id'];
export type PetVersion = 'v1' | 'v2';

export interface FramePose {
  x: number;
  lift: number;
  sx: number;
  sy: number;
  tilt: number;
  faceX: number;
  faceY: number;
  faceScaleY: number;
  wave: number | null;
}

/** Pure pose specification shared by the live player and the exported atlas. */
export function getFramePose(state: PetState, frame: number): FramePose {
  const definition = PET_STATES.find((item) => item.id === state)!;
  const index = ((frame % definition.frames) + definition.frames) % definition.frames;
  const phase = index / definition.frames * Math.PI * 2;
  const sin = Math.sin(phase);
  const pose: FramePose = { x: 0, lift: 0, sx: 1, sy: 1, tilt: 0, faceX: 0, faceY: 0, faceScaleY: 1, wave: null };
  switch (state) {
    case 'idle':
      pose.sx = 1 + sin * 0.012;
      pose.sy = 1 - sin * 0.018;
      pose.faceScaleY = index === 2 ? 0.12 : index === 1 || index === 3 ? 0.8 : 1;
      break;
    case 'running-right':
    case 'running-left': {
      const direction = state === 'running-right' ? 1 : -1;
      pose.x = sin * 3;
      pose.lift = Math.abs(sin) * 8;
      pose.tilt = direction * (0.14 + Math.cos(phase) * 0.06);
      pose.sx = 1 + sin * 0.04;
      pose.sy = 1 - sin * 0.04;
      pose.faceX = direction * 13;
      break;
    }
    case 'waving':
      pose.wave = [-0.55, -1.2, -0.6, -1.1][index];
      pose.tilt = sin * 0.04;
      pose.faceY = -2;
      break;
    case 'jumping':
      pose.lift = [0, 20, 40, 20, 0][index];
      pose.sx = [1.08, 0.96, 0.98, 0.96, 1][index];
      pose.sy = [0.92, 1.04, 1.02, 1.04, 1][index];
      pose.faceY = index === 2 ? -5 : 0;
      break;
    case 'failed':
      pose.tilt = Math.sin(index * 2.8) * 0.075;
      pose.sy = 0.91 + sin * 0.015;
      pose.sx = 1.035;
      pose.faceY = 7;
      pose.faceScaleY = 0.65;
      break;
    case 'waiting':
      pose.tilt = sin * 0.065;
      pose.faceX = sin * 5;
      pose.faceY = -6 - Math.abs(sin) * 2;
      pose.sy = 1 + sin * 0.012;
      break;
    case 'running':
      pose.sx = 1 + sin * 0.025;
      pose.sy = 1 - sin * 0.025;
      pose.faceX = sin * 5;
      pose.faceY = 3 + Math.cos(phase * 2) * 3;
      pose.faceScaleY = index % 3 === 1 ? 0.7 : 1;
      break;
    case 'review':
      pose.tilt = -0.07 + sin * 0.045;
      pose.faceX = sin * 9;
      pose.faceY = 3 + Math.cos(phase) * 4;
      pose.faceScaleY = index === 4 ? 0.45 : 0.9;
      break;
  }
  return pose;
}

export function frameAtTime(state: PetState, elapsed: number): number {
  const durations: readonly number[] = PET_STATES.find((item) => item.id === state)!.durations;
  const total = durations.reduce((sum, value) => sum + value, 0);
  let time = elapsed % total;
  for (let frame = 0; frame < durations.length; frame++) {
    if (time < durations[frame]) return frame;
    time -= durations[frame];
  }
  return 0;
}

// Cache the tiny cyclic timelines: preview rendering must not rebuild poses each refresh.
const PREVIEW_TIMELINES = new Map(PET_STATES.map(state => {
  const durations: readonly number[] = state.durations;
  return [state.id, {
    durations,
    total: durations.reduce((sum, duration) => sum + duration, 0),
    poses: Array.from({ length: state.frames }, (_, frame) => getFramePose(state.id, frame)),
  }];
}));

/** A shape-preserving tangent: continuous velocity without overshooting validated poses. */
function tangent(left: number, right: number, leftDuration: number, rightDuration: number): number {
  if (left * right <= 0) return 0;
  const firstWeight = 2 * rightDuration + leftDuration;
  const secondWeight = rightDuration + 2 * leftDuration;
  return (firstWeight + secondWeight) / (firstWeight / left + secondWeight / right);
}

/** Sample continuous live motion; exports still use the original discrete getFramePose. */
export function getPreviewPose(state: PetState, elapsed: number): FramePose {
  const { durations, total, poses } = PREVIEW_TIMELINES.get(state)!;
  let time = ((elapsed % total) + total) % total;
  let index = 0;
  while (index < poses.length - 1 && time >= durations[index]) {
    time -= durations[index++];
  }
  const previousIndex = (index + poses.length - 1) % poses.length;
  const nextIndex = (index + 1) % poses.length;
  const followingIndex = (index + 2) % poses.length;
  const current = poses[index];
  if (time === 0) return { ...current };
  const duration = durations[index];
  const amount = time / duration;
  const squared = amount * amount;
  const cubed = squared * amount;
  const result = { ...current };
  for (const key of Object.keys(current) as (keyof FramePose)[]) {
    const from = current[key];
    const to = poses[nextIndex][key];
    if (from === null || to === null) continue;
    const previous = poses[previousIndex][key] ?? from;
    const following = poses[followingIndex][key] ?? to;
    const slope = (to - from) / duration;
    const startVelocity = tangent((from - previous) / durations[previousIndex], slope, durations[previousIndex], duration);
    const endVelocity = tangent(slope, (following - to) / durations[nextIndex], duration, durations[nextIndex]);
    result[key] = (2 * cubed - 3 * squared + 1) * from
      + (cubed - 2 * squared + amount) * duration * startVelocity
      + (-2 * cubed + 3 * squared) * to
      + (cubed - squared) * duration * endVelocity;
  }
  return result;
}
