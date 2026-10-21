import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { getProjectIcon } from '../../utils/projectIcons';
import { getPreviewPose, type PetState } from '../spec';
import { buildPet3D } from './pet3dBuilder';

interface PetModel3DProps {
  icon: string;
  state: PetState;
  paused?: boolean;
}

export const PetModel3D: React.FC<PetModel3DProps> = ({
  icon,
  state,
  paused = false,
}) => {
  const avatar = useMemo(() => getProjectIcon(icon), [icon]);
  const pet3d = useMemo(() => buildPet3D(avatar), [avatar]);

  useEffect(() => {
    return () => {
      pet3d.dispose();
    };
  }, [pet3d]);

  // Playback timer ref
  const elapsedRef = useRef(0);

  // Interactive playful click boop
  const [boopTime, setBoopTime] = useState<number | null>(null);
  const [, setHovered] = useState(false);

  useFrame((_, delta) => {
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
  });

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        setBoopTime(performance.now());
      }}
    >
      <primitive object={pet3d.root} />
    </group>
  );
};
