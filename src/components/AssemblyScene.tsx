import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function AssemblyStreams({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);
  const count = isMobile ? 60 : 120;

  const { positions, origins } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const perStream = Math.floor(count / 4);
    const offsets = [[-4, 5], [-1.3, 5], [1.3, 5], [4, 5]];

    for (let i = 0; i < count; i++) {
      const si = Math.min(Math.floor(i / perStream), 3);
      const ox = offsets[si][0] + (Math.random() - 0.5) * 1;
      const oy = offsets[si][1] * (Math.random());
      const oz = (Math.random() - 0.5) * 2;
      orig[i * 3] = ox;
      orig[i * 3 + 1] = oy;
      orig[i * 3 + 2] = oz;
      pos[i * 3] = ox;
      pos[i * 3 + 1] = oy;
      pos[i * 3 + 2] = oz;
    }
    return { positions: pos, origins: orig };
  }, [count]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.37) / 0.15));
    const pts = pointsRef.current;
    if (!pts) return;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const converge = smoothstep(sceneP);

    for (let i = 0; i < count; i++) {
      const si = i * 3;
      arr[si] = origins[si] * (1 - converge * 0.7);
      arr[si + 1] = origins[si + 1] * (1 - converge);
      arr[si + 2] = origins[si + 2] * (1 - converge);
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
        opacity={isMobile ? 0.35 : 0.12}
        size={isMobile ? 0.12 : 0.06}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function AssemblyCore({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const sceneP = Math.max(0, Math.min(1, (progress - 0.37) / 0.15));
    if (!ref.current) return;
    const s = 0.05 + sceneP * 0.1;
    ref.current.scale.set(s, s, s);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.05 + sceneP * 0.05;
    mat.opacity = 0.02 + sceneP * 0.02;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        emissive="#2D1B69"
        emissiveIntensity={0.05}
        color="#0d0a1a"
        transparent
        opacity={0.02}
        depthWrite={false}
      />
    </mesh>
  );
}

export function AssemblyPulses({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const timeRef = useRef(0);
  const ringsRef = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.37) / 0.15));
    if (!groupRef.current) return;

    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;
      const cycle = (timeRef.current * 0.3 + i * 1.2) % 3.6;
      const expand = cycle / 3.6;
      const s = 0.5 + expand * 5;
      ring.scale.set(s, s, s);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - expand) * 0.04 * sceneP);
    });
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringsRef.current[i] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[1, 0.01, 8, 64]} />
          <meshBasicMaterial
            color="#2D1B69"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function AssemblyLighting({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <>
      <ambientLight intensity={isMobile ? 0.08 : 0.02} />
    </>
  );
}
