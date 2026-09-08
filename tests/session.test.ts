import { beforeEach, describe, expect, it } from "vitest";
import { clearStorage } from "./setup";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/brand";
import {
  createDefaultSession,
  loadSavedDesigns,
  loadSession,
  saveSession,
} from "@/lib/persistence";
import { calculatePrice } from "@shared/pricing/calculatePrice";
import { resolveEnvironmentParam, environmentHref } from "@shared/configuration/environmentParam";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { setQuoteRepository } from "@/domain/quotes";
import { configure } from "./helpers";

function resetApp(): void {
  clearStorage();
  setQuoteRepository(null);
  useConfiguratorStore.setState({ hydrated: false, reference: null, lastQuote: null });
  useConfiguratorStore.getState().startNewDesign();
}

beforeEach(resetApp);

describe("service selection is a single source of truth", () => {
  it("prices the estimate from the same list the store holds", () => {
    const store = useConfiguratorStore.getState();
    store.setServices(["SVC-DELIVERY", "SVC-MAINTENANCE"]);

    const state = useConfiguratorStore.getState();
    const breakdown = calculatePrice(state.config, {
      selectedServiceIds: state.selectedServiceIds,
    });

    const pricedServiceIds = breakdown.lines
      .filter((line) => line.group === "Services")
      .map((line) => line.itemId);

    // Both rate-based services are priced; nothing else sneaks in.
    expect(pricedServiceIds.sort()).toEqual(["SVC-DELIVERY", "SVC-MAINTENANCE"]);
  });

  it("toggling a service changes the total in one place", () => {
    const store = useConfiguratorStore.getState();
    store.setServices([]);
    const withoutTotal = calculatePrice(useConfiguratorStore.getState().config, {
      selectedServiceIds: useConfiguratorStore.getState().selectedServiceIds,
    }).total;

    store.toggleService("SVC-DELIVERY");
    const withTotal = calculatePrice(useConfiguratorStore.getState().config, {
      selectedServiceIds: useConfiguratorStore.getState().selectedServiceIds,
    }).total;

    expect(withTotal).toBeGreaterThan(withoutTotal);
  });

  it("ignores unknown service ids", () => {
    useConfiguratorStore.getState().setServices(["SVC-DELIVERY", "SVC-NOT-REAL"]);
    expect(useConfiguratorStore.getState().selectedServiceIds).toEqual([
      "SVC-DELIVERY",
    ]);
  });

  it("never stores the same service twice", () => {
    useConfiguratorStore.getState().setServices(["SVC-DELIVERY", "SVC-DELIVERY"]);
    expect(useConfiguratorStore.getState().selectedServiceIds).toEqual([
      "SVC-DELIVERY",
    ]);
  });
});

describe("session persistence", () => {
  it("survives a refresh", () => {
    const store = useConfiguratorStore.getState();
    store.setServices(["SVC-MAINTENANCE", "SVC-SITE-VISIT"]);
    store.setRoof("ROOF-LOUVERS");

    // Simulate a reload: fresh store, same localStorage.
    useConfiguratorStore.setState({ hydrated: false });
    useConfiguratorStore.getState().hydrate();

    const after = useConfiguratorStore.getState();
    expect(after.selectedServiceIds).toEqual(["SVC-MAINTENANCE", "SVC-SITE-VISIT"]);
    expect(after.config.roof.roofId).toBe("ROOF-LOUVERS");
  });

  it("restores the service selection when a saved design is reopened", () => {
    const store = useConfiguratorStore.getState();
    store.setServices(["SVC-MAINTENANCE"]);
    store.setRoof("ROOF-FLAT");
    const design = store.saveDesign({ name: "Flat roof design" });

    // Move away from that selection entirely.
    store.setServices(["SVC-DELIVERY"]);
    store.setRoof("ROOF-PYRAMID");

    const loaded = useConfiguratorStore.getState().loadDesign(design.reference);
    expect(loaded).toBe(true);

    const after = useConfiguratorStore.getState();
    expect(after.selectedServiceIds).toEqual(["SVC-MAINTENANCE"]);
    expect(after.config.roof.roofId).toBe("ROOF-FLAT");
    expect(after.reference).toBe(design.reference);
  });

  it("keeps the saved estimate consistent with the saved services", () => {
    const store = useConfiguratorStore.getState();
    store.setServices(["SVC-DELIVERY", "SVC-MAINTENANCE"]);
    const design = store.saveDesign({ name: "With services" });

    const recomputed = calculatePrice(design.configuration, {
      selectedServiceIds: design.selectedServiceIds,
    });
    expect(design.estimatedTotal).toBe(recomputed.total);
  });

  it("starts a new design from the defaults", () => {
    const store = useConfiguratorStore.getState();
    store.setServices([]);
    store.startNewDesign();
    expect(useConfiguratorStore.getState().selectedServiceIds).toEqual([
      "SVC-DELIVERY",
    ]);
  });
});

