import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function DecisionParticles({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);
  const count = isMobile ? 80 : 150;

  const { positions, origins } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 4;
      orig[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      orig[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      orig[i * 3 + 2] = r * Math.cos(phi);
      pos[i * 3] = orig[i * 3];
      pos[i * 3 + 1] = orig[i * 3 + 1];
      pos[i * 3 + 2] = orig[i * 3 + 2];
    }
    return { positions: pos, origins: orig };
  }, [count]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.2) / 0.15));
    const split = smoothstep(sceneP);
    const pts = pointsRef.current;
    if (!pts) return;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const si = i * 3;
      const isLeft = i % 2 === 0;
      const dir = isLeft ? -1 : 1;
      arr[si] = origins[si] + dir * split * 3;
      arr[si + 1] = origins[si + 1] + Math.sin(timeRef.current * 0.5 + i) * 0.05;
      arr[si + 2] = origins[si + 2];
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={isMobile ? "#6a4aba" : "#2D1B69"}
        transparent
        opacity={isMobile ? 0.4 : 0.15}
        size={isMobile ? 0.15 : 0.08}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function DecisionDivider({ progress }: { progress: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 30;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = (i / count - 0.5) * 6;
      pos[i * 3 + 2] = 0;
    }
    return pos;
  }, []);

  useFrame(() => {
    const sceneP = Math.max(0, Math.min(1, (progress - 0.2) / 0.15));
    if (!pointsRef.current) return;
    const mid = sceneP < 0.5 ? sceneP / 0.5 : 1 - (sceneP - 0.5) / 0.5;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = mid * 0.15;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#2D1B69"
        transparent
        opacity={0}
        size={0.06}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function DecisionGlow({ progress }: { progress: number }) {
  const leftRef = useRef<THREE.Mesh>(null!);
  const rightRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const sceneP = Math.max(0, Math.min(1, (progress - 0.2) / 0.15));
    const converge = smoothstep(sceneP);
    [leftRef, rightRef].forEach((ref) => {
      if (!ref.current) return;
      const s = 0.1 + converge * 0.15;
      ref.current.scale.set(s, s, s);
      (ref.current.material as THREE.MeshStandardMaterial).opacity = converge * 0.02;
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.05 + converge * 0.05;
    });
  });

  return (
    <>
      <mesh ref={leftRef} position={[-3, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          emissive="#2D1B69"
          emissiveIntensity={0.05}
          color="#0d0a1a"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={rightRef} position={[3, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          emissive="#2D1B69"
          emissiveIntensity={0.05}
          color="#0d0a1a"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export function DecisionLighting({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <>
      <ambientLight intensity={isMobile ? 0.08 : 0.02} />
    </>
  );
}
