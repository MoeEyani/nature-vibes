"use client";

import { create } from "zustand";
import { APP_MODE, QUOTE_SOURCE } from "@/constants/appConfig";
import { getItem, meta } from "@/data/catalog";
import { normalizeServiceIds } from "@/data/catalog/services";
import { DEFAULT_AQUARIUM } from "@/data/seed/defaultConfiguration";
import { normalizeConfiguration } from "@/domain/configuration/normalize";
import {
  QUOTE_SCHEMA_VERSION,
  type DesignConfiguration,
  type QuoteCustomer,
  type QuoteRequest,
  type SavedDesign,
} from "@/domain/configuration/schema";
import { calculatePrice } from "@/domain/pricing/calculatePrice";
import { evaluateConfiguration } from "@/domain/rules/evaluateConfiguration";
import {
  getQuoteRepository,
  notifyTeam,
  type QuoteSubmissionResult,
} from "@/domain/quotes";
import { createDesignReference } from "@/lib/id";
import {
  clearSession,
  createDefaultSession,
  loadSavedDesigns,
  loadSession,
  saveSavedDesigns,
  saveSession,
} from "@/lib/persistence";

/**
 * The single configurator store.
 *
 * Components read the configuration and write through these actions; they
 * never mutate nested state directly. Every mutation goes through
 * `apply`, which normalises the result and persists the draft.
 */

type Updater = (config: DesignConfiguration) => void;

