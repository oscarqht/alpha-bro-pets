import type { ProjectAvatarEyeType, ProjectAvatarBrowType, ProjectAvatarExpressionDefinition, ProjectAvatarPaletteColor, ProjectIconDefinition, ProjectAvatarShapeDefinition } from './projectIconTypes';
import { PROJECT_AVATAR_SHAPES } from './projectAvatarShapes';
export * from './projectIconTypes';
export { PROJECT_AVATAR_SHAPES } from './projectAvatarShapes';

const DARK_INK = '#141416';
const LIGHT_INK = '#FFFFFF';

const SHAPE_BY_ID = new Map<string, ProjectAvatarShapeDefinition>();
for (const sh of PROJECT_AVATAR_SHAPES) {
  SHAPE_BY_ID.set(sh.id, sh);
}
// Support 'round' as an alias for 'circle' (dots-lab uses id 'round' with label 'Round')
SHAPE_BY_ID.set('round', SHAPE_BY_ID.get('circle')!);

const EYE_GAP_MAP: Record<ProjectAvatarEyeType, number> = {
  toon: 0.2,
  pill: 0.15,
  dot: 0.22,
  ring: 0.32,
  happy: 0.3,
  plus: 0.32,
  dash: 0.2,
  slash: 0.3,
  squint: 0.28,
  wink: 0.22,
};

const EYE_LABEL_MAP: Record<ProjectAvatarEyeType, string> = {
  toon: 'Toon',
  pill: 'Pills',
  dot: 'Dots',
  ring: 'Rings',
  happy: 'Happy',
  plus: 'Plus',
  dash: 'X X',
  slash: 'Slashes',
  squint: '> <',
  wink: 'Wink',
};

const BROW_LABEL_MAP: Record<ProjectAvatarBrowType, string> = {
  none: 'None',
  flat: 'Straight',
  angry: 'Angry',
  worried: 'Worried',
  sceptic: 'Skeptical',
};

const RAW_EXPRESSIONS: readonly [ProjectAvatarEyeType, ProjectAvatarBrowType][] = [
  ['toon', 'none'],
  ['toon', 'angry'],
  ['toon', 'sceptic'],
  ['toon', 'worried'],
  ['toon', 'flat'],
  ['pill', 'none'],
  ['pill', 'flat'],
  ['dot', 'none'],
  ['dot', 'angry'],
  ['ring', 'none'],
  ['ring', 'worried'],
  ['happy', 'none'],
  ['happy', 'flat'],
  ['plus', 'none'],
  ['dash', 'none'],
  ['slash', 'none'],
  ['squint', 'none'],
  ['wink', 'none'],
];

/**
 * The 18 expressions arranged on the horseshoe ring around the center avatar preview.
 */
export const PROJECT_ICON_EXPRESSIONS: readonly ProjectAvatarExpressionDefinition[] =
  RAW_EXPRESSIONS.map(([eyes, brows]) => ({
    id: `${eyes}-${brows}`,
    eyes,
    brows,
    label: `${EYE_LABEL_MAP[eyes]} eyes${
      brows === 'none' ? '' : `, ${BROW_LABEL_MAP[brows].toLowerCase()} brows`
    }`,
    eyeGap: EYE_GAP_MAP[eyes],
  }));

const EXPRESSION_BY_ID = new Map<string, ProjectAvatarExpressionDefinition>();
for (const expr of PROJECT_ICON_EXPRESSIONS) {
  EXPRESSION_BY_ID.set(expr.id, expr);
  if (expr.brows === 'none') {
    EXPRESSION_BY_ID.set(expr.eyes, expr);
  }
}

/**
 * The 18 palette colors from dots-lab (12 outer vivid ring + 6 inner neutral/pastel ring).
 */
