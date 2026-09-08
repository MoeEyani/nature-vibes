import { getItem, getItems, meta } from "../catalog/index.ts";
import type { DesignConfiguration } from "./schema.ts";
import { estimateAquarium, type AquariumEstimates } from "../aquarium/volume.ts";

/**
 * Values computed from the configuration.
 *
 * Pricing, rules and the 3D scene all read these instead of recomputing
 * footprints and perimeters independently.
 */
export type DerivedConfiguration = {
  /** Pavilion footprint in m². */
  footprintM2: number;
  /** Full perimeter of the pavilion in metres. */
  perimeterM: number;
  /** Metres of bench actually built, from the layout's share of the perimeter. */
  seatingRunM: number;
  /** Indicative seat count at ~0.6 m per person. Estimated, not certified. */
  estimatedSeats: number;
  aquarium: AquariumEstimates;
  /** True when the customer's stated space is smaller than the pavilion. */
  spaceTooSmall: boolean;
  /** Metres of clearance left on each axis, when the space is known. */
  clearance: { widthM?: number; lengthM?: number; heightM?: number };
};

/** Metres of bench assumed per seated person. Estimated. */
export const METRES_PER_SEAT = 0.6;

export function derive(config: DesignConfiguration): DerivedConfiguration {
  const widthM = config.pavilion.widthMm / 1000;
  const lengthM = config.pavilion.lengthMm / 1000;

  const footprintM2 = widthM * lengthM;
  const perimeterM = 2 * (widthM + lengthM);

  const layout = getItem(config.seating.layoutId);
  const runFactor = config.seating.enabled
    ? (meta<number>(layout, "runFactor") ?? 0)
    : 0;
  const seatingRunM = perimeterM * runFactor;

  const space = config.space;
  const clearance = {
    widthM: space.widthMm ? (space.widthMm - config.pavilion.widthMm) / 1000 : undefined,
    lengthM: space.lengthMm
      ? (space.lengthMm - config.pavilion.lengthMm) / 1000
      : undefined,
    heightM: space.heightMm
      ? (space.heightMm - config.pavilion.heightMm) / 1000
      : undefined,
  };

  const spaceTooSmall = [clearance.widthM, clearance.lengthM, clearance.heightM].some(
    (value) => value !== undefined && value < 0,
  );

  return {
    footprintM2,
    perimeterM,
    seatingRunM,
    estimatedSeats: Math.floor(seatingRunM / METRES_PER_SEAT),
    aquarium: estimateAquarium(config.aquarium),
    spaceTooSmall,
    clearance,
  };
}

/** Every catalog id currently referenced by the configuration. */
export function selectedItemIds(config: DesignConfiguration): string[] {
  return [
    config.environment,
    config.pavilion.familyId,
    config.pavilion.shapeId,
    config.pavilion.sizePresetId,
    config.structure.materialId,
    config.structure.finishId,
    config.roof.roofId,
    ...(config.seating.enabled
      ? [config.seating.layoutId, config.seating.styleId, config.seating.fabricId]
      : []),
    ...(config.aquarium.enabled
      ? [
          config.aquarium.positionId,
          config.aquarium.shapeId,
          ...config.aquarium.selectedSpeciesIds,
        ]
      : []),
    ...config.plants.planterIds,
    ...config.plants.plantIds,
    ...config.addons,
  ].filter((id): id is string => Boolean(id));
}

export function selectedItems(config: DesignConfiguration) {
  return getItems(selectedItemIds(config));
}

/**
 * Capability tokens let catalog items depend on a *state* rather than another
 * item id — e.g. the irrigation add-on requires `PLANTERS`, not one specific
 * planter product.
 */
export const CAPABILITY_TOKENS = [
  "AQUARIUM",
  "SEATING",
  "PLANTERS",
  "PLANTS",
  "POWER",
] as const;
export type CapabilityToken = (typeof CAPABILITY_TOKENS)[number];

export function isCapabilityToken(id: string): id is CapabilityToken {
  return (CAPABILITY_TOKENS as readonly string[]).includes(id);
}

export function hasCapability(
  config: DesignConfiguration,
  token: CapabilityToken,
): boolean {
  switch (token) {
    case "AQUARIUM":
      return config.aquarium.enabled;
    case "SEATING":
      return config.seating.enabled && Boolean(config.seating.layoutId);
    case "PLANTERS":
      return config.plants.planterIds.length > 0;
    case "PLANTS":
      return config.plants.plantIds.length > 0;
    case "POWER":
      return config.addons.includes("ADD-POWER");
  }
}

/** Human label for a requirement id, whether it is a token or a catalog item. */
export function requirementLabel(id: string): string {
  if (isCapabilityToken(id)) {
    return {
      AQUARIUM: "an aquarium",
      SEATING: "seating",
      PLANTERS: "at least one planter module",
      PLANTS: "at least one plant",
      POWER: "the power & sockets option",
    }[id];
  }
  return getItem(id)?.name ?? id;
}

/** True when `requirementId` is satisfied by the configuration. */
export function isRequirementMet(
  config: DesignConfiguration,
  requirementId: string,
): boolean {
  if (isCapabilityToken(requirementId)) {
    return hasCapability(config, requirementId);
  }
  return selectedItemIds(config).includes(requirementId);
}
