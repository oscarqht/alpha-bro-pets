import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { getProjectIcon } from '../../utils/projectIcons';
import { getPreviewPose, type PetState } from '../spec';
import { buildPet3D } from './pet3dBuilder';

interface PetModel3DProps {
  icon: string;
  state: PetState;
  paused?: boolean;
  furry?: boolean;
  glass?: boolean;
  furLength?: number;
  messiness?: number;
  fluffTrigger?: number;
}

export const PetModel3D: React.FC<PetModel3DProps> = ({
  icon,
  state,
  paused = false,
  furry = false,
  glass = false,
  furLength,
  messiness,
  fluffTrigger = 0,
}) => {
  const avatar = useMemo(() => getProjectIcon(icon), [icon]);
  const pet3d = useMemo(() => buildPet3D(avatar, { furry, glass }), [avatar, furry, glass]);

  useEffect(() => {
    return () => {
      pet3d.dispose();
    };
  }, [pet3d]);

  // Dynamic fur length & messiness tuning
  useEffect(() => {
    if (furLength !== undefined) {
      pet3d.setFurLength?.(furLength);
    }
  }, [furLength, pet3d]);

  useEffect(() => {
    if (messiness !== undefined) {
      pet3d.setMessiness?.(messiness);
    }
  }, [messiness, pet3d]);

  // Respond to Fluff button trigger with a joyful plush shake
  const lastFluffRef = useRef(fluffTrigger);
  useEffect(() => {
    if (fluffTrigger > 0 && fluffTrigger !== lastFluffRef.current) {
      lastFluffRef.current = fluffTrigger;
      pet3d.addFurImpulse?.(
        (Math.random() - 0.5) * 0.22,
        0.18,
        (Math.random() - 0.5) * 0.16
      );
    }
  }, [fluffTrigger, pet3d]);

  // Playback timer ref
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = 0;
  }, [state]);

  // Interactive playful click boop
  const [boopTime, setBoopTime] = useState<number | null>(null);
  const [, setHovered] = useState(false);

  useFrame((stateCtx, delta) => {
    if (!paused) {
      elapsedRef.current += delta * 1000;
    }
    const pose = getPreviewPose(state, elapsedRef.current);

    // Click boop bounce effect
    let boopY = 0;
    let boopScale = 1;
    if (boopTime !== null) {
      const t = (performance.now() - boopTime) / 1000;
      if (t < 0.6) {
        boopY = Math.sin(t * 18) * 0.15 * Math.exp(-t * 5);
        boopScale = 1 + Math.sin(t * 22) * 0.12 * Math.exp(-t * 4);
      } else {
        setBoopTime(null);
      }
    }

    pet3d.applyPose(pose, { y: boopY, scale: boopScale });

    // Update dynamic reactive fur physics relative to camera rotation and view movement
    if (furry && pet3d.updateFurPhysics) {
      pet3d.updateFurPhysics(delta, stateCtx.camera, boopY, stateCtx.gl);
    }
  });

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => { setHovered(false); pet3d.setFurPointer?.(null); }}
      onPointerMove={(e) => {
        if (furry) pet3d.setFurPointer?.(pet3d.petRoot.worldToLocal(e.point.clone()));
        // Petting reaction: dragging cursor across the fur gently combs/swishes it
        if (furry && pet3d.addFurImpulse && (e.buttons > 0 || Math.abs(e.movementX) > 2)) {
          pet3d.addFurImpulse(
            e.movementX * 0.0035,
            -e.movementY * 0.0035,
            0.015
          );
        }
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setBoopTime(performance.now());
        if (furry && pet3d.addFurImpulse) {
          pet3d.addFurImpulse(0, 0.12, 0.06);
        }
      }}
    >
      <primitive object={pet3d.root} />
    </group>
  );
};