export const PROJECT_ICON_PALETTE: readonly ProjectAvatarPaletteColor[] = [
  { hex: '#8A5A3A', label: 'Hazel', ring: 0 },
  { hex: '#EE7433', label: 'Orange', ring: 0 },
  { hex: '#FFC20E', label: 'Sun', ring: 0 },
  { hex: '#A8D13B', label: 'Lime', ring: 0 },
  { hex: '#5CCB77', label: 'Mint', ring: 0 },
  { hex: '#1ED8C0', label: 'Lagoon', ring: 0 },
  { hex: '#3F95F5', label: 'Sky', ring: 0 },
  { hex: '#2F6BF0', label: 'Royal blue', ring: 0 },
  { hex: '#9966FF', label: 'Lilac', ring: 0 },
  { hex: '#8844EE', label: 'Violet', ring: 0 },
  { hex: '#FF5AA5', label: 'Pink', ring: 0 },
  { hex: '#FF5A5A', label: 'Tomato', ring: 0 },
  { hex: '#E4E4E1', label: 'Chalk', ring: 1 },
  { hex: '#F7B8CF', label: 'Powder pink', ring: 1 },
  { hex: '#B07350', label: 'Leather', ring: 1 },
  { hex: '#161618', label: 'Ink', ring: 1 },
  { hex: '#8E8E8E', label: 'Grey', ring: 1 },
  { hex: '#BFE0F5', label: 'Pale blue', ring: 1 },
];

export const PROJECT_ICON_SHAPES = (
  ['triangle', 'square', 'circle', 'diamond', 'star', 'hexagon'] as const
).map((id) => {
  const sh = SHAPE_BY_ID.get(id)!;
  return {
    id: sh.id,
    name: sh.name,
    shapePath: sh.svgPath,
    facePath: '',
  };
});

export const PROJECT_ICON_COLORS = [
  { id: 'blue', name: 'Blue', color: '#3F95F5' },
  { id: 'yellow', name: 'Yellow', color: '#FFC20E' },
  { id: 'purple', name: 'Purple', color: '#8844EE' },
  { id: 'red', name: 'Red', color: '#FF5A5A' },
  { id: 'green', name: 'Green', color: '#5CCB77' },
  { id: 'orange', name: 'Orange', color: '#EE7433' },
] as const;

export function getColorLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return 0.3;
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes the eye/brow ink color using dots-lab's automatic contrast rule:
 * Pills and crosses (the legacy dash ID) default to white on medium/dark colors;
 * other eyes default to dark ink unless on near-black.
 */
export function getAvatarInkColor(eyes: ProjectAvatarEyeType, hexColor: string): string {
  const L = getColorLuminance(hexColor);
  if (eyes === 'pill' || eyes === 'dash') {
    return L > 0.6 ? DARK_INK : LIGHT_INK;
  }
  return L < 0.05 ? LIGHT_INK : DARK_INK;
}

function createIconDefinition(opts: {
  id: string;
  name?: string;
  index: number;
  color: string;
  shape: ProjectAvatarShapeDefinition;
  expression: ProjectAvatarExpressionDefinition;
}): ProjectIconDefinition {
  const normalizedColor = opts.color.startsWith('#') ? opts.color : `#${opts.color}`;
  const ink = getAvatarInkColor(opts.expression.eyes, normalizedColor);
  return {
    id: opts.id,
    name: opts.name || `${opts.shape.label} (${opts.expression.label})`,
    index: opts.index,
    color: normalizedColor,
    shapeId: opts.shape.id,
    shapeName: opts.shape.name,
    shapeLabel: opts.shape.label,
    shapeIndex: opts.shape.shapeIndex,
    expressionId: opts.expression.id,
    eyes: opts.expression.eyes,
    brows: opts.expression.brows,
    eyeGap: opts.expression.eyeGap,
    ink,
    fy: opts.shape.fy,
    fs: opts.shape.fs,
    handle: opts.shape.handle,
    shapePath: opts.shape.svgPath,
    facePath: '',
  };
}

const DEFAULT_EXPR = EXPRESSION_BY_ID.get('toon-none')!;

// 6x6 grid: each row contains all 6 legacy shapes in the same order (triangle, square, circle, diamond, star, hexagon),
// and down each column the 6 rows have different colors (blue, yellow, purple, red, green, orange).
export const PROJECT_ICONS: readonly ProjectIconDefinition[] = PROJECT_ICON_COLORS.flatMap(
  (colorDef, rowIdx) =>
    PROJECT_ICON_SHAPES.map((shapeDef, colIdx) => {
      const sh = SHAPE_BY_ID.get(shapeDef.id)!;
      return createIconDefinition({
        id: `${colorDef.id}-${shapeDef.id}`,
        name: `${colorDef.name} ${shapeDef.name}`,
        index: rowIdx * PROJECT_ICON_SHAPES.length + colIdx,
        color: colorDef.color,
        shape: sh,
        expression: DEFAULT_EXPR,
      });
    }),
);

