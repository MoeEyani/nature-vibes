import { describe, expect, it } from "vitest";
import { normalizeConfiguration } from "@shared/configuration/normalize";
import { AQUARIUM_1200, configure } from "./helpers";

describe("configuration normalisation", () => {
  it("clears the aquatic-life selection when the aquarium is turned off", () => {
    const withFish = configure({
      aquarium: { ...AQUARIUM_1200, selectedSpeciesIds: ["FISH-GUPPY", "FISH-BETTA"] },
    });
    expect(withFish.aquarium.selectedSpeciesIds).toHaveLength(2);

    const off = normalizeConfiguration({
      ...withFish,
      aquarium: { ...withFish.aquarium, enabled: false },
    });

    expect(off.aquarium.selectedSpeciesIds).toEqual([]);
    expect(off.aquarium.positionId).toBeUndefined();
    expect(off.aquarium.lengthMm).toBeUndefined();
  });

  it("clears the seat style and fabric when seating is turned off", () => {
    const off = configure({ seating: { enabled: false } });
    expect(off.seating.layoutId).toBeUndefined();
    expect(off.seating.styleId).toBeUndefined();
    expect(off.seating.fabricId).toBeUndefined();
  });

  it("treats the 'No seating' layout as seating off", () => {
    const off = configure({ seating: { enabled: true, layoutId: "SEAT-NONE" } });
    expect(off.seating.enabled).toBe(false);
  });

  it("clears the fabric for a style with no cushion", () => {
    const bench = configure({
      seating: { enabled: true, styleId: "SEATSTYLE-BENCH", fabricId: "FAB-OLIVE" },
    });
    expect(bench.seating.fabricId).toBeUndefined();
  });

  it("keeps the size preset consistent with the shape", () => {
    const rect = configure({ pavilion: { shapeId: "SHAPE-RECT" } });
    expect(rect.pavilion.sizePresetId).toBe("SIZE-3X4");
    expect(rect.pavilion.lengthMm).toBe(4200);
  });

  it("derives the pavilion dimensions from the size preset", () => {
    const compact = configure({ pavilion: { sizePresetId: "SIZE-2X2" } });
    expect(compact.pavilion.widthMm).toBe(2400);
    expect(compact.pavilion.lengthMm).toBe(2400);
    expect(compact.pavilion.heightMm).toBe(2450);
  });

  it("removes aquarium-dependent planting and add-ons when the tank goes", () => {
    const withTank = configure({
      aquarium: AQUARIUM_1200,
      plants: { planterIds: ["PLANTER-AQUA-001"], plantIds: ["PLANT-AQUA-001"] },
      addons: ["ADD-AQUARIUM-LIGHT"],
    });
    expect(withTank.plants.planterIds).toContain("PLANTER-AQUA-001");

    const off = normalizeConfiguration({
      ...withTank,
      aquarium: { ...withTank.aquarium, enabled: false },
    });

    expect(off.plants.planterIds).not.toContain("PLANTER-AQUA-001");
    expect(off.plants.plantIds).not.toContain("PLANT-AQUA-001");
    expect(off.addons).not.toContain("ADD-AQUARIUM-LIGHT");
  });

  it("keeps an item-level dependency selected so the rules engine can explain it", () => {
    // The climbing plant stays; the rules engine warns about the missing trellis
    // rather than silently deleting the customer's choice.
    const config = configure({
      plants: { plantIds: ["PLANT-CLIMB-001"], planterIds: [] },
    });
    expect(config.plants.plantIds).toContain("PLANT-CLIMB-001");
  });

  it("de-duplicates selections", () => {
    const config = normalizeConfiguration({
      ...configure(),
      addons: ["ADD-FAN", "ADD-FAN", "ADD-POWER"],
    });
    expect(config.addons).toEqual(["ADD-FAN", "ADD-POWER"]);
  });

  it("is idempotent", () => {
    const once = configure({ aquarium: AQUARIUM_1200 });
    expect(normalizeConfiguration(once)).toEqual(once);
  });
});
