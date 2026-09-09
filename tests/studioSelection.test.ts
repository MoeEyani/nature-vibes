import { beforeEach, describe, expect, it } from "vitest";
import { clearStorage } from "./setup";
import { STORAGE_KEYS } from "@/constants/brand";
import { useStudioStore } from "@/store/useStudioStore";
import { deriveParts } from "@shared/studio/assemblies";
import { studioClipboardSchema } from "@shared/studio/schema";

/**
 * Multi-selection, group editing and the clipboard.
 *
 * Tested through the store rather than the UI, because that is where the
 * behaviour lives: the scene only decides *which* element was pressed and
 * whether a modifier was held.
 */

function reset(): void {
  clearStorage();
  useStudioStore.setState({ hydrated: false, clipboard: [] });
  useStudioStore.getState().startNewDesign();
}

beforeEach(reset);

const store = () => useStudioStore.getState();

/** Place `count` elements of a type and return their ids. */
function placeMany(typeId: string, count: number): string[] {
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    store().addAtCentre(typeId);
    ids.push(store().selectedId!);
  }
  return ids;
}

describe("the selection", () => {
  it("replaces on a plain click and toggles on an additive one", () => {
    const [a, b] = placeMany("EL-CHAIR", 2);

    store().select(a);
    expect(store().selectedIds).toEqual([a]);

    store().select(b, true);
    expect(store().selectedIds).toEqual([a, b]);

    // Additive again on the same element takes it back out.
    store().select(b, true);
    expect(store().selectedIds).toEqual([a]);

    store().select(b);
    expect(store().selectedIds).toEqual([b]);
  });

  it("keeps selectedId as the last member, so the panel has one element", () => {
    const [a, b, c] = placeMany("EL-CHAIR", 3);
    store().select(a);
    store().select(b, true);
    store().select(c, true);

    expect(store().selectedId).toBe(c);
    expect(store().selectedIds).toHaveLength(3);
  });

  it("clears to nothing rather than to a dangling id", () => {
    const [a] = placeMany("EL-CHAIR", 1);
    store().select(a);
    store().select(null);

    expect(store().selectedIds).toEqual([]);
    expect(store().selectedId).toBeNull();
  });

  it("selects everything, and ignores ids that are not in the design", () => {
    const ids = placeMany("EL-CHAIR", 3);
    store().selectAll();
    expect(store().selectedIds.sort()).toEqual([...ids].sort());

    store().selectMany([ids[0], "not-a-real-id"]);
    expect(store().selectedIds).toEqual([ids[0]]);
  });

  it("never keeps pointing at something undo or redo removed", () => {
    const ids = placeMany("EL-CHAIR", 2);
    store().selectAll();
    store().duplicateSelection();
    const copies = store().selectedIds;
    expect(copies).toHaveLength(2);

    store().undo();
    // The copies are gone, so the selection must be too.
    expect(store().selectedIds).toEqual([]);

    store().redo();
    expect(store().design.elements).toHaveLength(4);
    expect(store().selectedIds).toEqual([]);
    expect(ids).toHaveLength(2);
  });
});

