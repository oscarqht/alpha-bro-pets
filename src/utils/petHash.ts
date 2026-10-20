import {
  PROJECT_AVATAR_SHAPES,
  PROJECT_ICON_EXPRESSIONS,
  PROJECT_ICON_PALETTE,
  PROJECT_ICON_COLORS,
  formatProjectIconId,
  getProjectIcon,
  type ProjectIconDefinition,
} from './projectIcons';

// Shape aliases for flexible URL matching
const SHAPE_ALIASES: Record<string, string> = {
  round: 'circle',
  capsule: 'pill',
  briefcase: 'bag',
  flower: 'clover',
  cross: 'plus',
};

// Expression/eye aliases for flexible URL matching
const EYE_ALIASES: Record<string, string> = {
  dots: 'dot',
  rings: 'ring',
  pills: 'pill',
  slashes: 'slash',
  cross: 'dash',
  crosses: 'dash',
  x: 'dash',
  smile: 'happy',
  smiling: 'happy',
  winking: 'wink',
};

const BROW_ALIASES: Record<string, string> = {
  straight: 'flat',
  skeptical: 'sceptic',
};

// Named colors mapping
const NAMED_COLORS: Record<string, string> = {
  yellow: '#FFC20E',
  sun: '#FFC20E',
  orange: '#EE7433',
  blue: '#3F95F5',
  sky: '#3F95F5',
  purple: '#8844EE',
  violet: '#8844EE',
  lilac: '#9966FF',
  red: '#FF5A5A',
  tomato: '#FF5A5A',
  coral: '#FF5A5A',
  green: '#5CCB77',
  mint: '#5CCB77',
  lime: '#A8D13B',
  pink: '#FF5AA5',
  teal: '#1ED8C0',
  lagoon: '#1ED8C0',
  hazel: '#8A5A3A',
  leather: '#B07350',
  brown: '#B07350',
  chalk: '#E4E4E1',
  white: '#E4E4E1',
  ink: '#161618',
  black: '#161618',
  grey: '#8E8E8E',
  gray: '#8E8E8E',
  'royal-blue': '#2F6BF0',
  'royal blue': '#2F6BF0',
  royal: '#2F6BF0',
  'powder-pink': '#F7B8CF',
  'powder pink': '#F7B8CF',
  'pale-blue': '#BFE0F5',
  'pale blue': '#BFE0F5',
};

/**
 * Resolves a shape identifier from user input or URL query.
 */
export function resolveShapeId(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  const alias = SHAPE_ALIASES[clean] || clean;

  const found = PROJECT_AVATAR_SHAPES.find(
    (s) =>
      s.id.toLowerCase() === alias ||
      s.name.toLowerCase() === clean ||
      s.label.toLowerCase() === clean,
  );

  return found ? found.id : null;
}

/**
 * Resolves an expression ID (e.g. 'toon-flat' or 'toon-none') from eyes and optional brows.
 */
export function resolveExpressionId(
  rawEyes?: string | null,
  rawBrows?: string | null,
): string | null {
  if (!rawEyes) return null;
  const cleanEyes = rawEyes.trim().toLowerCase();
  const cleanBrows = rawBrows ? rawBrows.trim().toLowerCase() : '';
  const aliasedBrows = BROW_ALIASES[cleanBrows] || cleanBrows;

  // 1. If explicit brows provided (e.g. eyes=toon&brows=flat)
  if (aliasedBrows) {
    const combined = `${EYE_ALIASES[cleanEyes] || cleanEyes}-${aliasedBrows}`;
    const match = PROJECT_ICON_EXPRESSIONS.find((e) => e.id === combined);
    if (match) return match.id;
  }

  // 2. Direct match on expression ID (e.g. eyes=toon-flat or eyes=toon-none)
  const directMatch = PROJECT_ICON_EXPRESSIONS.find(
    (e) => e.id.toLowerCase() === cleanEyes,
  );
  if (directMatch) return directMatch.id;

  // 3. Match on eye type alone, defaulting to 'none' brows (e.g. eyes=toon -> toon-none)
  const eyeKey = EYE_ALIASES[cleanEyes] || cleanEyes;
  const eyeNoneMatch = PROJECT_ICON_EXPRESSIONS.find(
    (e) => e.eyes === eyeKey && e.brows === 'none',
  );
  if (eyeNoneMatch) return eyeNoneMatch.id;

  // 4. Any match starting with that eye type
  const anyEyeMatch = PROJECT_ICON_EXPRESSIONS.find((e) => e.eyes === eyeKey);
  if (anyEyeMatch) return anyEyeMatch.id;

  return null;
}

