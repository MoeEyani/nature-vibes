"use client";

import { useMemo } from "react";
import { createDefaultConfiguration } from "@/data/seed/defaultConfiguration";
import { normalizeConfiguration } from "@/domain/configuration/normalize";
import { Viewport } from "@/components/three/Viewport";

/**
 * The hero preview: a fully-loaded demo configuration, so the landing page
 * shows the real 3D engine rather than a rendered image.
 */
export function HomeHeroPreview() {
  const config = useMemo(() => {
    const base = createDefaultConfiguration();
    return normalizeConfiguration({
      ...base,
      aquarium: {
        enabled: true,
        positionId: "AQ-CENTER",
        shapeId: "AQSHAPE-RECT",
        lengthMm: 1400,
        widthMm: 550,
        heightMm: 600,
        selectedSpeciesIds: ["FISH-GUPPY", "FISH-NEON-TETRA"],
      },
      plants: {
        planterIds: ["PLANTER-BOX-001", "PLANTER-TRELLIS-001", "PLANTER-HANG-001"],
        plantIds: ["PLANT-CLIMB-002", "PLANT-SHRUB-002", "PLANT-HANG-001"],
      },
      addons: ["ADD-LED-AMBIENT", "ADD-AQUARIUM-LIGHT"],
    });
  }, []);

  return (
    <div className="rounded-card border border-white/10 bg-black/20 p-2">
      <Viewport config={config} className="h-[24rem] lg:h-[30rem]" showLayers={false} />
      <p className="px-2 py-2 text-center text-xs text-cream/50">
        Live 3D preview — drag to orbit. Placeholder geometry, not a
        manufacturing model.
      </p>
    </div>
  );
}
