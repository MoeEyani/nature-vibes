"use client";

import { useState } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

/** Canvas controls: history, view, grid, site size and saving. */
export function StudioToolbar() {
  const design = useStudioStore((state) => state.design);
  const past = useStudioStore((state) => state.past);
  const future = useStudioStore((state) => state.future);
  const view = useStudioStore((state) => state.view);
  const showGrid = useStudioStore((state) => state.showGrid);
  const showDimensions = useStudioStore((state) => state.showDimensions);

  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const setView = useStudioStore((state) => state.setView);
  const toggleGrid = useStudioStore((state) => state.toggleGrid);
  const toggleDimensions = useStudioStore((state) => state.toggleDimensions);
  const setGrid = useStudioStore((state) => state.setGrid);
  const setSite = useStudioStore((state) => state.setSite);
  const clearAll = useStudioStore((state) => state.clearAll);
  const saveDesign = useStudioStore((state) => state.saveDesign);

  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-off-white/95 px-3 py-2">
      <Group>
        <IconButton label="Undo" disabled={past.length === 0} onClick={undo}>
          ↶
        </IconButton>
        <IconButton label="Redo" disabled={future.length === 0} onClick={redo}>
          ↷
        </IconButton>
      </Group>

      <Group>
        <Toggle active={view === "perspective"} onClick={() => setView("perspective")}>
          3D
        </Toggle>
        <Toggle active={view === "top"} onClick={() => setView("top")}>
          Plan
        </Toggle>
      </Group>

      <Group>
        <Toggle active={showGrid} onClick={toggleGrid}>
          Grid
        </Toggle>
        <Toggle active={showDimensions} onClick={toggleDimensions}>
          Dimensions
        </Toggle>
      </Group>

      <Group>
        <label className="flex items-center gap-1.5 px-1 text-xs text-ink-muted">
          Snap
          <select
            aria-label="Snap step"
            value={design.gridMm}
            onChange={(event) => setGrid(Number(event.target.value))}
            className="rounded border border-line bg-white px-1.5 py-1 text-xs text-ink focus:border-brand-green focus:outline-none"
          >
            <option value={0}>Off</option>
            <option value={50}>50 mm</option>
            <option value={100}>100 mm</option>
            <option value={250}>250 mm</option>
            <option value={500}>500 mm</option>
          </select>
        </label>
      </Group>

      <Group>
        <label className="flex items-center gap-1.5 px-1 text-xs text-ink-muted">
          Site
          <select
            aria-label="Site size"
            value={design.site.widthMm}
            onChange={(event) => {
              const size = Number(event.target.value);
              setSite({ widthMm: size, depthMm: size });
            }}
            className="rounded border border-line bg-white px-1.5 py-1 text-xs text-ink focus:border-brand-green focus:outline-none"
          >
            <option value={4000}>4 × 4 m</option>
            <option value={6000}>6 × 6 m</option>
            <option value={8000}>8 × 8 m</option>
            <option value={12000}>12 × 12 m</option>
          </select>
        </label>
      </Group>

      <div className="ml-auto flex items-center gap-2">
        {saved ? (
          <span className="font-mono text-[11px] text-ok">Saved {saved}</span>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (design.elements.length > 0) clearAll();
          }}
          disabled={design.elements.length === 0}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={() => {
            const design = useStudioStore.getState().design;
            const record = saveDesign(design.name ?? "Studio design");
            setSaved(record.reference);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-sand/50 p-0.5">
      {children}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md px-2.5 py-1 text-sm text-ink-muted transition-colors hover:bg-white hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-white text-brand-green shadow-sm" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
