import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const RING_SPAWN_POINTS = [0.1, 0.25, 0.4, 0.55, 0.7];

export function VerificationRings({ progress }: { progress: number }) {
  const ringsRef = useRef<THREE.Mesh[]>([]);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.54) / 0.15));

    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;
      const spawnAt = RING_SPAWN_POINTS[i];
      const elapsed = Math.max(0, sceneP - spawnAt);
      const expand = Math.min(1, elapsed * 2.5);
      const radius = 0.5 + expand * 5.5;
      ring.scale.set(radius, radius, radius);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - expand * 0.8) * 0.6);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = timeRef.current * 0.05 * (i + 1);
    });
  });

  return (
    <>
      {RING_SPAWN_POINTS.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringsRef.current[i] = el;
          }}
        >
          <torusGeometry args={[1, 0.015, 8, 96]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

export function VerificationNodes({
  progress,
  isMobile,
}: {
  progress: number;
  isMobile: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const timeRef = useRef(0);
  const count = isMobile ? 150 : 300;

  const { nodePositions, distances, dummy, colorActive, colorDim } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const dist = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      dist[i] = Math.sqrt(
        pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2
      );
    }
    return {
      nodePositions: pos,
      distances: dist,
      dummy: new THREE.Object3D(),
      colorActive: new THREE.Color("#00E5FF"),
      colorDim: new THREE.Color("#2D1B69"),
    };
  }, [count]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.54) / 0.15));
    const mesh = meshRef.current;
    if (!mesh) return;

    const waveRadius = sceneP * 6;
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const si = i * 3;
      dummy.position.set(nodePositions[si], nodePositions[si + 1], nodePositions[si + 2]);
      const activated = distances[i] < waveRadius;
      const s = activated ? 1.2 : 0.6;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (activated) {
        color.copy(colorActive);
      } else {
        color.copy(colorDim);
      }
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        emissive="#00E5FF"
        emissiveIntensity={1.5}
        color="#2D1B69"
        transparent
        opacity={0.8}
      />
    </instancedMesh>
  );
}

export function VerificationCenter({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const sceneP = Math.max(0, Math.min(1, (progress - 0.54) / 0.15));
    if (!ref.current) return;
    ref.current.rotation.x = timeRef.current * 0.2;
    ref.current.rotation.y = timeRef.current * 0.15;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const pulse = Math.sin(timeRef.current * 2) * 0.3 + 0.7;
    mat.emissiveIntensity = (1 + sceneP * 2) * pulse;
    mat.opacity = 0.4 + sceneP * 0.5;
  });

  return (
    <mesh ref={ref}>
      <dodecahedronGeometry args={[0.5]} />
      <meshStandardMaterial
        emissive="#00E5FF"
        emissiveIntensity={1}
        color="#0d0a1a"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function VerificationLighting() {
  return (
    <>
      <ambientLight intensity={0.03} />
      <pointLight position={[0, 0, 0]} color="#00E5FF" intensity={1.2} distance={15} />
      <pointLight position={[0, 5, 0]} color="#ffffff" intensity={0.5} distance={12} />
      <pointLight position={[3, -2, -3]} color="#2D1B69" intensity={0.4} distance={10} />
    </>
  );
}
