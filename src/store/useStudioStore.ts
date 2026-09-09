"use client";

import { create } from "zustand";
import { STORAGE_KEYS } from "@/constants/brand";
import {
  applyPatch,
  createElement,
  createEmptyDesign,
  duplicateElement,
  findFreeSpot,
  normalizeDesign,
  snapPosition,
  type ElementPatch,
} from "@shared/studio/design";
import { clampToSite } from "@shared/studio/geometry";
import { calculateStudioPrice } from "@shared/studio/pricing";
import { evaluateStudioDesign } from "@shared/studio/rules";
import {
  savedStudioDesignSchema,
  studioDesignSchema,
  type SavedStudioDesign,
  type StudioDesign,
  type StudioElement,
} from "@shared/studio/schema";
import { createDesignReference } from "@shared/lib/id";
import { readJson, removeKey, writeJson } from "@/lib/storage";

/**
 * Design Studio store.
 *
 * Holds the design, the selection, and the two transient drag interactions:
 * placing a new element from the palette, and moving one already on the
 * canvas. Both keep their in-progress position in `ghost` so the 3D layer can
 * draw a preview without committing anything.
 *
 * Undo history snapshots the design before each committed mutation. Transient
 * state — hover, ghost, selection — is never recorded, so undo steps back
 * through real edits rather than through mouse movements.
 */

const HISTORY_LIMIT = 60;

export type StudioView = "perspective" | "top";

