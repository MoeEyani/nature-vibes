"use client";

import { create } from "zustand";
import { STORAGE_KEYS } from "@/constants/brand";
import { getItem, meta } from "@/data/catalog";
import {
  createDefaultConfiguration,
  DEFAULT_AQUARIUM,
} from "@/data/seed/defaultConfiguration";
import { normalizeConfiguration } from "@/domain/configuration/normalize";
import {
  designConfigurationSchema,
  savedDesignSchema,
  type DesignConfiguration,
  type QuoteRequest,
  type SavedDesign,
} from "@/domain/configuration/schema";
import { calculatePrice, type PricingContext } from "@/domain/pricing/calculatePrice";
import { evaluateConfiguration } from "@/domain/rules/evaluateConfiguration";
import { createDesignReference } from "@/lib/id";
import { readJson, removeKey, writeJson } from "@/lib/storage";

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
  /** True once a stored draft has been restored (or found absent). */
  hydrated: boolean;
  /** Reference assigned when the design is saved or quoted. */
  reference: string | null;
  /** Optional services included in the price estimate. */
  pricingContext: PricingContext;
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

  setPricingContext: (context: Partial<PricingContext>) => void;

  /** Satisfy an unmet item requirement by adding the missing item. */
  resolveRequirement: (requirementId: string) => void;

  saveDesign: (input: { name: string; description?: string }) => SavedDesign;
  loadDesign: (reference: string) => boolean;
  deleteDesign: (reference: string) => void;
  submitQuote: (
    request: Omit<QuoteRequest, "reference" | "submittedAt" | "configuration" | "pricing" | "validation">,
  ) => QuoteRequest;
  startNewDesign: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => {
  /** Apply a mutation, normalise, stamp `updatedAt` and persist the draft. */
  function apply(updater: Updater): void {
    set((state) => {
      const draft = structuredClone(state.config);
      updater(draft);
      draft.updatedAt = nowIso();
      const config = normalizeConfiguration(draft);
      writeJson(STORAGE_KEYS.draft, config);
      return { config };
    });
  }

  function toggleInList(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  return {
    config: createDefaultConfiguration(),
    hydrated: false,
    reference: null,
    pricingContext: { includeInstallation: true },
    savedDesigns: [],
    lastQuote: null,
    visited: [],

    hydrate() {
      if (get().hydrated) return;

      const storedDraft = readJson<unknown>(STORAGE_KEYS.draft);
      const parsedDraft = designConfigurationSchema.safeParse(storedDraft);

      const storedDesigns = readJson<unknown[]>(STORAGE_KEYS.savedDesigns) ?? [];
      const savedDesigns = storedDesigns
        .map((entry) => savedDesignSchema.safeParse(entry))
        .filter((result) => result.success)
        .map((result) => result.data);

      set({
        hydrated: true,
        savedDesigns,
        ...(parsedDraft.success
          ? { config: normalizeConfiguration(parsedDraft.data) }
          : {}),
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

    setPricingContext(context) {
      set((state) => ({ pricingContext: { ...state.pricingContext, ...context } }));
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
      const breakdown = calculatePrice(config, state.pricingContext);
      const validation = evaluateConfiguration(config);

      const reference = state.reference ?? createDesignReference();
      const design: SavedDesign = {
        reference,
        savedAt: nowIso(),
        name: name.trim() || `${config.pavilion.familyId} design`,
        description: description?.trim() || undefined,
        configuration: { ...config, name: name.trim() || undefined },
        estimatedTotal: breakdown.total,
        validationStatus: validation.status,
      };

      const savedDesigns = [
        design,
        ...state.savedDesigns.filter((entry) => entry.reference !== reference),
      ];

      writeJson(STORAGE_KEYS.savedDesigns, savedDesigns);
      set({ savedDesigns, reference, config: design.configuration });
      writeJson(STORAGE_KEYS.draft, design.configuration);

      return design;
    },

    loadDesign(reference) {
      const design = get().savedDesigns.find((entry) => entry.reference === reference);
      if (!design) return false;

      const config = normalizeConfiguration(design.configuration);
      writeJson(STORAGE_KEYS.draft, config);
      set({ config, reference: design.reference });
      return true;
    },

    deleteDesign(reference) {
      const savedDesigns = get().savedDesigns.filter(
        (entry) => entry.reference !== reference,
      );
      writeJson(STORAGE_KEYS.savedDesigns, savedDesigns);
      set({ savedDesigns });
    },

    submitQuote(input) {
      const state = get();
      const config = state.config;
      const breakdown = calculatePrice(config, state.pricingContext);
      const validation = evaluateConfiguration(config);
      const reference = state.reference ?? createDesignReference();

      const quote: QuoteRequest = {
        reference,
        submittedAt: nowIso(),
        customer: input.customer,
        additionalServices: input.additionalServices,
        configuration: config,
        pricing: {
          estimatedTotal: breakdown.total,
          currency: "SAR",
          isEstimate: breakdown.isEstimate,
        },
        validation: { status: validation.status, messages: validation.messages },
      };

      // V1 has no backend: the structured payload is persisted locally so it
      // can be inspected, exported and later POSTed to a real endpoint.
      const existing = readJson<QuoteRequest[]>(STORAGE_KEYS.quotes) ?? [];
      writeJson(STORAGE_KEYS.quotes, [quote, ...existing]);

      set({ lastQuote: quote, reference });
      return quote;
    },

    startNewDesign() {
      removeKey(STORAGE_KEYS.draft);
      set({
        config: createDefaultConfiguration(),
        reference: null,
        lastQuote: null,
        visited: [],
      });
    },
  };
});

/** Selector helper: the current price breakdown. */
export function usePriceBreakdown() {
  const config = useConfiguratorStore((state) => state.config);
  const pricingContext = useConfiguratorStore((state) => state.pricingContext);
  return calculatePrice(config, pricingContext);
}

/** Selector helper: the current validation result. */
export function useValidation() {
  const config = useConfiguratorStore((state) => state.config);
  return evaluateConfiguration(config);
}
