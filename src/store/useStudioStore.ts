"use client";

import { create } from "zustand";
import { STORAGE_KEYS } from "@/constants/brand";
import {
  applyPatch,
  createElement,
  createEmptyDesign,
  duplicateElement,
  explodeAssembly,
  findFreeSpot,
  normalizeDesign,
  pasteElements,
  snapPosition,
  type ElementPatch,
} from "@shared/studio/design";
import { clampToSite } from "@shared/studio/geometry";
import { calculateStudioPrice } from "@shared/studio/pricing";
import { evaluateStudioDesign } from "@shared/studio/rules";
import {
  savedStudioDesignSchema,
  studioClipboardSchema,
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

  /**
   * The selection, in the order it was built. `selectedId` is always its last
   * member — the properties panel edits one element, so it needs to know which
   * one "the" selected element is, and the most recently added is the one the
   * customer just pointed at.
   */
  selectedIds: string[];
  selectedId: string | null;
  hoveredId: string | null;

  /** Palette type being dragged onto the canvas, if any. */
  placingTypeId: string | null;
  /** Existing element being dragged, if any. */
  movingId: string | null;
  /** Snapped ground position of the current drag. */
  ghost: { x: number; z: number } | null;
  /**
   * Where the dragged element started. A multi-selection moves by the delta
   * from here, so the arrangement is carried along rather than every element
   * being stacked on the pointer.
   */
  moveOrigin: { x: number; z: number } | null;

  past: StudioDesign[];
  future: StudioDesign[];

  savedDesigns: SavedStudioDesign[];
  reference: string | null;

  /** Elements copied from this or another design. */
  clipboard: StudioElement[];

  view: StudioView;
  showGrid: boolean;
  showDimensions: boolean;

  hydrate: () => void;

  beginPlacement: (typeId: string) => void;
  beginMove: (elementId: string) => void;
  updateGhost: (point: { x: number; z: number }) => void;
  commitDrag: () => void;
  cancelDrag: () => void;

  /** `additive` toggles the element in the selection rather than replacing it. */
  select: (elementId: string | null, additive?: boolean) => void;
  selectMany: (elementIds: string[]) => void;
  selectAll: () => void;
  hover: (elementId: string | null) => void;

  addAtCentre: (typeId: string) => void;
  patchElement: (elementId: string, patch: ElementPatch) => void;
  nudge: (elementId: string, dx: number, dz: number) => void;
  rotate: (elementId: string, deltaDeg: number) => void;
  duplicate: (elementId: string) => void;
  /** Replace an assembly with the loose elements it stands for. */
  explode: (elementId: string) => void;
  remove: (elementId: string) => void;
  clearAll: () => void;

  // Selection-wide edits. Each is one history step, so undo takes back the
  // whole gesture rather than unpicking it element by element.
  nudgeSelection: (dx: number, dz: number) => void;
  rotateSelection: (deltaDeg: number) => void;
  patchSelection: (patch: ElementPatch) => void;
  duplicateSelection: () => void;
  removeSelection: () => void;
  copySelection: () => number;
  paste: () => number;

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

  /** The two selection fields, always written together so they cannot drift. */
  function selection(ids: string[]): { selectedIds: string[]; selectedId: string | null } {
    return { selectedIds: ids, selectedId: ids.at(-1) ?? null };
  }

  /** Elements of the current selection that may actually be edited. */
  function editable(state: StudioState): StudioElement[] {
    return state.selectedIds
      .map((id) => findElement(state.design, id))
      .filter((element): element is StudioElement => Boolean(element) && !element!.locked);
  }

  return {
    design: createEmptyDesign(),
    hydrated: false,
    selectedIds: [],
    selectedId: null,
    hoveredId: null,
    placingTypeId: null,
    movingId: null,
    ghost: null,
    moveOrigin: null,
    clipboard: [],
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
      const state = get();
      const element = findElement(state.design, elementId);
      if (!element || element.locked) return;

      // Pressing an element that is already part of a multi-selection drags
      // the whole selection; pressing anything else starts a fresh one.
      const inSelection = state.selectedIds.includes(elementId);
      set({
        movingId: elementId,
        placingTypeId: null,
        ghost: { x: element.x, z: element.z },
        moveOrigin: { x: element.x, z: element.z },
        ...(inSelection ? {} : selection([elementId])),
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
          set(selection([element.id]));
        }
      } else if (movingId && ghost) {
        const origin = state.moveOrigin;
        const element = findElement(design, movingId);

        // A press inside a multi-selection deliberately leaves the selection
        // alone, so that a drag moves the whole group. If the gesture turned
        // out to be a click, this is where it narrows to what was clicked.
        if (element && origin && element.x === ghost.x && element.z === ghost.z) {
          if (state.selectedIds.length > 1) set(selection([movingId]));
        }

        // Only record history if the element actually moved.
        if (element && origin && (element.x !== ghost.x || element.z !== ghost.z)) {
          const dx = ghost.x - origin.x;
          const dz = ghost.z - origin.z;
          // Everything selected moves by the same delta, so a group keeps its
          // arrangement instead of collapsing onto the pointer.
          const moving = new Set(
            state.selectedIds.includes(movingId) ? state.selectedIds : [movingId],
          );

          commit((current) => ({
            ...current,
            elements: current.elements.map((entry) => {
              if (!moving.has(entry.id) || entry.locked) return entry;
              const moved = { ...entry, x: entry.x + dx, z: entry.z + dz };
              return { ...moved, ...clampToSite(moved, current.site) };
            }),
          }));
        }
      }

      set({ placingTypeId: null, movingId: null, ghost: null, moveOrigin: null });
    },

    cancelDrag() {
      set({ placingTypeId: null, movingId: null, ghost: null, moveOrigin: null });
    },

    // ------------------------------------------------------------ selection

    select(elementId, additive = false) {
      if (!elementId) {
        set(selection([]));
        return;
      }

      set((state) => {
        if (!additive) return selection([elementId]);
        // Additive click toggles: pressing a selected element again with the
        // modifier held is how you take it back out.
        const without = state.selectedIds.filter((id) => id !== elementId);
        return selection(
          without.length === state.selectedIds.length
            ? [...state.selectedIds, elementId]
            : without,
        );
      });
    },

    selectMany(elementIds) {
      const known = new Set(get().design.elements.map((element) => element.id));
      set(selection(elementIds.filter((id) => known.has(id))));
    },

    selectAll() {
      set(selection(get().design.elements.map((element) => element.id)));
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
      set(selection([element.id]));
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
      set(selection([copy.id]));
    },

    explode(elementId) {
      const design = get().design;
      const element = findElement(design, elementId);
      if (!element || element.locked) return;

      const parts = explodeAssembly(element, design);
      // `explodeAssembly` returns the element unchanged when it is not an
      // assembly; nothing to record in that case.
      if (parts.length === 1 && parts[0].id === element.id) return;

      commit((current) => ({
        ...current,
        elements: current.elements.flatMap((entry) =>
          entry.id === elementId ? parts : [entry],
        ),
      }));
      // The assembly is gone, so the selection has to move with it.
      // Select the parts it became, so the customer keeps hold of their work.
      set({ ...selection(parts.map((entry) => entry.id)), hoveredId: null });
    },

    remove(elementId) {
      const element = findElement(get().design, elementId);
      if (!element || element.locked) return;
      commit((current) => ({
        ...current,
        elements: current.elements.filter((entry) => entry.id !== elementId),
      }));
      set((state) => ({
        ...selection(state.selectedIds.filter((id) => id !== elementId)),
        hoveredId: state.hoveredId === elementId ? null : state.hoveredId,
      }));
    },

    clearAll() {
      commit((current) => ({ ...current, elements: [] }));
      set({ ...selection([]), hoveredId: null });
    },

    // ------------------------------------------------- selection-wide edits

    nudgeSelection(dx, dz) {
      const targets = editable(get());
      if (targets.length === 0) return;
      const moving = new Set(targets.map((element) => element.id));

      commit((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          moving.has(element.id)
            ? applyPatch(element, { x: element.x + dx, z: element.z + dz }, current)
            : element,
        ),
      }));
    },

    rotateSelection(deltaDeg) {
      const targets = editable(get());
      if (targets.length === 0) return;
      const turning = new Set(targets.map((element) => element.id));

      commit((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          turning.has(element.id)
            ? applyPatch(
                element,
                { rotationDeg: element.rotationDeg + deltaDeg },
                current,
              )
            : element,
        ),
      }));
    },

    patchSelection(patch) {
      const targets = editable(get());
      if (targets.length === 0) return;
      const ids = new Set(targets.map((element) => element.id));

      commit((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          ids.has(element.id) ? applyPatch(element, patch, current) : element,
        ),
      }));
    },

    duplicateSelection() {
      const state = get();
      const originals = state.selectedIds
        .map((id) => findElement(state.design, id))
        .filter((element): element is StudioElement => Boolean(element));
      if (originals.length === 0) return;

      // One offset for the whole set, so a copied corner is still a corner.
      const copies = pasteElements(originals, state.design);
      commit((current) => ({
        ...current,
        elements: [...current.elements, ...copies],
      }));
      set(selection(copies.map((element) => element.id)));
    },

    removeSelection() {
      const targets = editable(get());
      if (targets.length === 0) return;
      const doomed = new Set(targets.map((element) => element.id));

      commit((current) => ({
        ...current,
        elements: current.elements.filter((element) => !doomed.has(element.id)),
      }));
      set((state) => ({
        ...selection(state.selectedIds.filter((id) => !doomed.has(id))),
        hoveredId: doomed.has(state.hoveredId ?? "") ? null : state.hoveredId,
      }));
    },

    copySelection() {
      const state = get();
      const elements = state.selectedIds
        .map((id) => findElement(state.design, id))
        .filter((element): element is StudioElement => Boolean(element));
      if (elements.length === 0) return 0;

      // Persisted, so a selection can be carried into a different saved design.
      writeJson(STORAGE_KEYS.studioClipboard, {
        copiedAt: nowIso(),
        elements,
      });
      set({ clipboard: elements });
      return elements.length;
    },

    paste() {
      const state = get();
      // Re-read storage: another tab, or the design loaded since the copy, may
      // hold a newer clipboard than this store instance saw.
      const stored = studioClipboardSchema.safeParse(
        readJson<unknown>(STORAGE_KEYS.studioClipboard),
      );
      const source = stored.success ? stored.data.elements : state.clipboard;
      if (source.length === 0) return 0;

      const pasted = pasteElements(source, state.design);
      if (pasted.length === 0) return 0;

      commit((current) => ({
        ...current,
        elements: [...current.elements, ...pasted],
      }));
      set({
        ...selection(pasted.map((element) => element.id)),
        clipboard: source,
      });
      return pasted.length;
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
          // Undo can remove elements; the selection must not keep pointing at
          // something that is no longer in the design.
          ...selection(
            state.selectedIds.filter((id) =>
              previous.elements.some((element) => element.id === id),
            ),
          ),
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
          // Redo can put back a deletion; the selection must not survive it.
          ...selection(
            state.selectedIds.filter((id) =>
              next.elements.some((element) => element.id === id),
            ),
          ),
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
      set({ design, reference, ...selection([]), past: [], future: [] });
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
        ...selection([]),
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