export type StudioState = {
  design: StudioDesign;
  hydrated: boolean;

  selectedId: string | null;
  hoveredId: string | null;

  /** Palette type being dragged onto the canvas, if any. */
  placingTypeId: string | null;
  /** Existing element being dragged, if any. */
  movingId: string | null;
  /** Snapped ground position of the current drag. */
  ghost: { x: number; z: number } | null;

  past: StudioDesign[];
  future: StudioDesign[];

  savedDesigns: SavedStudioDesign[];
  reference: string | null;

  view: StudioView;
  showGrid: boolean;
  showDimensions: boolean;

  hydrate: () => void;

  beginPlacement: (typeId: string) => void;
  beginMove: (elementId: string) => void;
  updateGhost: (point: { x: number; z: number }) => void;
  commitDrag: () => void;
  cancelDrag: () => void;

  select: (elementId: string | null) => void;
  hover: (elementId: string | null) => void;

  addAtCentre: (typeId: string) => void;
  patchElement: (elementId: string, patch: ElementPatch) => void;
  nudge: (elementId: string, dx: number, dz: number) => void;
  rotate: (elementId: string, deltaDeg: number) => void;
  duplicate: (elementId: string) => void;
  remove: (elementId: string) => void;
  clearAll: () => void;

  setSite: (site: Partial<StudioDesign["site"]>) => void;
  setGrid: (gridMm: number) => void;
  setView: (view: StudioView) => void;
  toggleGrid: () => void;
  toggleDimensions: () => void;

  undo: () => void;
  redo: () => void;

  saveDesign: (name: string) => SavedStudioDesign;
  loadSaved: (reference: string) => boolean;
  deleteSaved: (reference: string) => void;
  startNewDesign: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

export const useStudioStore = create<StudioState>((set, get) => {
  function persist(design: StudioDesign): void {
    writeJson(STORAGE_KEYS.studioDesign, design);
  }

  /**
   * Commit a change to the design: push the previous version onto the undo
   * stack, stamp `updatedAt`, persist, and clear the redo stack.
   */
  function commit(mutate: (design: StudioDesign) => StudioDesign): void {
    set((state) => {
      const next = { ...mutate(state.design), updatedAt: nowIso() };
      persist(next);
      return {
        design: next,
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
      };
    });
  }

  function findElement(design: StudioDesign, id: string): StudioElement | undefined {
    return design.elements.find((element) => element.id === id);
  }

  return {
    design: createEmptyDesign(),
    hydrated: false,
    selectedId: null,
    hoveredId: null,
    placingTypeId: null,
    movingId: null,
    ghost: null,
    past: [],
    future: [],
    savedDesigns: [],
    reference: null,
    view: "perspective",
    showGrid: true,
    showDimensions: true,

    hydrate() {
      if (get().hydrated) return;

      const stored = studioDesignSchema.safeParse(
        readJson<unknown>(STORAGE_KEYS.studioDesign),
      );
      const savedRaw = readJson<unknown[]>(STORAGE_KEYS.studioSaved) ?? [];
      const savedDesigns = savedRaw
        .map((entry) => savedStudioDesignSchema.safeParse(entry))
        .filter((result) => result.success)
        .map((result) => result.data);

      set({
        hydrated: true,
        savedDesigns,
        ...(stored.success ? { design: normalizeDesign(stored.data) } : {}),
      });
    },

    // ---------------------------------------------------------------- drags

    beginPlacement(typeId) {
      set({ placingTypeId: typeId, movingId: null, ghost: null });
    },

    beginMove(elementId) {
      const element = findElement(get().design, elementId);
      if (!element || element.locked) return;
      set({
        movingId: elementId,
        placingTypeId: null,
        selectedId: elementId,
        ghost: { x: element.x, z: element.z },
      });
    },

    updateGhost(point) {
      const state = get();
      if (!state.placingTypeId && !state.movingId) return;
      set({ ghost: snapPosition(point, state.design) });
    },

    commitDrag() {
      const state = get();
      const { ghost, placingTypeId, movingId, design } = state;

      if (placingTypeId && ghost) {
        const element = createElement(placingTypeId, ghost, design);
        if (element) {
          commit((current) => ({
            ...current,
            elements: [...current.elements, element],
          }));
          set({ selectedId: element.id });
        }
      } else if (movingId && ghost) {
        const element = findElement(design, movingId);
        // Only record history if the element actually moved.
        if (element && (element.x !== ghost.x || element.z !== ghost.z)) {
          commit((current) => ({
            ...current,
            elements: current.elements.map((entry) =>
              entry.id === movingId
                ? { ...entry, ...clampToSite({ ...entry, ...ghost }, current.site) }
                : entry,
            ),
          }));
        }
      }

      set({ placingTypeId: null, movingId: null, ghost: null });
    },

    cancelDrag() {
      set({ placingTypeId: null, movingId: null, ghost: null });
    },

    // ------------------------------------------------------------ selection

    select(elementId) {
      set({ selectedId: elementId });
    },

    hover(elementId) {
      set({ hoveredId: elementId });
    },

    // -------------------------------------------------------------- editing

    addAtCentre(typeId) {
      const design = get().design;
      // Search outward for a clear spot, so tapping repeatedly lays elements
      // out rather than piling them on the origin.
      const element = createElement(typeId, findFreeSpot(design, typeId), design);
      if (!element) return;
      commit((current) => ({ ...current, elements: [...current.elements, element] }));
      set({ selectedId: element.id });
    },

    patchElement(elementId, patch) {
      commit((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          element.id === elementId ? applyPatch(element, patch, current) : element,
        ),
      }));
    },

    nudge(elementId, dx, dz) {
      const design = get().design;
      const element = findElement(design, elementId);
      if (!element || element.locked) return;
      get().patchElement(elementId, { x: element.x + dx, z: element.z + dz });
    },

    rotate(elementId, deltaDeg) {
      const design = get().design;
      const element = findElement(design, elementId);
      if (!element || element.locked) return;
      get().patchElement(elementId, { rotationDeg: element.rotationDeg + deltaDeg });
    },

    duplicate(elementId) {
      const design = get().design;
      const element = findElement(design, elementId);
      if (!element) return;
      const copy = duplicateElement(element, design);
      commit((current) => ({ ...current, elements: [...current.elements, copy] }));
      set({ selectedId: copy.id });
    },

    remove(elementId) {
      const element = findElement(get().design, elementId);
      if (!element || element.locked) return;
      commit((current) => ({
        ...current,
        elements: current.elements.filter((entry) => entry.id !== elementId),
      }));
      set((state) => ({
        selectedId: state.selectedId === elementId ? null : state.selectedId,
        hoveredId: state.hoveredId === elementId ? null : state.hoveredId,
      }));
    },

    clearAll() {
      commit((current) => ({ ...current, elements: [] }));
      set({ selectedId: null, hoveredId: null });
    },

    // --------------------------------------------------------------- canvas

    setSite(site) {
      commit((current) => {
        const next = { ...current, site: { ...current.site, ...site } };
        // Shrinking the site must not strand elements outside it.
        return {
          ...next,
          elements: next.elements.map((element) => ({
            ...element,
            ...clampToSite(element, next.site),
          })),
        };
      });
    },

    setGrid(gridMm) {
      commit((current) => ({ ...current, gridMm }));
    },

    setView(view) {
      set({ view });
    },
    toggleGrid() {
      set((state) => ({ showGrid: !state.showGrid }));
    },
    toggleDimensions() {
      set((state) => ({ showDimensions: !state.showDimensions }));
    },

    // -------------------------------------------------------------- history

    undo() {
      set((state) => {
        const previous = state.past.at(-1);
        if (!previous) return state;
        persist(previous);
        return {
          design: previous,
          past: state.past.slice(0, -1),
          future: [state.design, ...state.future].slice(0, HISTORY_LIMIT),
          selectedId: previous.elements.some((e) => e.id === state.selectedId)
            ? state.selectedId
            : null,
        };
      });
    },

    redo() {
      set((state) => {
        const next = state.future[0];
        if (!next) return state;
        persist(next);
        return {
          design: next,
          past: [...state.past, state.design].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
        };
      });
    },

    // ------------------------------------------------------------ save/load

    saveDesign(name) {
      const state = get();
      const design = { ...state.design, name: name.trim() || undefined };
      const reference = state.reference ?? createDesignReference();

      const saved: SavedStudioDesign = {
        reference,
        savedAt: nowIso(),
        name: name.trim() || "Untitled studio design",
        design,
        estimatedTotal: calculateStudioPrice(design).total,
        elementCount: design.elements.length,
      };

      const savedDesigns = [
        saved,
        ...state.savedDesigns.filter((entry) => entry.reference !== reference),
      ];
      writeJson(STORAGE_KEYS.studioSaved, savedDesigns);
      persist(design);
      set({ savedDesigns, reference, design });
      return saved;
    },

    loadSaved(reference) {
      const saved = get().savedDesigns.find((entry) => entry.reference === reference);
      if (!saved) return false;

      const design = normalizeDesign(saved.design);
      persist(design);
      set({ design, reference, selectedId: null, past: [], future: [] });
      return true;
    },

    deleteSaved(reference) {
      const savedDesigns = get().savedDesigns.filter(
        (entry) => entry.reference !== reference,
      );
      writeJson(STORAGE_KEYS.studioSaved, savedDesigns);
      set({ savedDesigns });
    },

    startNewDesign() {
      removeKey(STORAGE_KEYS.studioDesign);
      set({
        design: createEmptyDesign(),
        selectedId: null,
        hoveredId: null,
        past: [],
        future: [],
        reference: null,
      });
    },
  };
});

/** Selector helper: the current studio price breakdown. */
export function useStudioPrice() {
  const design = useStudioStore((state) => state.design);
  return calculateStudioPrice(design);
}

/** Selector helper: the current studio validation result. */
export function useStudioValidation() {
  const design = useStudioStore((state) => state.design);
  return evaluateStudioDesign(design);
}