export type ConfiguratorState = {
  config: DesignConfiguration;
  /** True once a stored session has been restored (or found absent). */
  hydrated: boolean;
  /** Reference assigned when the design is saved or quoted. */
  reference: string | null;
  /**
   * The single source of truth for services. Review and the quote form both
   * read and write this list, and pricing is derived from it, so the estimate
   * always matches what is submitted.
   */
  selectedServiceIds: string[];
  savedDesigns: SavedDesign[];
  lastQuote: QuoteRequest | null;
  /** Steps the customer has visited, used by the stepper. */
  visited: string[];

  hydrate: () => void;
  markVisited: (stepId: string) => void;

  setEnvironment: (environmentId: string) => void;
  setSpace: (space: Partial<DesignConfiguration["space"]>) => void;
  setShape: (shapeId: string) => void;
  setSizePreset: (sizePresetId: string) => void;
  setMaterial: (materialId: string) => void;
  setFinish: (finishId: string) => void;
  setRoof: (roofId: string) => void;

  setSeatingEnabled: (enabled: boolean) => void;
  setSeatingLayout: (layoutId: string) => void;
  setSeatingStyle: (styleId: string) => void;
  setFabric: (fabricId: string) => void;

  setAquariumEnabled: (enabled: boolean) => void;
  setAquariumPosition: (positionId: string) => void;
  setAquariumShape: (shapeId: string) => void;
  setAquariumDimension: (
    axis: "lengthMm" | "widthMm" | "heightMm",
    value: number,
  ) => void;
  toggleSpecies: (speciesId: string) => void;

  togglePlanter: (planterId: string) => void;
  togglePlant: (plantId: string) => void;
  toggleAddon: (addonId: string) => void;

  toggleService: (serviceId: string) => void;
  setServices: (serviceIds: string[]) => void;

  /** Satisfy an unmet item requirement by adding the missing item. */
  resolveRequirement: (requirementId: string) => void;

  saveDesign: (input: { name: string; description?: string }) => SavedDesign;
  loadDesign: (reference: string) => boolean;
  deleteDesign: (reference: string) => void;
  /**
   * Build the immutable snapshot and hand it to the repository.
   *
   * Resolves only once the write is confirmed. In production that means the
   * remote row exists; the caller must not show success before this resolves
   * with `ok: true`.
   */
  submitQuote: (input: {
    customer: QuoteCustomer;
  }) => Promise<QuoteSubmissionResult>;
  /** Re-attach a reference restored from the URL on the success screen. */
  adoptReference: (reference: string) => void;
  startNewDesign: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => {
  /** Persist the parts of state that make up the durable session. */
  function persist(state: {
    config: DesignConfiguration;
    selectedServiceIds: string[];
    reference: string | null;
  }): void {
    saveSession({
      schemaVersion: 2,
      configuration: state.config,
      selectedServiceIds: state.selectedServiceIds,
      reference: state.reference,
    });
  }

  /** Apply a mutation, normalise, stamp `updatedAt` and persist the session. */
  function apply(updater: Updater): void {
    set((state) => {
      const draft = structuredClone(state.config);
      updater(draft);
      draft.updatedAt = nowIso();
      const config = normalizeConfiguration(draft);
      persist({ ...state, config });
      return { config };
    });
  }

  function toggleInList(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  return {
    config: createDefaultSession().configuration,
    hydrated: false,
    reference: null,
    selectedServiceIds: createDefaultSession().selectedServiceIds,
    savedDesigns: [],
    lastQuote: null,
    visited: [],

    hydrate() {
      if (get().hydrated) return;

      // Migrates v1 data on the way through — see lib/persistence.ts.
      const { session } = loadSession();
      const { designs } = loadSavedDesigns();

      set({
        hydrated: true,
        savedDesigns: designs,
        config: session.configuration,
        selectedServiceIds: session.selectedServiceIds,
        reference: session.reference,
      });
    },

    markVisited(stepId) {
      set((state) =>
        state.visited.includes(stepId)
          ? state
          : { visited: [...state.visited, stepId] },
      );
    },

    setEnvironment(environmentId) {
      apply((config) => {
        config.environment =
          environmentId as DesignConfiguration["environment"];
      });
    },

    setSpace(space) {
      apply((config) => {
        config.space = { ...config.space, ...space };
      });
    },

    setShape(shapeId) {
      apply((config) => {
        config.pavilion.shapeId = shapeId;
      });
    },

    setSizePreset(sizePresetId) {
      apply((config) => {
        config.pavilion.sizePresetId = sizePresetId;
      });
    },

    setMaterial(materialId) {
      apply((config) => {
        config.structure.materialId = materialId;
      });
    },

    setFinish(finishId) {
      apply((config) => {
        config.structure.finishId = finishId;
      });
    },

    setRoof(roofId) {
      apply((config) => {
        config.roof.roofId = roofId;
      });
    },

    setSeatingEnabled(enabled) {
      apply((config) => {
        config.seating.enabled = enabled;
        if (enabled && !config.seating.layoutId) {
          config.seating.layoutId = "SEAT-PERIMETER";
          config.seating.styleId = "SEATSTYLE-CUSHION";
          config.seating.fabricId = "FAB-SAND";
        }
      });
    },

    setSeatingLayout(layoutId) {
      apply((config) => {
        if (layoutId === "SEAT-NONE") {
          config.seating.enabled = false;
          return;
        }
        config.seating.enabled = true;
        config.seating.layoutId = layoutId;
        if (!config.seating.styleId) config.seating.styleId = "SEATSTYLE-BENCH";
      });
    },

    setSeatingStyle(styleId) {
      apply((config) => {
        config.seating.styleId = styleId;
        // Give cushioned styles a default fabric so the 3D scene has a colour.
        if (meta<boolean>(getItem(styleId), "cushion") && !config.seating.fabricId) {
          config.seating.fabricId = "FAB-SAND";
        }
      });
    },

    setFabric(fabricId) {
      apply((config) => {
        config.seating.fabricId = fabricId;
      });
    },

    setAquariumEnabled(enabled) {
      apply((config) => {
        config.aquarium.enabled = enabled;
        if (enabled && !config.aquarium.positionId) {
          Object.assign(config.aquarium, DEFAULT_AQUARIUM);
        }
      });
    },

    setAquariumPosition(positionId) {
      apply((config) => {
        config.aquarium.enabled = true;
        config.aquarium.positionId = positionId;
      });
    },

    setAquariumShape(shapeId) {
      apply((config) => {
        config.aquarium.shapeId = shapeId;
        // A cube tank is square in plan by definition.
        if (shapeId === "AQSHAPE-CUBE" && config.aquarium.lengthMm) {
          config.aquarium.widthMm = config.aquarium.lengthMm;
          config.aquarium.heightMm = config.aquarium.lengthMm;
        }
      });
    },

    setAquariumDimension(axis, value) {
      apply((config) => {
        config.aquarium[axis] = value;
        if (config.aquarium.shapeId === "AQSHAPE-CUBE") {
          config.aquarium.lengthMm = value;
          config.aquarium.widthMm = value;
          config.aquarium.heightMm = value;
        }
      });
    },

    toggleSpecies(speciesId) {
      apply((config) => {
        config.aquarium.selectedSpeciesIds = toggleInList(
          config.aquarium.selectedSpeciesIds,
          speciesId,
        );
      });
    },

    togglePlanter(planterId) {
      apply((config) => {
        config.plants.planterIds = toggleInList(config.plants.planterIds, planterId);
      });
    },

    togglePlant(plantId) {
      apply((config) => {
        config.plants.plantIds = toggleInList(config.plants.plantIds, plantId);
      });
    },

    toggleAddon(addonId) {
      apply((config) => {
        config.addons = toggleInList(config.addons, addonId);
      });
    },

    toggleService(serviceId) {
      set((state) => {
        const selectedServiceIds = normalizeServiceIds(
          state.selectedServiceIds.includes(serviceId)
            ? state.selectedServiceIds.filter((id) => id !== serviceId)
            : [...state.selectedServiceIds, serviceId],
        );
        persist({ ...state, selectedServiceIds });
        return { selectedServiceIds };
      });
    },

    setServices(serviceIds) {
      set((state) => {
        const selectedServiceIds = normalizeServiceIds(serviceIds);
        persist({ ...state, selectedServiceIds });
        return { selectedServiceIds };
      });
    },

    resolveRequirement(requirementId) {
      const item = getItem(requirementId);
      if (!item) return;

      apply((config) => {
        switch (item.category) {
          case "planter":
            if (!config.plants.planterIds.includes(item.id)) {
              config.plants.planterIds.push(item.id);
            }
            break;
          case "plant":
            if (!config.plants.plantIds.includes(item.id)) {
              config.plants.plantIds.push(item.id);
            }
            break;
          case "addon":
            if (!config.addons.includes(item.id)) config.addons.push(item.id);
            break;
          default:
            break;
        }
      });
    },

    saveDesign({ name, description }) {
      const state = get();
      const config = state.config;
      const selectedServiceIds = state.selectedServiceIds;
      const breakdown = calculatePrice(config, { selectedServiceIds });
      const validation = evaluateConfiguration(config);

      const reference = state.reference ?? createDesignReference();
      const design: SavedDesign = {
        reference,
        savedAt: nowIso(),
        name: name.trim() || `${config.pavilion.familyId} design`,
        description: description?.trim() || undefined,
        configuration: { ...config, name: name.trim() || undefined },
        // Saved with the design, so reopening restores the same estimate.
        selectedServiceIds: [...selectedServiceIds],
        estimatedTotal: breakdown.total,
        validationStatus: validation.status,
      };

      const savedDesigns = [
        design,
        ...state.savedDesigns.filter((entry) => entry.reference !== reference),
      ];

      saveSavedDesigns(savedDesigns);
      set({ savedDesigns, reference, config: design.configuration });
      persist({ config: design.configuration, selectedServiceIds, reference });

      return design;
    },

    loadDesign(reference) {
      const design = get().savedDesigns.find((entry) => entry.reference === reference);
      if (!design) return false;

      const config = normalizeConfiguration(design.configuration);
      const selectedServiceIds = normalizeServiceIds(design.selectedServiceIds);
      persist({ config, selectedServiceIds, reference: design.reference });
      set({ config, selectedServiceIds, reference: design.reference });
      return true;
    },

    deleteDesign(reference) {
      const savedDesigns = get().savedDesigns.filter(
        (entry) => entry.reference !== reference,
      );
      saveSavedDesigns(savedDesigns);
      set({ savedDesigns });
    },

    async submitQuote({ customer }) {
      const state = get();
      const config = state.config;
      // The services priced here are exactly the ones submitted below.
      const selectedServiceIds = normalizeServiceIds(state.selectedServiceIds);
      const breakdown = calculatePrice(config, { selectedServiceIds });
      const validation = evaluateConfiguration(config);
      const reference = state.reference ?? createDesignReference();

      const quote: QuoteRequest = {
        reference,
        submittedAt: nowIso(),
        schemaVersion: QUOTE_SCHEMA_VERSION,
        status: "new",
        source: `${QUOTE_SOURCE}:${APP_MODE}`,
        customer,
        additionalServices: selectedServiceIds,
        configuration: config,
        pricing: {
          estimatedTotal: breakdown.total,
          currency: "SAR",
          isEstimate: breakdown.isEstimate,
        },
        validation: { status: validation.status, messages: validation.messages },
      };

      const result = await getQuoteRepository().submit(quote);
      // Nothing is recorded as sent unless the write was confirmed. The caller
      // stays on the quote screen and can retry with the form intact.
      if (!result.ok) return result;

      const confirmed: QuoteRequest = { ...quote, reference: result.reference };
      set({ lastQuote: confirmed, reference: confirmed.reference });
      persist({ config, selectedServiceIds, reference: confirmed.reference });

      // The lead is already durable; a failed notification must not undo it.
      void notifyTeam(confirmed);

      return result;
    },

    adoptReference(reference) {
      set((state) => {
        if (state.reference === reference) return state;
        persist({ ...state, reference });
        return { reference };
      });
    },

    startNewDesign() {
      clearSession();
      const session = createDefaultSession();
      set({
        config: session.configuration,
        selectedServiceIds: session.selectedServiceIds,
        reference: null,
        lastQuote: null,
        visited: [],
      });
    },
  };
});

/**
 * Selector helper: the current price breakdown.
 *
 * Derived from the same `selectedServiceIds` the quote form submits, which is
 * what guarantees the estimate and the request can never diverge.
 */
export function usePriceBreakdown() {
  const config = useConfiguratorStore((state) => state.config);
  const selectedServiceIds = useConfiguratorStore((state) => state.selectedServiceIds);
  return calculatePrice(config, { selectedServiceIds });
}

/** Selector helper: the current validation result. */
export function useValidation() {
  const config = useConfiguratorStore((state) => state.config);
  return evaluateConfiguration(config);
}
