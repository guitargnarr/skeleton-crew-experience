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
  const count = isMobile ? 600 : 1200;

  const { positions, colors, sizes, origins } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const orig = new Float32Array(count * 3);
    const cream = new THREE.Color("#F5F0E8");
    const cyan = new THREE.Color("#00E5FF");

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 2;
      orig[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      orig[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      orig[i * 3 + 2] = r * Math.cos(phi);
      pos[i * 3] = orig[i * 3];
      pos[i * 3 + 1] = orig[i * 3 + 1];
      pos[i * 3 + 2] = orig[i * 3 + 2];
      const c = i % 2 === 0 ? cream : cyan;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sz[i] = 2 + Math.random() * 3;
    }
    return { positions: pos, colors: col, sizes: sz, origins: orig };
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
      const speed = isLeft ? 1.0 : 1.5;
      const dir = isLeft ? -1 : 1;
      arr[si] = origins[si] + dir * split * 4 * speed;
      arr[si + 1] = origins[si + 1] + Math.sin(timeRef.current + i) * 0.1;
      arr[si + 2] = origins[si + 2] + Math.cos(timeRef.current * 0.7 + i) * 0.08;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.5}
        size={2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function DecisionDivider({ progress }: { progress: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 50;

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
    mat.opacity = mid * 0.8;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#F5F0E8"
        transparent
        opacity={0}
        size={2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
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
      const s = 0.2 + converge * 0.5;
      ref.current.scale.set(s, s, s);
      (ref.current.material as THREE.MeshStandardMaterial).opacity = converge * 0.08;
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.3 + converge * 0.8;
    });
  });

  return (
    <>
      <mesh ref={leftRef} position={[-3, 0, 0]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          emissive="#F5F0E8"
          emissiveIntensity={0.5}
          color="#000000"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={rightRef} position={[3, 0, 0]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          emissive="#00E5FF"
          emissiveIntensity={0.5}
          color="#000000"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export function DecisionLighting() {
  return (
    <>
      <ambientLight intensity={0.03} />
      <pointLight position={[-5, 2, 0]} color="#F5F0E8" intensity={0.3} distance={12} />
      <pointLight position={[5, 2, 0]} color="#00E5FF" intensity={0.4} distance={12} />
      <pointLight position={[0, 0, 5]} color="#2D1B69" intensity={0.2} distance={10} />
    </>
  );
}
