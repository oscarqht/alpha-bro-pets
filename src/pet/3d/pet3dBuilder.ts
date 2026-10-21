import * as THREE from 'three';
import type { ProjectIconDefinition, ProjectAvatarEyeType, ProjectAvatarBrowType } from '../../utils/projectIcons';
import { getSweatProgress, type FramePose } from '../spec';
import { getShape3D } from './pet3dShapes';

export interface Pet3DInstance {
  root: THREE.Group;
  petRoot: THREE.Group;
  applyPose: (pose: FramePose, boopOffset?: { y: number; scale: number }) => void;
  dispose: () => void;
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
 * Builds eye meshes for one side (-1 for left, +1 for right).
 */
function createSingleEyeGroup(
  eyeType: ProjectAvatarEyeType,
  side: -1 | 1,
  inkMat: THREE.Material,
  whiteMat: THREE.Material,
  pupilMat: THREE.Material,
  frontZ: number,
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }
): THREE.Group {
  const eyeGroup = new THREE.Group();
  eyeGroup.position.set(0, 0, frontZ);

  const actualType = eyeType === 'wink' ? (side < 0 ? 'toon' : 'squint') : eyeType;

  if (actualType === 'toon') {
    // Sclera
    const scleraGeom = new THREE.SphereGeometry(1, 24, 24);
    disposables.geometries.push(scleraGeom);
    const scleraMesh = new THREE.Mesh(scleraGeom, whiteMat);
    scleraMesh.scale.set(0.14, 0.175, 0.04);
    scleraMesh.castShadow = true;
    eyeGroup.add(scleraMesh);

    // Pupil
    const pupilGeom = new THREE.SphereGeometry(1, 20, 20);
    disposables.geometries.push(pupilGeom);
    const pupilMesh = new THREE.Mesh(pupilGeom, pupilMat);
    pupilMesh.position.set(-side * 0.015, -0.02, 0.03);
    pupilMesh.scale.set(0.085, 0.092, 0.03);
    pupilMesh.castShadow = true;
    eyeGroup.add(pupilMesh);

    // Catchlight
    const catchGeom = new THREE.SphereGeometry(1, 12, 12);
    disposables.geometries.push(catchGeom);
    const catchMesh = new THREE.Mesh(catchGeom, whiteMat);
    catchMesh.position.set(-side * 0.03 + 0.02, 0.03, 0.045);
    catchMesh.scale.set(0.025, 0.025, 0.02);
    eyeGroup.add(catchMesh);
  } else if (actualType === 'pill') {
    const pillGeom = new THREE.CapsuleGeometry(1, 1, 8, 16);
    disposables.geometries.push(pillGeom);
    const pillMesh = new THREE.Mesh(pillGeom, inkMat);
    pillMesh.scale.set(0.04, 0.11, 0.03);
    pillMesh.castShadow = true;
    eyeGroup.add(pillMesh);
  } else if (actualType === 'dot') {
    const dotGeom = new THREE.SphereGeometry(1, 20, 20);
    disposables.geometries.push(dotGeom);
    const dotMesh = new THREE.Mesh(dotGeom, inkMat);
    dotMesh.scale.set(0.085, 0.09, 0.03);
    dotMesh.castShadow = true;
    eyeGroup.add(dotMesh);
  } else if (actualType === 'ring') {
    const ringGeom = new THREE.TorusGeometry(0.08, 0.022, 12, 28);
    disposables.geometries.push(ringGeom);
    const ringMesh = new THREE.Mesh(ringGeom, inkMat);
    ringMesh.scale.set(1, 1.15, 1);
    ringMesh.castShadow = true;
    eyeGroup.add(ringMesh);
  } else if (actualType === 'happy') {
    const happyGeom = new THREE.TorusGeometry(0.08, 0.022, 10, 24, Math.PI);
    disposables.geometries.push(happyGeom);
    const happyMesh = new THREE.Mesh(happyGeom, inkMat);
    happyMesh.position.set(0, 0.02, 0);
    happyMesh.rotation.set(0, 0, Math.PI);
    happyMesh.castShadow = true;
    eyeGroup.add(happyMesh);
  } else if (actualType === 'plus') {
    const b1 = new THREE.BoxGeometry(0.18, 0.04, 0.025);
    const b2 = new THREE.BoxGeometry(0.04, 0.18, 0.025);
    disposables.geometries.push(b1, b2);
    const m1 = new THREE.Mesh(b1, inkMat);
    const m2 = new THREE.Mesh(b2, inkMat);
    m1.castShadow = true;
    m2.castShadow = true;
    eyeGroup.add(m1, m2);
  } else if (actualType === 'dash') {
    const b1 = new THREE.BoxGeometry(0.18, 0.04, 0.025);
    const b2 = new THREE.BoxGeometry(0.18, 0.04, 0.025);
    disposables.geometries.push(b1, b2);
    const m1 = new THREE.Mesh(b1, inkMat);
    const m2 = new THREE.Mesh(b2, inkMat);
    m1.rotation.set(0, 0, Math.PI / 4);
    m2.rotation.set(0, 0, -Math.PI / 4);
    m1.castShadow = true;
    m2.castShadow = true;
    eyeGroup.add(m1, m2);
  } else if (actualType === 'slash') {
    const b1 = new THREE.BoxGeometry(0.04, 0.2, 0.025);
    disposables.geometries.push(b1);
    const m1 = new THREE.Mesh(b1, inkMat);
    m1.rotation.set(0, 0, Math.PI / 6);
    m1.castShadow = true;
    eyeGroup.add(m1);
  } else if (actualType === 'squint') {
    const angle = side < 0 ? Math.PI / 4 : -Math.PI / 4;
    const b1 = new THREE.BoxGeometry(0.1, 0.035, 0.025);
    const b2 = new THREE.BoxGeometry(0.1, 0.035, 0.025);
    disposables.geometries.push(b1, b2);
    const m1 = new THREE.Mesh(b1, inkMat);
    const m2 = new THREE.Mesh(b2, inkMat);
    m1.position.set(side * 0.025, 0.04, 0);
    m1.rotation.set(0, 0, angle);
    m2.position.set(side * 0.025, -0.04, 0);
    m2.rotation.set(0, 0, -angle);
    m1.castShadow = true;
    m2.castShadow = true;
    eyeGroup.add(m1, m2);
  } else {
    const dotGeom = new THREE.SphereGeometry(1, 16, 16);
    disposables.geometries.push(dotGeom);
    const dotMesh = new THREE.Mesh(dotGeom, inkMat);
    dotMesh.scale.set(0.085, 0.09, 0.03);
    dotMesh.castShadow = true;
    eyeGroup.add(dotMesh);
  }

  return eyeGroup;
}