describe("v1 → v2 migration", () => {
  it("migrates a v1 draft into a v2 session", () => {
    clearStorage();
    const v1Config = configure({ roof: { roofId: "ROOF-PERGOLA" } });
    window.localStorage.setItem(
      LEGACY_STORAGE_KEYS.draft,
      JSON.stringify(v1Config),
    );

    const { session, origin } = loadSession();
    expect(origin).toBe("migrated-v1");
    expect(session.schemaVersion).toBe(2);
    expect(session.configuration.roof.roofId).toBe("ROOF-PERGOLA");
    // v1 had no service selection, so the default applies.
    expect(session.selectedServiceIds).toEqual(["SVC-DELIVERY"]);

    // The migrated session is written under the v2 key…
    expect(window.localStorage.getItem(STORAGE_KEYS.session)).not.toBeNull();
    // …and the v1 data is left untouched.
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEYS.draft)).not.toBeNull();
  });

  it("migrates v1 saved designs and gives them an empty service list", () => {
    clearStorage();
    const v1Design = {
      reference: "NV-OLD1-OLD1",
      savedAt: new Date().toISOString(),
      name: "Legacy design",
      configuration: configure(),
      estimatedTotal: 1000,
      validationStatus: "warning",
    };
    window.localStorage.setItem(
      LEGACY_STORAGE_KEYS.savedDesigns,
      JSON.stringify([v1Design]),
    );

    const { designs, migratedFromV1 } = loadSavedDesigns();
    expect(migratedFromV1).toBe(1);
    expect(designs[0].reference).toBe("NV-OLD1-OLD1");
    expect(designs[0].selectedServiceIds).toEqual([]);
  });

  it("falls back to defaults rather than crashing on corrupt data", () => {
    clearStorage();
    window.localStorage.setItem(STORAGE_KEYS.session, "{ not json");
    window.localStorage.setItem(LEGACY_STORAGE_KEYS.draft, '{"nope":true}');

    const { session, origin } = loadSession();
    expect(origin).toBe("default");
    expect(session.schemaVersion).toBe(2);
  });

  it("drops unknown service ids found in a stored session", () => {
    clearStorage();
    const base = createDefaultSession();
    saveSession({ ...base, selectedServiceIds: ["SVC-DELIVERY", "SVC-GHOST"] });

    const { session } = loadSession();
    expect(session.selectedServiceIds).toEqual(["SVC-DELIVERY"]);
  });
});

describe("environment card preselection", () => {
  it("builds a link that carries the environment", () => {
    expect(environmentHref("ENV-GARDEN")).toBe(
      "/design/location?environment=ENV-GARDEN",
    );
  });

  it("resolves the three selectable environments", () => {
    expect(resolveEnvironmentParam("ENV-INDOOR")).toBe("ENV-INDOOR");
    expect(resolveEnvironmentParam("ENV-GARDEN")).toBe("ENV-GARDEN");
    expect(resolveEnvironmentParam("ENV-ROOFTOP")).toBe("ENV-ROOFTOP");
  });

  it("refuses anything that is not a selectable environment", () => {
    // Not yet available, so it must not become the configuration.
    expect(resolveEnvironmentParam("ENV-COMMERCIAL")).toBeNull();
    expect(resolveEnvironmentParam("ROOF-PYRAMID")).toBeNull();
    expect(resolveEnvironmentParam("nonsense")).toBeNull();
    expect(resolveEnvironmentParam(null)).toBeNull();
    expect(resolveEnvironmentParam("")).toBeNull();
  });

  it("applies the resolved environment to the configuration", () => {
    const environmentId = resolveEnvironmentParam("ENV-ROOFTOP")!;
    useConfiguratorStore.getState().setEnvironment(environmentId);
    expect(useConfiguratorStore.getState().config.environment).toBe("ENV-ROOFTOP");
  });
});
