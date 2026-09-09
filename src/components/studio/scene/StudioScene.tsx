"use client";

import { useEffect, useMemo, useRef } from "react";
import { ContactShadows, Edges, Grid, GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getElementType } from "@shared/studio/catalog";
import { deriveParts, isAssembly, parentOf } from "@shared/studio/assemblies";
import { bounds, designBounds, findCollisions, rectSize } from "@shared/studio/geometry";
import type { StudioDesign, StudioElement } from "@shared/studio/schema";
import { useStudioStore } from "@/store/useStudioStore";
import { ElementGeometry } from "./ElementGeometry";
import { DimensionOverlay } from "./DimensionOverlay";

/**
 * The studio 3D canvas.
 *
 * Interaction model:
 *  - dragging a palette item sets `placingTypeId`; the ground plane tracks the
 *    pointer into `ghost`, a translucent preview follows it, and releasing
 *    commits the element.
 *  - pressing an element selects it and sets `movingId`; the same ground
 *    tracking then moves it. Orbit is disabled for the duration so the camera
 *    does not fight the drag.
 *
 * Positions are metres here and millimetres in the domain; the conversion
 * happens at this boundary and nowhere else.
 */

const MM = 0.001;

export function StudioScene() {
  const design = useStudioStore((state) => state.design);
  const view = useStudioStore((state) => state.view);
  const showGrid = useStudioStore((state) => state.showGrid);

  const span = Math.max(design.site.widthMm, design.site.depthMm) * MM;
  const isTop = view === "top";

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{
        position: isTop ? [0, span * 1.6, 0.001] : [span * 0.75, span * 0.62, span * 0.95],
        fov: 40,
      }}
      gl={{ antialias: true }}
      onPointerMissed={() => useStudioStore.getState().select(null)}
    >
      <color attach="background" args={["#eef0ec"]} />

      <hemisphereLight args={["#dfe7e4", "#b3b7ad", 0.9]} />
      <directionalLight
        position={[span * 0.8, span * 1.4, span * 0.6]}
        intensity={1.5}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
      />
      <directionalLight position={[-span, span, -span]} intensity={0.35} />

      <SceneContents design={design} showGrid={showGrid} isTop={isTop} />
    </Canvas>
  );
}

function SceneContents({
  design,
  showGrid,
  isTop,
}: {
  design: StudioDesign;
  showGrid: boolean;
  isTop: boolean;
}) {
  const placingTypeId = useStudioStore((state) => state.placingTypeId);
  const movingId = useStudioStore((state) => state.movingId);
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const showDimensions = useStudioStore((state) => state.showDimensions);

  const isDragging = Boolean(placingTypeId || movingId);
  const span = Math.max(design.site.widthMm, design.site.depthMm) * MM;

  // Ids the rules engine says are colliding — drawn in the alert colour.
  //
  // Collision runs on derived parts, whose ids are synthetic. A clash on a
  // pavilion post has to light up the pavilion, since that is the thing the
  // customer can actually select and move, so each part is reported under its
  // parent.
  const collidingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of findCollisions(design)) {
      ids.add(parentOf(a) ?? a.id);
      ids.add(parentOf(b) ?? b.id);
    }
    return ids;
  }, [design]);

  return (
    <>
      <GroundPlane design={design} />
      <PointerTracker />

      {showGrid ? (
        <Grid
          args={[span * 2, span * 2]}
          cellSize={design.gridMm * MM * 5 || 0.5}
          cellThickness={0.6}
          cellColor="#c3c9c2"
          sectionSize={1}
          sectionThickness={1.1}
          sectionColor="#98a29a"
          fadeDistance={span * 4}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
          position={[0, 0.002, 0]}
        />
      ) : null}

      <SiteOutline design={design} />

      {design.elements.map((element) => (
        <PlacedElement
          key={element.id}
          element={element}
          colliding={collidingIds.has(element.id)}
          // Everything being dragged is hidden, not just the pressed element:
          // a multi-selection moves together, so it has to preview together.
          hidden={
            Boolean(movingId) &&
            (movingId === element.id ||
              (selectedIds.includes(movingId!) && selectedIds.includes(element.id)))
          }
        />
      ))}

      <DragPreview design={design} />

      {showDimensions ? <DimensionOverlay design={design} /> : null}

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.35}
        scale={span * 2.2}
        blur={2.2}
        far={span}
      />

      <OrbitControls
        makeDefault
        // Dragging must move the element, not the camera.
        enabled={!isDragging}
        enablePan
        target={[0, 0.4, 0]}
        minDistance={1.5}
        maxDistance={span * 4}
        maxPolarAngle={isTop ? Math.PI : Math.PI / 2.05}
        enableDamping
        dampingFactor={0.1}
      />

      <CameraRig isTop={isTop} span={span} />

      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport axisColors={["#b4614a", "#6a8f5a", "#4a7fb4"]} labelColor="#14201a" />
      </GizmoHelper>
    </>
  );
}

