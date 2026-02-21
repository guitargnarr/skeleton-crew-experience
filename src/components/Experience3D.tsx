/**
 * Experience3D: Main 3D canvas orchestrator -- 5-Scene Architecture
 * Skeleton Crew: The operational backbone behind every delivery.
 *
 * Timeline (normalized 0-1):
 *   0.00-0.03  Title
 *   0.03-0.18  I.   Inventory (cataloging the parts)
 *   0.18-0.20  Transition I->II
 *   0.20-0.35  II.  Decision (choosing the path)
 *   0.35-0.37  Transition II->III
 *   0.37-0.52  III. Assembly (building the machine)
 *   0.52-0.54  Transition III->IV
 *   0.54-0.69  IV.  Verification (testing every joint)
 *   0.69-0.71  Transition IV->V
 *   0.71-0.86  V.   Accumulation (the full system)
 *   0.86-1.00  Outro
 */

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { InventoryObjects, InventoryGrid, InventoryGlow, InventoryLighting } from "./InventoryScene";
import { DecisionParticles, DecisionDivider, DecisionGlow, DecisionLighting } from "./DecisionScene";
import { AssemblyStreams, AssemblyCore, AssemblyPulses, AssemblyLighting } from "./AssemblyScene";
import { VerificationRings, VerificationNodes, VerificationCenter, VerificationLighting } from "./VerificationScene";
import { AccumulationStars, AccumulationEdges, AccumulationNebula, AccumulationCentralNode, AccumulationLighting } from "./AccumulationScene";

interface SceneProps {
  progress: number;
  isMobile?: boolean;
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl");
    return gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext;
  } catch { return false; }
}

function GradientFallback({ progress }: { progress: number }) {
  const phase = progress * 5;
  return (
    <div className="fixed inset-0" style={{ zIndex: 0, background: "#0d0a1a" }}>
      <div style={{ position: "absolute", left: "20%", top: "25%", width: "30%", height: "50%", background: "radial-gradient(ellipse, rgba(45,27,105,0.15) 0%, transparent 70%)", opacity: Math.max(0, 1 - phase), filter: "blur(40px)" }} />
      <div style={{ position: "absolute", right: "15%", top: "20%", width: "35%", height: "45%", background: "radial-gradient(ellipse, rgba(0,229,255,0.1) 0%, transparent 70%)", opacity: Math.min(1, phase * 0.3), filter: "blur(50px)" }} />
    </div>
  );
}

/* === MORPH CAMERA === */

