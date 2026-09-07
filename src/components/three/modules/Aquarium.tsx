"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneModel } from "../sceneModel";

/**
 * `aquarium:*` — glass box, water volume, stand and demo livestock.
 * The tank's size comes straight from the customer's dimensions, so the
 * viewport and the volume estimate always agree.
 */
export function Aquarium({ model }: { model: SceneModel }) {
  const { aquarium } = model;
  if (!aquarium) return null;

  const { size, origin, standHeight, lit } = aquarium;
  const waterHeight = size.y * 0.88;

  return (
    <group position={origin}>
      {/* Stand */}
      <mesh position={[0, -standHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x + 0.08, standHeight, size.z + 0.08]} />
        <meshStandardMaterial color="#3a3f42" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Water */}
      <mesh position={[0, waterHeight / 2, 0]}>
        <boxGeometry args={[size.x - 0.03, waterHeight, size.z - 0.03]} />
        <meshStandardMaterial
          color={lit ? "#3fa9c4" : "#2f7f8f"}
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Substrate */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[size.x - 0.05, 0.06, size.z - 0.05]} />
        <meshStandardMaterial color="#8f7d63" roughness={1} />
      </mesh>

      {/* Glass */}
      <mesh position={[0, size.y / 2, 0]}>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial
          color="#cfe6ea"
          transparent
          opacity={0.14}
          roughness={0.05}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rim */}
      <mesh position={[0, size.y, 0]}>
        <boxGeometry args={[size.x + 0.02, 0.03, size.z + 0.02]} />
        <meshStandardMaterial color="#2b2f31" roughness={0.6} metalness={0.4} />
      </mesh>

      {lit ? (
        <pointLight
          position={[0, size.y + 0.1, 0]}
          color="#7fd8ee"
          intensity={4}
          distance={2.4}
        />
      ) : null}

      <Fish aquarium={aquarium} waterHeight={waterHeight} />
    </group>
  );
}

type FishInstance = {
  color: string;
  radius: number;
  y: number;
  speed: number;
  phase: number;
  scale: number;
};

/** Demo livestock: small bodies orbiting inside the tank volume. */
function Fish({
  aquarium,
  waterHeight,
}: {
  aquarium: NonNullable<SceneModel["aquarium"]>;
  waterHeight: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const instances = useMemo<FishInstance[]>(() => {
    const out: FishInstance[] = [];
    const maxRadius = Math.max(0.08, Math.min(aquarium.size.x, aquarium.size.z) / 2 - 0.08);

    aquarium.fish.forEach((species, speciesIndex) => {
      for (let i = 0; i < species.count; i += 1) {
        const t = (i + 1) / (species.count + 1);
        out.push({
          color: species.color,
          radius: maxRadius * (0.35 + 0.6 * t),
          y: waterHeight * (0.25 + 0.5 * ((speciesIndex + t) % 1)),
          speed: 0.35 + 0.25 * ((speciesIndex % 3) + t),
          phase: (speciesIndex * 2.1 + i * 1.7) % (Math.PI * 2),
          scale: 0.035 + 0.02 * ((speciesIndex + 1) % 3),
        });
      }
    });
    return out;
  }, [aquarium.fish, aquarium.size.x, aquarium.size.z, waterHeight]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const time = clock.getElapsedTime();

    group.children.forEach((child, index) => {
      const fish = instances[index];
      if (!fish) return;
      const angle = fish.phase + time * fish.speed;
      // Elliptical path so fish read as swimming along the tank, not in a circle.
      child.position.set(
        Math.cos(angle) * fish.radius * (aquarium.size.x / aquarium.size.z),
        fish.y + Math.sin(time * fish.speed * 1.7 + fish.phase) * 0.03,
        Math.sin(angle) * fish.radius,
      );
      child.rotation.y = -angle + Math.PI / 2;
    });
  });

  if (instances.length === 0) return null;

  return (
    <group ref={groupRef}>
      {instances.map((fish, index) => (
        <mesh key={index} scale={[fish.scale * 2.2, fish.scale, fish.scale * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial
            color={fish.color}
            roughness={0.4}
            emissive={fish.color}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}
