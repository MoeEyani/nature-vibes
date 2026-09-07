import type { DesignConfiguration } from "@/domain/configuration/schema";
import { createConfigurationId } from "@/lib/id";
import { normalizeConfiguration } from "@/domain/configuration/normalize";

/**
 * The starting point for a new design: the M3 demo platform, garden
 * environment, pyramid roof, perimeter seating — the configuration shown in
 * the concept imagery, with the aquarium off so the customer opts in.
 *
 * Every value here is a concept seed value, not an approved specification.
 */
export function createDefaultConfiguration(): DesignConfiguration {
  const now = new Date().toISOString();

  return normalizeConfiguration({
    id: createConfigurationId(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    environment: "ENV-GARDEN",
    space: {},
    pavilion: {
      familyId: "PAV-M3",
      shapeId: "SHAPE-SQUARE",
      sizePresetId: "SIZE-3X3",
      widthMm: 3000,
      lengthMm: 3000,
      heightMm: 2600,
    },
    structure: {
      materialId: "MAT-ALU",
      finishId: "FIN-MATTE-BLACK",
    },
    roof: { roofId: "ROOF-PYRAMID" },
    seating: {
      enabled: true,
      layoutId: "SEAT-PERIMETER",
      styleId: "SEATSTYLE-CUSHION",
      fabricId: "FAB-SAND",
    },
    aquarium: {
      enabled: false,
      selectedSpeciesIds: [],
    },
    plants: {
      plantIds: [],
      planterIds: ["PLANTER-BOX-001"],
    },
    addons: ["ADD-LED-AMBIENT"],
  });
}

/** Default tank dimensions applied the first time the aquarium is enabled. */
export const DEFAULT_AQUARIUM = {
  positionId: "AQ-CENTER",
  shapeId: "AQSHAPE-RECT",
  lengthMm: 1200,
  widthMm: 500,
  heightMm: 600,
} as const;
