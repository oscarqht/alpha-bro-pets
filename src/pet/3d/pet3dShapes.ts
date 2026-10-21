import * as THREE from 'three';
import { PROJECT_AVATAR_SHAPES } from '../../utils/projectAvatarShapes';

export interface Shape3DData {
  shape: THREE.Shape;
  width: number;
  height: number;
  radius: number;
  topY: number;
  bottomY: number;
}

const shapeCache = new Map<string, Shape3DData>();

/**
 * Parses the normalized SVG path from PROJECT_AVATAR_SHAPES into a THREE.Shape.
 * Handles SVG path format where commands like M and L can be directly prefixed to numbers (e.g. "M1.0000 0.0000 L0.9989 ...").
 * Inverts Y so that negative SVG coordinates (up) point towards positive Three.js Y (up).
 */
export function getShape3D(shapeId: string): Shape3DData {
  const cached = shapeCache.get(shapeId);
  if (cached) return cached;

  const shapeDef =
    PROJECT_AVATAR_SHAPES.find((s) => s.id === shapeId) ??
    PROJECT_AVATAR_SHAPES[0];

  const threeShape = new THREE.Shape();
  const points: [number, number][] = [];

  // Match commands (M, L, Z) and coordinates (e.g., M1.0000 0.0000, L0.9989 0.0449, Z)
  const regex = /([MLZ])\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)?/gi;
  let match: RegExpExecArray | null;
  let isFirst = true;

  while ((match = regex.exec(shapeDef.svgPath)) !== null) {
    const cmd = match[1].toUpperCase();
    if (cmd === 'M' || cmd === 'L') {
      const x = parseFloat(match[2]);
      const y = -parseFloat(match[3]); // Invert SVG Y to 3D Y
      points.push([x, y]);
      if (isFirst || cmd === 'M') {
        threeShape.moveTo(x, y);
        isFirst = false;
      } else {
        threeShape.lineTo(x, y);
      }
    } else if (cmd === 'Z') {
      if (threeShape.curves.length > 0) {
        threeShape.closePath();
      }
    }
  }

  // Calculate bounding dimensions
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const width = isFinite(maxX - minX) ? maxX - minX : 2;
  const height = isFinite(maxY - minY) ? maxY - minY : 2;
  const radius = isFinite(minX) && isFinite(maxX) ? Math.max(Math.abs(minX), Math.abs(maxX)) : 1;

  const data: Shape3DData = {
    shape: threeShape,
    width,
    height,
    radius,
    topY: maxY,
    bottomY: minY,
  };

  shapeCache.set(shapeId, data);
  return data;
}
