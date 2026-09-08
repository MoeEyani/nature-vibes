import { describe, expect, it } from "vitest";
import { getItem } from "@shared/catalog";
import { calculatePrice, groupLines } from "@shared/pricing/calculatePrice";
import { getService } from "@shared/catalog/services";
import { derive } from "@shared/configuration/derive";
import { AQUARIUM_1200, configure } from "./helpers";

describe("pricing engine", () => {
  it("produces line items with quantity, unit price and subtotal", () => {
    const breakdown = calculatePrice(configure());

    expect(breakdown.lines.length).toBeGreaterThan(0);
    for (const line of breakdown.lines) {
      expect(line.subtotal).toBe(Math.round(line.unitPrice * line.quantity));
      expect(line.quantity).toBeGreaterThan(0);
      expect(line.description).toBeTruthy();
    }
  });

  it("labels the total as an estimate while prices are placeholders", () => {
    const breakdown = calculatePrice(configure());
    expect(breakdown.isEstimate).toBe(true);
    expect(breakdown.lines.every((line) => line.priceStatus === "placeholder")).toBe(true);
  });

  it("totals the line items exactly", () => {
    const breakdown = calculatePrice(configure());
    const sum = breakdown.lines.reduce((total, line) => total + line.subtotal, 0);
    expect(breakdown.total).toBe(sum);
  });

  it("scales per-square-metre items with the footprint", () => {
    const small = calculatePrice(configure({ pavilion: { sizePresetId: "SIZE-2X2" } }));
    const large = calculatePrice(
      configure({
        pavilion: { shapeId: "SHAPE-RECT", sizePresetId: "SIZE-3X5" },
      }),
    );

    const roofLine = (breakdown: typeof small) =>
      breakdown.lines.find((line) => line.itemId === "ROOF-PYRAMID")!;

    expect(roofLine(small).quantity).toBeCloseTo(2.4 * 2.4, 2);
    expect(roofLine(large).quantity).toBeCloseTo(3.0 * 5.4, 2);
    expect(roofLine(large).subtotal).toBeGreaterThan(roofLine(small).subtotal);
  });

  it("scales per-linear-metre seating with the layout's share of the perimeter", () => {
    const config = configure({ seating: { layoutId: "SEAT-ONE-SIDE" } });
    const breakdown = calculatePrice(config);
    const derived = derive(config);

    const seatLine = breakdown.lines.find((line) => line.itemId === "SEAT-ONE-SIDE")!;
    expect(seatLine.quantity).toBeCloseTo(derived.seatingRunM, 2);
    expect(seatLine.unit).toBe("m");
  });

  it("changes the total when a priced option is added", () => {
    const withoutFan = calculatePrice(configure({ addons: ["ADD-LED-AMBIENT"] }));
    const withFan = calculatePrice(configure({ addons: ["ADD-LED-AMBIENT", "ADD-FAN"] }));

    const fanPrice = getItem("ADD-FAN")!.price!.amount;
    expect(withFan.total - withoutFan.total).toBe(fanPrice);
  });

  it("drops seating lines entirely when seating is off", () => {
    const breakdown = calculatePrice(configure({ seating: { enabled: false } }));
    expect(breakdown.lines.some((line) => line.group === "Seating")).toBe(false);
  });

  it("drops aquarium and species lines when the aquarium is off", () => {
    const on = calculatePrice(
      configure({
        aquarium: { ...AQUARIUM_1200, selectedSpeciesIds: ["FISH-GUPPY"] },
      }),
    );
    expect(on.lines.some((line) => line.group === "Aquarium")).toBe(true);
    expect(on.lines.some((line) => line.group === "Aquatic life")).toBe(true);

    const off = calculatePrice(configure({ aquarium: { enabled: false } }));
    expect(off.lines.some((line) => line.group === "Aquarium")).toBe(false);
    expect(off.lines.some((line) => line.group === "Aquatic life")).toBe(false);
  });

  it("prices planter modules by their units-per-pavilion count", () => {
    const breakdown = calculatePrice(
      configure({ plants: { planterIds: ["PLANTER-BOX-001"], plantIds: [] } }),
    );
    const line = breakdown.lines.find((entry) => entry.itemId === "PLANTER-BOX-001")!;
    expect(line.quantity).toBe(4);
    expect(line.subtotal).toBe(getItem("PLANTER-BOX-001")!.price!.amount * 4);
  });

  it("adds installation as a share of the product subtotal", () => {
    const config = configure();
    const base = calculatePrice(config);
    const withInstall = calculatePrice(config, {
      selectedServiceIds: ["SVC-DELIVERY"],
    });

    const pricing = getService("SVC-DELIVERY")!.pricing;
    const rate = pricing.mode === "rateOfProductSubtotal" ? pricing.rate : 0;

    expect(withInstall.servicesSubtotal).toBe(
      Math.round(base.productSubtotal * rate),
    );
    expect(withInstall.total).toBe(base.productSubtotal + withInstall.servicesSubtotal);
  });

  it("prices only the services that were selected", () => {
    const config = configure();
    const none = calculatePrice(config, { selectedServiceIds: [] });
    expect(none.servicesSubtotal).toBe(0);

    const both = calculatePrice(config, {
      selectedServiceIds: ["SVC-DELIVERY", "SVC-MAINTENANCE"],
    });
    expect(both.lines.filter((line) => line.group === "Services")).toHaveLength(2);
  });

  it("never charges the same service twice", () => {
    const config = configure();
    const once = calculatePrice(config, { selectedServiceIds: ["SVC-DELIVERY"] });
    const duplicated = calculatePrice(config, {
      selectedServiceIds: ["SVC-DELIVERY", "SVC-DELIVERY"],
    });
    expect(duplicated.total).toBe(once.total);
    expect(duplicated.lines.filter((line) => line.group === "Services")).toHaveLength(1);
  });

  it("ignores unknown and quoted-separately services", () => {
    const config = configure();
    const base = calculatePrice(config, { selectedServiceIds: [] });
    const withExtras = calculatePrice(config, {
      selectedServiceIds: ["SVC-NOPE", "SVC-SITE-VISIT", "SVC-CONSULT"],
    });
    expect(withExtras.total).toBe(base.total);
  });

  it("is deterministic for the same configuration", () => {
    const config = configure();
    expect(calculatePrice(config)).toEqual(calculatePrice(config));
  });

  it("groups lines without losing any", () => {
    const breakdown = calculatePrice(configure(), {
      selectedServiceIds: ["SVC-DELIVERY"],
    });
    const grouped = groupLines(breakdown).flatMap((group) => group.lines);
    expect(grouped.length).toBe(breakdown.lines.length);
  });
});
