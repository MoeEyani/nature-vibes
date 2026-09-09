"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { colorHex, getElementType } from "@shared/studio/catalog";
import type { StudioElement } from "@shared/studio/schema";

/**
 * Procedural geometry for one studio element, keyed by `assetKey`.
 *
 * Same abstraction the configurator uses: the scene never knows what a
 * "bench" is, only that `studio:bench` draws in a box of
 * width × height × depth metres. Real GLB assets can replace any branch here
 * without touching the studio, the store or the domain.
 *
 * Everything draws inside a box centred on the origin in X/Z and rising from
 * y = 0, so the caller only has to position and rotate the group.
 */

export type Dims = { w: number; h: number; d: number };

export function ElementGeometry({ element }: { element: StudioElement }) {
  const type = getElementType(element.typeId);
  const dims: Dims = {
    w: element.widthMm / 1000,
    h: element.heightMm / 1000,
    d: element.depthMm / 1000,
  };
  const color = colorHex(element.colorId);

  switch (type?.assetKey) {
    case "studio:post":
      return <Post dims={dims} color={color} />;
    case "studio:beam":
      return <Beam dims={dims} color={color} />;
    case "studio:deck":
      return <Deck dims={dims} color={color} />;
    case "studio:bench":
      return <Bench dims={dims} color={color} />;
    case "studio:lounge":
      return <Lounge dims={dims} color={color} />;
    case "studio:chair":
      return <Chair dims={dims} color={color} />;
    case "studio:table":
      return <Table dims={dims} color={color} />;
    case "studio:planter":
      return <Planter dims={dims} color={color} />;
    case "studio:pot":
      return <Pot dims={dims} color={color} />;
    case "studio:plant":
      return <Plant dims={dims} color={color} />;
    case "studio:trellis":
      return <Trellis dims={dims} color={color} />;
    case "studio:aquarium":
      return <Aquarium dims={dims} color={color} />;
    case "studio:water":
      return <WaterFeature dims={dims} color={color} />;
    case "studio:screen":
      return <Screen dims={dims} color={color} />;
    case "studio:balustrade":
      return <Balustrade dims={dims} color={color} />;
    case "studio:pendant":
      return <Pendant dims={dims} color={color} />;
    case "studio:lantern":
      return <Lantern dims={dims} color={color} />;
    case "studio:roof-pyramid":
      return <RoofPyramid dims={dims} color={color} />;
    case "studio:roof-flat":
      return <RoofFlat dims={dims} color={color} />;
    case "studio:roof-gable":
      return <RoofGable dims={dims} color={color} />;
    case "studio:roof-pergola":
      return <RoofPergola dims={dims} color={color} />;
    case "studio:roof-louvered":
      return <RoofLouvered dims={dims} color={color} />;
    // An assembly draws nothing of its own: the scene renders the parts it
    // derives, which are real elements with real geometry.
    case "studio:assembly":
      return null;
    default:
      return <Fallback dims={dims} color={color} />;
  }
}

type Props = { dims: Dims; color: string };

const METAL = { metalness: 0.6, roughness: 0.45 };
const TIMBER = { metalness: 0.05, roughness: 0.8 };

