import { useEffect, useRef, useState } from 'react';
import { CELL_HEIGHT, CELL_WIDTH, type PetState } from './spec';
import { loadAvatarLayers, renderPetPreview } from './renderer';

export interface PetPreviewProps {
  icon: string;
  state: PetState;
  className?: string;
  paused?: boolean;
}

export function PetPreview({ icon, state, className, paused = false }: PetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef({ key: '', elapsed: 0 });
  const [error, setError] = useState('');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let disposed = false;
    let request = 0;
    const key = `${icon}:${state}`;
    if (playbackRef.current.key !== key) playbackRef.current = { key, elapsed: 0 };
    setError('');
    void loadAvatarLayers(icon).then((layers) => {
      if (disposed) return;
      const context = canvasRef.current?.getContext('2d');
      if (!context) { setError('Preview is unavailable in this browser.'); return; }
      let previous = performance.now();
      const draw = (now: number) => {
        if (disposed) return;
        if (!paused && !reducedMotion) playbackRef.current.elapsed += now - previous;
        previous = now;
        context.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
        renderPetPreview(context, layers, state, reducedMotion ? 0 : playbackRef.current.elapsed);
        if (!paused && !reducedMotion) request = requestAnimationFrame(draw);
      };
      draw(previous);
    }).catch((reason: unknown) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : 'Preview failed.');
    });
    return () => { disposed = true; cancelAnimationFrame(request); };
  }, [icon, state, paused, reducedMotion]);

  return <>
    <canvas ref={canvasRef} width={CELL_WIDTH} height={CELL_HEIGHT} className={className}
      role="img" aria-label={`Selected avatar: ${state.replaceAll('-', ' ')} animation`} />
    {error && <p role="alert">{error}</p>}
  </>;
}
