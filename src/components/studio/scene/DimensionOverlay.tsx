"use client";

import { Line } from "@react-three/drei";
// `Html` is not re-exported from drei's root entry in v10; the component lives
// under `web/`. Imported directly so labels can be real DOM (crisp text, no
// font asset to fetch) rather than 3D text.
import { Html } from "@react-three/drei/web/Html";
import { bounds, designBounds, rectSize } from "@shared/studio/geometry";
import type { StudioDesign, StudioElement } from "@shared/studio/schema";
import { useStudioStore } from "@/store/useStudioStore";

/**
 * CAD-style dimensions.
 *
 * Two levels, which is what makes the canvas usable for real layout work:
 * the overall envelope of everything placed, and the selected element's own
 * footprint. Values are millimetres — the domain's unit — shown in metres
 * because that is how the customer thinks about a garden.
 */

const MM = 0.001;
/** How far the dimension line sits outside what it measures. */
const OFFSET = 0.45;
const TICK = 0.09;
const COLOR = "#5c6b62";

function metres(mm: number): string {
  return `${(mm / 1000).toFixed(2)} m`;
}

export function DimensionOverlay({ design }: { design: StudioDesign }) {
  const selectedId = useStudioStore((state) => state.selectedId);
  const selected = design.elements.find((element) => element.id === selectedId);

  return (
    <group>
      {design.elements.length > 0 ? <EnvelopeDimensions design={design} /> : null}
      {selected ? <ElementDimensions element={selected} /> : null}
    </group>
  );
}

/** Overall width and depth of everything placed. */
function EnvelopeDimensions({ design }: { design: StudioDesign }) {
  const rect = designBounds(design);
  const size = rectSize(rect);
  if (size.widthMm <= 0 || size.depthMm <= 0) return null;

  const minX = rect.minX * MM;
  const maxX = rect.maxX * MM;
  const minZ = rect.minZ * MM;
  const maxZ = rect.maxZ * MM;

  return (
    <group>
      <DimensionLine
        from={[minX, 0.01, maxZ + OFFSET]}
        to={[maxX, 0.01, maxZ + OFFSET]}
        label={metres(size.widthMm)}
        caption="overall width"
      />
      <DimensionLine
        from={[maxX + OFFSET, 0.01, minZ]}
        to={[maxX + OFFSET, 0.01, maxZ]}
        label={metres(size.depthMm)}
        caption="overall depth"
      />
    </group>
  );
}

/** The selected element's own footprint, measured tight against it. */
function ElementDimensions({ element }: { element: StudioElement }) {
  const rect = bounds(element);
  const minX = rect.minX * MM;
  const maxX = rect.maxX * MM;
  const minZ = rect.minZ * MM;
  const maxZ = rect.maxZ * MM;
  const near = 0.16;

  return (
    <group>
      <DimensionLine
        from={[minX, 0.012, minZ - near]}
        to={[maxX, 0.012, minZ - near]}
        label={metres(element.widthMm)}
        tone="accent"
      />
      <DimensionLine
        from={[minX - near, 0.012, minZ]}
        to={[minX - near, 0.012, maxZ]}
        label={metres(element.depthMm)}
        tone="accent"
      />
      {/* Height, measured vertically at the element's near corner. */}
      <DimensionLine
        from={[minX - near, element.elevationMm * MM, minZ - near]}
        to={[
          minX - near,
          (element.elevationMm + element.heightMm) * MM,
          minZ - near,
        ]}
        label={metres(element.heightMm)}
        tone="accent"
      />
    </group>
  );
}

type Vec3 = [number, number, number];

function DimensionLine({
  from,
  to,
  label,
  caption,
  tone = "muted",
}: {
  from: Vec3;
  to: Vec3;
  label: string;
  caption?: string;
  tone?: "muted" | "accent";
}) {
  const color = tone === "accent" ? "#1d5138" : COLOR;
  const midpoint: Vec3 = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];

  // End ticks, drawn perpendicular to the run.
  const isVertical = Math.abs(to[1] - from[1]) > 1e-6;
  const alongX = Math.abs(to[0] - from[0]) > Math.abs(to[2] - from[2]);
  const tick: Vec3 = isVertical
    ? [TICK, 0, 0]
    : alongX
      ? [0, 0, TICK]
      : [TICK, 0, 0];

  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={1.5} />
      <Line
        points={[offset(from, tick, -1), offset(from, tick, 1)]}
        color={color}
        lineWidth={1.5}
      />
      <Line
        points={[offset(to, tick, -1), offset(to, tick, 1)]}
        color={color}
        lineWidth={1.5}
      />
      {/* Labels are decoration: they must never intercept a pointer. */}
      <Html
        position={midpoint}
        center
        distanceFactor={10}
        zIndexRange={[10, 0]}
        pointerEvents="none"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="pointer-events-none select-none whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-center font-mono text-[11px] leading-tight shadow-sm backdrop-blur"
          style={{ color }}
        >
          {label}
          {caption ? (
            <span className="block text-[9px] uppercase tracking-wider opacity-60">
              {caption}
            </span>
          ) : null}
        </div>
      </Html>
    </group>
  );
}

function offset(point: Vec3, delta: Vec3, sign: number): Vec3 {
  return [
    point[0] + delta[0] * sign,
    point[1] + delta[1] * sign,
    point[2] + delta[2] * sign,
  ];
}
