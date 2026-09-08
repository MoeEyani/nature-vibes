import { getItem, meta } from "../catalog/index.ts";
import { SIZE_PRESETS } from "../catalog/pavilions.ts";
import type { DesignConfiguration } from "./schema.ts";
import { isCapabilityToken, hasCapability } from "./derive.ts";

/**
 * Normalisation keeps the configuration internally consistent after any edit.
 *
 * These are the "UX / logical" rules from the brief: turning the aquarium off
 * clears the species, turning seating off clears the style and fabric, and so
 * on. They are applied on every mutation so no downstream consumer ever sees
 * a dangling selection.
 *
 * Anything the customer needs to *decide* about stays a rules-engine message
 * instead; normalisation only removes selections that have become meaningless.
 */
export function normalizeConfiguration(
  input: DesignConfiguration,
): DesignConfiguration {
  const config: DesignConfiguration = structuredClone(input);

  applySizePreset(config);
  normalizeSeating(config);
  normalizeAquarium(config);
  normalizePlanting(config);
  normalizeAddons(config);

  return config;
}

/** The size preset is the single source of the pavilion's dimensions. */
function applySizePreset(config: DesignConfiguration): void {
  const shape = getItem(config.pavilion.shapeId);
  let preset = getItem(config.pavilion.sizePresetId);

  // A shape change can orphan the size preset — fall back to the first
  // active preset offered for the new shape.
  const fitsShape =
    !preset?.compatibleWith?.length ||
    preset.compatibleWith.includes(config.pavilion.shapeId);

  if (!preset || !fitsShape) {
    const replacement = SIZE_PRESETS.find(
      (candidate) =>
        candidate.status === "active" &&
        (candidate.compatibleWith?.includes(config.pavilion.shapeId) ?? false),
    );
    if (replacement) {
      config.pavilion.sizePresetId = replacement.id;
      preset = replacement;
    }
  }

  const width = meta<number>(preset, "widthMm");
  const length = meta<number>(preset, "lengthMm");
  const height = meta<number>(preset, "heightMm");
  if (width && length && height) {
    config.pavilion.widthMm = width;
    config.pavilion.lengthMm = length;
    config.pavilion.heightMm = height;
  }

  // Keep the shape reference honest: a square preset implies a square.
  if (shape?.id === "SHAPE-SQUARE" && width && length && width !== length) {
    config.pavilion.lengthMm = width;
  }
}

/** Seating OFF → the style and fabric are cleared. */
function normalizeSeating(config: DesignConfiguration): void {
  if (config.seating.layoutId === "SEAT-NONE") {
    config.seating.enabled = false;
  }

  if (!config.seating.enabled) {
    config.seating.layoutId = undefined;
    config.seating.styleId = undefined;
    config.seating.fabricId = undefined;
    return;
  }

  // Fabric is only meaningful for a cushioned style.
  const style = getItem(config.seating.styleId);
  if (!meta<boolean>(style, "cushion")) {
    config.seating.fabricId = undefined;
  }
}

/** Aquarium OFF → position, shape, dimensions and species are cleared. */
function normalizeAquarium(config: DesignConfiguration): void {
  if (config.aquarium.enabled) {
    // De-duplicate and drop unknown species ids.
    config.aquarium.selectedSpeciesIds = [
      ...new Set(config.aquarium.selectedSpeciesIds),
    ].filter((id) => Boolean(getItem(id)));
    return;
  }

  config.aquarium.positionId = undefined;
  config.aquarium.shapeId = undefined;
  config.aquarium.lengthMm = undefined;
  config.aquarium.widthMm = undefined;
  config.aquarium.heightMm = undefined;
  config.aquarium.selectedSpeciesIds = [];
}

/** Drop planting whose hard prerequisite (e.g. the aquarium) is gone. */
function normalizePlanting(config: DesignConfiguration): void {
  config.plants.planterIds = dedupe(config.plants.planterIds).filter((id) =>
    prerequisitesStillPossible(config, id),
  );
  config.plants.plantIds = dedupe(config.plants.plantIds).filter((id) =>
    prerequisitesStillPossible(config, id),
  );
}

/** Drop add-ons whose hard prerequisite is gone. */
function normalizeAddons(config: DesignConfiguration): void {
  config.addons = dedupe(config.addons).filter((id) =>
    prerequisitesStillPossible(config, id),
  );
}

/**
 * Only capability requirements are auto-cleared. Item-level requirements
 * (climbing plant → trellis) stay selected so the rules engine can explain
 * them and offer a fix, rather than silently deleting the customer's choice.
 */
function prerequisitesStillPossible(
  config: DesignConfiguration,
  itemId: string,
): boolean {
  const item = getItem(itemId);
  if (!item) return false;

  for (const requirementId of item.requires ?? []) {
    if (!isCapabilityToken(requirementId)) continue;
    // PLANTERS/PLANTS depend on the very lists being normalised, so only the
    // structural capabilities are treated as hard prerequisites here.
    if (requirementId !== "AQUARIUM" && requirementId !== "SEATING") continue;
    if (!hasCapability(config, requirementId)) return false;
  }
  return true;
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}
