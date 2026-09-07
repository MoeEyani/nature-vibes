"use client";

import { Suspense, useMemo } from "react";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { DesignConfiguration } from "@/domain/configuration/schema";
import { buildSceneModel } from "./sceneModel";
import { Frame } from "./modules/Frame";
import { Roof } from "./modules/Roof";
import { Seating } from "./modules/Seating";
import { Aquarium } from "./modules/Aquarium";
import { Planting } from "./modules/Planting";
import { Extras } from "./modules/Extras";

/** Which module groups the viewport is currently showing. */
export type LayerVisibility = {
  frame: boolean;
  roof: boolean;
  seating: boolean;
  aquarium: boolean;
  planting: boolean;
  extras: boolean;
};

/**
 * Minimal handle onto drei's OrbitControls. Declared locally so the app does
 * not depend on three-stdlib's types, which reach us only transitively.
 */
export type OrbitControlsHandle = { reset: () => void };

export const ALL_LAYERS: LayerVisibility = {
  frame: true,
  roof: true,
  seating: true,
  aquarium: true,
  planting: true,
  extras: true,
};

/** Environment lighting presets, matched to the location step. */
const TONES = {
  warm: {
    sky: "#efe7d8",
    ground: "#cbbfa8",
    key: 1.15,
    ambient: 0.85,
    keyColor: "#ffe3bd",
  },
  daylight: {
    sky: "#dbe7ea",
    ground: "#b9c4ad",
    key: 1.7,
    ambient: 0.7,
    keyColor: "#fff5e2",
  },
  dusk: {
    sky: "#4c5570",
    ground: "#3d4352",
    key: 0.85,
    ambient: 0.5,
    keyColor: "#ffd0a0",
  },
} as const;

export function Scene({
  config,
  layers = ALL_LAYERS,
  controlsRef,
}: {
  config: DesignConfiguration;
  layers?: LayerVisibility;
  controlsRef?: React.RefObject<OrbitControlsHandle | null>;
}) {
  const model = useMemo(() => buildSceneModel(config), [config]);
  const tone = TONES[model.lighting.tone];

  // Frame the pavilion whatever its size, so bigger presets stay in view.
  const span = Math.max(model.width, model.length, model.height);
  const distance = span * 2.35;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [distance * 0.75, span * 0.95, distance], fov: 42 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[tone.sky]} />
      <fog attach="fog" args={[tone.sky, span * 6, span * 16]} />

      <hemisphereLight args={[tone.sky, tone.ground, tone.ambient]} />
      <directionalLight
        position={[span * 1.6, span * 2.4, span * 1.2]}
        intensity={tone.key}
        color={tone.keyColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-span * 2}
        shadow-camera-right={span * 2}
        shadow-camera-top={span * 2}
        shadow-camera-bottom={-span * 2}
      />
      <directionalLight position={[-span, span, -span]} intensity={tone.key * 0.3} />

      <Suspense fallback={null}>
        <group position={[0, 0, 0]}>
          {layers.frame ? <Frame model={model} /> : null}
          {layers.roof ? <Roof model={model} /> : null}
          {layers.seating ? <Seating model={model} /> : null}
          {layers.aquarium ? <Aquarium model={model} /> : null}
          {layers.planting ? <Planting model={model} /> : null}
          {layers.extras ? <Extras model={model} /> : null}
        </group>

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow>
          <circleGeometry args={[span * 4, 48]} />
          <meshStandardMaterial color={tone.ground} roughness={1} />
        </mesh>

        <ContactShadows
          position={[0, -0.12, 0]}
          opacity={0.45}
          scale={span * 3}
          blur={2.4}
          far={span}
        />
      </Suspense>

      <OrbitControls
        // The handle is narrowed to the one method the viewport calls; drei's
        // own controls type reaches us only transitively via three-stdlib.
        ref={controlsRef as React.Ref<never>}
        makeDefault
        target={[0, model.height * 0.42, 0]}
        enablePan
        minDistance={span * 0.9}
        maxDistance={span * 6}
        // Keep the camera above the ground plane.
        maxPolarAngle={Math.PI / 2.08}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
