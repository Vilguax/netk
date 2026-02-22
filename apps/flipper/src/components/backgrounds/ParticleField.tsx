"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  color: string;
  count?: number;
}

function Particles({ color, count = 500 }: ParticleFieldProps) {
  const mesh = useRef<THREE.Points>(null);

  const [geometry, velocities] = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      vels[i * 3] = (Math.random() - 0.5) * 0.01;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return [geo, vels];
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;

    const positions = mesh.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];

      if (Math.abs(positions[i * 3]) > 10) positions[i * 3] *= -0.9;
      if (Math.abs(positions[i * 3 + 1]) > 10) positions[i * 3 + 1] *= -0.9;
      if (Math.abs(positions[i * 3 + 2]) > 10) positions[i * 3 + 2] *= -0.9;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.rotation.y += 0.0005;
  });

  return (
    <points ref={mesh} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function GridFloor({ color }: { color: string }) {
  return (
    <gridHelper
      args={[30, 30, color, color]}
      position={[0, -5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

export function ParticleField({ color, count = 500 }: ParticleFieldProps) {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <fog attach="fog" args={["#000", 5, 20]} />
        <ambientLight intensity={0.5} />
        <Particles color={color} count={count} />
        <GridFloor color={color} />
      </Canvas>
    </div>
  );
}
