import { describe, expect, it } from "vitest";
import { evaluateConfiguration, groupChecks } from "@/domain/rules/evaluateConfiguration";
import { AQUARIUM_1200, configure } from "./helpers";

const codes = (config: Parameters<typeof evaluateConfiguration>[0]) =>
  evaluateConfiguration(config).messages.map((message) => message.code);

describe("rules engine", () => {
  it("never claims an approval — the best status is a warning about placeholder data", () => {
    const result = evaluateConfiguration(configure());
    // The standing placeholder-data notice is always present.
    expect(result.messages.some((m) => m.code === "DATA_PLACEHOLDER")).toBe(true);
    expect(result.status).not.toBe("ok");
  });

  it("allows a quote when nothing is incompatible", () => {
    const result = evaluateConfiguration(configure());
    expect(result.counts.incompatible).toBe(0);
    expect(result.canRequestQuote).toBe(true);
  });

  describe("rooftop + aquarium", () => {
    it("raises Engineering Review Required", () => {
      const result = evaluateConfiguration(
        configure({ environment: "ENV-ROOFTOP", aquarium: AQUARIUM_1200 }),
      );

      const message = result.messages.find((m) => m.code === "ROOFTOP_AQUARIUM_REVIEW");
      expect(message).toBeDefined();
      expect(message!.severity).toBe("review_required");
      expect(result.status).toBe("review_required");
      // A review requirement must not block the customer from asking for a quote.
      expect(result.canRequestQuote).toBe(true);
    });

    it("does not raise it in a garden without an aquarium", () => {
      expect(codes(configure({ environment: "ENV-GARDEN" }))).not.toContain(
        "ROOFTOP_AQUARIUM_REVIEW",
      );
    });
  });

  it("escalates a heavy tank to review in any environment", () => {
    const heavy = configure({
      environment: "ENV-GARDEN",
      aquarium: { ...AQUARIUM_1200, lengthMm: 1800, widthMm: 700, heightMm: 700 },
    });
    expect(codes(heavy)).toContain("AQ_LOAD_REVIEW");
  });

  it("escalates custom or unsupported geometry to review", () => {
    const custom = configure({ pavilion: { shapeId: "SHAPE-CUSTOM" } });
    const result = evaluateConfiguration(custom);
    expect(result.messages.map((m) => m.code)).toContain("GEOMETRY_CUSTOM_REVIEW");
  });

  it("blocks a pavilion that does not fit the stated space", () => {
    const tooBig = configure({
      space: { lengthMm: 2000, widthMm: 2000 },
      pavilion: { shapeId: "SHAPE-RECT", sizePresetId: "SIZE-3X5" },
    });
    const result = evaluateConfiguration(tooBig);

    expect(result.status).toBe("incompatible");
    expect(result.canRequestQuote).toBe(false);
    expect(result.blocking.length).toBeGreaterThan(0);
  });

  it("warns when a climbing plant has no trellis, and clears once one is added", () => {
    const withoutTrellis = configure({
      plants: { plantIds: ["PLANT-CLIMB-001"], planterIds: ["PLANTER-BOX-001"] },
    });
    const message = evaluateConfiguration(withoutTrellis).messages.find((m) =>
      m.code.startsWith("REQ_PLANT-CLIMB-001"),
    );
    expect(message).toBeDefined();
    expect(message!.severity).toBe("warning");
    expect(message!.step).toBe("plants");

    const withTrellis = configure({
      plants: {
        plantIds: ["PLANT-CLIMB-001"],
        planterIds: ["PLANTER-BOX-001", "PLANTER-TRELLIS-001"],
      },
    });
    expect(
      evaluateConfiguration(withTrellis).messages.some((m) =>
        m.code.startsWith("REQ_PLANT-CLIMB-001"),
      ),
    ).toBe(false);
  });

  it("blocks an explicitly incompatible pair and explains why", () => {
    // A ceiling fan cannot hang from an open pergola roof.
    const result = evaluateConfiguration(
      configure({ roof: { roofId: "ROOF-PERGOLA" }, addons: ["ADD-FAN"] }),
    );

    const message = result.messages.find((m) => m.severity === "incompatible");
    expect(message).toBeDefined();
    expect(message!.message).toMatch(/cannot be built together/i);
    expect(result.canRequestQuote).toBe(false);
  });

  it("blocks misting indoors", () => {
    const result = evaluateConfiguration(
      configure({ environment: "ENV-INDOOR", addons: ["ADD-MISTING"] }),
    );
    expect(result.messages.map((m) => m.code)).toContain("INDOOR_MISTING");
    expect(result.canRequestQuote).toBe(false);
  });

  it("blocks a size preset that does not belong to the selected shape", () => {
    // SIZE-3X5 is a rectangle preset; force it onto a square.
    const mismatched = {
      ...configure(),
      pavilion: {
        ...configure().pavilion,
        shapeId: "SHAPE-SQUARE",
        sizePresetId: "SIZE-3X5",
      },
    };
    expect(codes(mismatched)).toContain("GEOMETRY_SIZE_SHAPE_MISMATCH");
  });

  describe("aquatic life (demo data)", () => {
    it("warns when the tank is under a species' demo minimum", () => {
      const result = evaluateConfiguration(
        configure({
          aquarium: {
            ...AQUARIUM_1200,
            lengthMm: 400,
            widthMm: 300,
            heightMm: 300,
            selectedSpeciesIds: ["FISH-GOLDFISH"],
          },
        }),
      );
      expect(result.messages.map((m) => m.code)).toContain("SPECIES_VOLUME");
    });

    it("blocks species with no overlapping temperature band", () => {
      // Goldfish 18–23 °C against Betta 24–29 °C.
      const result = evaluateConfiguration(
        configure({
          aquarium: {
            ...AQUARIUM_1200,
            selectedSpeciesIds: ["FISH-GOLDFISH", "FISH-BETTA"],
          },
        }),
      );
      const message = result.messages.find((m) => m.code === "SPECIES_TEMPERATURE");
      expect(message?.severity).toBe("incompatible");
    });

    it("always says the species data is unverified", () => {
      const result = evaluateConfiguration(
        configure({
          aquarium: { ...AQUARIUM_1200, selectedSpeciesIds: ["FISH-GUPPY"] },
        }),
      );
      expect(result.messages.map((m) => m.code)).toContain("SPECIES_UNVERIFIED");
    });

    it("raises no species messages while the aquarium is off", () => {
      const result = evaluateConfiguration(configure({ aquarium: { enabled: false } }));
      expect(result.messages.some((m) => m.code.startsWith("SPECIES_"))).toBe(false);
    });
  });

  it("warns when powered add-ons have no power module", () => {
    expect(codes(configure({ addons: ["ADD-LED-AMBIENT"] }))).toContain(
      "UTIL_POWER_SUPPLY",
    );
    expect(codes(configure({ addons: ["ADD-LED-AMBIENT", "ADD-POWER"] }))).not.toContain(
      "UTIL_POWER_SUPPLY",
    );
  });

  it("sorts the most severe findings first", () => {
    const result = evaluateConfiguration(
      configure({
        environment: "ENV-INDOOR",
        addons: ["ADD-MISTING", "ADD-LED-AMBIENT"],
        aquarium: AQUARIUM_1200,
      }),
    );
    expect(result.messages[0].severity).toBe("incompatible");
  });

  it("places every message into exactly one checklist group", () => {
    const result = evaluateConfiguration(
      configure({ environment: "ENV-ROOFTOP", aquarium: AQUARIUM_1200 }),
    );
    const grouped = groupChecks(result).flatMap((group) => group.messages);
    expect(grouped.length).toBe(result.messages.length);
    expect(new Set(grouped).size).toBe(result.messages.length);
  });

  it("gives every message a code, a title and a body", () => {
    const result = evaluateConfiguration(
      configure({ environment: "ENV-ROOFTOP", aquarium: AQUARIUM_1200 }),
    );
    for (const message of result.messages) {
      expect(message.code).toBeTruthy();
      expect(message.title).toBeTruthy();
      expect(message.message.length).toBeGreaterThan(10);
    }
  });
});
