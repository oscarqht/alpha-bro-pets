// Project avatar definitions inspired by https://dots-lab.pages.dev/
// Supports customizable shape, expression (eyes + brows), and color, while maintaining
// full backward compatibility with legacy project icon IDs.

export type ProjectAvatarEyeType =
  | 'toon'
  | 'pill'
  | 'dot'
  | 'ring'
  | 'happy'
  | 'plus'
  | 'dash'
  | 'slash'
  | 'squint'
  | 'wink';

export type ProjectAvatarBrowType = 'none' | 'flat' | 'angry' | 'worried' | 'sceptic';

export interface ProjectAvatarHandle {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  lw: number;
}

export interface ProjectAvatarShapeDefinition {
  id: string;
  /** Display name used in grouping/sorting (e.g. 'Circle' for backward compatibility) */
  name: string;
  /** Label shown in the dots-lab shape carousel (e.g. 'Round') */
  label: string;
  shapeIndex: number;
  fy: number;
  fs: number;
  svgPath: string;
  handle: ProjectAvatarHandle | null;
}

export interface ProjectAvatarExpressionDefinition {
  id: string;
  eyes: ProjectAvatarEyeType;
  brows: ProjectAvatarBrowType;
  label: string;
  eyeGap: number;
}

export interface ProjectAvatarPaletteColor {
  hex: string;
  label: string;
  ring: 0 | 1;
}

export interface ProjectIconDefinition {
  id: string;
  name: string;
  index: number;
  color: string;
  shapeId: string;
  shapeName: string;
  shapeLabel: string;
  shapeIndex: number;
  expressionId: string;
  eyes: ProjectAvatarEyeType;
  brows: ProjectAvatarBrowType;
  eyeGap: number;
  ink: string;
  fy: number;
  fs: number;
  handle: ProjectAvatarHandle | null;
  shapePath: string;
  facePath: string;
}
