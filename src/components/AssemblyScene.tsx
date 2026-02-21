import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

const STREAM_CONFIGS = [
  { color: new THREE.Color("#00E5FF"), origin: [0, 6, 0], speed: 1.0 },
  { color: new THREE.Color("#F5F0E8"), origin: [6, 0, 0], speed: 1.3 },
  { color: new THREE.Color("#6a5dba"), origin: [0, -6, 0], speed: 0.8 },
  { color: new THREE.Color("#b0f0ff"), origin: [-6, 0, 0], speed: 1.1 },
] as const;

export function AssemblyStreams({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);
  const count = isMobile ? 400 : 800;
  const perStream = Math.floor(count / 4);

  const { positions, colors, origins, streamIdx } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const idx = new Int32Array(count);

    for (let i = 0; i < count; i++) {
      const si = Math.floor(i / perStream);
      const stream = STREAM_CONFIGS[Math.min(si, 3)];
      idx[i] = Math.min(si, 3);
      const ox = stream.origin[0] + (Math.random() - 0.5) * 2;
      const oy = stream.origin[1] + (Math.random() - 0.5) * 2;
      const oz = (Math.random() - 0.5) * 3;
      orig[i * 3] = ox;
      orig[i * 3 + 1] = oy;
      orig[i * 3 + 2] = oz;
      pos[i * 3] = ox;
      pos[i * 3 + 1] = oy;
      pos[i * 3 + 2] = oz;
      col[i * 3] = stream.color.r;
      col[i * 3 + 1] = stream.color.g;
      col[i * 3 + 2] = stream.color.b;
    }
    return { positions: pos, colors: col, origins: orig, streamIdx: idx };
  }, [count, perStream]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.37) / 0.15));
    const pts = pointsRef.current;
    if (!pts) return;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const si = i * 3;
      const stream = STREAM_CONFIGS[streamIdx[i]];
      const converge = smoothstep(Math.min(1, sceneP * stream.speed));
      arr[si] = origins[si] * (1 - converge);
      arr[si + 1] = origins[si + 1] * (1 - converge);
      arr[si + 2] =
        origins[si + 2] * (1 - converge) +
        Math.sin(timeRef.current * 0.8 + i * 0.3) * 0.15 * (1 - converge);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.2}
        size={1.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function AssemblyCore({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const sceneP = Math.max(0, Math.min(1, (progress - 0.37) / 0.15));
    if (!ref.current) return;
    const s = 0.1 + sceneP * 0.3;
    ref.current.scale.set(s, s, s);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.1 + sceneP * 0.15;
    mat.opacity = 0.03 + sceneP * 0.05;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        emissive="#00E5FF"
        emissiveIntensity={0.15}
        color="#0d0a1a"
        transparent
        opacity={0.06}
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
      mat.opacity = Math.max(0, (1 - expand) * 0.15 * sceneP);
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
          <torusGeometry args={[1, 0.02, 8, 64]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function AssemblyLighting() {
  return (
    <>
      <ambientLight intensity={0.04} />
      <pointLight position={[0, 0, 0]} color="#00E5FF" intensity={0.4} distance={15} />
      <pointLight position={[3, 3, -2]} color="#F5F0E8" intensity={0.2} distance={10} />
      <pointLight position={[-2, -3, 3]} color="#2D1B69" intensity={0.15} distance={10} />
    </>
  );
}