function Fallback({ dims, color }: Props) {
  return (
    <mesh position={[0, dims.h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[dims.w, dims.h, dims.d]} />
      <meshStandardMaterial color={color} {...TIMBER} />
    </mesh>
  );
}

function Post({ dims, color }: Props) {
  return (
    <group>
      <mesh position={[0, dims.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, dims.h, dims.d]} />
        <meshStandardMaterial color={color} {...METAL} />
      </mesh>
      {/* Base plate — reads as a real fixing point. */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[dims.w * 1.8, 0.02, dims.d * 1.8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Beam({ dims, color }: Props) {
  return (
    <mesh position={[0, dims.h / 2, 0]} castShadow>
      <boxGeometry args={[dims.w, dims.h, dims.d]} />
      <meshStandardMaterial color={color} {...METAL} />
    </mesh>
  );
}

function Deck({ dims, color }: Props) {
  const plankCount = Math.max(3, Math.round(dims.w / 0.16));
  const plankWidth = dims.w / plankCount;

  return (
    <group>
      <mesh position={[0, dims.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, dims.h, dims.d]} />
        <meshStandardMaterial color={color} {...TIMBER} />
      </mesh>
      {/* Plank lines, so the surface reads as decking rather than a slab. */}
      {Array.from({ length: plankCount - 1 }, (_, index) => (
        <mesh
          key={index}
          position={[-dims.w / 2 + plankWidth * (index + 1), dims.h + 0.001, 0]}
        >
          <boxGeometry args={[0.008, 0.002, dims.d]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Bench({ dims, color }: Props) {
  const seatThickness = Math.min(0.07, dims.h * 0.18);
  const legHeight = dims.h - seatThickness;

  return (
    <group>
      <mesh position={[0, dims.h - seatThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, seatThickness, dims.d]} />
        <meshStandardMaterial color={color} {...TIMBER} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (dims.w / 2 - 0.12), legHeight / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.06, legHeight, dims.d * 0.8]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Lounge({ dims, color }: Props) {
  const seatHeight = dims.h * 0.55;
  const backHeight = dims.h - seatHeight;

  return (
    <group>
      <mesh position={[0, seatHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, seatHeight, dims.d]} />
        <meshStandardMaterial color="#5b4130" {...TIMBER} />
      </mesh>
      {/* Cushion */}
      <mesh position={[0, seatHeight + 0.05, 0.02]} castShadow>
        <boxGeometry args={[dims.w - 0.06, 0.1, dims.d - 0.08]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Backrest */}
      <mesh
        position={[0, seatHeight + backHeight / 2 + 0.05, -dims.d / 2 + 0.09]}
        castShadow
      >
        <boxGeometry args={[dims.w - 0.06, backHeight, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Chair({ dims, color }: Props) {
  const seatHeight = dims.h * 0.55;
  const legHeight = seatHeight - 0.05;
  const legInset = 0.06;

  return (
    <group>
      <mesh position={[0, seatHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, 0.09, dims.d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh
        position={[0, seatHeight + (dims.h - seatHeight) / 2, -dims.d / 2 + 0.05]}
        castShadow
      >
        <boxGeometry args={[dims.w, dims.h - seatHeight, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], index) => (
        <mesh
          key={index}
          position={[
            sx * (dims.w / 2 - legInset),
            legHeight / 2,
            sz * (dims.d / 2 - legInset),
          ]}
          castShadow
        >
          <boxGeometry args={[0.035, legHeight, 0.035]} />
          <meshStandardMaterial color="#3a3f42" {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function Table({ dims, color }: Props) {
  const topThickness = 0.05;
  const legHeight = dims.h - topThickness;
  const inset = 0.09;

  return (
    <group>
      <mesh position={[0, dims.h - topThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, topThickness, dims.d]} />
        <meshStandardMaterial color={color} {...TIMBER} />
      </mesh>
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], index) => (
        <mesh
          key={index}
          position={[
            sx * (dims.w / 2 - inset),
            legHeight / 2,
            sz * (dims.d / 2 - inset),
          ]}
          castShadow
        >
          <boxGeometry args={[0.05, legHeight, 0.05]} />
          <meshStandardMaterial color="#3a3f42" {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function Planter({ dims, color }: Props) {
  const wall = 0.05;
  const walls: { pos: [number, number, number]; args: [number, number, number] }[] = [
    { pos: [0, dims.h / 2, -dims.d / 2 + wall / 2], args: [dims.w, dims.h, wall] },
    { pos: [0, dims.h / 2, dims.d / 2 - wall / 2], args: [dims.w, dims.h, wall] },
    { pos: [-dims.w / 2 + wall / 2, dims.h / 2, 0], args: [wall, dims.h, dims.d] },
    { pos: [dims.w / 2 - wall / 2, dims.h / 2, 0], args: [wall, dims.h, dims.d] },
  ];

  return (
    <group>
      {walls.map((entry, index) => (
        <mesh key={index} position={entry.pos} castShadow receiveShadow>
          <boxGeometry args={entry.args} />
          <meshStandardMaterial color={color} {...TIMBER} />
        </mesh>
      ))}
      {/* Soil, so an empty planter still reads as a planter. */}
      <mesh position={[0, dims.h - 0.06, 0]} receiveShadow>
        <boxGeometry args={[dims.w - wall * 2, 0.04, dims.d - wall * 2]} />
        <meshStandardMaterial color="#4a3a2a" roughness={1} />
      </mesh>
    </group>
  );
}

function Pot({ dims, color }: Props) {
  const radius = Math.min(dims.w, dims.d) / 2;
  return (
    <group>
      <mesh position={[0, dims.h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 0.78, dims.h, 24]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, dims.h - 0.03, 0]}>
        <cylinderGeometry args={[radius * 0.92, radius * 0.92, 0.03, 24]} />
        <meshStandardMaterial color="#4a3a2a" roughness={1} />
      </mesh>
    </group>
  );
}

function Plant({ dims, color }: Props) {
  const radius = Math.min(dims.w, dims.d) / 2;
  const clumps: [number, number, number][] = [
    [0, dims.h * 0.62, 0],
    [radius * 0.5, dims.h * 0.42, radius * 0.35],
    [-radius * 0.45, dims.h * 0.48, -radius * 0.4],
  ];

  return (
    <group>
      <mesh position={[0, dims.h * 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.03, dims.h * 0.5, 6]} />
        <meshStandardMaterial color="#5b4a38" roughness={0.9} />
      </mesh>
      {clumps.map((position, index) => (
        <mesh key={index} position={position} castShadow>
          <sphereGeometry args={[radius * (index === 0 ? 0.85 : 0.55), 8, 7]} />
          <meshStandardMaterial color={color} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Trellis({ dims, color }: Props) {
  const rungs = Math.max(4, Math.round(dims.h / 0.3));
  const verticals = Math.max(2, Math.round(dims.w / 0.3));

  return (
    <group>
      {Array.from({ length: verticals }, (_, index) => (
        <mesh
          key={`v${index}`}
          position={[
            -dims.w / 2 + (dims.w / (verticals - 1 || 1)) * index,
            dims.h / 2,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[0.025, dims.h, dims.d]} />
          <meshStandardMaterial color={color} {...TIMBER} />
        </mesh>
      ))}
      {Array.from({ length: rungs }, (_, index) => (
        <mesh
          key={`h${index}`}
          position={[0, ((index + 1) / (rungs + 1)) * dims.h, 0]}
          castShadow
        >
          <boxGeometry args={[dims.w, 0.022, dims.d]} />
          <meshStandardMaterial color={color} {...TIMBER} />
        </mesh>
      ))}
    </group>
  );
}

function Aquarium({ dims, color }: Props) {
  const waterHeight = dims.h * 0.88;
  return (
    <group>
      {/* Water */}
      <mesh position={[0, waterHeight / 2, 0]}>
        <boxGeometry args={[dims.w - 0.02, waterHeight, dims.d - 0.02]} />
        <meshStandardMaterial
          color="#2f7f8f"
          transparent
          opacity={0.55}
          roughness={0.1}
        />
      </mesh>
      {/* Substrate */}
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[dims.w - 0.04, 0.05, dims.d - 0.04]} />
        <meshStandardMaterial color="#8f7d63" roughness={1} />
      </mesh>
      {/* Glass */}
      <mesh position={[0, dims.h / 2, 0]}>
        <boxGeometry args={[dims.w, dims.h, dims.d]} />
        <meshStandardMaterial
          color="#cfe6ea"
          transparent
          opacity={0.16}
          roughness={0.05}
          metalness={0.2}
        />
      </mesh>
      {/* Rim */}
      <mesh position={[0, dims.h, 0]}>
        <boxGeometry args={[dims.w + 0.02, 0.03, dims.d + 0.02]} />
        <meshStandardMaterial color={color} {...METAL} />
      </mesh>
    </group>
  );
}

function WaterFeature({ dims, color }: Props) {
  const radius = Math.min(dims.w, dims.d) / 2;
  return (
    <group>
      <mesh position={[0, dims.h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.04, dims.h, 24]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, dims.h - 0.04, 0]}>
        <cylinderGeometry args={[radius * 0.88, radius * 0.88, 0.04, 24]} />
        <meshStandardMaterial color="#2f7f8f" transparent opacity={0.75} roughness={0.1} />
      </mesh>
    </group>
  );
}

function Screen({ dims, color }: Props) {
  const slats = Math.max(6, Math.round(dims.h / 0.16));
  const slatHeight = (dims.h / slats) * 0.66;

  return (
    <group>
      {Array.from({ length: slats }, (_, index) => (
        <mesh
          key={index}
          position={[0, ((index + 0.5) / slats) * dims.h, 0]}
          castShadow
        >
          <boxGeometry args={[dims.w, slatHeight, dims.d]} />
          <meshStandardMaterial color={color} {...TIMBER} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (dims.w / 2 - 0.03), dims.h / 2, 0]} castShadow>
          <boxGeometry args={[0.06, dims.h, dims.d * 1.3]} />
          <meshStandardMaterial color="#3a3f42" {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function Balustrade({ dims, color }: Props) {
  const posts = Math.max(2, Math.round(dims.w / 1.2) + 1);
  return (
    <group>
      {Array.from({ length: posts }, (_, index) => (
        <mesh
          key={index}
          position={[-dims.w / 2 + (dims.w / (posts - 1 || 1)) * index, dims.h / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.04, dims.h, 0.04]} />
          <meshStandardMaterial color={color} {...METAL} />
        </mesh>
      ))}
      {[dims.h, dims.h * 0.5].map((y, index) => (
        <mesh key={index} position={[0, y, 0]} castShadow>
          <boxGeometry args={[dims.w, 0.04, dims.d]} />
          <meshStandardMaterial color={color} {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function Pendant({ dims, color }: Props) {
  const radius = Math.min(dims.w, dims.d) / 2;
  return (
    <group>
      {/* Cord runs up out of the element box, to wherever it is hung from. */}
      <mesh position={[0, dims.h + 0.6, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 1.2, 6]} />
        <meshStandardMaterial color="#3a3f42" />
      </mesh>
      <mesh position={[0, dims.h / 2, 0]} castShadow>
        <coneGeometry args={[radius, dims.h, 20, 1, true]} />
        <meshStandardMaterial color={color} side={2} {...METAL} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[radius * 0.35, 10, 8]} />
        <meshStandardMaterial
          color="#ffd9a0"
          emissive="#ffb75e"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} color="#ffc98a" intensity={2.5} distance={3} />
    </group>
  );
}

function Lantern({ dims, color }: Props) {
  const radius = Math.min(dims.w, dims.d) / 2;
  const headHeight = Math.min(0.22, dims.h * 0.3);
  return (
    <group>
      <mesh position={[0, (dims.h - headHeight) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.045, dims.h - headHeight, 10]} />
        <meshStandardMaterial color={color} {...METAL} />
      </mesh>
      <mesh position={[0, dims.h - headHeight / 2, 0]} castShadow>
        <boxGeometry args={[radius * 1.6, headHeight, radius * 1.6]} />
        <meshStandardMaterial
          color="#ffe6bb"
          emissive="#ffb75e"
          emissiveIntensity={1.1}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, dims.h - headHeight / 2, 0]}
        color="#ffc98a"
        intensity={2}
        distance={2.4}
      />
    </group>
  );
}

/* -------------------------------------------------------------------- *
 * Roof surfaces
 *
 * Only ever produced by a pavilion assembly, which sizes them from its span
 * and overhang and lifts them to the eave line. Each draws from y = 0 like
 * every other element, so the assembly does not have to know how tall a
 * particular style is.
 * -------------------------------------------------------------------- */

/** The band around a roof's lower edge — what you actually see from below. */
function Fascia({ dims, color }: Props) {
  const height = Math.min(0.09, dims.h * 0.5);
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[dims.w, height, dims.d]} />
      <meshStandardMaterial color={color} {...METAL} />
    </mesh>
  );
}

function RoofPyramid({ dims, color }: Props) {
  const fascia = Math.min(0.09, dims.h * 0.5);
  const rise = Math.max(0.02, dims.h - fascia);

  return (
    <group>
      <Fascia dims={dims} color={color} />
      {/*
        A four-sided cone is a square pyramid. Its base corners sit at radius
        r, so a unit-box footprint needs r = √2⁄2; scaling the group then
        stretches it to any rectangle, which a fixed radius could not do.
      */}
      <group position={[0, fascia, 0]} scale={[dims.w, rise, dims.d]}>
        <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[Math.SQRT2 / 2, 1, 4]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.55} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function RoofFlat({ dims, color }: Props) {
  return (
    <group>
      <mesh position={[0, dims.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.w, dims.h, dims.d]} />
        <meshStandardMaterial color={color} {...METAL} />
      </mesh>
      {/* A shallow upstand, so a flat roof does not read as a floating slab. */}
      <mesh position={[0, dims.h + 0.02, 0]}>
        <boxGeometry args={[dims.w * 0.995, 0.04, dims.d * 0.995]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.6} />
      </mesh>
    </group>
  );
}

function RoofGable({ dims, color }: Props) {
  const fascia = Math.min(0.09, dims.h * 0.4);
  const rise = Math.max(0.02, dims.h - fascia);
  const half = dims.d / 2;
  const slope = Math.hypot(half, rise);
  // Angle of the pitch, measured from horizontal.
  const pitch = Math.atan2(rise, half);
  const thickness = 0.05;

  // The gable ends, as a triangle in the Z/Y plane.
  const endShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    return shape;
  }, [half, rise]);

  return (
    <group>
      <Fascia dims={dims} color={color} />
      <group position={[0, fascia, 0]}>
        {/* Ridge runs along X; the two planes fall toward ±Z. */}
        <mesh position={[0, rise / 2, half / 2]} rotation={[pitch, 0, 0]} castShadow>
          <boxGeometry args={[dims.w, thickness, slope]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh
          position={[0, rise / 2, -half / 2]}
          rotation={[Math.PI - pitch, 0, 0]}
          castShadow
        >
          <boxGeometry args={[dims.w, thickness, slope]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.55} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[(side * dims.w) / 2, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <shapeGeometry args={[endShape]} />
            <meshStandardMaterial
              color={color}
              side={THREE.DoubleSide}
              metalness={0.4}
              roughness={0.7}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Perimeter frame shared by the two open roofs. */
function RoofFrame({ dims, color }: Props) {
  const member = 0.06;
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh
          key={`x${side}`}
          position={[0, dims.h / 2, (side * (dims.d - member)) / 2]}
          castShadow
        >
          <boxGeometry args={[dims.w, dims.h, member]} />
          <meshStandardMaterial color={color} {...METAL} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`z${side}`}
          position={[(side * (dims.w - member)) / 2, dims.h / 2, 0]}
          castShadow
        >
          <boxGeometry args={[member, dims.h, dims.d]} />
          <meshStandardMaterial color={color} {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function RoofPergola({ dims, color }: Props) {
  // Rafter spacing is a real spacing, not a fixed count: widen the pavilion
  // and you get more rafters, not stretched ones.
  const spacing = 0.32;
  const count = Math.max(2, Math.round(dims.w / spacing) - 1);
  const rafter = 0.05;

  return (
    <group>
      <RoofFrame dims={dims} color={color} />
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          position={[
            -dims.w / 2 + (dims.w / (count + 1)) * (index + 1),
            dims.h * 0.62,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[rafter, dims.h * 0.72, dims.d - 0.12]} />
          <meshStandardMaterial color={color} {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function RoofLouvered({ dims, color }: Props) {
  const spacing = 0.17;
  const count = Math.max(3, Math.round(dims.w / spacing) - 1);
  const blade = 0.16;

  return (
    <group>
      <RoofFrame dims={dims} color={color} />
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          position={[
            -dims.w / 2 + (dims.w / (count + 1)) * (index + 1),
            dims.h * 0.55,
            0,
          ]}
          // Blades on the tilt, which is what tells a louvered roof apart
          // from a pergola at a glance.
          rotation={[0, 0, Math.PI / 6]}
          castShadow
        >
          <boxGeometry args={[blade, 0.018, dims.d - 0.12]} />
          <meshStandardMaterial color={color} metalness={0.65} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