export const DEFAULT_PROJECT_ICON_ID = 'purple-triangle';
export const DEFAULT_PROJECT_ICON =
  PROJECT_ICONS.find((icon) => icon.id === DEFAULT_PROJECT_ICON_ID) ?? PROJECT_ICONS[0];

const ICON_MAP = new Map<string, ProjectIconDefinition>();
for (const icon of PROJECT_ICONS) {
  ICON_MAP.set(icon.id, icon);
  if (!ICON_MAP.has(icon.shapeId)) {
    ICON_MAP.set(icon.shapeId, icon);
  }
  ICON_MAP.set(`icon-${icon.index + 1}`, icon);
  ICON_MAP.set(`icon-${String(icon.index + 1).padStart(2, '0')}`, icon);
  ICON_MAP.set(String(icon.index), icon);
}

const LEGACY_ICON_ALIASES: Record<
  string,
  { targetId: string; shapeId?: string; exprId?: string; color?: string }
> = {
  'coral-circle-smile': { targetId: 'red-circle', exprId: 'happy-none' },
  'yellow-diamond-wink': { targetId: 'yellow-diamond', exprId: 'wink-none' },
  'orange-hexagon-angry': { targetId: 'orange-hexagon', exprId: 'toon-angry' },
  'pink-heart': { targetId: 'red-circle', shapeId: 'heart', color: '#FF5AA5' },
  'teal-triangle-smile': { targetId: 'blue-triangle', exprId: 'happy-none', color: '#1ED8C0' },
  'purple-flower': { targetId: 'purple-circle', shapeId: 'clover' },
  'blue-capsule-sleep': { targetId: 'blue-square', shapeId: 'pill', exprId: 'dash-none' },
  'yellow-star-smile': { targetId: 'yellow-star', exprId: 'happy-none' },
  'coral-triangle-squint': { targetId: 'red-triangle', exprId: 'squint-none' },
  'purple-pentagon': { targetId: 'purple-hexagon' },
  'purple-cloud-smile': { targetId: 'purple-circle', shapeId: 'cloud', exprId: 'happy-none' },
  'green-heart': { targetId: 'green-circle', shapeId: 'heart' },
  'coral-hexagon-cross': { targetId: 'red-hexagon', exprId: 'plus-none' },
  'pink-flower': { targetId: 'red-star', shapeId: 'clover', color: '#FF5AA5' },
  'teal-capsule-wink': { targetId: 'green-square', shapeId: 'pill', exprId: 'wink-none', color: '#1ED8C0' },
  'indigo-square-smile': { targetId: 'blue-square', exprId: 'happy-none' },
  'orange-star-angry': { targetId: 'orange-star', exprId: 'toon-angry' },
};

for (const [legacyId, spec] of Object.entries(LEGACY_ICON_ALIASES)) {
  const base = ICON_MAP.get(spec.targetId);
  if (base) {
    const expr = (spec.exprId && EXPRESSION_BY_ID.get(spec.exprId)) || DEFAULT_EXPR;
    ICON_MAP.set(legacyId, {
      ...base,
      expressionId: expr.id,
      eyes: expr.eyes,
      brows: expr.brows,
      eyeGap: expr.eyeGap,
    });
  }
}

/**
 * Formats a custom or preset combination of (shapeId, expressionId, color) into a valid project icon ID.
 * If it matches one of the 36 base icons with the default expression, returns that canonical ID;
 * otherwise returns `icon-dots-<shapeId>-<expressionId>-<hex>`.
 */
export function formatProjectIconId(opts: {
  shapeId: string;
  expressionId: string;
  color: string;
}): string {
  const shape = SHAPE_BY_ID.get(opts.shapeId) ?? SHAPE_BY_ID.get('circle')!;
  const expr = EXPRESSION_BY_ID.get(opts.expressionId) ?? DEFAULT_EXPR;
  const cleanHex = opts.color.replace('#', '').trim().toLowerCase();
  const validHex = /^[0-9a-f]{6}$/i.test(cleanHex) ? cleanHex : 'a761ee';

  if (expr.id === DEFAULT_EXPR.id) {
    const matchingColor = PROJECT_ICON_COLORS.find(
      (c) => c.color.replace('#', '').toLowerCase() === validHex,
    );
    if (matchingColor && PROJECT_ICON_SHAPES.some((s) => s.id === shape.id)) {
      return `${matchingColor.id}-${shape.id}`;
    }
  }

  return `icon-dots-${shape.id}-${expr.id}-${validHex}`;
}

