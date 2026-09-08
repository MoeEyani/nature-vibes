import { describe, expect, it } from "vitest";
import { CATALOG, findDuplicateIds, getItem } from "@shared/catalog";

describe("catalog seed data", () => {
  it("has no duplicate ids", () => {
    expect(findDuplicateIds()).toEqual([]);
  });

  it("marks every price as a placeholder", () => {
    const confirmed = CATALOG.filter((item) => item.price?.status === "confirmed");
    expect(confirmed).toEqual([]);
  });

  it("gives every unavailable option a reason the UI can show", () => {
    const missingReason = CATALOG.filter(
      (item) => item.status !== "active" && !item.unavailableReason,
    ).map((item) => item.id);
    expect(missingReason).toEqual([]);
  });

  it("only references real ids in requires / incompatibleWith / compatibleWith", () => {
    // Capability tokens are the deliberate exception — they name a state.
    const tokens = new Set(["AQUARIUM", "SEATING", "PLANTERS", "PLANTS", "POWER"]);
    const dangling: string[] = [];

    for (const item of CATALOG) {
      for (const id of [
        ...(item.requires ?? []),
        ...(item.incompatibleWith ?? []),
        ...(item.compatibleWith ?? []),
      ]) {
        if (!tokens.has(id) && !getItem(id)) dangling.push(`${item.id} → ${id}`);
      }
    }

    expect(dangling).toEqual([]);
  });

  it("gives every priced item a pricing mode", () => {
    const missing = CATALOG.filter((item) => item.price && !item.pricingMode).map(
      (item) => item.id,
    );
    expect(missing).toEqual([]);
  });
});
