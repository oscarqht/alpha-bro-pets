import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Rotate3d, Compass, Sparkles } from 'lucide-react';
import type { PetState } from '../spec';
import { PetModel3D } from './PetModel3D';
import type { CameraPOV } from './pet3dExport';
import { DEFAULT_POV } from './pet3dExport';

export interface PetCanvas3DHandle {
  getPOV: () => CameraPOV;
  getFurSettings: () => { furLength: number; messiness: number };
  resetCamera: () => void;
  setPreset: (preset: 'front' | 'isometric' | 'side') => void;
  fluff?: () => void;
}

export interface PetCanvas3DProps {
  icon: string;
  state: PetState;
  paused?: boolean;
  furry?: boolean;
  className?: string;
  onPovChange?: (pov: CameraPOV) => void;
}

export const PetCanvas3D = forwardRef<PetCanvas3DHandle, PetCanvas3DProps>(
  ({ icon, state, paused = false, furry = false, className = '', onPovChange }, ref) => {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const [autoRotate, setAutoRotate] = useState(false);
    const [fluffTrigger, setFluffTrigger] = useState(0);
    const [furStyle, setFurStyle] = useState<'shaggy' | 'wild' | 'plush'>('shaggy');

    const furLength = furStyle === 'wild' ? 0.32 : furStyle === 'shaggy' ? 0.26 : 0.18;
    const messiness = furStyle === 'wild' ? 0.20 : furStyle === 'shaggy' ? 0.14 : 0.08;

    function extractCurrentPOV(): CameraPOV {
      if (controlsRef.current) {
        const cam = controlsRef.current.object as THREE.PerspectiveCamera;
        const target = controlsRef.current.target;
        return {
          position: [cam.position.x, cam.position.y, cam.position.z],
          quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
          target: [target.x, target.y, target.z],
          fov: cam.fov,
          zoom: cam.zoom,
        };
      }
      return DEFAULT_POV;
    }

    function resetCamera() {
      if (controlsRef.current) {
        setAutoRotate(false);
        controlsRef.current.reset();
        const pov = extractCurrentPOV();
        onPovChange?.(pov);
      }
    }

    function setPreset(preset: 'front' | 'isometric' | 'side') {
      if (!controlsRef.current) return;
      setAutoRotate(false);
      const cam = controlsRef.current.object as THREE.PerspectiveCamera;
      controlsRef.current.target.set(0, 0, 0);

      if (preset === 'front') {
        cam.position.set(0, 0.25, 4.6);
      } else if (preset === 'isometric') {
        cam.position.set(3.0, 1.6, 3.5);
      } else if (preset === 'side') {
        cam.position.set(4.6, 0.25, 0);
      }
      cam.lookAt(0, 0, 0);
      controlsRef.current.update();
      const pov = extractCurrentPOV();
      onPovChange?.(pov);
    }

    useImperativeHandle(ref, () => ({
      getPOV: extractCurrentPOV,
      getFurSettings: () => ({ furLength, messiness }),
      resetCamera,
      setPreset,
      fluff: () => setFluffTrigger(Date.now()),
    }));

    return (
      <div className={`relative w-full h-full select-none ${className}`}>
        {/* 3D WebGL Canvas */}
        <Canvas
          shadows
          camera={{ position: [0, 0.25, 4.6], fov: 38 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
        >
          {/* Studio Lighting Setup */}
          <ambientLight intensity={0.7} />
          <hemisphereLight
            args={['#ffffff', '#8fa382', 0.55]}
            position={[0, 10, 0]}
          />

          {/* Warm Key Light */}
          <directionalLight
            position={[4, 6, 5]}
            intensity={1.8}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={15}
            shadow-camera-left={-2.5}
            shadow-camera-right={2.5}
            shadow-camera-top={2.5}
            shadow-camera-bottom={-2.5}
            shadow-bias={-0.001}
          />

          {/* Cool Fill Light */}
          <directionalLight
            position={[-4, 3, 3]}
            intensity={0.65}
            color="#dbeafe"
          />

          {/* Back / Rim Light */}
          <directionalLight
            position={[0, 4, -4]}
            intensity={0.8}
            color="#fef3c7"
          />

          {/* Ground Pedestal Disc (Preview only - excluded from export) */}
          <group position={[0, -1.25, 0]}>
            {/* Subtle Stage Disc Base */}
            <mesh receiveShadow position={[0, -0.05, 0]}>
              <cylinderGeometry args={[1.5, 1.55, 0.1, 48]} />
              <meshStandardMaterial
                color="#e2e6d8"
                roughness={0.6}
                metalness={0.05}
              />
            </mesh>
            {/* Inner Inset Ring */}
            <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.32, 1.36, 48]} />
              <meshBasicMaterial color="#d4dac6" />
            </mesh>
          </group>

          {/* Animated 3D Pet Model */}
          <React.Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              <PetModel3D
                icon={icon}
                state={state}
                paused={paused}
                furry={furry}
                furLength={furLength}
                messiness={messiness}
                fluffTrigger={fluffTrigger}
              />
            </group>
          </React.Suspense>

          {/* Interactive Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            autoRotate={autoRotate}
            autoRotateSpeed={2.5}
            enablePan={false}
            minDistance={2.8}
            maxDistance={7.0}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2 + 0.1}
            dampingFactor={0.08}
            onChange={() => {
              if (onPovChange) {
                onPovChange(extractCurrentPOV());
              }
            }}
          />
        </Canvas>

        {/* Sleek Stage 3D Control Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-auto">
          {furry && (
            <>
              <button
                type="button"
                onClick={() => {
                  setFurStyle((prev) => (prev === 'shaggy' ? 'wild' : prev === 'wild' ? 'plush' : 'shaggy'));
                  setFluffTrigger(Date.now());
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border bg-[#fffdf5] text-[#92400e] border-[#fcd34d] hover:bg-[#fef3c7] shadow-2xs transition-all active:scale-95"
                title={`Click to switch fur style (Current: ${furStyle === 'shaggy' ? 'Shaggy Fleece' : furStyle === 'wild' ? 'Extra Wild' : 'Plush'})`}
                aria-label="Switch fur style"
              >
                <span>{furStyle === 'shaggy' ? '🧶 Shaggy' : furStyle === 'wild' ? '🦁 Wild' : '🧸 Plush'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFluffTrigger(Date.now())}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border bg-[#fffdf5] text-[#92400e] border-[#fcd34d] hover:bg-[#fef3c7] shadow-2xs transition-all active:scale-95"
                title="Shake and fluff the messy fur"
                aria-label="Fluff the soft fur"
              >
                <Sparkles size={11} className="text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Fluff</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border transition-all ${
              autoRotate
                ? 'bg-[#5c6951] text-[#fffdf6] border-[#5c6951] shadow-xs'
                : 'bg-[#ffffffd6] text-[#5c6951] border-[#dce2d3] hover:bg-white'
            }`}
            title={autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'}
            aria-label={autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'}
          >
            <Rotate3d size={12} className={autoRotate ? 'animate-spin' : ''} />
            <span>{autoRotate ? 'Spinning' : 'Spin'}</span>
          </button>

          <button
            type="button"
            onClick={resetCamera}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border bg-[#ffffffd6] text-[#5c6951] border-[#dce2d3] hover:bg-white transition-all"
            title="Reset 3D camera to front view"
            aria-label="Reset 3D camera to front view"
          >
            <Compass size={12} />
            <span>Front</span>
          </button>

          <button
            type="button"
            onClick={() => setPreset('isometric')}
            className="px-2 py-1 text-[10px] font-medium rounded-md border bg-[#ffffffd6] text-[#5c6951] border-[#dce2d3] hover:bg-white transition-all"
            title="Switch to 3/4 isometric perspective view"
            aria-label="3/4 perspective view"
          >
            3/4
          </button>

          <button
            type="button"
            onClick={() => setPreset('side')}
            className="px-2 py-1 text-[10px] font-medium rounded-md border bg-[#ffffffd6] text-[#5c6951] border-[#dce2d3] hover:bg-white transition-all"
            title="Switch to side profile view"
            aria-label="Side profile view"
          >
            Side
          </button>
        </div>

        {/* Sleek interaction hint pill at bottom center (never overlaps top controls) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#637257] bg-[#ffffffea] px-3 py-1 rounded-full border border-[#dce2d3] pointer-events-none tracking-wide shadow-2xs whitespace-nowrap z-10">
          {furry ? 'Rotate view to feel plush fur physics · Drag to pet' : 'Drag to rotate · Click to boop'}
        </div>
      </div>
    );
  }
);

PetCanvas3D.displayName = 'PetCanvas3D';
