import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

const CLUSTER_CENTERS = [
  [0, 4, 0],
  [3.8, 1.24, 0],
  [2.35, -3.24, 0],
  [-2.35, -3.24, 0],
  [-3.8, 1.24, 0],
] as const;

export function AccumulationStars({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);
  const count = isMobile ? 80 : 150;
  const perCluster = Math.floor(count / 5);

  const { positions, scattered, targets } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scat = new Float32Array(count * 3);
    const targ = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const ci = Math.min(Math.floor(i / perCluster), 4);
      const center = CLUSTER_CENTERS[ci];
      scat[i * 3] = (Math.random() - 0.5) * 20;
      scat[i * 3 + 1] = (Math.random() - 0.5) * 14;
      scat[i * 3 + 2] = (Math.random() - 0.5) * 10;
      targ[i * 3] = center[0] + (Math.random() - 0.5) * 1.2;
      targ[i * 3 + 1] = center[1] + (Math.random() - 0.5) * 1.2;
      targ[i * 3 + 2] = center[2] + (Math.random() - 0.5) * 1.2;
      pos[i * 3] = scat[i * 3];
      pos[i * 3 + 1] = scat[i * 3 + 1];
      pos[i * 3 + 2] = scat[i * 3 + 2];
    }
    return { positions: pos, scattered: scat, targets: targ };
  }, [count, perCluster]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.71) / 0.15));
    const converge = smoothstep(sceneP);
    const pts = pointsRef.current;
    if (!pts) return;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const si = i * 3;
      arr[si] = scattered[si] + (targets[si] - scattered[si]) * converge;
      arr[si + 1] = scattered[si + 1] + (targets[si + 1] - scattered[si + 1]) * converge;
      arr[si + 2] = scattered[si + 2] + (targets[si + 2] - scattered[si + 2]) * converge;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#2D1B69"
        transparent
        opacity={0.15}
        size={0.06}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function AccumulationEdges({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const linesRef = useRef<THREE.LineSegments>(null!);
  const count = isMobile ? 15 : 30;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const fromCluster = Math.floor(Math.random() * 5);
      const toCluster = (fromCluster + 1 + Math.floor(Math.random() * 4)) % 5;
      const fc = CLUSTER_CENTERS[fromCluster];
      const tc = CLUSTER_CENTERS[toCluster];
      pos[i * 6] = fc[0] + (Math.random() - 0.5) * 0.8;
      pos[i * 6 + 1] = fc[1] + (Math.random() - 0.5) * 0.8;
      pos[i * 6 + 2] = fc[2] + (Math.random() - 0.5) * 0.8;
      pos[i * 6 + 3] = tc[0] + (Math.random() - 0.5) * 0.8;
      pos[i * 6 + 4] = tc[1] + (Math.random() - 0.5) * 0.8;
      pos[i * 6 + 5] = tc[2] + (Math.random() - 0.5) * 0.8;
    }
    return pos;
  }, [count]);

  useFrame(() => {
    const sceneP = Math.max(0, Math.min(1, (progress - 0.71) / 0.15));
    if (!linesRef.current) return;
    const mat = linesRef.current.material as THREE.LineBasicMaterial;
    const edgeP = Math.max(0, (sceneP - 0.3) / 0.7);
    mat.opacity = smoothstep(edgeP) * 0.08;
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#2D1B69"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export function AccumulationNebula({
  progress: _progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = isMobile ? 40 : 80;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 6;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#1a1530"
        transparent
        opacity={0.1}
        size={0.04}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function AccumulationCentralNode({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.71) / 0.15));

    if (ref.current) {
      const s = 0.05 + sceneP * 0.1;
      ref.current.scale.set(s, s, s);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.03 + sceneP * 0.03;
    }
    if (glowRef.current) {
      const gs = 0.1 + sceneP * 0.15;
      glowRef.current.scale.set(gs, gs, gs);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = sceneP * 0.01;
    }
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#2D1B69"
          transparent
          opacity={0.03}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#1a1530"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export function AccumulationLighting() {
  return (
    <>
      <ambientLight intensity={0.02} />
    </>
  );
}
