import { describe, expect, it } from "vitest";
import {
  estimateAquarium,
  HARDWARE_MASS_FACTOR,
  OPERATING_VOLUME_FACTOR,
} from "@shared/aquarium/volume";

describe("aquarium volume estimates", () => {
  it("returns zeroes when the aquarium is disabled", () => {
    const result = estimateAquarium({
      enabled: false,
      selectedSpeciesIds: [],
    });
    expect(result.hasDimensions).toBe(false);
    expect(result.nominalVolumeL).toBe(0);
  });

  it("returns zeroes when a dimension is missing", () => {
    const result = estimateAquarium({
      enabled: true,
      lengthMm: 1200,
      widthMm: 500,
      selectedSpeciesIds: [],
    });
    expect(result.hasDimensions).toBe(false);
  });

  it("computes nominal volume as length × width × height", () => {
    // 1200 × 500 × 600 mm = 360,000,000 mm³ = 360 L
    const result = estimateAquarium({
      enabled: true,
      shapeId: "AQSHAPE-RECT",
      lengthMm: 1200,
      widthMm: 500,
      heightMm: 600,
      selectedSpeciesIds: [],
    });
    expect(result.nominalVolumeL).toBeCloseTo(360, 6);
    expect(result.geometricVolumeL).toBeCloseTo(360, 6);
  });

  it("applies the shape factor for a cylindrical tank", () => {
    const result = estimateAquarium({
      enabled: true,
      shapeId: "AQSHAPE-CYL",
      lengthMm: 1000,
      widthMm: 1000,
      heightMm: 500,
      selectedSpeciesIds: [],
    });
    // A cylinder inscribed in a 500 L box holds π/4 of it.
    expect(result.nominalVolumeL).toBeCloseTo(500, 6);
    expect(result.geometricVolumeL).toBeCloseTo(500 * (Math.PI / 4), 6);
  });

  it("distinguishes geometric, operating and filled figures", () => {
    const result = estimateAquarium({
      enabled: true,
      shapeId: "AQSHAPE-RECT",
      lengthMm: 1200,
      widthMm: 500,
      heightMm: 600,
      selectedSpeciesIds: [],
    });

    expect(result.operatingVolumeL).toBeCloseTo(360 * OPERATING_VOLUME_FACTOR, 6);
    expect(result.waterMassKg).toBeCloseTo(result.operatingVolumeL, 6);
    expect(result.estimatedFilledMassKg).toBeCloseTo(
      result.waterMassKg * (1 + HARDWARE_MASS_FACTOR),
      6,
    );
    // The filled figure must never understate the water alone.
    expect(result.estimatedFilledMassKg).toBeGreaterThan(result.waterMassKg);
  });
});
