import type { CatalogCategory, CatalogIndex, CatalogItem } from "../types/catalog.ts";
import { ENVIRONMENTS } from "./environments.ts";
import { PAVILION_FAMILIES, SHAPES, SIZE_PRESETS } from "./pavilions.ts";
import { FINISHES, MATERIALS } from "./structure.ts";
import { ROOFS } from "./roofs.ts";
import { FABRICS, SEATING_LAYOUTS, SEATING_STYLES } from "./seating.ts";
import { AQUARIUM_POSITIONS, AQUARIUM_SHAPES, SPECIES } from "./aquariums.ts";
import { PLANTERS, PLANTS } from "./plants.ts";
import { ADDONS } from "./addons.ts";

export {
  ENVIRONMENTS,
  PAVILION_FAMILIES,
  SHAPES,
  SIZE_PRESETS,
  MATERIALS,
  FINISHES,
  ROOFS,
  SEATING_LAYOUTS,
  SEATING_STYLES,
  FABRICS,
  AQUARIUM_POSITIONS,
  AQUARIUM_SHAPES,
  SPECIES,
  PLANTERS,
  PLANTS,
  ADDONS,
};

/** Every catalog item in the system, flattened. */
export const CATALOG: CatalogItem[] = [
  ...ENVIRONMENTS,
  ...PAVILION_FAMILIES,
  ...SHAPES,
  ...SIZE_PRESETS,
  ...MATERIALS,
  ...FINISHES,
  ...ROOFS,
  ...SEATING_LAYOUTS,
  ...SEATING_STYLES,
  ...FABRICS,
  ...AQUARIUM_POSITIONS,
  ...AQUARIUM_SHAPES,
  ...SPECIES,
  ...PLANTERS,
  ...PLANTS,
  ...ADDONS,
];

export const CATALOG_INDEX: CatalogIndex = Object.fromEntries(
  CATALOG.map((item) => [item.id, item]),
);

/** Look up an item by id. Returns undefined for unknown ids. */
export function getItem(id: string | undefined | null): CatalogItem | undefined {
  if (!id) return undefined;
  return CATALOG_INDEX[id];
}

/** Look up an item by id, throwing if it is missing (seed-data bug). */
export function requireItem(id: string): CatalogItem {
  const item = CATALOG_INDEX[id];
  if (!item) throw new Error(`Unknown catalog item: ${id}`);
  return item;
}

export function getItems(ids: readonly string[]): CatalogItem[] {
  return ids.map(getItem).filter((item): item is CatalogItem => Boolean(item));
}

export function byCategory(category: CatalogCategory): CatalogItem[] {
  return CATALOG.filter((item) => item.category === category);
}

export function isSelectable(item: CatalogItem | undefined): boolean {
  return item?.status === "active";
}

/** Display name for an id, with a readable fallback for missing data. */
export function itemName(id: string | undefined | null, fallback = "—"): string {
  return getItem(id)?.name ?? fallback;
}

/** Typed reader for the loose `meta` bag on catalog items. */
export function meta<T>(item: CatalogItem | undefined, key: string): T | undefined {
  return item?.meta?.[key] as T | undefined;
}

/**
 * True when every price the configurator can produce is still placeholder
 * seed data. Drives the "Estimated" language across the UI.
 */
export const ALL_PRICES_ARE_PLACEHOLDER = CATALOG.every(
  (item) => !item.price || item.price.status === "placeholder",
);

/** Sanity check for seed data — surfaces duplicate ids during development. */
export function findDuplicateIds(): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of CATALOG) {
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return [...duplicates];
}
