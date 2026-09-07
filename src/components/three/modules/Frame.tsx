"use client";

import type { SceneModel } from "../sceneModel";

/**
 * `frame` — four posts, a ground deck and the top beam ring.
 * Placeholder geometry: sections are visual only, not structural members.
 */
export function Frame({ model }: { model: SceneModel }) {
  const { width, length, height, frame } = model;
  const s = frame.postSize;
  const halfW = width / 2 - s / 2;
  const halfL = length / 2 - s / 2;

  const posts: [number, number][] = [
    [halfL, halfW],
    [halfL, -halfW],
    [-halfL, halfW],
    [-halfL, -halfW],
  ];

  return (
    <group>
      {/* Deck */}
      <mesh position={[0, -0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[length + 0.3, 0.12, width + 0.3]} />
        <meshStandardMaterial color="#7b6247" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* A single step at the entry side */}
      <mesh position={[0, -0.17, width / 2 + 0.4]} receiveShadow>
        <boxGeometry args={[length * 0.55, 0.12, 0.5]} />
        <meshStandardMaterial color="#6d5740" roughness={0.9} />
      </mesh>

      {posts.map(([x, z], index) => (
        <mesh key={index} position={[x, height / 2, z]} castShadow>
          <boxGeometry args={[s, height, s]} />
          <meshStandardMaterial
            color={frame.color}
            metalness={frame.metalness}
            roughness={frame.roughness}
          />
        </mesh>
      ))}

      {/* Top beam ring */}
      {[
        { pos: [0, height, halfW], args: [length, s, s] },
        { pos: [0, height, -halfW], args: [length, s, s] },
        { pos: [halfL, height, 0], args: [s, s, width] },
        { pos: [-halfL, height, 0], args: [s, s, width] },
      ].map((beam, index) => (
        <mesh
          key={index}
          position={beam.pos as [number, number, number]}
          castShadow
        >
          <boxGeometry args={beam.args as [number, number, number]} />
          <meshStandardMaterial
            color={frame.color}
            metalness={frame.metalness}
            roughness={frame.roughness}
          />
        </mesh>
      ))}
    </group>
  );
}
