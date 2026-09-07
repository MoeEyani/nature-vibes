"use client";

import Link from "next/link";
import { getItem, itemName } from "@/data/catalog";
import type { DesignConfiguration } from "@/domain/configuration/schema";
import { derive } from "@/domain/configuration/derive";
import { formatFootprint, formatKilograms, formatLitres, formatMetres } from "@/lib/format";

type Row = { label: string; value: string; step?: string };

/** Complete, human-readable summary of a configuration. */
export function ConfigurationSummary({
  config,
  linkSteps = true,
}: {
  config: DesignConfiguration;
  linkSteps?: boolean;
}) {
  const derived = derive(config);

  const rows: Row[] = [
    { label: "Location", value: itemName(config.environment), step: "location" },
    {
      label: "Space",
      value:
        config.space.lengthMm || config.space.widthMm
          ? `${formatMetres(config.space.lengthMm)} × ${formatMetres(
              config.space.widthMm,
            )}${config.space.people ? ` · ${config.space.people} people` : ""}`
          : "Not specified",
      step: "space",
    },
    {
      label: "Pavilion",
      value: `${itemName(config.pavilion.familyId)} · ${itemName(config.pavilion.shapeId)}`,
      step: "pavilion",
    },
    {
      label: "Dimensions",
      value: `${formatFootprint(
        config.pavilion.widthMm,
        config.pavilion.lengthMm,
      )} × ${formatMetres(config.pavilion.heightMm, 2)} h · ${derived.footprintM2.toFixed(1)} m²`,
      step: "pavilion",
    },
    {
      label: "Structure",
      value: `${itemName(config.structure.materialId)} (${itemName(
        config.structure.finishId,
      )})`,
      step: "structure",
    },
    { label: "Roof", value: itemName(config.roof.roofId), step: "roof" },
    {
      label: "Seating",
      value: config.seating.enabled
        ? `${itemName(config.seating.layoutId)} · ${itemName(config.seating.styleId)}${
            config.seating.fabricId ? ` · ${itemName(config.seating.fabricId)}` : ""
          } · ≈ ${derived.estimatedSeats} seats`
        : "No seating",
      step: "seating",
    },
    {
      label: "Aquarium",
      value: config.aquarium.enabled
        ? `${itemName(config.aquarium.positionId)} · ${itemName(
            config.aquarium.shapeId,
          )} · ≈ ${formatLitres(derived.aquarium.operatingVolumeL)} (est.) · ≈ ${formatKilograms(
            derived.aquarium.estimatedFilledMassKg,
          )} filled (est.)`
        : "None",
      step: "aquarium",
    },
  ];

  if (config.aquarium.enabled) {
    rows.push({
      label: "Aquatic life",
      value:
        config.aquarium.selectedSpeciesIds.length > 0
          ? config.aquarium.selectedSpeciesIds.map((id) => itemName(id)).join(", ")
          : "None selected",
      step: "aquatic-life",
    });
  }

  rows.push(
    {
      label: "Planters",
      value:
        config.plants.planterIds.length > 0
          ? config.plants.planterIds.map((id) => itemName(id)).join(", ")
          : "None",
      step: "plants",
    },
    {
      label: "Plants",
      value:
        config.plants.plantIds.length > 0
          ? config.plants.plantIds.map((id) => itemName(id)).join(", ")
          : "None",
      step: "plants",
    },
    {
      label: "Add-ons",
      value:
        config.addons.length > 0
          ? config.addons.map((id) => itemName(id)).join(", ")
          : "None",
      step: "addons",
    },
  );

  return (
    <dl className="divide-y divide-line rounded-card border border-line bg-white">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 text-sm"
        >
          <dt className="w-28 shrink-0 text-ink-subtle">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-ink">{row.value}</dd>
          {linkSteps && row.step ? (
            <Link
              href={`/design/${row.step}`}
              className="shrink-0 text-xs font-medium text-brand-green underline-offset-2 hover:underline"
            >
              Change
            </Link>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Compact list of the SKUs behind a configuration — the seed of a future BOM. */
export function SkuList({ config }: { config: DesignConfiguration }) {
  const ids = [
    config.pavilion.familyId,
    config.pavilion.sizePresetId,
    config.structure.materialId,
    config.structure.finishId,
    config.roof.roofId,
    ...(config.seating.enabled ? [config.seating.layoutId, config.seating.styleId] : []),
    ...(config.aquarium.enabled
      ? [config.aquarium.positionId, config.aquarium.shapeId]
      : []),
    ...config.plants.planterIds,
    ...config.plants.plantIds,
    ...config.addons,
  ].filter((id): id is string => Boolean(id));

  const items = ids.map(getItem).filter(Boolean);

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <li
          key={`${item!.id}-${index}`}
          className="rounded-pill bg-sand/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted"
          title={item!.name}
        >
          {item!.sku ?? item!.id}
        </li>
      ))}
    </ul>
  );
}
