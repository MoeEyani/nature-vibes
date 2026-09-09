"use client";

import {
  STUDIO_COLOR_INDEX,
  getElementType,
  type AssemblyParamSpec,
  type AssemblyParams,
  type SizeRange,
} from "@shared/studio/catalog";
import { deriveParts, resolveParams } from "@shared/studio/assemblies";
import { estimateAquarium } from "@shared/aquarium/volume";
import type { StudioDesign, StudioElement } from "@shared/studio/schema";
import { useStudioStore } from "@/store/useStudioStore";
import { formatCurrency, formatKilograms, formatLitres } from "@/lib/format";
import { priceElementLines } from "@shared/studio/pricing";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Field, TextInput } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";

/**
 * Properties of the selected element.
 *
 * Every control writes through `patchElement`, which clamps to what the
 * element's type actually permits — so a hand-typed number can never put an
 * element outside its buildable range.
 */
export function StudioProperties() {
  const design = useStudioStore((state) => state.design);
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const selectedId = useStudioStore((state) => state.selectedId);
  const element = design.elements.find((entry) => entry.id === selectedId);

  if (!element) {
    return (
      <div className="p-4">
        <h2 className="eyebrow text-ink-muted">Properties</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Select an element on the canvas to edit its size, rotation, height and
          finish.
        </p>
        <ul className="mt-4 space-y-1.5 text-xs text-ink-subtle">
          <li>Drag an element to move it</li>
          <li>Shift-click to select more than one</li>
          <li>Arrow keys nudge · R rotates · D duplicates</li>
          <li>Ctrl/⌘ + A selects all · C copies · V pastes</li>
          <li>Delete removes · Escape deselects</li>
        </ul>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return <MultiSelectionProperties ids={selectedIds} design={design} />;
  }

  return <ElementProperties key={element.id} element={element} />;
}

/**
 * What can honestly be edited across a mixed selection.
 *
 * Not width, depth or height: each type has its own permitted range, so one
 * slider across a bench and a pendant would either mean nothing or quietly
 * clamp differently for each. Position, rotation, finish and the whole-set
 * operations do apply to everything, so those are what is offered.
 */
function MultiSelectionProperties({
  ids,
  design,
}: {
  ids: string[];
  design: StudioDesign;
}) {
  const rotateSelection = useStudioStore((state) => state.rotateSelection);
  const patchSelection = useStudioStore((state) => state.patchSelection);
  const duplicateSelection = useStudioStore((state) => state.duplicateSelection);
  const removeSelection = useStudioStore((state) => state.removeSelection);
  const copySelection = useStudioStore((state) => state.copySelection);
  const paste = useStudioStore((state) => state.paste);
  const select = useStudioStore((state) => state.select);

  const elements = design.elements.filter((entry) => ids.includes(entry.id));
  const lines = elements.flatMap(priceElementLines);
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const locked = elements.filter((entry) => entry.locked).length;

  // A finish can only be offered where every selected element accepts it.
  const sharedColorIds = elements.reduce<string[]>((shared, entry, index) => {
    const colorIds = getElementType(entry.typeId)?.colorIds ?? [];
    return index === 0 ? [...colorIds] : shared.filter((id) => colorIds.includes(id));
  }, []);

  const counts = new Map<string, number>();
  for (const entry of elements) {
    const name = getElementType(entry.typeId)?.name ?? entry.typeId;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return (
    <div>
      <div className="border-b border-line px-4 py-3">
        <h2 className="eyebrow text-ink-muted">Properties</h2>
        <p className="mt-1 font-medium text-ink">{elements.length} elements selected</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-subtle">
          {[...counts.entries()]
            .map(([name, count]) => (count > 1 ? `${name} × ${count}` : name))
            .join(" · ")}
          {locked > 0 ? ` · ${locked} locked and left alone` : null}
        </p>
      </div>

      <div className="space-y-5 p-4">
        <section>
          <h3 className="eyebrow mb-2 text-ink-subtle">Rotation</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => rotateSelection(-45)}>
              −45°
            </Button>
            <span className="min-w-14 text-center text-xs text-ink-subtle">each</span>
            <Button size="sm" variant="secondary" onClick={() => rotateSelection(45)}>
              +45°
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            Each element turns on its own centre, so the arrangement stays put.
          </p>
        </section>

        {sharedColorIds.length > 1 ? (
          <section>
            <h3 className="eyebrow mb-2 text-ink-subtle">Finish</h3>
            <div className="flex flex-wrap gap-2">
              {sharedColorIds.map((colorId) => {
                const color = STUDIO_COLOR_INDEX[colorId];
                if (!color) return null;
                return (
                  <button
                    key={colorId}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    onClick={() => patchSelection({ colorId })}
                    className="size-9 rounded-lg border-2 border-line transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-subtle">
              Only finishes every selected element offers are shown.
            </p>
          </section>
        ) : (
          <p className="text-xs text-ink-subtle">
            These elements share no finish, so there is nothing to apply to all
            of them at once.
          </p>
        )}

        {lines.length > 0 ? (
          <div className="rounded-card border border-line bg-sand/30 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-muted">This selection</span>
              <span className="font-medium tabular-nums text-ink">
                {formatCurrency(total)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              {lines.length} line {lines.length === 1 ? "item" : "items"} ·
              placeholder prices
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button size="sm" variant="secondary" onClick={() => duplicateSelection()}>
            Duplicate
          </Button>
          <Button size="sm" variant="secondary" onClick={() => copySelection()}>
            Copy
          </Button>
          <Button size="sm" variant="secondary" onClick={() => paste()}>
            Paste
          </Button>
          <Button size="sm" variant="secondary" onClick={() => select(null)}>
            Deselect
          </Button>
          <Button size="sm" variant="danger" onClick={() => removeSelection()}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function ElementProperties({ element }: { element: StudioElement }) {
  const patchElement = useStudioStore((state) => state.patchElement);
  const duplicate = useStudioStore((state) => state.duplicate);
  const remove = useStudioStore((state) => state.remove);
  const rotate = useStudioStore((state) => state.rotate);
  const explode = useStudioStore((state) => state.explode);
  const copySelection = useStudioStore((state) => state.copySelection);

  const type = getElementType(element.typeId);
  if (!type) return null;

  const assembly = type.assembly;
  const lines = priceElementLines(element);
  const elementTotal = lines.reduce((total, entry) => total + entry.subtotal, 0);
  const partCount = assembly ? deriveParts(element).length : 0;
  const isTank = element.typeId === "EL-AQUARIUM";
  const estimates = isTank
    ? estimateAquarium({
        enabled: true,
        shapeId: "AQSHAPE-RECT",
        lengthMm: element.widthMm,
        widthMm: element.depthMm,
        heightMm: element.heightMm,
        selectedSpeciesIds: [],
      })
    : null;

  return (
    <div>
      <div className="border-b border-line px-4 py-3">
        <h2 className="eyebrow text-ink-muted">Properties</h2>
        <p className="mt-1 font-medium text-ink">{type.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-subtle">
          {type.description}
        </p>
      </div>

      <div className="space-y-5 p-4">
        <Field label="Name" hint="Optional. Helps when the design gets busy.">
          <TextInput
            value={element.label ?? ""}
            placeholder={type.name}
            maxLength={60}
            onChange={(event) =>
              patchElement(element.id, { label: event.target.value || undefined })
            }
          />
        </Field>

        {assembly ? (
          <AssemblySection
            spec={assembly.params}
            params={resolveParams(element)}
            onChange={(params) => patchElement(element.id, { params })}
            widthMm={element.widthMm}
            depthMm={element.depthMm}
            heightMm={element.heightMm}
            partCount={partCount}
          />
        ) : (
        <section>
          <h3 className="eyebrow mb-2 text-ink-subtle">Size</h3>
          <div className="space-y-3">
            <SizeControl
              label="Width"
              value={element.widthMm}
              range={type.resize.width}
              onChange={(widthMm) => patchElement(element.id, { widthMm })}
            />
            <SizeControl
              label="Depth"
              value={element.depthMm}
              range={type.resize.depth}
              onChange={(depthMm) => patchElement(element.id, { depthMm })}
            />
            <SizeControl
              label="Height"
              value={element.heightMm}
              range={type.resize.height}
              onChange={(heightMm) => patchElement(element.id, { heightMm })}
            />
            {type.elevation ? (
              <SizeControl
                label="Height above floor"
                value={element.elevationMm}
                range={type.elevation}
                onChange={(elevationMm) => patchElement(element.id, { elevationMm })}
              />
            ) : null}
          </div>
        </section>
        )}

        <section>
          <h3 className="eyebrow mb-2 text-ink-subtle">Rotation</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => rotate(element.id, -45)}>
              −45°
            </Button>
            <span className="min-w-14 text-center font-mono text-sm tabular-nums text-ink">
              {Math.round(element.rotationDeg)}°
            </span>
            <Button size="sm" variant="secondary" onClick={() => rotate(element.id, 45)}>
              +45°
            </Button>
          </div>
          <input
            type="range"
            aria-label="Rotation"
            min={0}
            max={355}
            step={5}
            value={element.rotationDeg}
            onChange={(event) =>
              patchElement(element.id, { rotationDeg: Number(event.target.value) })
            }
            className="mt-3 w-full accent-[var(--color-brand-green)]"
          />
        </section>

        <section>
          <h3 className="eyebrow mb-2 text-ink-subtle">Position</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X (mm)">
              <TextInput
                type="number"
                step={100}
                value={element.x}
                onChange={(event) =>
                  patchElement(element.id, { x: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Z (mm)">
              <TextInput
                type="number"
                step={100}
                value={element.z}
                onChange={(event) =>
                  patchElement(element.id, { z: Number(event.target.value) })
                }
              />
            </Field>
          </div>
        </section>

        {type.colorIds.length > 1 ? (
          <section>
            <h3 className="eyebrow mb-2 text-ink-subtle">Finish</h3>
            <div className="flex flex-wrap gap-2">
              {type.colorIds.map((colorId) => {
                const color = STUDIO_COLOR_INDEX[colorId];
                if (!color) return null;
                const selected = element.colorId === colorId;
                return (
                  <button
                    key={colorId}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    aria-pressed={selected}
                    onClick={() => patchElement(element.id, { colorId })}
                    className={cn(
                      "size-9 rounded-lg border-2 transition-transform",
                      selected
                        ? "border-brand-green scale-105"
                        : "border-line hover:scale-105",
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {estimates?.hasDimensions ? (
          <Callout tone="review" title="Estimated tank figures">
            <dl className="space-y-1">
              <div className="flex justify-between gap-3">
                <dt>Operating volume</dt>
                <dd className="font-medium text-ink">
                  {formatLitres(estimates.operatingVolumeL)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Filled mass</dt>
                <dd className="font-medium text-ink">
                  {formatKilograms(estimates.estimatedFilledMassKg)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs">
              Geometric estimates only. Glass thickness, stand design and floor
              capacity need qualified verification.
            </p>
          </Callout>
        ) : null}

        {lines.length > 0 ? (
          <div className="rounded-card border border-line bg-sand/30 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-muted">
                {assembly ? "This group" : "This element"}
              </span>
              <span className="font-medium tabular-nums text-ink">
                {formatCurrency(elementTotal)}
              </span>
            </div>
            {assembly ? (
              <ul className="mt-2 space-y-0.5 text-xs text-ink-subtle">
                {lines.map((entry) => (
                  <li key={entry.itemId} className="flex justify-between gap-3">
                    <span>
                      {entry.description} · {entry.quantity} {entry.unit}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(entry.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-ink-subtle">
                {lines[0].quantity} {lines[0].unit} ×{" "}
                {formatCurrency(lines[0].unitPrice)} · placeholder price
              </p>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button size="sm" variant="secondary" onClick={() => duplicate(element.id)}>
            Duplicate
          </Button>
          <Button size="sm" variant="secondary" onClick={() => copySelection()}>
            Copy
          </Button>
          {assembly ? (
            <Button
              size="sm"
              variant="secondary"
              title="Break the group into separate elements. This cannot be re-grouped."
              onClick={() => explode(element.id)}
            >
              Ungroup
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => patchElement(element.id, { locked: !element.locked })}
          >
            {element.locked ? "Unlock" : "Lock"}
          </Button>
          <Button size="sm" variant="danger" onClick={() => remove(element.id)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A slider plus a number box, kept inside the type's permitted range. */
function SizeControl({
  label,
  value,
  range,
  onChange,
  unit = "mm",
}: {
  label: string;
  value: number;
  range: SizeRange | undefined;
  onChange: (value: number) => void;
  /** Suffix beside the number box. Empty for plain counts. */
  unit?: string;
}) {
  if (!range) {
    return (
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="tabular-nums text-ink-subtle">
          {(value / 1000).toFixed(2)} m · fixed
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm text-ink-muted">{label}</label>
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            aria-label={label}
            value={value}
            min={range.minMm}
            max={range.maxMm}
            step={range.stepMm}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-20 rounded border border-line bg-white px-1.5 py-0.5 text-right text-sm tabular-nums text-ink focus:border-brand-green focus:outline-none"
          />
          {unit ? <span className="text-xs text-ink-subtle">{unit}</span> : null}
        </div>
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={range.minMm}
        max={range.maxMm}
        step={range.stepMm}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-[var(--color-brand-green)]"
      />
    </div>
  );
}

/**
 * Parameter controls for an assembly.
 *
 * Rendered generically from the type's `AssemblyParamSpec[]`, so a new
 * assembly needs a catalog entry and a deriver — never a new panel. The
 * footprint is shown as a result, not a control: it follows from the
 * parameters, and offering a width box here would let the two disagree.
 */
function AssemblySection({
  spec,
  params,
  onChange,
  widthMm,
  depthMm,
  heightMm,
  partCount,
}: {
  spec: AssemblyParamSpec[];
  params: AssemblyParams;
  onChange: (params: AssemblyParams) => void;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  partCount: number;
}) {
  return (
    <section>
      <h3 className="eyebrow mb-2 text-ink-subtle">Group</h3>
      <div className="space-y-3">
        {spec
          .filter(
            // A control that cannot affect anything is worse than one that is
            // not there: a hanging height means nothing to a floor lantern.
            (param) =>
              !param.showWhen ||
              String(params[param.showWhen.key]) === param.showWhen.equals,
          )
          .map((param) =>
          param.kind === "choice" ? (
            <div key={param.key}>
              <label
                htmlFor={`asm-${param.key}`}
                className="text-sm text-ink-muted"
              >
                {param.label}
              </label>
              <select
                id={`asm-${param.key}`}
                value={String(params[param.key] ?? param.options[0].value)}
                onChange={(event) =>
                  onChange({ ...params, [param.key]: event.target.value })
                }
                className="mt-1 w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-brand-green focus:outline-none"
              >
                {param.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <SizeControl
              key={param.key}
              label={param.label}
              unit={param.unit === "count" ? "" : "mm"}
              value={Number(params[param.key] ?? param.minMm)}
              range={{
                minMm: param.minMm,
                maxMm: param.maxMm,
                stepMm: param.stepMm,
              }}
              onChange={(value) => onChange({ ...params, [param.key]: value })}
            />
          ),
        )}
      </div>

      <p className="mt-3 rounded-card border border-line bg-sand/30 px-3 py-2 text-xs text-ink-subtle">
        Footprint {(widthMm / 1000).toFixed(2)} × {(depthMm / 1000).toFixed(2)} m ·
        height {(heightMm / 1000).toFixed(2)} m · {partCount}{" "}
        {partCount === 1 ? "part" : "parts"}. All derived from the settings
        above.
      </p>
    </section>
  );
}