/**
 * Returns a human-readable name for an avatar color: the dots-lab palette label,
 * then the legacy color name, falling back to the uppercase hex.
 */
export function getProjectColorLabel(hex: string): string {
  const color = hex.trim().toUpperCase();
  const paletteMatch = PROJECT_ICON_PALETTE.find((p) => p.hex.toUpperCase() === color);
  if (paletteMatch) return paletteMatch.label;
  const legacyColorMatch = PROJECT_ICON_COLORS.find((c) => c.color.toUpperCase() === color);
  return legacyColorMatch?.name || color;
}

const CUSTOM_DOTS_ICON_RE = /^icon-dots-([a-z0-9]+)-([a-z0-9]+-[a-z0-9]+)-([0-9a-f]{6})$/i;

function parseCustomDotsIcon(iconId: string): ProjectIconDefinition | null {
  const m = CUSTOM_DOTS_ICON_RE.exec(iconId.trim());
  if (!m) return null;
  const [, rawShapeId, rawExprId, rawHex] = m;
  const shape = SHAPE_BY_ID.get(rawShapeId.toLowerCase());
  const expr = EXPRESSION_BY_ID.get(rawExprId.toLowerCase());
  if (!shape || !expr) return null;
  const color = `#${rawHex.toUpperCase()}`;
  const colorLabel = getProjectColorLabel(color);

  return createIconDefinition({
    id: `icon-dots-${shape.id}-${expr.id}-${rawHex.toLowerCase()}`,
    name: `${colorLabel} ${shape.label}`,
    index: shape.shapeIndex,
    color,
    shape,
    expression: expr,
  });
}

/**
 * Resolves any project icon identifier to a valid ProjectIconDefinition.
 * If the input is missing, invalid, or an old emoji, it falls back to the default icon.
 */
export function getProjectIcon(iconId?: string | null): ProjectIconDefinition {
  if (!iconId) {
    return DEFAULT_PROJECT_ICON;
  }
  const trimmed = iconId.trim();
  const match = ICON_MAP.get(trimmed);
  if (match) {
    return match;
  }
  const custom = parseCustomDotsIcon(trimmed);
  if (custom) {
    return custom;
  }
  return DEFAULT_PROJECT_ICON;
}

/**
 * Checks whether an iconId is one of the valid project icon IDs.
 */
export function isValidProjectIcon(iconId?: string | null): boolean {
  if (!iconId) return false;
  const trimmed = iconId.trim();
  return ICON_MAP.has(trimmed) || parseCustomDotsIcon(trimmed) !== null;
}

/**
 * Converts a hex color (#rrggbb) to an rgba(...) string with specified alpha.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return `rgba(167, 97, 238, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Returns the theme color associated with the given project icon.
 */
export function getProjectColor(iconId?: string | null): string {
  return getProjectIcon(iconId).color;
}

export interface ProjectCardTheme {
  color: string;
  gradientBackground: string;
  hoverGradientBackground: string;
  iconBg: string;
  iconBorder: string;
  hoverBorder: string;
  hoverShadow: string;
}

/**
 * Returns graceful, soft, and smooth color styling for project cards.
 */
export function getProjectCardTheme(iconId?: string | null): ProjectCardTheme {
  const iconDef = getProjectIcon(iconId);
  const c = iconDef.color;

  return {
    color: c,
    gradientBackground: `radial-gradient(130% 130% at 0% 0%, ${hexToRgba(c, 0.13)} 0%, ${hexToRgba(c, 0.035)} 42%, transparent 75%), linear-gradient(160deg, ${hexToRgba(c, 0.04)} 0%, transparent 55%)`,
    hoverGradientBackground: `radial-gradient(130% 130% at 0% 0%, ${hexToRgba(c, 0.19)} 0%, ${hexToRgba(c, 0.06)} 45%, transparent 80%), linear-gradient(160deg, ${hexToRgba(c, 0.07)} 0%, transparent 60%)`,
    iconBg: hexToRgba(c, 0.12),
    iconBorder: hexToRgba(c, 0.24),
    hoverBorder: hexToRgba(c, 0.40),
    hoverShadow: `0 12px 32px -8px ${hexToRgba(c, 0.20)}`,
  };
}
