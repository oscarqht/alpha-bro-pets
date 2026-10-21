import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type GlassBackdropPattern = 'grid' | 'stripes' | 'plain';

function createPattern(pattern: Exclude<GlassBackdropPattern, 'plain'>) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Glass backdrop canvas is unavailable.');
  ctx.fillStyle = '#f5f4ec';
  ctx.fillRect(0, 0, 1024, 1024);
  if (pattern === 'grid') {
    const cell = 40;
    ctx.fillStyle = '#c8d6c2';
    for (let y = 0; y < 1024; y += cell) {
      for (let x = 0; x < 1024; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      }
    }
  } else {
    const colors = ['#c8d6c2', '#f5f4ec', '#c1d9e7', '#f5f4ec', '#ebc6ae', '#f5f4ec'];
    ctx.translate(512, 512);
    ctx.rotate(-Math.PI / 6);
    for (let x = -1024, i = 0; x < 1024; x += 48, i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, -1024, 48, 2048);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A real opaque surface behind the pet, included in the refraction capture.
 * Camera-facing positioning keeps the pattern visible at every orbit angle.
 * Preview only: this component never enters the exported pet object graph.
 */
export function GlassBackdrop({ pattern }: { pattern: Exclude<GlassBackdropPattern, 'plain'> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createPattern(pattern), [pattern]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    mesh.current.position.copy(camera.position).normalize().multiplyScalar(-2);
    mesh.current.quaternion.copy(camera.quaternion);
  });
  return (
    <mesh ref={mesh} name="glass-preview-backdrop">
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
