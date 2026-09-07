"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneModel } from "../sceneModel";

/**
 * `light:*`, `comfort:*` and `utility:*` — the add-on modules.
 * Each maps to one asset key so a real GLB can replace it later.
 */
export function Extras({ model }: { model: SceneModel }) {
  const { extras, lighting, width, length, height } = model;

  return (
    <group>
      {lighting.ambientStrip ? <LightStrip width={width} length={length} height={height} /> : null}
      {extras.fan ? <CeilingFan height={height} /> : null}
      {extras.privacyScreens ? <PrivacyScreen width={width} length={length} height={height} /> : null}
      {extras.misting ? <MistingLine width={width} length={length} height={height} /> : null}
      {extras.waterFeature ? <WaterFeature width={width} length={length} /> : null}
      {extras.storage ? <StorageModule width={width} length={length} /> : null}
    </group>
  );
}

/** `light:ambient` — the warm strip under the roof line. */
function LightStrip({
  width,
  length,
  height,
}: {
  width: number;
  length: number;
  height: number;
}) {
  const y = height - 0.14;
  const runs: { position: [number, number, number]; args: [number, number, number] }[] = [
    { position: [0, y, width / 2 - 0.08], args: [length - 0.2, 0.03, 0.04] },
    { position: [0, y, -width / 2 + 0.08], args: [length - 0.2, 0.03, 0.04] },
    { position: [length / 2 - 0.08, y, 0], args: [0.04, 0.03, width - 0.2] },
    { position: [-length / 2 + 0.08, y, 0], args: [0.04, 0.03, width - 0.2] },
  ];

  return (
    <group>
      {runs.map((run, index) => (
        <mesh key={index} position={run.position}>
          <boxGeometry args={run.args} />
          <meshStandardMaterial
            color="#ffd9a0"
            emissive="#ffb75e"
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight position={[0, height - 0.3, 0]} color="#ffc98a" intensity={9} distance={5.5} />
    </group>
  );
}

/** `comfort:fan` — a slowly rotating ceiling fan. */
function CeilingFan({ height }: { height: number }) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (bladesRef.current) bladesRef.current.rotation.y += delta * 1.6;
  });

  return (
    <group position={[0, height - 0.22, 0]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#3a3f42" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.07, 12]} />
        <meshStandardMaterial color="#2b2f31" metalness={0.5} roughness={0.5} />
      </mesh>
      <group ref={bladesRef}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} rotation={[0, (index / 4) * Math.PI * 2, 0]} position={[0, -0.02, 0]}>
            <boxGeometry args={[0.66, 0.012, 0.13]} />
            <meshStandardMaterial color="#6b4a30" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** `comfort:privacy` — slatted screens on the two closed sides. */
function PrivacyScreen({
  width,
  length,
  height,
}: {
  width: number;
  length: number;
  height: number;
}) {
  const slats = Math.max(8, Math.round(height / 0.22));

  return (
    <group>
      {[-1, 1].map((sign) => (
        <group key={sign} position={[sign * (length / 2 - 0.06), 0, 0]}>
          {Array.from({ length: slats }, (_, index) => (
            <mesh key={index} position={[0, 0.25 + (index / slats) * (height - 0.4), 0]}>
              <boxGeometry args={[0.03, 0.11, width - 0.25]} />
              <meshStandardMaterial color="#5d4b39" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** `comfort:misting` — nozzles along the roof edge. */
function MistingLine({
  width,
  length,
  height,
}: {
  width: number;
  length: number;
  height: number;
}) {
  const nozzles = Math.max(4, Math.round(length / 0.7));

  return (
    <group position={[0, height - 0.06, 0]}>
      {[-1, 1].map((sign) => (
        <group key={sign} position={[0, 0, sign * (width / 2 - 0.14)]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, length - 0.2, 6]} />
            <meshStandardMaterial color="#9aa3a8" metalness={0.7} roughness={0.3} />
          </mesh>
          {Array.from({ length: nozzles }, (_, index) => {
            const t = nozzles === 1 ? 0.5 : index / (nozzles - 1);
            return (
              <mesh key={index} position={[-length / 2 + 0.1 + t * (length - 0.2), -0.04, 0]}>
                <coneGeometry args={[0.018, 0.05, 6]} />
                <meshStandardMaterial color="#7f8a90" metalness={0.6} roughness={0.35} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/** `utility:water-feature` — a small basin beside the pavilion. */
function WaterFeature({ width, length }: { width: number; length: number }) {
  return (
    <group position={[length / 2 + 0.75, 0, -width / 2 + 0.5]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.46, 0.32, 20]} />
        <meshStandardMaterial color="#5b6360" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.04, 20]} />
        <meshStandardMaterial color="#2f7f8f" transparent opacity={0.7} roughness={0.1} />
      </mesh>
    </group>
  );
}

/** `utility:storage` — a lockable module tucked against one post. */
function StorageModule({ width, length }: { width: number; length: number }) {
  return (
    <mesh position={[-length / 2 + 0.45, 0.28, -width / 2 + 0.32]} castShadow receiveShadow>
      <boxGeometry args={[0.8, 0.56, 0.5]} />
      <meshStandardMaterial color="#4a4f52" roughness={0.7} metalness={0.25} />
    </mesh>
  );
}