/**
 * Moves the camera when the view mode changes.
 *
 * The `camera` prop on `<Canvas>` only configures the camera on mount, so
 * toggling 3D/Plan does nothing without this — the button would light up
 * while the view stayed put.
 */
function CameraRig({ isTop, span }: { isTop: boolean; span: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;

  useEffect(() => {
    const target = new THREE.Vector3(0, isTop ? 0 : 0.4, 0);
    // A hair off dead-centre in plan view: a perfectly vertical camera makes
    // the orbit controls' up-vector ambiguous and the view flips.
    const position = isTop
      ? new THREE.Vector3(0, span * 1.7, 0.001)
      : new THREE.Vector3(span * 0.75, span * 0.62, span * 0.95);

    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }, [camera, controls, isTop, span]);

  return null;
}

/** The visible floor. Purely visual — tracking is done by PointerTracker. */
function GroundPlane({ design }: { design: StudioDesign }) {
  const span = Math.max(design.site.widthMm, design.site.depthMm) * MM * 3;

  return (
    <mesh
      name="studio-ground"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[span, span]} />
      <meshStandardMaterial color="#e4e7e1" roughness={1} />
    </mesh>
  );
}

/**
 * Turns pointer positions into ground coordinates during a drag.
 *
 * Intersects the pointer ray with the y = 0 plane mathematically rather than
 * relying on a hit against the floor mesh. Mesh-based tracking breaks the
 * moment the pointer passes over something already placed: the ray hits that
 * object instead of the floor, the ghost stops following, and the drop is
 * silently lost — exactly the case a customer hits when adding a chair onto a
 * deck. A plane intersection has no such blind spot.
 */
function PointerTracker() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  const scratch = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      point: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
    }),
    [],
  );

  useEffect(() => {
    const element = gl.domElement;

    function onPointerMove(event: PointerEvent) {
      const store = useStudioStore.getState();
      if (!store.placingTypeId && !store.movingId) return;

      const rect = element.getBoundingClientRect();
      scratch.ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      scratch.ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      scratch.raycaster.setFromCamera(scratch.ndc, camera);

      if (scratch.raycaster.ray.intersectPlane(scratch.plane, scratch.point)) {
        store.updateGhost({ x: scratch.point.x / MM, z: scratch.point.z / MM });
      }
    }

    function onPointerUp(event: PointerEvent) {
      const store = useStudioStore.getState();
      if (!store.placingTypeId && !store.movingId) return;

      // Releasing away from the canvas abandons the drag rather than dropping
      // the element wherever it was last seen.
      //
      // Tested by coordinates, not by DOM identity: the dimension labels are
      // HTML overlaid on the canvas, so `event.target` for a release over a
      // label is the label's div, not the canvas. Checking containment made
      // dropping onto a label silently cancel the drop — which looks exactly
      // like the tool randomly ignoring you.
      const rect = element.getBoundingClientRect();
      const insideCanvas =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (insideCanvas) store.commitDrag();
      else store.cancelDrag();

      document.body.style.cursor = "";
    }

    element.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      element.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, gl, scratch]);

  return null;
}

