"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { DragChip, StudioPalette } from "./StudioPalette";
import { StudioProperties } from "./StudioProperties";
import { StudioSummary } from "./StudioSummary";
import { StudioToolbar } from "./StudioToolbar";

/** three.js has no business in the server bundle. */
const StudioScene = dynamic(
  () => import("./scene/StudioScene").then((mod) => mod.StudioScene),
  { ssr: false, loading: () => <CanvasSkeleton /> },
);

/**
 * The studio workspace: palette, canvas, and the inspector.
 *
 * Desktop-first, as the rest of the app is — this is a layout tool and needs
 * room. Below `lg` the panels stack under the canvas so it stays usable on a
 * tablet or phone rather than breaking.
 */
export function StudioWorkspace() {
  const hydrate = useStudioStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useKeyboardShortcuts();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <StudioToolbar />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <aside className="order-2 border-line bg-off-white lg:order-1 lg:h-[calc(100vh-8rem)] lg:border-r">
          <StudioPalette />
        </aside>

        <main className="order-1 min-h-[26rem] lg:order-2 lg:h-[calc(100vh-8rem)]">
          <StudioScene />
        </main>

        {/* One continuous scroll rather than two fixed halves: a tall
            properties panel would otherwise clip its own last control. */}
        <aside className="nv-scroll order-3 divide-y divide-line border-line bg-off-white lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:border-l">
          <StudioProperties />
          <StudioSummary />
        </aside>
      </div>

      <DragChip />
    </div>
  );
}

/**
 * Keyboard shortcuts, the thing that separates a toy from a tool.
 *
 * Ignored while a text field has focus, so typing a name does not delete the
 * element being named.
 */
function useKeyboardShortcuts() {
  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return;

      const store = useStudioStore.getState();
      const step = store.design.gridMm || 100;
      const modifier = event.metaKey || event.ctrlKey;

      // History and clipboard first — these work with nothing selected.
      if (modifier) {
        switch (event.key.toLowerCase()) {
          case "z":
            event.preventDefault();
            if (event.shiftKey) store.redo();
            else store.undo();
            return;
          case "a":
            event.preventDefault();
            store.selectAll();
            return;
          case "c":
            event.preventDefault();
            store.copySelection();
            return;
          case "v":
            event.preventDefault();
            store.paste();
            return;
          default:
            return;
        }
      }

      if (event.key === "Escape") {
        store.cancelDrag();
        store.select(null);
        return;
      }

      // Everything below acts on the whole selection, so one element and six
      // behave the same way rather than the shortcuts quietly meaning less
      // once more than one thing is selected.
      if (store.selectedIds.length === 0) return;

      switch (event.key) {
        case "Delete":
        case "Backspace":
          event.preventDefault();
          store.removeSelection();
          break;
        case "ArrowLeft":
          event.preventDefault();
          store.nudgeSelection(-step, 0);
          break;
        case "ArrowRight":
          event.preventDefault();
          store.nudgeSelection(step, 0);
          break;
        case "ArrowUp":
          event.preventDefault();
          store.nudgeSelection(0, -step);
          break;
        case "ArrowDown":
          event.preventDefault();
          store.nudgeSelection(0, step);
          break;
        case "r":
        case "R":
          store.rotateSelection(event.shiftKey ? -45 : 45);
          break;
        case "d":
        case "D":
          store.duplicateSelection();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function CanvasSkeleton() {
  return (
    <div className="flex h-full min-h-96 items-center justify-center bg-sand/30">
      <div className="text-center">
        <div
          className="mx-auto size-8 animate-spin rounded-full border-2 border-line border-t-brand-green"
          aria-hidden
        />
        <p className="mt-3 text-xs text-ink-subtle">Preparing the design canvas…</p>
      </div>
    </div>
  );
}
