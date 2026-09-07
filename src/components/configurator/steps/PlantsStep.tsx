"use client";

import { PLANTERS, PLANTS, getItem, meta } from "@/data/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { isRequirementMet, requirementLabel } from "@/domain/configuration/derive";
import { DISCLAIMERS } from "@/constants/brand";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";

const HABIT_LABEL: Record<string, string> = {
  climbing: "Climbing",
  hanging: "Hanging",
  planter: "Planter",
  aquatic: "Aquatic",
};

export function PlantsStep() {
  const config = useConfiguratorStore((state) => state.config);
  const togglePlanter = useConfiguratorStore((state) => state.togglePlanter);
  const togglePlant = useConfiguratorStore((state) => state.togglePlant);
  const resolveRequirement = useConfiguratorStore((state) => state.resolveRequirement);

  // Planting whose declared dependency is not satisfied yet.
  const unmet = config.plants.plantIds
    .map(getItem)
    .filter(Boolean)
    .flatMap((plant) =>
      (plant!.requires ?? [])
        .filter((requirementId) => !isRequirementMet(config, requirementId))
        .map((requirementId) => ({ plant: plant!, requirementId })),
    );

  // The aquatic tray and aquatic planting only make sense with a tank.
  const planters = PLANTERS.filter(
    (planter) => config.aquarium.enabled || !planter.requires?.includes("AQUARIUM"),
  );
  const plants = PLANTS.filter(
    (plant) => config.aquarium.enabled || !plant.requires?.includes("AQUARIUM"),
  );

  return (
    <>
      <Section
        title="Planter modules"
        description="Structure first: planters are what the planting grows in, and the trellis is what climbers climb."
      >
        <OptionGrid columns={3}>
          {planters.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              multi
              selected={config.plants.planterIds.includes(item.id)}
              onSelect={togglePlanter}
              footer={
                meta<number>(item, "unitsPerPavilion") ? (
                  <Badge tone="neutral">
                    {meta<number>(item, "unitsPerPavilion")} units per pavilion
                  </Badge>
                ) : null
              }
            />
          ))}
        </OptionGrid>
      </Section>

      <Section title="Planting">
        <OptionGrid columns={3}>
          {plants.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              multi
              selected={config.plants.plantIds.includes(item.id)}
              onSelect={togglePlant}
              footer={
                <>
                  {meta<string>(item, "habit") ? (
                    <Badge tone="brand">
                      {HABIT_LABEL[meta<string>(item, "habit")!] ?? "Plant"}
                    </Badge>
                  ) : null}
                  {item.requires?.length ? (
                    <Badge
                      tone={
                        item.requires.every((id) => isRequirementMet(config, id))
                          ? "ok"
                          : "warning"
                      }
                    >
                      needs {item.requires.map(requirementLabel).join(", ")}
                    </Badge>
                  ) : null}
                </>
              }
            />
          ))}
        </OptionGrid>
      </Section>

      {unmet.length > 0 ? (
        <Callout tone="warning" title="Missing support" className="mt-6">
          <ul className="space-y-2">
            {unmet.map(({ plant, requirementId }) => (
              <li key={`${plant.id}-${requirementId}`} className="flex flex-wrap items-center gap-2">
                <span>
                  <span className="font-medium text-ink">{plant.name}</span> needs{" "}
                  {requirementLabel(requirementId)}.
                </span>
                <button
                  type="button"
                  onClick={() => resolveRequirement(requirementId)}
                  className="rounded-pill bg-brand-green px-3 py-1 text-xs font-medium text-cream transition-colors hover:bg-deep-green"
                >
                  Add {requirementLabel(requirementId)}
                </button>
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <Callout tone="warning" title="Demo plant catalog" className="mt-4">
        {DISCLAIMERS.plants}
      </Callout>
    </>
  );
}
