import React, { useMemo } from 'react';
import * as THREE from 'three';
import type {
  ProjectAvatarBrowType,
  ProjectAvatarEyeType,
} from '../../utils/projectIcons';

interface PetFace3DProps {
  eyes: ProjectAvatarEyeType;
  brows: ProjectAvatarBrowType;
  eyeGap: number;
  ink: string;
  frontZ: number;
}

function getEyeHalfHeight(eyeType: ProjectAvatarEyeType): number {
  switch (eyeType) {
    case 'toon':
      return 0.175;
    case 'pill':
    case 'ring':
      return 0.11;
    case 'dot':
      return 0.09;
    default:
      return 0.1;
  }
}

/**
 * Creates 3D geometry for a single eye feature.
 */
function SingleEye3D({
  eyeType,
  side,
  ink,
  frontZ,
}: {
  eyeType: ProjectAvatarEyeType;
  side: -1 | 1;
  ink: string;
  frontZ: number;
}) {
  const actualType =
    eyeType === 'wink' ? (side < 0 ? 'toon' : 'squint') : eyeType;

  const inkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ink,
        roughness: 0.25,
        metalness: 0.08,
      }),
    [ink]
  );

  const whiteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.15,
        metalness: 0.02,
      }),
    []
  );

  const pupilMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#141416',
        roughness: 0.1,
        metalness: 0.1,
      }),
    []
  );

  if (actualType === 'toon') {
    return (
      <group position={[0, 0, frontZ]}>
        {/* Sclera (White eye background) */}
        <mesh scale={[0.14, 0.175, 0.04]} castShadow>
          <sphereGeometry args={[1, 24, 24]} />
          <primitive object={whiteMaterial} attach="material" />
        </mesh>
        {/* Pupil */}
        <mesh
          position={[-side * 0.015, -0.02, 0.03]}
          scale={[0.085, 0.092, 0.03]}
          castShadow
        >
          <sphereGeometry args={[1, 20, 20]} />
          <primitive object={pupilMaterial} attach="material" />
        </mesh>
        {/* Catchlight sparkle */}
        <mesh
          position={[-side * 0.03 + 0.02, 0.03, 0.045]}
          scale={[0.025, 0.025, 0.02]}
        >
          <sphereGeometry args={[1, 12, 12]} />
          <primitive object={whiteMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'pill') {
    return (
      <group position={[0, 0, frontZ]}>
        <mesh scale={[0.04, 0.11, 0.03]} castShadow>
          <capsuleGeometry args={[1, 1, 8, 16]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'dot') {
    return (
      <group position={[0, 0, frontZ]}>
        <mesh scale={[0.085, 0.09, 0.03]} castShadow>
          <sphereGeometry args={[1, 20, 20]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'ring') {
    return (
      <group position={[0, 0, frontZ]}>
        <mesh scale={[1, 1.15, 1]} castShadow>
          <torusGeometry args={[0.08, 0.022, 12, 28]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'happy') {
    return (
      <group position={[0, 0.02, frontZ]}>
        <mesh rotation={[0, 0, Math.PI]} castShadow>
          <torusGeometry args={[0.08, 0.022, 10, 24, Math.PI]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'plus') {
    return (
      <group position={[0, 0, frontZ]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.04, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.18, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'dash') {
    return (
      <group position={[0, 0, frontZ]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.18, 0.04, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
          <boxGeometry args={[0.18, 0.04, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'slash') {
    return (
      <group position={[0, 0, frontZ]}>
        <mesh rotation={[0, 0, Math.PI / 6]} castShadow>
          <boxGeometry args={[0.04, 0.2, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  if (actualType === 'squint') {
    const angle = side < 0 ? Math.PI / 4 : -Math.PI / 4;
    return (
      <group position={[0, 0, frontZ]}>
        <mesh position={[side * 0.025, 0.04, 0]} rotation={[0, 0, angle]} castShadow>
          <boxGeometry args={[0.1, 0.035, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
        <mesh position={[side * 0.025, -0.04, 0]} rotation={[0, 0, -angle]} castShadow>
          <boxGeometry args={[0.1, 0.035, 0.025]} />
          <primitive object={inkMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0, frontZ]}>
      <mesh scale={[0.085, 0.09, 0.03]} castShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <primitive object={inkMaterial} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * 3D Eyebrows.
 */
function Brows3D({
  eyeType,
  brows,
  eyeGap,
  ink,
  frontZ,
}: {
  eyeType: ProjectAvatarEyeType;
  brows: ProjectAvatarBrowType;
  eyeGap: number;
  ink: string;
  frontZ: number;
}) {
  const inkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ink,
        roughness: 0.25,
        metalness: 0.08,
      }),
    [ink]
  );

  if (brows === 'none') return null;

  const hh = getEyeHalfHeight(eyeType === 'wink' ? 'toon' : eyeType);
  const by = hh + 0.075; // Above the eyes in 3D Y
  const bw = 0.2;
  const bh = 0.055;
  const bd = 0.03;

  return (
    <>
      {([-1, 1] as const).map((side) => {
        let rotRad = 0;
        let dy = 0;
        if (brows === 'angry') {
          rotRad = -side * 0.32;
        } else if (brows === 'worried') {
          rotRad = side * 0.28;
        } else if (brows === 'sceptic') {
          if (side < 0) {
            rotRad = 0.3;
          } else {
            dy = 0.05;
            rotRad = 0.06;
          }
        }

        return (
          <group
            key={side}
            position={[side * eyeGap, by + dy, frontZ]}
            rotation={[0, 0, rotRad]}
          >
            <mesh castShadow>
              <boxGeometry args={[bw, bh, bd]} />
              <primitive object={inkMaterial} attach="material" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export const PetFace3D: React.FC<PetFace3DProps> = ({
  eyes,
  brows,
  eyeGap,
  ink,
  frontZ,
}) => {
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * eyeGap, 0, 0]}>
          <SingleEye3D
            eyeType={eyes}
            side={side}
            ink={ink}
            frontZ={frontZ}
          />
        </group>
      ))}
      <Brows3D
        eyeType={eyes}
        brows={brows}
        eyeGap={eyeGap}
        ink={ink}
        frontZ={frontZ}
      />
    </group>
  );
};
