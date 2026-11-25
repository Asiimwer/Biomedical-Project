import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Box } from 'lucide-react';
import { EquipmentAsset } from '../types/bems';

interface Equipment3DViewerProps {
  equipment: EquipmentAsset;
}

type CameraPreset = 'iso' | 'front' | 'side' | 'top';
type FinishMode = 'clinical' | 'anodized' | 'wireframe';

// Pre-allocated module-scope scratch objects to guarantee zero GC in render loop
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3(0, 0.9, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getStatusColorHex(status: EquipmentAsset['status']): number {
  switch (status) {
    case 'Operational':
      return 0x16a34a;
    case 'Faulty':
      return 0xdc2626;
    case 'Under Maintenance':
    case 'Awaiting Inspection':
      return 0xd97706;
    default:
      return 0x64748b;
  }
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d4d8de';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const shade = 200 + Math.floor(Math.sin(y * 0.45) * 18 + (y % 5) * 3);
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 4})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createClinicalScreenTexture(equipment: EquipmentAsset): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0b1322';
    ctx.fillRect(0, 0, 512, 320);

    // Subtle clinical grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 320);
      ctx.stroke();
    }
    for (let y = 0; y < 320; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Header bar
    ctx.fillStyle = '#132038';
    ctx.fillRect(0, 0, 512, 40);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${equipment.assetId} · ${equipment.name.toUpperCase()}`, 16, 26);

    const statusColor =
      equipment.status === 'Operational'
        ? '#22c55e'
        : equipment.status === 'Faulty'
          ? '#ef4444'
          : '#f59e0b';
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(equipment.status.toUpperCase(), 355, 25);

    // Waveform trace 1 (ECG Lead II)
    ctx.strokeStyle = equipment.status === 'Faulty' ? '#ef4444' : '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 16; x < 340; x += 2) {
      const cycle = (x - 16) % 72;
      let y = 110;
      if (cycle > 18 && cycle < 24) y -= 6;
      else if (cycle >= 30 && cycle < 33) y += 8;
      else if (cycle >= 33 && cycle < 37) y -= 42;
      else if (cycle >= 37 && cycle < 41) y += 16;
      else if (cycle >= 48 && cycle < 58) y -= 10;
      if (x === 16) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Waveform trace 2 (Pleth / Flow)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 16; x < 340; x += 2) {
      const t = (x - 16) * 0.08;
      const y = 205 - Math.sin(t) * 18 - Math.sin(t * 2 + 0.6) * 8;
      if (x === 16) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Waveform trace 3 (Pressure / Aux)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 16; x < 340; x += 2) {
      const t = (x - 16) * 0.05;
      const y = 275 - Math.abs(Math.sin(t)) * 24;
      if (x === 16) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Right numeric telemetry column
    ctx.fillStyle = '#0f1b2e';
    ctx.fillRect(356, 52, 140, 250);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(equipment.status === 'Faulty' ? 'ERR' : '72', 376, 102);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('TEST SIG / CAL', 376, 122);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('98%', 376, 180);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('SIM OUTPUT', 376, 198);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px monospace';
    ctx.fillText(`SN: ${equipment.serialNumber.slice(0, 12)}`, 366, 255);
    ctx.fillText(`NEXT: ${equipment.nextServiceDate}`, 366, 278);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.32)');
    grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.12)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRoundedChassisGeometry(w: number, h: number, d: number, r = 0.04): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  shape.moveTo(-hw, -h / 2);
  shape.lineTo(hw, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
  shape.lineTo(w / 2, hh);
  shape.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
  shape.lineTo(-hw, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
  shape.lineTo(-w / 2, -hh);
  shape.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
}

function buildMedicalEquipmentGroup(
  equipment: EquipmentAsset,
  materials: {
    shell: THREE.MeshPhysicalMaterial;
    frame: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    rubber: THREE.MeshStandardMaterial;
    screen: THREE.MeshStandardMaterial;
    statusBeacon: THREE.MeshStandardMaterial;
  },
  disposables: Array<{ dispose: () => void }>
): { root: THREE.Group; explodeParts: Array<{ obj: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3 }> } {
  const root = new THREE.Group();
  const explodeParts: Array<{ obj: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3 }> = [];

  const registerPart = (obj: THREE.Object3D, ox: number, oy: number, oz: number) => {
    explodeParts.push({
      obj,
      base: obj.position.clone(),
      offset: new THREE.Vector3(ox, oy, oz),
    });
    root.add(obj);
  };

  // Shared 4-caster mobile base (Part 1: Base & Casters)
  const baseGroup = new THREE.Group();
  const basePlateGeo = buildRoundedChassisGeometry(0.86, 0.06, 0.72, 0.06);
  basePlateGeo.rotateX(Math.PI / 2);
  disposables.push(basePlateGeo);
  const basePlate = new THREE.Mesh(basePlateGeo, materials.frame);
  basePlate.position.y = 0.14;
  basePlate.castShadow = true;
  basePlate.receiveShadow = true;
  baseGroup.add(basePlate);

  const wheelGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.06, 12);
  disposables.push(wheelGeo, stemGeo);

  const casterCoords = [
    [-0.34, -0.26],
    [0.34, -0.26],
    [-0.34, 0.26],
    [0.34, 0.26],
  ];
  for (const [cx, cz] of casterCoords) {
    const wheel = new THREE.Mesh(wheelGeo, materials.rubber);
    wheel.position.set(cx, 0.055, cz);
    wheel.castShadow = true;
    const stem = new THREE.Mesh(stemGeo, materials.accent);
    stem.position.set(cx, 0.1, cz);
    baseGroup.add(wheel, stem);
  }
  registerPart(baseGroup, 0, -0.18, 0);

  const cat = equipment.category.toLowerCase();
  const nameLower = equipment.name.toLowerCase();

  if (cat.includes('fluid') || nameLower.includes('infusion') || nameLower.includes('suction')) {
    // Pole & Pump Assembly
    const poleGeo = new THREE.CylinderGeometry(0.028, 0.034, 1.45, 20);
    disposables.push(poleGeo);
    const pole = new THREE.Mesh(poleGeo, materials.accent);
    pole.position.set(0, 0.88, -0.05);
    pole.castShadow = true;
    registerPart(pole, 0, 0, -0.25);

    const pumpHousingGeo = buildRoundedChassisGeometry(0.48, 0.34, 0.26, 0.03);
    disposables.push(pumpHousingGeo);
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(0, 1.15, 0.06);
    const housing = new THREE.Mesh(pumpHousingGeo, materials.shell);
    housing.castShadow = true;
    housing.receiveShadow = true;
    pumpGroup.add(housing);

    const screenGeo = new THREE.PlaneGeometry(0.36, 0.2);
    disposables.push(screenGeo);
    const screenMesh = new THREE.Mesh(screenGeo, materials.screen);
    screenMesh.position.set(0, 0.02, 0.155);
    pumpGroup.add(screenMesh);

    const beaconGeo = new THREE.BoxGeometry(0.14, 0.025, 0.04);
    disposables.push(beaconGeo);
    const beacon = new THREE.Mesh(beaconGeo, materials.statusBeacon);
    beacon.position.set(0, 0.2, 0.08);
    pumpGroup.add(beacon);

    registerPart(pumpGroup, 0, 0.1, 0.32);

    // Coiled IV Tubing via TubeGeometry
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 1.56, 0.06),
      new THREE.Vector3(-0.26, 1.38, 0.16),
      new THREE.Vector3(-0.14, 1.2, 0.22),
      new THREE.Vector3(0.05, 1.02, 0.2),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.012, 10, false);
    disposables.push(tubeGeo);
    const tube = new THREE.Mesh(tubeGeo, materials.accent);
    registerPart(tube, -0.28, 0.15, 0.18);
  } else if (cat.includes('critical') || cat.includes('anaesthesia') || nameLower.includes('ventilator')) {
    // Ventilator / Anaesthesia Workstation
    const columnGeo = buildRoundedChassisGeometry(0.56, 0.85, 0.48, 0.04);
    disposables.push(columnGeo);
    const mainUnit = new THREE.Mesh(columnGeo, materials.shell);
    mainUnit.position.set(0, 0.62, -0.02);
    mainUnit.castShadow = true;
    mainUnit.receiveShadow = true;
    registerPart(mainUnit, 0, 0.05, 0);

    // Dual Gas Cylinders via LatheGeometry
    const cylPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.07, 0),
      new THREE.Vector2(0.07, 0.48),
      new THREE.Vector2(0.03, 0.58),
      new THREE.Vector2(0.03, 0.64),
      new THREE.Vector2(0, 0.64),
    ];
    const cylGeo = new THREE.LatheGeometry(cylPoints, 24);
    disposables.push(cylGeo);
    const cylGroup = new THREE.Group();
    cylGroup.position.set(0, 0.2, -0.32);
    const cylL = new THREE.Mesh(cylGeo, materials.accent);
    cylL.position.x = -0.14;
    cylL.castShadow = true;
    const cylR = new THREE.Mesh(cylGeo, materials.frame);
    cylR.position.x = 0.14;
    cylR.castShadow = true;
    cylGroup.add(cylL, cylR);
    registerPart(cylGroup, 0, 0.08, -0.38);

    // Articulated Monitor Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.32, 0.04);
    headGroup.rotation.x = -0.18;
    const bezelGeo = buildRoundedChassisGeometry(0.64, 0.42, 0.09, 0.03);
    const screenGeo = new THREE.PlaneGeometry(0.56, 0.34);
    const beaconGeo = new THREE.BoxGeometry(0.24, 0.03, 0.05);
    disposables.push(bezelGeo, screenGeo, beaconGeo);

    const bezel = new THREE.Mesh(bezelGeo, materials.frame);
    bezel.castShadow = true;
    const screen = new THREE.Mesh(screenGeo, materials.screen);
    screen.position.z = 0.068;
    const beacon = new THREE.Mesh(beaconGeo, materials.statusBeacon);
    beacon.position.set(0, 0.23, 0);
    headGroup.add(bezel, screen, beacon);
    registerPart(headGroup, 0, 0.38, 0.14);

    // Breathing Circuit Hose
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.24, 0.92, 0.22),
      new THREE.Vector3(0.42, 0.85, 0.32),
      new THREE.Vector3(0.46, 0.62, 0.24),
      new THREE.Vector3(0.26, 0.56, 0.18),
    ]);
    const hoseGeo = new THREE.TubeGeometry(hoseCurve, 36, 0.022, 12, false);
    disposables.push(hoseGeo);
    const hose = new THREE.Mesh(hoseGeo, materials.rubber);
    registerPart(hose, 0.34, 0, 0.2);
  } else if (cat.includes('sterilization') || nameLower.includes('autoclave')) {
    // Cylindrical Stainless Autoclave Chamber via LatheGeometry
    const cabinetGeo = buildRoundedChassisGeometry(0.76, 0.68, 0.64, 0.04);
    disposables.push(cabinetGeo);
    const cabinet = new THREE.Mesh(cabinetGeo, materials.shell);
    cabinet.position.set(0, 0.54, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    registerPart(cabinet, 0, 0, 0);

    const drumGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.58, 32);
    drumGeo.rotateX(Math.PI / 2);
    disposables.push(drumGeo);
    const drum = new THREE.Mesh(drumGeo, materials.accent);
    drum.position.set(0, 1.12, -0.02);
    drum.castShadow = true;
    registerPart(drum, 0, 0.28, -0.2);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.12, 0.32);
    const doorGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.05, 32);
    doorGeo.rotateX(Math.PI / 2);
    const wheelGeo = new THREE.TorusGeometry(0.11, 0.018, 12, 24);
    const screenGeo = new THREE.PlaneGeometry(0.28, 0.16);
    disposables.push(doorGeo, wheelGeo, screenGeo);

    const door = new THREE.Mesh(doorGeo, materials.frame);
    const lockWheel = new THREE.Mesh(wheelGeo, materials.accent);
    lockWheel.position.z = 0.04;
    const screen = new THREE.Mesh(screenGeo, materials.screen);
    screen.position.set(0, -0.45, 0.03);
    const beaconGeo = new THREE.BoxGeometry(0.18, 0.03, 0.04);
    disposables.push(beaconGeo);
    const beacon = new THREE.Mesh(beaconGeo, materials.statusBeacon);
    beacon.position.set(0, 0.31, -0.04);
    doorGroup.add(door, lockWheel, screen, beacon);
    registerPart(doorGroup, 0, 0.12, 0.42);
  } else {
    // Diagnostic / Cardiology / Monitor / Defibrillator / Imaging Cart
    const mastGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.88, 20);
    const trayGeo = buildRoundedChassisGeometry(0.54, 0.05, 0.42, 0.03);
    trayGeo.rotateX(Math.PI / 2);
    disposables.push(mastGeo, trayGeo);

    const mastGroup = new THREE.Group();
    mastGroup.position.set(0, 0.6, -0.08);
    const mast = new THREE.Mesh(mastGeo, materials.accent);
    mast.castShadow = true;
    const tray = new THREE.Mesh(trayGeo, materials.shell);
    tray.position.set(0, 0.14, 0.14);
    tray.castShadow = true;
    mastGroup.add(mast, tray);
    registerPart(mastGroup, 0, 0, -0.22);

    // Handle bar via TubeGeometry
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.28, 0.92, -0.22),
      new THREE.Vector3(-0.3, 0.96, -0.34),
      new THREE.Vector3(0.3, 0.96, -0.34),
      new THREE.Vector3(0.28, 0.92, -0.22),
    ]);
    const handleGeo = new THREE.TubeGeometry(handleCurve, 24, 0.016, 10, false);
    disposables.push(handleGeo);
    const handle = new THREE.Mesh(handleGeo, materials.rubber);
    registerPart(handle, 0, 0.06, -0.36);

    // Main Diagnostic Chassis + Display Screen
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(0, 1.24, 0.05);
    consoleGroup.rotation.x = -0.15;

    const bodyGeo = buildRoundedChassisGeometry(0.66, 0.44, 0.22, 0.035);
    const screenGeo = new THREE.PlaneGeometry(0.52, 0.31);
    const knobGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 18);
    knobGeo.rotateX(Math.PI / 2);
    const beaconGeo = new THREE.BoxGeometry(0.22, 0.028, 0.05);
    disposables.push(bodyGeo, screenGeo, knobGeo, beaconGeo);

    const body = new THREE.Mesh(bodyGeo, materials.shell);
    body.castShadow = true;
    body.receiveShadow = true;
    const screen = new THREE.Mesh(screenGeo, materials.screen);
    screen.position.set(-0.03, 0.02, 0.132);
    const knob = new THREE.Mesh(knobGeo, materials.accent);
    knob.position.set(0.26, -0.08, 0.13);
    const beacon = new THREE.Mesh(beaconGeo, materials.statusBeacon);
    beacon.position.set(0, 0.24, 0);
    consoleGroup.add(body, screen, knob, beacon);
    registerPart(consoleGroup, 0, 0.34, 0.18);

    // Side Acquisition / Sensor Module
    const sideModGeo = buildRoundedChassisGeometry(0.14, 0.28, 0.18, 0.02);
    disposables.push(sideModGeo);
    const sideMod = new THREE.Mesh(sideModGeo, materials.frame);
    sideMod.position.set(0.41, 1.2, 0.05);
    sideMod.castShadow = true;
    registerPart(sideMod, 0.36, 0.14, 0);
  }

  return { root, explodeParts };
}

export const Equipment3DViewer: React.FC<Equipment3DViewerProps> = ({ equipment }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodeRatio, setExplodeRatio] = useState(0);
  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [finishMode, setFinishMode] = useState<FinishMode>('clinical');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const explodeTargetRef = useRef(0);
  const presetTriggerRef = useRef<{ preset: CameraPreset; active: boolean }>({
    preset: 'iso',
    active: false,
  });
  const finishRef = useRef<FinishMode>('clinical');
  const requestRenderRef = useRef<(() => void) | null>(null);
  const applyFinishRef = useRef<((mode: FinishMode) => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeRatio;
    requestRenderRef.current?.();
  }, [explodeRatio]);

  useEffect(() => {
    finishRef.current = finishMode;
    applyFinishRef.current?.(finishMode);
    requestRenderRef.current?.();
  }, [finishMode]);

  const handlePresetClick = (next: CameraPreset) => {
    setPreset(next);
    presetTriggerRef.current = { preset: next, active: true };
    requestRenderRef.current?.();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.Fog(0xf1f5f9, 7, 16);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
    camera.position.set(2.15, 1.75, 2.35);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Studio 3-point lighting with warm key & cool hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    keyLight.position.set(3.5, 5.0, 3.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.75);
    rimLight.position.set(-3.2, 2.8, -3.0);
    scene.add(rimLight);

    // Ground platform & soft radial contact shadow
    const disposables: Array<{ dispose: () => void }> = [];

    const floorGeo = new THREE.CircleGeometry(4.5, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    disposables.push(floorGeo, floorMat);

    const gridHelper = new THREE.GridHelper(6, 18, 0xcbd5e1, 0xdbeafe);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.75, 1.75);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = 0.01;
    scene.add(shadowPlane);
    disposables.push(shadowTex, shadowGeo, shadowMat);

    // Procedural PBR Materials
    const brushedTex = createBrushedMetalTexture();
    brushedTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const screenTex = createClinicalScreenTexture(equipment);
    screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    disposables.push(brushedTex, screenTex);

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.08,
      clearcoat: 0.45,
      clearcoatRoughness: 0.2,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.52,
      metalness: 0.35,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughnessMap: brushedTex,
      roughness: 0.25,
      metalness: 0.88,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.48,
      roughness: 0.18,
      metalness: 0.1,
    });
    const statusBeaconMat = new THREE.MeshStandardMaterial({
      color: getStatusColorHex(equipment.status),
      emissive: getStatusColorHex(equipment.status),
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.1,
    });
    disposables.push(shellMat, frameMat, accentMat, rubberMat, screenMat, statusBeaconMat);

    const { root: equipmentGroup, explodeParts } = buildMedicalEquipmentGroup(
      equipment,
      {
        shell: shellMat,
        frame: frameMat,
        accent: accentMat,
        rubber: rubberMat,
        screen: screenMat,
        statusBeacon: statusBeaconMat,
      },
      disposables
    );
    scene.add(equipmentGroup);

    applyFinishRef.current = (mode: FinishMode) => {
      const wireframe = mode === 'wireframe';
      shellMat.wireframe = wireframe;
      frameMat.wireframe = wireframe;
      accentMat.wireframe = wireframe;
      rubberMat.wireframe = wireframe;
      if (mode === 'anodized') {
        shellMat.color.setHex(0x334155);
        shellMat.metalness = 0.65;
        shellMat.roughness = 0.28;
      } else {
        shellMat.color.setHex(0xf8fafc);
        shellMat.metalness = 0.08;
        shellMat.roughness = 0.35;
      }
      shellMat.needsUpdate = true;
    };
    applyFinishRef.current(finishRef.current);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.4;
    controls.maxDistance = 6.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.update();

    controls.addEventListener('start', () => {
      presetTriggerRef.current.active = false;
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let currentExplode = explodeTargetRef.current;
    let lastTime = performance.now();
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Smooth exploded view interpolation
        const expDiff = Math.abs(explodeTargetRef.current - currentExplode);
        if (expDiff > 0.002) {
          currentExplode = isSoftwareGl
            ? explodeTargetRef.current
            : THREE.MathUtils.damp(currentExplode, explodeTargetRef.current, 7, dt);
          for (const part of explodeParts) {
            part.obj.position.set(
              part.base.x + part.offset.x * currentExplode,
              part.base.y + part.offset.y * currentExplode,
              part.base.z + part.offset.z * currentExplode
            );
          }
          if (!isSoftwareGl && Math.abs(explodeTargetRef.current - currentExplode) > 0.002) {
            renderDirty = true;
          }
        }

        // Smooth camera preset transition
        if (presetTriggerRef.current.active) {
          const p = presetTriggerRef.current.preset;
          if (p === 'iso') _targetCamPos.set(2.15, 1.75, 2.35);
          else if (p === 'front') _targetCamPos.set(0, 1.1, 3.0);
          else if (p === 'side') _targetCamPos.set(3.0, 1.1, 0);
          else _targetCamPos.set(0.01, 3.6, 0.35);

          if (isSoftwareGl) {
            camera.position.copy(_targetCamPos);
            controls.target.copy(_targetLookAt);
            presetTriggerRef.current.active = false;
          } else {
            const factor = 1 - Math.exp(-8 * dt);
            camera.position.lerp(_targetCamPos, factor);
            controls.target.lerp(_targetLookAt, factor);
            if (camera.position.distanceTo(_targetCamPos) < 0.02) {
              camera.position.copy(_targetCamPos);
              presetTriggerRef.current.active = false;
            } else {
              renderDirty = true;
            }
          }
        }

        const stillDamping = controls.update();
        if (stillDamping && !isSoftwareGl) {
          renderDirty = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      envRT.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [equipment.id, equipment.assetId, equipment.name, equipment.category, equipment.status, equipment.serialNumber, equipment.nextServiceDate]);

  return (
    <div className="relative w-full h-[380px] rounded-xl border border-slate-200 bg-slate-100 overflow-hidden select-none">
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Top-Left Asset Identification */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none bg-white/95 border border-slate-200 rounded-lg px-3 py-1.5">
        <div className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
          {equipment.assetId} · 3D Asset Twin
        </div>
        <div className="text-[11px] text-slate-600">
          {equipment.manufacturer} {equipment.model}
        </div>
      </div>

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-20 bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <Box className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-800">3D Viewport Suspended</p>
          <p className="text-xs text-slate-500 mt-1">WebGL context is recovering.</p>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (solid surface, zero backdrop-filter) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[95%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 border-b-0 rounded-t-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show 3D Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Hide Controls
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
            {/* Exploded View Slider */}
            <label className="flex items-center gap-2 text-xs text-slate-700 whitespace-nowrap">
              <span className="font-medium">Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodeRatio}
                onChange={(e) => setExplodeRatio(parseFloat(e.target.value))}
                className="w-20 accent-slate-900 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-slate-500 w-8 tabular-nums">
                {Math.round(explodeRatio * 100)}%
              </span>
            </label>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Camera Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
              {(['iso', 'front', 'side', 'top'] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`px-2 py-1 text-[11px] font-medium rounded capitalize transition-colors whitespace-nowrap ${
                    preset === p
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Surface Finish */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
              {(['clinical', 'anodized', 'wireframe'] as FinishMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFinishMode(m)}
                  className={`px-2 py-1 text-[11px] font-medium rounded capitalize transition-colors whitespace-nowrap ${
                    finishMode === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
