import { getItem, meta } from "@/data/catalog";
import type { AquariumConfig } from "@/domain/configuration/schema";

/**
 * Aquarium geometry.
 *
 * Everything here is arithmetic on the dimensions the customer entered. None
 * of it is an engineering calculation: glass thickness, structural capacity,
 * filtration sizing and stocking limits are all out of scope for the MVP and
 * must come from qualified verification.
 */

/** Share of nominal volume actually holding water (substrate, freeboard, hardscape). */
export const OPERATING_VOLUME_FACTOR = 0.85;

/** Density of fresh water at room temperature, kg per litre. */
export const WATER_DENSITY_KG_PER_L = 1.0;

/**
 * Rough allowance for tank, stand, substrate and equipment, as a share of the
 * water mass. An Assumption used only to give the customer an order of
 * magnitude — never a structural input.
 */
export const HARDWARE_MASS_FACTOR = 0.35;

export type AquariumEstimates = {
  hasDimensions: boolean;
  /** length × width × height of the bounding box, litres. */
  nominalVolumeL: number;
  /** Nominal volume adjusted for tank shape (e.g. a cylinder). */
  geometricVolumeL: number;
  /** Geometric volume minus freeboard and displacement, litres. */
  operatingVolumeL: number;
  /** Mass of the water alone, kg. */
  waterMassKg: number;
  /** Water plus an assumed allowance for tank and equipment, kg. */
  estimatedFilledMassKg: number;
};

const EMPTY: AquariumEstimates = {
  hasDimensions: false,
  nominalVolumeL: 0,
  geometricVolumeL: 0,
  operatingVolumeL: 0,
  waterMassKg: 0,
  estimatedFilledMassKg: 0,
};

/**
 * Derive the volume and mass estimates for an aquarium configuration.
 * Returns zeroed estimates when the aquarium is off or under-specified.
 */
export function estimateAquarium(aquarium: AquariumConfig): AquariumEstimates {
  const { enabled, lengthMm, widthMm, heightMm } = aquarium;
  if (!enabled || !lengthMm || !widthMm || !heightMm) return EMPTY;

  // 1 litre = 1,000,000 mm³
  const nominalVolumeL = (lengthMm * widthMm * heightMm) / 1_000_000;

  const shape = getItem(aquarium.shapeId);
  const volumeFactor = meta<number>(shape, "volumeFactor") ?? 1;
  const geometricVolumeL = nominalVolumeL * volumeFactor;

  const operatingVolumeL = geometricVolumeL * OPERATING_VOLUME_FACTOR;
  const waterMassKg = operatingVolumeL * WATER_DENSITY_KG_PER_L;

  return {
    hasDimensions: true,
    nominalVolumeL,
    geometricVolumeL,
    operatingVolumeL,
    waterMassKg,
    estimatedFilledMassKg: waterMassKg * (1 + HARDWARE_MASS_FACTOR),
  };
}