/** The working area's edge, so the customer can see the plot they set. */
function SiteOutline({ design }: { design: StudioDesign }) {
  const width = design.site.widthMm * MM;
  const depth = design.site.depthMm * MM;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color="#1d5138" transparent opacity={0.05} />
      <Edges color="#1d5138" scale={1} threshold={15} />
    </mesh>
  );
}

/** Shift or Ctrl/Cmd held: add to or remove from the selection. */
function isAdditive(event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
  return event.shiftKey || event.ctrlKey || event.metaKey;
}

/**
 * What pressing an element does.
 *
 * The subtle case is pressing an element that is *already* part of a
 * multi-selection. Selecting it outright — the obvious thing — collapses the
 * selection to one element before the drag has even begun, so a group drag
 * silently moves a single item. So a press inside the selection leaves the
 * selection alone; `commitDrag` narrows it to the pressed element if the
 * gesture turns out to have been a click rather than a drag.
 */
function press({
  element,
  isSelected,
  event,
  select,
  beginMove,
}: {
  element: StudioElement;
  isSelected: boolean;
  event: PointerEvent;
  select: (id: string | null, additive?: boolean) => void;
  beginMove: (id: string) => void;
}) {
  if (isAdditive(event)) {
    // A modifier press only edits the selection; starting a move as well
    // would drag the element the customer was picking.
    select(element.id, true);
    return;
  }

  if (!isSelected) select(element.id);
  if (!element.locked) {
    beginMove(element.id);
    document.body.style.cursor = "grabbing";
  }
}

function PlacedElement({
  element,
  colliding,
  hidden,
}: {
  element: StudioElement;
  colliding: boolean;
  hidden: boolean;
}) {
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const hoveredId = useStudioStore((state) => state.hoveredId);
  const select = useStudioStore((state) => state.select);
  const hover = useStudioStore((state) => state.hover);
  const beginMove = useStudioStore((state) => state.beginMove);

  const isSelected = selectedIds.includes(element.id);
  const isHovered = hoveredId === element.id;

  const assembly = isAssembly(element);
  // Derived parts carry world coordinates already — `place()` applies the
  // assembly's own position and rotation — so they are drawn in an untransformed
  // group. Nesting them under the assembly's transform would apply it twice.
  const parts = useMemo(
    () => (assembly ? deriveParts(element) : []),
    [assembly, element],
  );

  if (hidden) return null;

  const transform = {
    position: [element.x * MM, element.elevationMm * MM, element.z * MM] as const,
    rotation: [0, -element.rotationDeg * (Math.PI / 180), 0] as const,
  };

  const indicator =
    isSelected || isHovered || colliding ? (
      <SelectionBox
        element={element}
        tone={colliding ? "alert" : isSelected ? "selected" : "hover"}
      />
    ) : null;

  if (assembly) {
    return (
      <group
        onPointerOver={(event) => {
          event.stopPropagation();
          hover(element.id);
          document.body.style.cursor = element.locked ? "not-allowed" : "grab";
        }}
        onPointerOut={() => {
          hover(null);
          document.body.style.cursor = "";
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          // Pressing any part selects the assembly, never the part: the parts
          // do not exist as far as the design is concerned.
          press({ element, isSelected, event: event.nativeEvent, select, beginMove });
        }}
      >
        {parts.map((partElement) => (
          <group
            key={partElement.id}
            position={[
              partElement.x * MM,
              partElement.elevationMm * MM,
              partElement.z * MM,
            ]}
            rotation={[0, -partElement.rotationDeg * (Math.PI / 180), 0]}
          >
            <ElementGeometry element={partElement} />
          </group>
        ))}
        {indicator ? (
          <group position={transform.position} rotation={transform.rotation}>
            {indicator}
          </group>
        ) : null}
      </group>
    );
  }

  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
      onPointerOver={(event) => {
        event.stopPropagation();
        hover(element.id);
        document.body.style.cursor = element.locked ? "not-allowed" : "grab";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        press({ element, isSelected, event: event.nativeEvent, select, beginMove });
      }}
    >
      <ElementGeometry element={element} />
      {indicator}
    </group>
  );
}

/**
 * Selection and hover indicator: a bounding cage plus a footprint pad, so the
 * customer can see both the volume and where it lands on the ground.
 */
