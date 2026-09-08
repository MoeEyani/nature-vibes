import { createDefaultConfiguration } from "@shared/seed/defaultConfiguration";
import { normalizeConfiguration } from "@shared/configuration/normalize";
import type { DesignConfiguration } from "@shared/configuration/schema";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Build a configuration for a test, applying the same normalisation the store
 * applies so tests exercise realistic state.
 */
export function configure(
  overrides: DeepPartial<DesignConfiguration> = {},
): DesignConfiguration {
  const base = createDefaultConfiguration();

  return normalizeConfiguration({
    ...base,
    ...overrides,
    space: { ...base.space, ...overrides.space },
    pavilion: { ...base.pavilion, ...overrides.pavilion },
    structure: { ...base.structure, ...overrides.structure },
    roof: { ...base.roof, ...overrides.roof },
    seating: { ...base.seating, ...overrides.seating },
    aquarium: { ...base.aquarium, ...overrides.aquarium },
    plants: { ...base.plants, ...overrides.plants },
    addons: overrides.addons ?? base.addons,
  } as DesignConfiguration);
}

export const AQUARIUM_1200 = {
  enabled: true,
  positionId: "AQ-CENTER",
  shapeId: "AQSHAPE-RECT",
  lengthMm: 1200,
  widthMm: 500,
  heightMm: 600,
  selectedSpeciesIds: [] as string[],
};
