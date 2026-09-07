"use client";

import type { SceneModel, Side } from "../sceneModel";

/**
 * `seat:*` — bench runs placed on the sides the layout declares.
 * One component covers every layout because the layout data says which
 * sides to build.
 */
export function Seating({ model }: { model: SceneModel }) {
  const { seating, width, length } = model;
  if (!seating || seating.sides.length === 0) return null;

  const inset = seating.inset ? 0.45 : 0.12;
  const depth = seating.depth;

  return (
    <group>
      {seating.sides.map((side) => (
        <BenchRun
          key={side}
          side={side}
          width={width}
          length={length}
          inset={inset}
          depth={depth}
          seating={seating}
        />
      ))}
    </group>
  );
}

function BenchRun({
  side,
  width,
  length,
  inset,
  depth,
  seating,
}: {
  side: Side;
  width: number;
  length: number;
  inset: number;
  depth: number;
  seating: NonNullable<SceneModel["seating"]>;
}) {
  const runsAlongX = side === "north" || side === "south";
  const run = (runsAlongX ? length : width) - inset * 2 - depth;

  const offset = (runsAlongX ? width : length) / 2 - inset - depth / 2;
  const position: [number, number, number] = runsAlongX
    ? [0, 0, side === "north" ? -offset : offset]
    : [side === "east" ? offset : -offset, 0, 0];

  const rotation: [number, number, number] = runsAlongX
    ? [0, 0, 0]
    : [0, Math.PI / 2, 0];

  const seatThickness = 0.08;

  return (
    <group position={position} rotation={rotation}>
      {/* Plinth / base box */}
      <mesh position={[0, (seating.seatHeight - seatThickness) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[run, seating.seatHeight - seatThickness, depth * 0.8]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Seat top */}
      <mesh position={[0, seating.seatHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[run, seatThickness, depth]} />
        <meshStandardMaterial color="#8a6440" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Individual pads rather than one slab — it reads as seating, and it
          shows the customer roughly how many places the run gives. */}
      {seating.hasCushion ? <CushionPads run={run} depth={depth} seating={seating} /> : null}

      {seating.hasBackrest ? (
        <mesh
          position={[0, seating.seatHeight + 0.3, -depth / 2 + 0.07]}
          castShadow
        >
          <boxGeometry args={[run - 0.06, 0.42, 0.12]} />
          <meshStandardMaterial color={seating.cushionColor} roughness={0.95} />
        </mesh>
      ) : null}
    </group>
  );
}

const CUSHION_THICKNESS = 0.09;
/** Nominal pad width, metres. Cosmetic — not a certified seat pitch. */
const PAD_WIDTH = 0.58;

function CushionPads({
  run,
  depth,
  seating,
}: {
  run: number;
  depth: number;
  seating: NonNullable<SceneModel["seating"]>;
}) {
  const count = Math.max(1, Math.floor(run / PAD_WIDTH));
  const gap = 0.04;
  const padWidth = (run - gap * (count + 1)) / count;
  if (padWidth <= 0) return null;

  return (
    <group position={[0, seating.seatHeight + CUSHION_THICKNESS / 2 + 0.04, 0]}>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          position={[
            -run / 2 + gap + padWidth / 2 + index * (padWidth + gap),
            0,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[padWidth, CUSHION_THICKNESS, depth - 0.1]} />
          <meshStandardMaterial color={seating.cushionColor} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
