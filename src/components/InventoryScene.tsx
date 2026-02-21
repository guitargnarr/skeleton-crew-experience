import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function InventoryObjects({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const timeRef = useRef(0);
  const count = isMobile ? 40 : 80;

  const { scattered, grid, dummy } = useMemo(() => {
    const s = new Float32Array(count * 3);
    const g = new Float32Array(count * 3);
    const cols = 8;
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      s[i * 3] = (Math.random() - 0.5) * 12;
      s[i * 3 + 1] = (Math.random() - 0.5) * 8;
      s[i * 3 + 2] = (Math.random() - 0.5) * 6;
      const col = i % cols;
      const row = Math.floor(i / cols);
      g[i * 3] = (col - cols / 2 + 0.5) * 0.5;
      g[i * 3 + 1] = (row - rows / 2 + 0.5) * 0.5;
      g[i * 3 + 2] = 0;
    }
    return { scattered: s, grid: g, dummy: new THREE.Object3D() };
  }, [count]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.03) / 0.15));
    const converge = smoothstep(sceneP);
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const si = i * 3;
      const x = scattered[si] + (grid[si] - scattered[si]) * converge;
      const y = scattered[si + 1] + (grid[si + 1] - scattered[si + 1]) * converge;
      const z = scattered[si + 2] + (grid[si + 2] - scattered[si + 2]) * converge;
      dummy.position.set(x, y, z);
      dummy.rotation.y = timeRef.current * 0.3 + i * 0.1;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial
        emissive="#00E5FF"
        emissiveIntensity={1.2}
        color="#0d0a1a"
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}

export function InventoryGrid({ progress }: { progress: number }) {
  const ref = useRef<THREE.GridHelper>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.03) / 0.15));
    if (!ref.current) return;
    ref.current.material.opacity = sceneP * 0.3;
    ref.current.rotation.y = timeRef.current * 0.02;
  });

  return (
    <gridHelper
      ref={ref as any}
      args={[10, 10, "#2D1B69", "#1a1530"]}
      position={[0, -2, 0]}
      material-transparent={true}
      material-opacity={0}
      material-depthWrite={false}
    />
  );
}

export function InventoryGlow({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const sceneP = Math.max(0, Math.min(1, (progress - 0.03) / 0.15));
    if (!ref.current) return;
    const s = 0.3 + sceneP * 1.2;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = sceneP * 0.25;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.5 + sceneP * 1.5;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
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
  );
}

export function InventoryLighting() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 3, 0]} color="#00E5FF" intensity={0.8} distance={12} />
      <pointLight position={[4, 2, -3]} color="#2D1B69" intensity={0.4} distance={10} />
      <pointLight position={[-3, -1, 4]} color="#F5F0E8" intensity={0.3} distance={10} />
    </>
  );
}