function MorphCamera({ progress, isMobile }: { progress: number; isMobile: boolean }) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, 0.5, 12));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const zPull = isMobile ? 5.0 : 0;
  const xScale = isMobile ? 0.35 : 1;

  useFrame(() => {
    let pos: THREE.Vector3;
    let lookAt: THREE.Vector3;

    if (progress < 0.03) {
      /* Title: static wide shot */
      pos = new THREE.Vector3(0, 0.5, 12 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.10) {
      /* Scene I entry: rise from center to overhead */
      const t = (progress - 0.03) / 0.07;
      const e = t * t * (3 - 2 * t);
      pos = new THREE.Vector3(0, 0.5 + e * 4.5, 8 + (1 - e) * 4 + zPull);
      lookAt = new THREE.Vector3(0, -e * 0.5, 0);
    } else if (progress < 0.18) {
      /* Scene I (Inventory): orbit down from overhead */
      const t = (progress - 0.10) / 0.08;
      const angle = t * Math.PI * 0.4;
      pos = new THREE.Vector3(Math.sin(angle) * 3 * xScale, 5 - t * 3, 8 - t * 2 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.20) {
      /* Transition I->II: smoothstep to center */
      const t = (progress - 0.18) / 0.02;
      const e = t * t * (3 - 2 * t);
      pos = new THREE.Vector3(Math.sin(Math.PI * 0.2) * 3 * (1 - e) * xScale, 2 * (1 - e) + 0.5 * e, 6 * (1 - e) + 8 * e + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.35) {
      /* Scene II (Decision): slow dolly back */
      const t = (progress - 0.20) / 0.15;
      pos = new THREE.Vector3(Math.sin(t * Math.PI * 0.2) * 2 * xScale, 0.5, 8 + t * 2 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.37) {
      /* Transition II->III: rise to overhead */
      const t = (progress - 0.35) / 0.02;
      const e = t * t * (3 - 2 * t);
      pos = new THREE.Vector3(0, 0.5 + e * 3.5, 10 - e * 4 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.52) {
      /* Scene III (Assembly): overhead tilt to side */
      const t = (progress - 0.37) / 0.15;
      const angle = t * Math.PI * 0.3;
      pos = new THREE.Vector3(Math.sin(angle) * 2 * xScale, 4 - t * 1.5, 6 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.54) {
      /* Transition III->IV: dive to close */
      const t = (progress - 0.52) / 0.02;
      const e = t * t * (3 - 2 * t);
      pos = new THREE.Vector3(Math.sin(Math.PI * 0.15) * 2 * (1 - e) * xScale, 2.5 * (1 - e), 6 * (1 - e) + 5 * e + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.69) {
      /* Scene IV (Verification): close pull-back */
      const t = (progress - 0.54) / 0.15;
      pos = new THREE.Vector3(-t * 2 * xScale, t * 1, 5 + t * 2 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.71) {
      /* Transition IV->V: rise to orbit */
      const t = (progress - 0.69) / 0.02;
      const e = t * t * (3 - 2 * t);
      pos = new THREE.Vector3(-2 * (1 - e) * xScale, 1 + e * 1, 7 + e * 2 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else if (progress < 0.86) {
      /* Scene V (Accumulation): slow orbit */
      const t = (progress - 0.71) / 0.15;
      const angle = t * Math.PI * 0.4;
      pos = new THREE.Vector3(Math.sin(angle) * 8 * xScale, 2 + Math.sin(t * Math.PI * 0.5) * 1.5, Math.cos(angle) * 8 + zPull);
      lookAt = new THREE.Vector3(0, 0, 0);
    } else {
      /* Outro: drift upward */
      const t = (progress - 0.86) / 0.14;
      pos = new THREE.Vector3(Math.sin(t * 0.5) * xScale, 2 + t * 8, 8 + t * 4 + zPull);
      lookAt = new THREE.Vector3(0, -1, 0);
    }

    const lerpSpeed = progress < 0.03 ? 0.015 : 0.035;
    currentPos.current.lerp(pos, lerpSpeed);
    currentLookAt.current.lerp(lookAt, lerpSpeed);
    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

/* === SCENE GROUPS === */

function InventoryGroup({ progress, isMobile }: { progress: number; isMobile: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const fade = progress < 0.20 ? 1 : Math.max(0, 1 - (progress - 0.20) / 0.04);
    ref.current.visible = fade > 0.01;
    ref.current.scale.setScalar(0.95 + fade * 0.05);
  });
  return (
    <group ref={ref}>
      <InventoryLighting />
      <InventoryObjects progress={progress} isMobile={isMobile} />
      <InventoryGrid progress={progress} />
      <InventoryGlow progress={progress} />
    </group>
  );
}

function DecisionGroup({ progress, isMobile }: { progress: number; isMobile: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const fadeIn = progress < 0.18 ? 0 : Math.min(1, (progress - 0.18) / 0.04);
    const fadeOut = progress < 0.37 ? 1 : Math.max(0, 1 - (progress - 0.37) / 0.04);
    ref.current.visible = Math.min(fadeIn, fadeOut) > 0.01;
  });
  return (
    <group ref={ref}>
      <DecisionLighting />
      <DecisionParticles progress={progress} isMobile={isMobile} />
      <DecisionDivider progress={progress} />
      <DecisionGlow progress={progress} />
    </group>
  );
}

function AssemblyGroup({ progress, isMobile }: { progress: number; isMobile: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const fadeIn = progress < 0.35 ? 0 : Math.min(1, (progress - 0.35) / 0.04);
    const fadeOut = progress < 0.54 ? 1 : Math.max(0, 1 - (progress - 0.54) / 0.04);
    ref.current.visible = Math.min(fadeIn, fadeOut) > 0.01;
  });
  return (
    <group ref={ref}>
      <AssemblyLighting />
      <AssemblyStreams progress={progress} isMobile={isMobile} />
      <AssemblyCore progress={progress} />
      <AssemblyPulses progress={progress} />
    </group>
  );
}

function VerificationGroup({ progress, isMobile }: { progress: number; isMobile: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const fadeIn = progress < 0.52 ? 0 : Math.min(1, (progress - 0.52) / 0.04);
    const fadeOut = progress < 0.71 ? 1 : Math.max(0, 1 - (progress - 0.71) / 0.04);
    ref.current.visible = Math.min(fadeIn, fadeOut) > 0.01;
  });
  return (
    <group ref={ref}>
      <VerificationLighting />
      <VerificationRings progress={progress} />
      <VerificationNodes progress={progress} isMobile={isMobile} />
      <VerificationCenter progress={progress} />
    </group>
  );
}

function AccumulationGroup({ progress, isMobile }: { progress: number; isMobile: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const fadeIn = progress < 0.69 ? 0 : Math.min(1, (progress - 0.69) / 0.04);
    ref.current.visible = fadeIn > 0.01;
  });
  return (
    <group ref={ref}>
      <AccumulationLighting />
      <AccumulationNebula progress={progress} isMobile={isMobile} />
      <AccumulationStars progress={progress} isMobile={isMobile} />
      <AccumulationEdges progress={progress} isMobile={isMobile} />
      <AccumulationCentralNode progress={progress} />
    </group>
  );
}

/* === AMBIENT PARTICLES === */

function AmbientParticles({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 150 : 400;
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 30;
      p[i * 3 + 1] = (Math.random() - 0.5) * 20;
      p[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return p;
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.001;
      arr[i * 3] += Math.cos(t * 0.15 + i * 0.3) * 0.0005;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#3a2a5a" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* === MAIN EXPORT === */

export default function Experience3D({ progress, isMobile = false }: SceneProps) {
  if (typeof window !== "undefined" && !detectWebGL()) {
    return <GradientFallback progress={progress} />;
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 1, width: "100vw", height: "100dvh" }}>
      <Canvas
        camera={{ position: [0, 0.5, 12], fov: isMobile ? 65 : 50, near: 0.1, far: 100 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isMobile, powerPreference: isMobile ? "low-power" : "default", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ pointerEvents: "none" }}
      >
        <color attach="background" args={["#0d0a1a"]} />
        <fog attach="fog" args={["#0d0a1a", isMobile ? 12 : 10, isMobile ? 35 : 30]} />

        <MorphCamera progress={progress} isMobile={isMobile} />

        <InventoryGroup progress={progress} isMobile={isMobile} />
        <DecisionGroup progress={progress} isMobile={isMobile} />
        <AssemblyGroup progress={progress} isMobile={isMobile} />
        <VerificationGroup progress={progress} isMobile={isMobile} />
        <AccumulationGroup progress={progress} isMobile={isMobile} />

        <AmbientParticles isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
