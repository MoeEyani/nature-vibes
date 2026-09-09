"use client";

import {
  STUDIO_COLOR_INDEX,
  getElementType,
  type SizeRange,
} from "@shared/studio/catalog";
import { estimateAquarium } from "@shared/aquarium/volume";
import type { StudioElement } from "@shared/studio/schema";
import { useStudioStore } from "@/store/useStudioStore";
import { formatCurrency, formatKilograms, formatLitres } from "@/lib/format";
import { priceElement } from "@shared/studio/pricing";
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
          <li>Arrow keys nudge · R rotates · D duplicates</li>
          <li>Delete removes · Escape deselects</li>
        </ul>
      </div>
    );
  }

  return <ElementProperties key={element.id} element={element} />;
}

function ElementProperties({ element }: { element: StudioElement }) {
  const patchElement = useStudioStore((state) => state.patchElement);
  const duplicate = useStudioStore((state) => state.duplicate);
  const remove = useStudioStore((state) => state.remove);
  const rotate = useStudioStore((state) => state.rotate);

  const type = getElementType(element.typeId);
  if (!type) return null;

  const line = priceElement(element);
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

        {line ? (
          <div className="rounded-card border border-line bg-sand/30 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink-muted">This element</span>
              <span className="font-medium tabular-nums text-ink">
                {formatCurrency(line.subtotal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              {line.quantity} {line.unit} × {formatCurrency(line.unitPrice)} ·
              placeholder price
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button size="sm" variant="secondary" onClick={() => duplicate(element.id)}>
            Duplicate
          </Button>
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
}: {
  label: string;
  value: number;
  range: SizeRange | undefined;
  onChange: (value: number) => void;
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
          <span className="text-xs text-ink-subtle">mm</span>
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