describe("editing a whole selection", () => {
  it("nudges every selected element and leaves the rest alone", () => {
    const [a, b, c] = placeMany("EL-CHAIR", 3);
    const before = new Map(store().design.elements.map((e) => [e.id, e.x]));

    store().selectMany([a, b]);
    store().nudgeSelection(500, 0);

    const after = new Map(store().design.elements.map((e) => [e.id, e.x]));
    expect(after.get(a)! - before.get(a)!).toBe(500);
    expect(after.get(b)! - before.get(b)!).toBe(500);
    expect(after.get(c)).toBe(before.get(c));
  });

  it("is one history step, so undo takes back the whole gesture", () => {
    const ids = placeMany("EL-CHAIR", 3);
    const before = store().design.elements.map((e) => e.x);

    store().selectAll();
    store().nudgeSelection(500, 0);
    expect(store().design.elements.map((e) => e.x)).not.toEqual(before);

    store().undo();
    expect(store().design.elements.map((e) => e.x)).toEqual(before);
    expect(ids).toHaveLength(3);
  });

  it("turns each element on its own centre, keeping the arrangement", () => {
    const [a, b] = placeMany("EL-BENCH", 2);
    const positions = new Map(store().design.elements.map((e) => [e.id, `${e.x},${e.z}`]));

    store().selectMany([a, b]);
    store().rotateSelection(90);

    for (const element of store().design.elements) {
      expect(element.rotationDeg).toBe(90);
      expect(`${element.x},${element.z}`).toBe(positions.get(element.id));
    }
  });

  it("applies a finish to everything selected", () => {
    const ids = placeMany("EL-BENCH", 2);
    store().selectMany(ids);
    store().patchSelection({ colorId: "COL-WALNUT" });

    expect(store().design.elements.every((e) => e.colorId === "COL-WALNUT")).toBe(true);
  });

  it("refuses to move or delete a locked element", () => {
    const [a, b] = placeMany("EL-CHAIR", 2);
    store().patchElement(b, { locked: true });
    const lockedX = store().design.elements.find((e) => e.id === b)!.x;

    store().selectMany([a, b]);
    store().nudgeSelection(500, 0);
    expect(store().design.elements.find((e) => e.id === b)!.x).toBe(lockedX);

    store().removeSelection();
    const left = store().design.elements.map((e) => e.id);
    expect(left).toEqual([b]);
  });

  it("duplicates a set as a set, preserving its arrangement", () => {
    const ids = placeMany("EL-CHAIR", 2);
    const originals = store().design.elements.filter((e) => ids.includes(e.id));
    const gap = originals[1].x - originals[0].x;

    store().selectMany(ids);
    store().duplicateSelection();

    const copies = store().design.elements.filter((e) =>
      store().selectedIds.includes(e.id),
    );
    expect(copies).toHaveLength(2);
    expect(copies[1].x - copies[0].x).toBe(gap);
    expect(store().design.elements).toHaveLength(4);
  });
});

describe("dragging a selection", () => {
  it("moves every selected element by the same delta", () => {
    const [a, b] = placeMany("EL-CHAIR", 2);
    store().selectMany([a, b]);

    const start = store().design.elements.find((e) => e.id === a)!;
    const other = store().design.elements.find((e) => e.id === b)!;

    store().beginMove(a);
    store().updateGhost({ x: start.x + 1000, z: start.z + 500 });
    store().commitDrag();

    const movedA = store().design.elements.find((e) => e.id === a)!;
    const movedB = store().design.elements.find((e) => e.id === b)!;
    expect(movedA.x).toBe(start.x + 1000);
    expect(movedB.x).toBe(other.x + 1000);
    expect(movedB.z).toBe(other.z + 500);
  });

  it("drops the selection when a press lands outside it", () => {
    const [a, b, c] = placeMany("EL-CHAIR", 3);
    store().selectMany([a, b]);

    store().beginMove(c);
    expect(store().selectedIds).toEqual([c]);
  });

  it("moves only the pressed element when it was not part of the selection", () => {
    const [a, b] = placeMany("EL-CHAIR", 2);
    store().selectMany([a]);
    const before = store().design.elements.find((e) => e.id === a)!.x;
    const start = store().design.elements.find((e) => e.id === b)!;

    store().beginMove(b);
    store().updateGhost({ x: start.x + 1000, z: start.z });
    store().commitDrag();

    expect(store().design.elements.find((e) => e.id === a)!.x).toBe(before);
    expect(store().design.elements.find((e) => e.id === b)!.x).toBe(start.x + 1000);
  });

  it("narrows to the pressed element when the gesture was a click, not a drag", () => {
    const [a, b, c] = placeMany("EL-CHAIR", 3);
    store().selectMany([a, b, c]);

    // The scene deliberately leaves the selection alone on press, so that a
    // drag moves the whole group. A press that goes nowhere has to narrow, or
    // there would be no way to pick one element back out with the mouse.
    const start = store().design.elements.find((e) => e.id === b)!;
    store().beginMove(b);
    store().updateGhost({ x: start.x, z: start.z });
    store().commitDrag();

    expect(store().selectedIds).toEqual([b]);
  });

  it("leaves a single selection alone when a click goes nowhere", () => {
    const [a] = placeMany("EL-CHAIR", 1);
    store().selectMany([a]);
    const start = store().design.elements.find((e) => e.id === a)!;

    store().beginMove(a);
    store().updateGhost({ x: start.x, z: start.z });
    store().commitDrag();

    expect(store().selectedIds).toEqual([a]);
  });

  it("records nothing when the drag ends where it began", () => {
    const [a] = placeMany("EL-CHAIR", 1);
    const depth = store().past.length;
    const start = store().design.elements.find((e) => e.id === a)!;

    store().beginMove(a);
    store().updateGhost({ x: start.x, z: start.z });
    store().commitDrag();

    expect(store().past.length).toBe(depth);
  });
});

