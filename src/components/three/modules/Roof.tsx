"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { SceneModel } from "../sceneModel";

/**
 * Roof modules, keyed by `roof:*`.
 * Each key maps to its own placeholder geometry; adding a roof style means
 * adding a catalog record and a branch here.
 */
export function Roof({ model }: { model: SceneModel }) {
  const { roof, width, length, height } = model;
  if (!roof) return null;

  const overhang = 0.28;
  const w = width + overhang * 2;
  const l = length + overhang * 2;

  switch (roof.assetKey) {
    case "roof:pyramid":
      return <PyramidRoof roof={roof} w={w} l={l} height={height} />;
    case "roof:pergola":
      return <PergolaRoof roof={roof} w={w} l={l} height={height} />;
    case "roof:louvers":
      return <LouverRoof roof={roof} w={w} l={l} height={height} />;
    case "roof:flat":
    default:
      return <FlatRoof roof={roof} w={w} l={l} height={height} />;
  }
}

type RoofProps = {
  roof: NonNullable<SceneModel["roof"]>;
  w: number;
  l: number;
  height: number;
};

function FlatRoof({ roof, w, l, height }: RoofProps) {
  return (
    <mesh position={[0, height + roof.peakHeight / 2 + 0.05, 0]} castShadow receiveShadow>
      <boxGeometry args={[l, roof.peakHeight, w]} />
      <meshStandardMaterial color={roof.color} metalness={0.35} roughness={0.6} />
    </mesh>
  );
}

/**
 * A four-sided pyramid built as a cone with 4 radial segments, rotated so the
 * flat faces align with the pavilion sides. Non-square footprints are handled
 * by scaling the cone on X/Z.
 */
function PyramidRoof({ roof, w, l, height }: RoofProps) {
  const radius = Math.max(w, l) / 2;
  const scaleX = l / (radius * 2);
  const scaleZ = w / (radius * 2);

  return (
    <group position={[0, height + 0.05, 0]}>
      {/* Fascia band under the slope */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[l, 0.12, w]} />
        <meshStandardMaterial color={roof.color} metalness={0.3} roughness={0.65} />
      </mesh>
      <mesh
        position={[0, roof.peakHeight / 2 + 0.12, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[scaleX, 1, scaleZ]}
        castShadow
      >
        <coneGeometry args={[radius * Math.SQRT2, roof.peakHeight, 4, 1]} />
        <meshStandardMaterial
          color={roof.color}
          metalness={0.25}
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Finial ring, as in the concept imagery */}
      <mesh position={[0, roof.peakHeight + 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.016, 8, 20]} />
        <meshStandardMaterial color={roof.color} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function PergolaRoof({ roof, w, l, height }: RoofProps) {
  const battenCount = Math.max(6, Math.round(l / 0.28));
  const battens = useMemo(
    () =>
      Array.from({ length: battenCount }, (_, index) => {
        const t = battenCount === 1 ? 0.5 : index / (battenCount - 1);
        return -l / 2 + t * l;
      }),
    [battenCount, l],
  );

  return (
    <group position={[0, height + 0.08, 0]}>
      {battens.map((x, index) => (
        <mesh key={index} position={[x, 0.09, 0]} castShadow>
          <boxGeometry args={[0.07, 0.16, w]} />
          <meshStandardMaterial color={roof.color} metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
      {/* Two cross rails carrying the battens */}
      {[-w / 2 + 0.2, w / 2 - 0.2].map((z, index) => (
        <mesh key={index} position={[0, -0.02, z]} castShadow>
          <boxGeometry args={[l, 0.12, 0.1]} />
          <meshStandardMaterial color={roof.color} metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function LouverRoof({ roof, w, l, height }: RoofProps) {
  const bladeCount = Math.max(5, Math.round(l / 0.34));
  const blades = useMemo(
    () =>
      Array.from({ length: bladeCount }, (_, index) => {
        const t = bladeCount === 1 ? 0.5 : index / (bladeCount - 1);
        return -l / 2 + 0.16 + t * (l - 0.32);
      }),
    [bladeCount, l],
  );

  return (
    <group position={[0, height + 0.1, 0]}>
      {/* Perimeter frame */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[l, 0.2, w]} />
        <meshStandardMaterial
          color={roof.color}
          metalness={0.4}
          roughness={0.55}
          transparent
          opacity={0.18}
        />
      </mesh>
      {blades.map((x, index) => (
        <mesh key={index} position={[x, 0.1, 0]} rotation={[0, 0, -0.5]} castShadow>
          <boxGeometry args={[0.26, 0.035, w - 0.1]} />
          <meshStandardMaterial color={roof.color} metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