function SelectionBox({
  element,
  tone,
}: {
  element: StudioElement;
  tone: "selected" | "hover" | "alert";
}) {
  const color =
    tone === "alert" ? "#a13a2e" : tone === "selected" ? "#1d5138" : "#5c6b62";
  const padOpacity = tone === "hover" ? 0.12 : 0.22;

  const w = element.widthMm * MM;
  const h = element.heightMm * MM;
  const d = element.depthMm * MM;
  const pad = 0.02;

  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w + pad, h + pad, d + pad]} />
        <meshBasicMaterial visible={false} />
        <Edges color={color} lineWidth={tone === "hover" ? 1.2 : 2} />
      </mesh>
      {/* Footprint pad, drawn on the floor beneath the element. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -element.elevationMm * MM + 0.006, 0]}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={padOpacity} />
      </mesh>
    </group>
  );
}

/** Translucent preview of what a drag would produce, at the snapped position. */
function DragPreview({ design }: { design: StudioDesign }) {
  const placingTypeId = useStudioStore((state) => state.placingTypeId);
  const movingId = useStudioStore((state) => state.movingId);
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const moveOrigin = useStudioStore((state) => state.moveOrigin);
  const ghost = useStudioStore((state) => state.ghost);

  const preview = useMemo<StudioElement[]>(() => {
    if (!ghost) return [];

    if (movingId) {
      if (!moveOrigin) return [];
      const dx = ghost.x - moveOrigin.x;
      const dz = ghost.z - moveOrigin.z;
      // The whole selection previews, offset by the same delta the commit will
      // apply — otherwise a group drag shows one element moving and then five
      // more jump when you let go.
      const moving = selectedIds.includes(movingId) ? selectedIds : [movingId];

      return design.elements
        .filter((entry) => moving.includes(entry.id) && !entry.locked)
        .map((entry) => ({ ...entry, x: entry.x + dx, z: entry.z + dz }));
    }

    if (placingTypeId) {
      const type = getElementType(placingTypeId);
      if (!type) return [];
      return [
        {
          id: "__preview__",
          typeId: placingTypeId,
          x: ghost.x,
          z: ghost.z,
          rotationDeg: 0,
          widthMm: type.defaultSize.widthMm,
          depthMm: type.defaultSize.depthMm,
          heightMm: type.defaultSize.heightMm,
          elevationMm: type.defaultElevationMm,
          colorId: type.colorIds[0],
          locked: false,
        },
      ];
    }
    return [];
  }, [design.elements, ghost, moveOrigin, movingId, placingTypeId, selectedIds]);

  if (preview.length === 0) return null;

  return (
    <group>
      {preview.map((entry) => {
        const rect = bounds(entry);
        return (
          <group key={entry.id}>
            <group
              position={[entry.x * MM, entry.elevationMm * MM, entry.z * MM]}
              rotation={[0, -entry.rotationDeg * (Math.PI / 180), 0]}
            >
              <PreviewGhost element={entry} />
            </group>
            {/* Drop target pad on the ground, at the snapped position. */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[entry.x * MM, 0.008, entry.z * MM]}
            >
              <planeGeometry
                args={[(rect.maxX - rect.minX) * MM, (rect.maxZ - rect.minZ) * MM]}
              />
              <meshBasicMaterial color="#1d5138" transparent opacity={0.28} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function PreviewGhost({ element }: { element: StudioElement }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  // Render the real geometry, then wash it out so it reads as "not placed yet".
  useMemo(() => {
    void scene;
  }, [scene]);

  return (
    <group ref={groupRef}>
      <mesh position={[0, (element.heightMm * MM) / 2, 0]}>
        <boxGeometry
          args={[element.widthMm * MM, element.heightMm * MM, element.depthMm * MM]}
        />
        <meshStandardMaterial
          color="#1d5138"
          transparent
          opacity={0.32}
          roughness={0.6}
        />
        <Edges color="#1d5138" lineWidth={2} />
      </mesh>
    </group>
  );
}

export { MM, designBounds, rectSize };