describe("copy and paste", () => {
  it("pastes what was copied, with new ids, and selects the result", () => {
    const ids = placeMany("EL-CHAIR", 2);
    store().selectMany(ids);
    expect(store().copySelection()).toBe(2);

    expect(store().paste()).toBe(2);
    expect(store().design.elements).toHaveLength(4);
    expect(store().selectedIds).toHaveLength(2);
    for (const id of store().selectedIds) expect(ids).not.toContain(id);
  });

  it("survives into a different design, which is the point of persisting it", () => {
    const ids = placeMany("EL-BENCH", 2);
    store().selectMany(ids);
    store().copySelection();

    // A brand-new design: nothing in memory links it to the old one.
    store().startNewDesign();
    expect(store().design.elements).toHaveLength(0);

    expect(store().paste()).toBe(2);
    expect(store().design.elements).toHaveLength(2);
    expect(store().design.elements.every((e) => e.typeId === "EL-BENCH")).toBe(true);
  });

  it("copies an assembly whole, still parametric after pasting", () => {
    store().addAtCentre("ASM-PAVILION");
    const id = store().selectedId!;
    store().patchElement(id, { params: { roofStyle: "louvered", spanW: 4000 } });
    store().copySelection();
    store().paste();

    const pasted = store().design.elements.find(
      (element) => element.id === store().selectedId,
    )!;
    expect(pasted.params?.roofStyle).toBe("louvered");
    expect(deriveParts(pasted).some((e) => e.typeId === "EL-ROOF-LOUVERED")).toBe(true);
  });

  it("does nothing with an empty clipboard rather than throwing", () => {
    expect(store().paste()).toBe(0);
    expect(store().design.elements).toHaveLength(0);
  });

  it("does nothing with an empty selection", () => {
    placeMany("EL-CHAIR", 1);
    store().select(null);
    expect(store().copySelection()).toBe(0);
  });

  it("shrugs off a corrupt clipboard in storage instead of crashing", () => {
    placeMany("EL-CHAIR", 1);
    window.localStorage.setItem(
      STORAGE_KEYS.studioClipboard,
      JSON.stringify({ copiedAt: "yesterday", elements: [{ nonsense: true }] }),
    );

    expect(() => store().paste()).not.toThrow();
    expect(store().design.elements).toHaveLength(1);
  });

  it("writes a clipboard the schema accepts", () => {
    const ids = placeMany("EL-CHAIR", 1);
    store().selectMany(ids);
    store().copySelection();

    const raw = window.localStorage.getItem(STORAGE_KEYS.studioClipboard);
    expect(raw).toBeTruthy();
    expect(studioClipboardSchema.safeParse(JSON.parse(raw!)).success).toBe(true);
  });
});