/**
 * Resolves a hex color string from URL query (hex code, with/without #, or color name).
 */
export function resolveColorHex(raw?: string | null): string | null {
  if (!raw) return null;
  let clean = raw.trim().replace(/^%23/i, '').replace(/^#+/, '');

  // 3-digit hex
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // 6-digit hex
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }

  // Check named colors dictionary
  const lower = raw.trim().toLowerCase();
  if (NAMED_COLORS[lower]) {
    return NAMED_COLORS[lower];
  }

  // Check dots-lab palette labels
  const paletteMatch = PROJECT_ICON_PALETTE.find(
    (p) => p.label.toLowerCase() === lower,
  );
  if (paletteMatch) return paletteMatch.hex;

  // Check legacy colors
  const legacyMatch = PROJECT_ICON_COLORS.find(
    (c) => c.name.toLowerCase() === lower || c.id.toLowerCase() === lower,
  );
  if (legacyMatch) return legacyMatch.color;

  return null;
}

export interface ParsedPetHash {
  shapeId?: string;
  expressionId?: string;
  color?: string;
  name?: string;
}

/**
 * Parses URL hash query string (e.g. "#shape=triangle&eyes=toon&color=FFC20E").
 */
export function parsePetHash(hash?: string | null): ParsedPetHash | null {
  if (!hash) return null;

  // Strip leading hash and optional query indicator (#? or #)
  const rawQuery = hash.replace(/^#[?]*/, '').trim();
  if (!rawQuery) return null;

  // Use URLSearchParams for standard decoding
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(rawQuery);
  } catch {
    return null;
  }

  const rawShape = params.get('shape') || params.get('avatar');
  const rawEyes = params.get('eyes') || params.get('expression') || params.get('face');
  const rawBrows = params.get('brows');
  const rawColor = params.get('color') || params.get('hex');
  const rawName = params.get('name');

  const shapeId = resolveShapeId(rawShape);
  const expressionId = resolveExpressionId(rawEyes, rawBrows);
  const color = resolveColorHex(rawColor);
  const name = rawName ? rawName.trim().slice(0, 40) : undefined;

  if (!shapeId && !expressionId && !color && !name) {
    return null;
  }

  return {
    shapeId: shapeId || undefined,
    expressionId: expressionId || undefined,
    color: color || undefined,
    name,
  };
}

/**
 * Builds the URL hash query string from the current avatar definition.
 * e.g. "#shape=triangle&eyes=toon&color=FFC20E" or "#shape=triangle&eyes=toon-flat&color=FFC20E"
 */
export function buildPetHash(avatar: ProjectIconDefinition): string {
  const shape = avatar.shapeId;
  const eyes =
    avatar.brows && avatar.brows !== 'none'
      ? avatar.expressionId
      : avatar.eyes;
  const color = avatar.color.replace('#', '').toUpperCase();

  const params = new URLSearchParams();
  params.set('shape', shape);
  params.set('eyes', eyes);
  params.set('color', color);

  return `#${params.toString()}`;
}

/**
 * Combines URL hash parameters with fallback icon attributes to produce a valid icon ID.
 */
export function getPetIconFromHash(
  hash?: string | null,
  fallbackIconId?: string,
): { icon: string; name?: string } | null {
  const parsed = parsePetHash(hash);
  if (!parsed) return null;

  const fallback = getProjectIcon(fallbackIconId);

  const shapeId = parsed.shapeId || fallback.shapeId;
  const expressionId = parsed.expressionId || fallback.expressionId;
  const color = parsed.color || fallback.color;

  const icon = formatProjectIconId({
    shapeId,
    expressionId,
    color,
  });

  return {
    icon,
    name: parsed.name,
  };
}