/**
 * Builds eyebrow meshes.
 */
function createBrowsGroup(
  eyeType: ProjectAvatarEyeType,
  brows: ProjectAvatarBrowType,
  eyeGap: number,
  inkMat: THREE.Material,
  frontZ: number,
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }
): THREE.Group | null {
  if (brows === 'none') return null;

  const browGroup = new THREE.Group();
  const hh = getEyeHalfHeight(eyeType === 'wink' ? 'toon' : eyeType);
  const by = hh + 0.075;
  const bw = 0.2;
  const bh = 0.055;
  const bd = 0.03;

  const browGeom = new THREE.BoxGeometry(bw, bh, bd);
  disposables.geometries.push(browGeom);

  for (const side of [-1, 1] as const) {
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

    const sub = new THREE.Group();
    sub.position.set(side * eyeGap, by + dy, frontZ);
    sub.rotation.set(0, 0, rotRad);
    const m = new THREE.Mesh(browGeom, inkMat);
    m.castShadow = true;
    sub.add(m);
    browGroup.add(sub);
  }

  return browGroup;
}

/**
 * Builds the complete 3D Pet object graph with pure Three.js.
 * Guarantees 100% visual fidelity between the interactive 3D preview and 3D exports.
 */
export function buildPet3D(avatar: ProjectIconDefinition): Pet3DInstance {
  const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
    geometries: [],
    materials: [],
  };

  const shapeData = getShape3D(avatar.shapeId);
  const root = new THREE.Group();
  const petRoot = new THREE.Group();
  root.add(petRoot);

  // 1. Body Mesh
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.38,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.11,
    bevelThickness: 0.11,
    curveSegments: 28,
  };
  const bodyGeometry = new THREE.ExtrudeGeometry(shapeData.shape, extrudeSettings);
  bodyGeometry.center();
  bodyGeometry.computeVertexNormals();
  disposables.geometries.push(bodyGeometry);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: avatar.color,
    roughness: 0.26,
    metalness: 0.04,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    reflectivity: 0.4,
  });
  disposables.materials.push(bodyMaterial);

  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  petRoot.add(bodyMesh);

  // 2. Briefcase Handle
  if (avatar.handle) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.32, 0.75, 0),
      new THREE.Vector3(-0.28, 1.1, 0),
      new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(0.28, 1.1, 0),
      new THREE.Vector3(0.32, 0.75, 0),
    ]);
    const handleGeom = new THREE.TubeGeometry(curve, 32, 0.05, 12, false);
    disposables.geometries.push(handleGeom);
    const handleMesh = new THREE.Mesh(handleGeom, bodyMaterial);
    handleMesh.castShadow = true;
    handleMesh.receiveShadow = true;
    petRoot.add(handleMesh);
  }

  // 3. Facial Expression
  const frontZ = 0.305;
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, -avatar.fy, frontZ);
  petRoot.add(faceGroup);

  const inkMaterial = new THREE.MeshStandardMaterial({
    color: avatar.ink,
    roughness: 0.25,
    metalness: 0.08,
  });
  const whiteMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.15,
    metalness: 0.02,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: '#141416',
    roughness: 0.1,
    metalness: 0.1,
  });
  disposables.materials.push(inkMaterial, whiteMaterial, pupilMaterial);

  // Left & right eye
  for (const side of [-1, 1] as const) {
    const eyeHolder = new THREE.Group();
    eyeHolder.position.set(side * avatar.eyeGap, 0, 0);
    const singleEye = createSingleEyeGroup(
      avatar.eyes,
      side,
      inkMaterial,
      whiteMaterial,
      pupilMaterial,
      0.01,
      disposables
    );
    eyeHolder.add(singleEye);
    faceGroup.add(eyeHolder);
  }

  // Eyebrows
  const brows = createBrowsGroup(
    avatar.eyes,
    avatar.brows,
    avatar.eyeGap,
    inkMaterial,
    0.01,
    disposables
  );
  if (brows) faceGroup.add(brows);

  // 4. Waving Arm
  const waveAnchorX = shapeData.radius + 0.18;
  const waveArmGroup = new THREE.Group();
  waveArmGroup.position.set(waveAnchorX, 0.18, 0.14);
  waveArmGroup.visible = false;
  petRoot.add(waveArmGroup);

  const waveArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.14, 0.20, 0.04),
    new THREE.Vector3(0.18, 0.44, 0.08),
  ]);
  const waveArmGeom = new THREE.TubeGeometry(waveArmCurve, 24, 0.075, 14, false);
  const pawGeom = new THREE.SphereGeometry(0.11, 18, 18);
  const thumbGeom = new THREE.SphereGeometry(0.05, 12, 12);
  disposables.geometries.push(waveArmGeom, pawGeom, thumbGeom);

  const waveArmMesh = new THREE.Mesh(waveArmGeom, bodyMaterial);
  waveArmMesh.castShadow = true;
  waveArmGroup.add(waveArmMesh);

  const pawMesh = new THREE.Mesh(pawGeom, bodyMaterial);
  pawMesh.position.set(0.18, 0.48, 0.08);
  pawMesh.castShadow = true;
  waveArmGroup.add(pawMesh);

  const thumbMesh = new THREE.Mesh(thumbGeom, bodyMaterial);
  thumbMesh.position.set(0.11, 0.46, 0.14);
  thumbMesh.castShadow = true;
  waveArmGroup.add(thumbMesh);

  // 5. Keyboard & Typing Arms
  const kbGroup = new THREE.Group();
  kbGroup.visible = false;
  petRoot.add(kbGroup);

  const kbBaseY = -0.92;
  const kbBaseZ = 0.58;
  const shoulderDist = Math.max(0.42, Math.min(0.72, shapeData.radius * 0.72));
  const shoulderY = -0.25;
  const shoulderZ = 0.15;

  const chassisMat = new THREE.MeshStandardMaterial({ color: '#1b1e28', roughness: 0.35, metalness: 0.3 });
  const bezelPlateMat = new THREE.MeshStandardMaterial({ color: '#252936', roughness: 0.4, metalness: 0.2 });
  const keyDefaultMat = new THREE.MeshStandardMaterial({ color: '#343a4e', roughness: 0.3, metalness: 0.08 });
  const keyAccentMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.25, metalness: 0.1 });
  const keyActiveMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.8,
    roughness: 0.15,
  });
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const goldSparkMat = new THREE.MeshBasicMaterial({ color: '#fde047' });
  const sweatMat = new THREE.MeshPhysicalMaterial({
    color: '#38bdf8',
    transmission: 0.85,
    opacity: 0.95,
    transparent: true,
    roughness: 0.08,
    metalness: 0.02,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    ior: 1.33,
  });
  const sweatHighlightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const armMat = new THREE.MeshStandardMaterial({ color: avatar.color, roughness: 0.28, metalness: 0.04 });
  const ghostArmMat = new THREE.MeshStandardMaterial({
    color: avatar.color,
    roughness: 0.3,
    transparent: true,
    opacity: 0.28,
  });

  disposables.materials.push(
    chassisMat, bezelPlateMat, keyDefaultMat, keyAccentMat, keyActiveMat,
    sparkMat, goldSparkMat, sweatMat, sweatHighlightMat, armMat, ghostArmMat
  );

  // Keyboard casing
  const kbCasingGroup = new THREE.Group();
  kbCasingGroup.position.set(0, kbBaseY, kbBaseZ);
  kbCasingGroup.rotation.set(-0.24, 0, 0);
  kbGroup.add(kbCasingGroup);

  const chassisGeom = new THREE.BoxGeometry(1.25, 0.065, 0.44);
  const plateGeom = new THREE.BoxGeometry(1.18, 0.03, 0.38);
  const rgbGeom = new THREE.BoxGeometry(1.2, 0.012, 0.005);
  disposables.geometries.push(chassisGeom, plateGeom, rgbGeom);

  const chassisMesh = new THREE.Mesh(chassisGeom, chassisMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  kbCasingGroup.add(chassisMesh);

  const plateMesh = new THREE.Mesh(plateGeom, bezelPlateMat);
  plateMesh.position.set(0, 0.025, 0);
  kbCasingGroup.add(plateMesh);

  const rgbMesh = new THREE.Mesh(rgbGeom, new THREE.MeshBasicMaterial({ color: '#38bdf8' }));
  rgbMesh.position.set(0, -0.015, 0.222);
  kbCasingGroup.add(rgbMesh);

  // Keycap geometries
  const keyGeom = new THREE.BoxGeometry(0.1, 0.04, 0.09);
  const enterGeom = new THREE.BoxGeometry(0.12, 0.04, 0.09);
  const modGeom = new THREE.BoxGeometry(0.16, 0.04, 0.09);
  const spaceGeom = new THREE.BoxGeometry(0.54, 0.04, 0.09);
  disposables.geometries.push(keyGeom, enterGeom, modGeom, spaceGeom);

  const row1Keys = [-0.44, -0.31, -0.19, -0.06, 0.06, 0.19, 0.31, 0.44];
  const row2Keys = [-0.42, -0.29, -0.16, -0.03, 0.09, 0.22, 0.35];

  const row1Meshes: THREE.Mesh[] = row1Keys.map((x, idx) => {
    const m = new THREE.Mesh(keyGeom, idx === 0 ? keyAccentMat : keyDefaultMat);
    m.position.set(x, 0.055, -0.1);
    m.castShadow = true;
    kbCasingGroup.add(m);
    return m;
  });

  const row2Meshes: THREE.Mesh[] = row2Keys.map((x) => {
    const m = new THREE.Mesh(keyGeom, keyDefaultMat);
    m.position.set(x, 0.055, 0.01);
    m.castShadow = true;
    kbCasingGroup.add(m);
    return m;
  });

  const enterMesh = new THREE.Mesh(enterGeom, keyAccentMat);
  enterMesh.position.set(0.45, 0.055, 0.01);
  enterMesh.castShadow = true;
  kbCasingGroup.add(enterMesh);

  const ctrlMesh = new THREE.Mesh(modGeom, keyDefaultMat);
  ctrlMesh.position.set(-0.41, 0.055, 0.12);
  ctrlMesh.castShadow = true;
  kbCasingGroup.add(ctrlMesh);

  const spaceMesh = new THREE.Mesh(spaceGeom, keyDefaultMat);
  spaceMesh.position.set(0, 0.055, 0.12);
  spaceMesh.castShadow = true;
  kbCasingGroup.add(spaceMesh);

  const modMesh = new THREE.Mesh(modGeom, keyDefaultMat);
  modMesh.position.set(0.41, 0.055, 0.12);
  modMesh.castShadow = true;
  kbCasingGroup.add(modMesh);

  // Dynamic Paw & Arm objects
  const leftPawSphereGeom = new THREE.SphereGeometry(0.075, 18, 18);
  const rightPawSphereGeom = new THREE.SphereGeometry(0.075, 18, 18);
  const ghostPawGeom = new THREE.SphereGeometry(0.06, 12, 12);
  disposables.geometries.push(leftPawSphereGeom, rightPawSphereGeom, ghostPawGeom);

  const leftPawMesh = new THREE.Mesh(leftPawSphereGeom, armMat);
  leftPawMesh.castShadow = true;
  kbGroup.add(leftPawMesh);

  const rightPawMesh = new THREE.Mesh(rightPawSphereGeom, armMat);
  rightPawMesh.castShadow = true;
  kbGroup.add(rightPawMesh);

  const leftGhostPawMesh = new THREE.Mesh(ghostPawGeom, ghostArmMat);
  kbGroup.add(leftGhostPawMesh);

  const rightGhostPawMesh = new THREE.Mesh(ghostPawGeom, ghostArmMat);
  kbGroup.add(rightGhostPawMesh);

  // Strike sparks
  const sparkGeom1 = new THREE.OctahedronGeometry(0.035, 0);
  const sparkGeom2 = new THREE.OctahedronGeometry(0.025, 0);
  disposables.geometries.push(sparkGeom1, sparkGeom2);

  const leftSparkGroup = new THREE.Group();
  const ls1 = new THREE.Mesh(sparkGeom1, sparkMat);
  ls1.position.set(0.02, 0.04, 0);
  const ls2 = new THREE.Mesh(sparkGeom2, goldSparkMat);
  ls2.position.set(-0.04, 0.06, 0.02);
  leftSparkGroup.add(ls1, ls2);
  kbGroup.add(leftSparkGroup);

  const rightSparkGroup = new THREE.Group();
  const rs1 = new THREE.Mesh(sparkGeom1, sparkMat);
  rs1.position.set(-0.02, 0.04, 0);
  const rs2 = new THREE.Mesh(sparkGeom2, goldSparkMat);
  rs2.position.set(0.04, 0.06, 0.02);
  rightSparkGroup.add(rs1, rs2);
  kbGroup.add(rightSparkGroup);

  // Multi-droplet cascading sweat system for head
  const sweatConeGeom = new THREE.ConeGeometry(1, 1.8, 14);
  const sweatSphereGeom = new THREE.SphereGeometry(1, 14, 14);
  const sweatHighlightGeom = new THREE.SphereGeometry(1, 10, 10);
  const sweatSplashGeom = new THREE.SphereGeometry(1, 10, 10);
  disposables.geometries.push(
    sweatConeGeom,
    sweatSphereGeom,
    sweatHighlightGeom,
    sweatSplashGeom
  );

  const sweatSystemGroup = new THREE.Group();
  kbGroup.add(sweatSystemGroup);

  const widthRatio3D = Math.max(0.75, Math.min(1.25, shapeData.radius / 0.9));
  const topY3D = Math.max(0.65, Math.min(1.05, shapeData.topY));

  const dropConfigs3D = [
    // Drop 1: Primary right forehead drip - trickles down past right temple/brow
    {
      xStart: 0.22 * widthRatio3D,
      xEnd: 0.38 * widthRatio3D,
      yStart: topY3D * 0.74,
      yEnd: topY3D * 0.08,
      phaseOffset: 0.05,
      radius: 0.052,
    },
    // Drop 2: Secondary right temple drip - follows slightly higher & later
    {
      xStart: 0.28 * widthRatio3D,
      xEnd: 0.44 * widthRatio3D,
      yStart: topY3D * 0.60,
      yEnd: -0.06,
      phaseOffset: 0.52,
      radius: 0.040,
    },
    // Drop 3: Primary left forehead drip - trickles down past left temple/brow
    {
      xStart: -0.22 * widthRatio3D,
      xEnd: -0.38 * widthRatio3D,
      yStart: topY3D * 0.72,
      yEnd: topY3D * 0.06,
      phaseOffset: 0.28,
      radius: 0.048,
    },
    // Drop 4: Left crown / upper bead - trickles down higher on the left side
    {
      xStart: -0.15 * widthRatio3D,
      xEnd: -0.28 * widthRatio3D,
      yStart: topY3D * 0.82,
      yEnd: topY3D * 0.22,
      phaseOffset: 0.76,
      radius: 0.035,
    },
  ];

  const sweatDropItems = dropConfigs3D.map((cfg) => {
    const dropGroup = new THREE.Group();

    // Bulbous lower drop
    const bulbMesh = new THREE.Mesh(sweatSphereGeom, sweatMat);
    bulbMesh.position.set(0, -0.3, 0);
    bulbMesh.scale.set(1, 1, 0.7);
    bulbMesh.castShadow = true;
    dropGroup.add(bulbMesh);

    // Tapered cone upper drop pointing upwards along Y
    const coneMesh = new THREE.Mesh(sweatConeGeom, sweatMat);
    coneMesh.position.set(0, 0.45, 0);
    coneMesh.scale.set(1, 1, 0.7);
    coneMesh.castShadow = true;
    dropGroup.add(coneMesh);

    // Bright specular highlight (glossy anime water shine)
    const highlightMesh = new THREE.Mesh(sweatHighlightGeom, sweatHighlightMat);
    highlightMesh.position.set(-0.35, 0, 0.55);
    highlightMesh.scale.set(0.3, 0.38, 0.2);
    dropGroup.add(highlightMesh);

    // Micro splash bead
    const splashMesh = new THREE.Mesh(sweatSplashGeom, sweatMat);
    splashMesh.scale.set(0.35, 0.35, 0.35);
    splashMesh.visible = false;
    dropGroup.add(splashMesh);

    sweatSystemGroup.add(dropGroup);

    return { cfg, dropGroup, splashMesh };
  });

  // Dynamic arm meshes holders
  let leftArmMesh: THREE.Mesh | null = null;
  let rightArmMesh: THREE.Mesh | null = null;
  let leftGhostArmMesh: THREE.Mesh | null = null;
  let rightGhostArmMesh: THREE.Mesh | null = null;

  const faceScale = avatar.fs * 1.45;

  function updateTypingArms(pose: FramePose) {
    const { typeLx, typeLy, typeRx, typeRy } = pose;
    if (typeLx === null || typeLy === null || typeRx === null || typeRy === null) {
      kbGroup.visible = false;
      return;
    }
    kbGroup.visible = true;

    const pawScale = 0.018;
    const leftPawX = typeLx * pawScale;
    const rightPawX = typeRx * pawScale;

    const hitL = typeLy >= -11;
    const hitR = typeRy >= -11;

    const leftPawY = kbBaseY + 0.12 + Math.max(0, -typeLy - 9) * 0.015;
    const rightPawY = kbBaseY + 0.12 + Math.max(0, -typeRy - 9) * 0.015;
    const leftPawZ = kbBaseZ + 0.02;
    const rightPawZ = kbBaseZ + 0.02;

    leftPawMesh.position.set(leftPawX, leftPawY, leftPawZ);
    rightPawMesh.position.set(rightPawX, rightPawY, rightPawZ);

    const ghostLy = hitL ? leftPawY + 0.1 : leftPawY - 0.08;
    const ghostRy = hitR ? rightPawY + 0.1 : rightPawY - 0.08;
    leftGhostPawMesh.position.set(leftPawX - 0.05, ghostLy, leftPawZ - 0.02);
    rightGhostPawMesh.position.set(rightPawX + 0.05, ghostRy, rightPawZ - 0.02);

    // Dispose old arm geometries
    if (leftArmMesh) {
      kbGroup.remove(leftArmMesh);
      leftArmMesh.geometry.dispose();
    }
    if (rightArmMesh) {
      kbGroup.remove(rightArmMesh);
      rightArmMesh.geometry.dispose();
    }
    if (leftGhostArmMesh) {
      kbGroup.remove(leftGhostArmMesh);
      leftGhostArmMesh.geometry.dispose();
    }
    if (rightGhostArmMesh) {
      kbGroup.remove(rightGhostArmMesh);
      rightGhostArmMesh.geometry.dispose();
    }

    const leftArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(-shoulderDist * 1.05, (shoulderY + leftPawY) * 0.55, (shoulderZ + leftPawZ) * 0.5),
      new THREE.Vector3(leftPawX - 0.02, leftPawY + 0.08, leftPawZ - 0.04),
      new THREE.Vector3(leftPawX, leftPawY, leftPawZ),
    ]);
    const leftGeom = new THREE.TubeGeometry(leftArmCurve, 20, 0.055, 12, false);
    leftArmMesh = new THREE.Mesh(leftGeom, armMat);
    leftArmMesh.castShadow = true;
    kbGroup.add(leftArmMesh);

    const rightArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(shoulderDist * 1.05, (shoulderY + rightPawY) * 0.55, (shoulderZ + rightPawZ) * 0.5),
      new THREE.Vector3(rightPawX + 0.02, rightPawY + 0.08, rightPawZ - 0.04),
      new THREE.Vector3(rightPawX, rightPawY, rightPawZ),
    ]);
    const rightGeom = new THREE.TubeGeometry(rightArmCurve, 20, 0.055, 12, false);
    rightArmMesh = new THREE.Mesh(rightGeom, armMat);
    rightArmMesh.castShadow = true;
    kbGroup.add(rightArmMesh);

    const ghostLeftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(-shoulderDist * 1.12, (shoulderY + ghostLy) * 0.5, (shoulderZ + leftPawZ) * 0.5),
      new THREE.Vector3(leftPawX - 0.05, ghostLy, leftPawZ - 0.02),
    ]);
    const ghostLeftGeom = new THREE.TubeGeometry(ghostLeftCurve, 14, 0.045, 8, false);
    leftGhostArmMesh = new THREE.Mesh(ghostLeftGeom, ghostArmMat);
    kbGroup.add(leftGhostArmMesh);

    const ghostRightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(shoulderDist, shoulderY, shoulderZ),
      new THREE.Vector3(shoulderDist * 1.12, (shoulderY + ghostRy) * 0.5, (shoulderZ + rightPawZ) * 0.5),
      new THREE.Vector3(rightPawX + 0.05, ghostRy, rightPawZ - 0.02),
    ]);
    const ghostRightGeom = new THREE.TubeGeometry(ghostRightCurve, 14, 0.045, 8, false);
    rightGhostArmMesh = new THREE.Mesh(ghostRightGeom, ghostArmMat);
    kbGroup.add(rightGhostArmMesh);

    // Key depressions
    row1Keys.forEach((x, idx) => {
      const isHit =
        (hitL && Math.abs(leftPawX - x) < 0.09) ||
        (hitR && Math.abs(rightPawX - x) < 0.09);
      const m = row1Meshes[idx];
      m.position.y = isHit ? 0.032 : 0.055;
      m.material = isHit ? keyActiveMat : idx === 0 ? keyAccentMat : keyDefaultMat;
    });

    row2Keys.forEach((x, idx) => {
      const isHit =
        (hitL && Math.abs(leftPawX - x) < 0.09) ||
        (hitR && Math.abs(rightPawX - x) < 0.09);
      const m = row2Meshes[idx];
      m.position.y = isHit ? 0.032 : 0.055;
      m.material = isHit ? keyActiveMat : keyDefaultMat;
    });

    const enterHit = hitR && Math.abs(rightPawX - 0.45) < 0.1;
    enterMesh.position.y = enterHit ? 0.032 : 0.055;
    enterMesh.material = enterHit ? keyActiveMat : keyAccentMat;

    const ctrlHit = hitL && leftPawX < -0.3;
    ctrlMesh.position.y = ctrlHit ? 0.032 : 0.055;
    ctrlMesh.material = ctrlHit ? keyActiveMat : keyDefaultMat;

    const spaceHit = (hitL || hitR) && Math.abs(hitL ? leftPawX : rightPawX) < 0.22;
    spaceMesh.position.y = spaceHit ? 0.032 : 0.055;
    spaceMesh.material = spaceHit ? keyActiveMat : keyDefaultMat;

    const modHit = hitR && rightPawX > 0.3;
    modMesh.position.y = modHit ? 0.032 : 0.055;
    modMesh.material = modHit ? keyActiveMat : keyDefaultMat;

    // Sparks
    leftSparkGroup.visible = hitL;
    if (hitL) leftSparkGroup.position.set(leftPawX, leftPawY + 0.08, leftPawZ);
    rightSparkGroup.visible = hitR;
    if (hitR) rightSparkGroup.position.set(rightPawX, rightPawY + 0.08, rightPawZ);

    // Multi-droplet cascading sweat animation on head
    const sweatProgress = getSweatProgress(pose) ?? 0;
    const frontHeadZ = 0.325;

    for (const item of sweatDropItems) {
      const { cfg, dropGroup, splashMesh } = item;
      const t = ((sweatProgress + cfg.phaseOffset) % 1 + 1) % 1;

      let currX: number;
      let currY: number;
      let stretchY = 0;
      let opacity = 1;
      let currRadius = cfg.radius;

      if (t < 0.18) {
        // 1. Forming phase: emerges as small bead at head/forehead
        const formT = t / 0.18;
        currX = cfg.xStart;
        currY = cfg.yStart;
        currRadius = cfg.radius * (0.35 + 0.65 * formT);
        stretchY = 0.05;
        opacity = formT;
        splashMesh.visible = false;
      } else if (t < 0.74) {
        // 2. Trickling / flowing down phase (accelerating down along head contour)
        const flowT = (t - 0.18) / 0.56;
        const ease = flowT * flowT; // gravity ease
        currX = cfg.xStart + (cfg.xEnd - cfg.xStart) * ease;
        currY = cfg.yStart + (cfg.yEnd - cfg.yStart) * ease;
        stretchY = Math.sin(flowT * Math.PI) * 0.75;
        opacity = 1;
        splashMesh.visible = false;
      } else {
        // 3. Detaching & dripping off phase: drops rapidly below cheek/chin and fades out
        const dropT = (t - 0.74) / 0.26;
        currX = cfg.xEnd + (cfg.xEnd > 0 ? 0.04 : -0.04) * dropT;
        currY = cfg.yEnd - 0.22 * dropT * dropT;
        stretchY = 0.4 * (1 - dropT);
        opacity = Math.max(0, 1 - dropT * 1.3);

        // Micro splash bead falls faster below the drop
        if (t > 0.75 && t < 0.94) {
          splashMesh.visible = true;
          const splashT = (t - 0.75) / 0.19;
          splashMesh.position.set(
            (cfg.xEnd > 0 ? 0.03 : -0.03) * splashT,
            -0.12 - 0.16 * splashT,
            0
          );
        } else {
          splashMesh.visible = false;
        }
      }

      if (opacity <= 0.02) {
        dropGroup.visible = false;
        continue;
      }

      dropGroup.visible = true;
      dropGroup.position.set(currX, currY, frontHeadZ);

      // Scale teardrop with vertical stretch
      const sx = currRadius * 0.95;
      const sy = currRadius * (1 + stretchY);
      const sz = currRadius * 0.75;
      dropGroup.scale.set(sx, sy, sz);
    }
  }

  function applyPose(pose: FramePose, boopOffset?: { y: number; scale: number }) {
    const boopY = boopOffset?.y ?? 0;
    const boopScale = boopOffset?.scale ?? 1;

    // Sway and jump
    const posX = pose.x * 0.013;
    const posY = pose.lift * 0.016;

    petRoot.position.x = posX;
    petRoot.position.y = posY + boopY;
    petRoot.rotation.z = -pose.tilt;

    const sx = pose.sx * boopScale;
    const sy = pose.sy * (1 / boopScale);
    const sz = 1 / Math.sqrt(Math.max(0.3, sx * sy));
    petRoot.scale.set(sx, sy, sz);

    // Face
    const fx = pose.faceX * 0.013;
    const fy = -avatar.fy - pose.faceY * 0.013;
    faceGroup.position.x = fx;
    faceGroup.position.y = fy;
    faceGroup.scale.set(faceScale, faceScale * pose.faceScaleY, 1);

    // Waving arm
    if (pose.wave !== null) {
      waveArmGroup.visible = true;
      waveArmGroup.rotation.z = pose.wave;
    } else {
      waveArmGroup.visible = false;
    }

    // Keyboard & typing arms
    updateTypingArms(pose);
  }

  function dispose() {
    if (leftArmMesh) leftArmMesh.geometry.dispose();
    if (rightArmMesh) rightArmMesh.geometry.dispose();
    if (leftGhostArmMesh) leftGhostArmMesh.geometry.dispose();
    if (rightGhostArmMesh) rightGhostArmMesh.geometry.dispose();

    disposables.geometries.forEach((g) => g.dispose());
    disposables.materials.forEach((m) => m.dispose());
  }

  return { root, petRoot, applyPose, dispose };
}
