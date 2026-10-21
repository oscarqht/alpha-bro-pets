import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { FramePose } from '../spec';

interface PetKeyboard3DProps {
  pose: FramePose;
  petColor: string;
  shapeRadius?: number;
}

export const PetKeyboard3D: React.FC<PetKeyboard3DProps> = ({
  pose,
  petColor,
  shapeRadius = 1,
}) => {
  const { typeLx, typeLy, typeRx, typeRy } = pose;
  if (typeLx === null || typeLy === null || typeRx === null || typeRy === null) {
    return null;
  }

  // Calculate realistic typing paw positions in 3D world space
  const pawScale = 0.018;
  const leftPawX = typeLx * pawScale;
  const rightPawX = typeRx * pawScale;

  // The keyboard sits down at desk/lap level (y = -0.92, z = 0.58)
  const kbBaseY = -0.92;
  const kbBaseZ = 0.58;

  const hitL = typeLy >= -11;
  const hitR = typeRy >= -11;

  // Vertical paw travel: when striking, paw lands on the key (-0.84); when raised, it lifts up to -0.68
  const leftPawY = kbBaseY + 0.12 + Math.max(0, -typeLy - 9) * 0.015;
  const rightPawY = kbBaseY + 0.12 + Math.max(0, -typeRy - 9) * 0.015;

  const leftPawZ = kbBaseZ + 0.02;
  const rightPawZ = kbBaseZ + 0.02;

  // Shoulder width adapts naturally to pet body width
  const shoulderDist = Math.max(0.42, Math.min(0.72, shapeRadius * 0.72));
  const shoulderY = -0.25;
  const shoulderZ = 0.15;

  // Generate 3D curved arms from shoulders to paws
  const leftArmCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(-shoulderDist * 1.05, (shoulderY + leftPawY) * 0.55, (shoulderZ + leftPawZ) * 0.5),
      new THREE.Vector3(leftPawX - 0.02, leftPawY + 0.08, leftPawZ - 0.04),
      new THREE.Vector3(leftPawX, leftPawY, leftPawZ),
    ]);
  }, [shoulderDist, leftPawX, leftPawY, leftPawZ]);

  const rightArmCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(shoulderDist * 1.05, (shoulderY + rightPawY) * 0.55, (shoulderZ + rightPawZ) * 0.5),
      new THREE.Vector3(rightPawX + 0.02, rightPawY + 0.08, rightPawZ - 0.04),
      new THREE.Vector3(rightPawX, rightPawY, rightPawZ),
    ]);
  }, [shoulderDist, rightPawX, rightPawY, rightPawZ]);

  // Ghost trailing arms for rapid motion blur effect
  const ghostLeftArmCurve = useMemo(() => {
    const ghostY = hitL ? leftPawY + 0.1 : leftPawY - 0.08;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(-shoulderDist * 1.12, (shoulderY + ghostY) * 0.5, (shoulderZ + leftPawZ) * 0.5),
      new THREE.Vector3(leftPawX - 0.05, ghostY, leftPawZ - 0.02),
    ]);
  }, [shoulderDist, leftPawX, leftPawY, leftPawZ, hitL]);

  const ghostRightArmCurve = useMemo(() => {
    const ghostY = hitR ? rightPawY + 0.1 : rightPawY - 0.08;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(shoulderDist * 1.12, (shoulderY + ghostY) * 0.5, (shoulderZ + rightPawZ) * 0.5),
      new THREE.Vector3(rightPawX + 0.05, ghostY, rightPawZ - 0.02),
    ]);
  }, [shoulderDist, rightPawX, rightPawY, rightPawZ, hitR]);

  // Arm materials
  const armMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: petColor,
        roughness: 0.28,
        metalness: 0.04,
      }),
    [petColor]
  );

  const ghostArmMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: petColor,
        roughness: 0.3,
        transparent: true,
        opacity: 0.28,
      }),
    [petColor]
  );

  // Keyboard materials
  const chassisMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1b1e28',
        roughness: 0.35,
        metalness: 0.3,
      }),
    []
  );

  const bezelPlateMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#252936',
        roughness: 0.4,
        metalness: 0.2,
      }),
    []
  );

  const keyDefaultMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#343a4e',
        roughness: 0.3,
        metalness: 0.08,
      }),
    []
  );

  const keyAccentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f43f5e',
        roughness: 0.25,
        metalness: 0.1,
      }),
    []
  );

  const keyActiveMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.8,
        roughness: 0.15,
      }),
    []
  );

  const sparkMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
      }),
    []
  );

  const goldSparkMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fde047',
      }),
    []
  );

  const sweatMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transmission: 0.85,
        opacity: 0.9,
        transparent: true,
        roughness: 0.1,
        ior: 1.33,
      }),
    []
  );

  // Key rows layout
  const row1Keys = [-0.44, -0.31, -0.19, -0.06, 0.06, 0.19, 0.31, 0.44];
  const row2Keys = [-0.42, -0.29, -0.16, -0.03, 0.09, 0.22, 0.35];

  return (
    <group>
      {/* --- Connecting 3D Arms --- */}
      {/* Left primary arm */}
      <mesh castShadow>
        <tubeGeometry args={[leftArmCurve, 20, 0.055, 12, false]} />
        <primitive object={armMaterial} attach="material" />
      </mesh>
      {/* Left typing paw */}
      <mesh position={[leftPawX, leftPawY, leftPawZ]} castShadow>
        <sphereGeometry args={[0.075, 18, 18]} />
        <primitive object={armMaterial} attach="material" />
      </mesh>

      {/* Left ghost motion blur arm */}
      <mesh>
        <tubeGeometry args={[ghostLeftArmCurve, 14, 0.045, 8, false]} />
        <primitive object={ghostArmMaterial} attach="material" />
      </mesh>
      <mesh position={[leftPawX - 0.05, hitL ? leftPawY + 0.1 : leftPawY - 0.08, leftPawZ - 0.02]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <primitive object={ghostArmMaterial} attach="material" />
      </mesh>

      {/* Right primary arm */}
      <mesh castShadow>
        <tubeGeometry args={[rightArmCurve, 20, 0.055, 12, false]} />
        <primitive object={armMaterial} attach="material" />
      </mesh>
      {/* Right typing paw */}
      <mesh position={[rightPawX, rightPawY, rightPawZ]} castShadow>
        <sphereGeometry args={[0.075, 18, 18]} />
        <primitive object={armMaterial} attach="material" />
      </mesh>

      {/* Right ghost motion blur arm */}
      <mesh>
        <tubeGeometry args={[ghostRightArmCurve, 14, 0.045, 8, false]} />
        <primitive object={ghostArmMaterial} attach="material" />
      </mesh>
      <mesh position={[rightPawX + 0.05, hitR ? rightPawY + 0.1 : rightPawY - 0.08, rightPawZ - 0.02]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <primitive object={ghostArmMaterial} attach="material" />
      </mesh>

      {/* --- 3D Mechanical Keyboard --- */}
      <group position={[0, kbBaseY, kbBaseZ]} rotation={[-0.24, 0, 0]}>
        {/* Chassis Outer Beveled Base */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.25, 0.065, 0.44]} />
          <primitive object={chassisMaterial} attach="material" />
        </mesh>

        {/* Chassis Inner Switch Plate (Recessed) */}
        <mesh position={[0, 0.025, 0]}>
          <boxGeometry args={[1.18, 0.03, 0.38]} />
          <primitive object={bezelPlateMaterial} attach="material" />
        </mesh>

        {/* Front RGB Accent Light Strip */}
        <mesh position={[0, -0.015, 0.222]}>
          <boxGeometry args={[1.2, 0.012, 0.005]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Keyboard Row 1 */}
        {row1Keys.map((x, idx) => {
          const isHit =
            (hitL && Math.abs(leftPawX - x) < 0.09) ||
            (hitR && Math.abs(rightPawX - x) < 0.09);
          const isAccent = idx === 0; // Esc key accent
          return (
            <mesh
              key={`r1-${idx}`}
              position={[x, isHit ? 0.032 : 0.055, -0.1]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.04, 0.09]} />
              <primitive
                object={isHit ? keyActiveMat : isAccent ? keyAccentMat : keyDefaultMat}
                attach="material"
              />
            </mesh>
          );
        })}

        {/* Keyboard Row 2 */}
        {row2Keys.map((x, idx) => {
          const isHit =
            (hitL && Math.abs(leftPawX - x) < 0.09) ||
            (hitR && Math.abs(rightPawX - x) < 0.09);
          return (
            <mesh
              key={`r2-${idx}`}
              position={[x, isHit ? 0.032 : 0.055, 0.01]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.04, 0.09]} />
              <primitive
                object={isHit ? keyActiveMat : keyDefaultMat}
                attach="material"
              />
            </mesh>
          );
        })}

        {/* Row 2 Enter Key Accent */}
        <mesh
          position={[0.45, (hitR && Math.abs(rightPawX - 0.45) < 0.1) ? 0.032 : 0.055, 0.01]}
          castShadow
        >
          <boxGeometry args={[0.12, 0.04, 0.09]} />
          <primitive
            object={(hitR && Math.abs(rightPawX - 0.45) < 0.1) ? keyActiveMat : keyAccentMat}
            attach="material"
          />
        </mesh>

        {/* Keyboard Row 3: Bottom Row (Left Mod, Spacebar, Right Mod) */}
        {/* Left Ctrl / Cmd */}
        <mesh
          position={[-0.41, hitL && leftPawX < -0.3 ? 0.032 : 0.055, 0.12]}
          castShadow
        >
          <boxGeometry args={[0.16, 0.04, 0.09]} />
          <primitive
            object={hitL && leftPawX < -0.3 ? keyActiveMat : keyDefaultMat}
            attach="material"
          />
        </mesh>

        {/* Spacebar */}
        <mesh
          position={[
            0,
            (hitL || hitR) && Math.abs(hitL ? leftPawX : rightPawX) < 0.22 ? 0.032 : 0.055,
            0.12,
          ]}
          castShadow
        >
          <boxGeometry args={[0.54, 0.04, 0.09]} />
          <primitive
            object={
              (hitL || hitR) && Math.abs(hitL ? leftPawX : rightPawX) < 0.22
                ? keyActiveMat
                : keyDefaultMat
            }
            attach="material"
          />
        </mesh>

        {/* Right Mod */}
        <mesh
          position={[0.41, hitR && rightPawX > 0.3 ? 0.032 : 0.055, 0.12]}
          castShadow
        >
          <boxGeometry args={[0.16, 0.04, 0.09]} />
          <primitive
            object={hitR && rightPawX > 0.3 ? keyActiveMat : keyDefaultMat}
            attach="material"
          />
        </mesh>
      </group>

      {/* --- Strike Sparks Particles --- */}
      {hitL && (
        <group position={[leftPawX, leftPawY + 0.08, leftPawZ]}>
          <mesh position={[0.02, 0.04, 0]}>
            <octahedronGeometry args={[0.035, 0]} />
            <primitive object={sparkMat} attach="material" />
          </mesh>
          <mesh position={[-0.04, 0.06, 0.02]}>
            <octahedronGeometry args={[0.025, 0]} />
            <primitive object={goldSparkMat} attach="material" />
          </mesh>
        </group>
      )}

      {hitR && (
        <group position={[rightPawX, rightPawY + 0.08, rightPawZ]}>
          <mesh position={[-0.02, 0.04, 0]}>
            <octahedronGeometry args={[0.035, 0]} />
            <primitive object={sparkMat} attach="material" />
          </mesh>
          <mesh position={[0.04, 0.06, 0.02]}>
            <octahedronGeometry args={[0.025, 0]} />
            <primitive object={goldSparkMat} attach="material" />
          </mesh>
        </group>
      )}

      {/* --- Frantic Exertion Sweat Droplet --- */}
      {(typeLy <= -20 || typeRy <= -20) && (
        <group position={[shoulderDist * 0.95 + 0.08, 0.55, 0.22]}>
          <mesh scale={[0.045, 0.075, 0.045]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[1, 1.6, 12]} />
            <primitive object={sweatMaterial} attach="material" />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <primitive object={sweatMaterial} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  );
};
