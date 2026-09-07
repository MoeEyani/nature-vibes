"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { itemName } from "@/data/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { formatCurrency, formatDate, formatFootprint } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SeverityBadge } from "./ValidationList";

export function SavedDesignsList() {
  const router = useRouter();
  const hydrate = useConfiguratorStore((state) => state.hydrate);
  const hydrated = useConfiguratorStore((state) => state.hydrated);
  const savedDesigns = useConfiguratorStore((state) => state.savedDesigns);
  const loadDesign = useConfiguratorStore((state) => state.loadDesign);
  const deleteDesign = useConfiguratorStore((state) => state.deleteDesign);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <p className="text-sm text-ink-subtle">Loading saved designs…</p>;
  }

  if (savedDesigns.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-8 text-center">
        <p className="text-ink-muted">You have not saved a design yet.</p>
        <ButtonLink href="/design/location" className="mt-4">
          Start designing
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {savedDesigns.map((design) => (
        <li
          key={design.reference}
          className="flex flex-col rounded-card border border-line bg-white p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-medium text-ink">{design.name}</h2>
              <p className="mt-0.5 font-mono text-xs text-ink-subtle">
                {design.reference}
              </p>
            </div>
            <SeverityBadge severity={design.validationStatus} />
          </div>

          {design.description ? (
            <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
              {design.description}
            </p>
          ) : null}

          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Location" value={itemName(design.configuration.environment)} />
            <Row
              label="Footprint"
              value={formatFootprint(
                design.configuration.pavilion.widthMm,
                design.configuration.pavilion.lengthMm,
              )}
            />
            <Row label="Roof" value={itemName(design.configuration.roof.roofId)} />
            <Row
              label="Aquarium"
              value={design.configuration.aquarium.enabled ? "Yes" : "No"}
            />
            <Row
              label="Estimated"
              value={`${formatCurrency(design.estimatedTotal)} (placeholder)`}
            />
            <Row label="Saved" value={formatDate(design.savedAt)} />
          </dl>

          <div className="mt-5 flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                if (loadDesign(design.reference)) router.push("/design/review");
              }}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => deleteDesign(design.reference)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
