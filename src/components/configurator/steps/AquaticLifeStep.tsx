"use client";

import { SPECIES, meta } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { estimateAquarium } from "@shared/aquarium/volume";
import { DISCLAIMERS } from "@/constants/brand";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";
import { formatLitres } from "@/lib/format";

/**
 * Aquatic life.
 *
 * This step only exists while the aquarium is enabled — see
 * `STEPS[…].isVisible` in constants/steps.ts. Species records carry demo
 * traits so the compatibility engine has something real to reason about.
 */
export function AquaticLifeStep() {
  const config = useConfiguratorStore((state) => state.config);
  const toggleSpecies = useConfiguratorStore((state) => state.toggleSpecies);
  const estimates = estimateAquarium(config.aquarium);

  return (
    <>
      <Callout tone="warning" title="Demo catalog" className="mb-6">
        {DISCLAIMERS.species}
      </Callout>

      <Section
        title="Species"
        description={
          estimates.hasDimensions
            ? `Your tank holds an estimated ${formatLitres(estimates.operatingVolumeL)} of water. Demo minimums are shown against each species.`
            : "Enter the tank dimensions on the previous step to see volume-based checks."
        }
      >
        <OptionGrid columns={3}>
          {SPECIES.map((item) => {
            const minVolume = meta<number>(item, "minVolumeL");
            const tooBig =
              estimates.hasDimensions &&
              minVolume !== undefined &&
              minVolume > estimates.operatingVolumeL;

            return (
              <OptionCard
                key={item.id}
                item={item}
                multi
                selected={config.aquarium.selectedSpeciesIds.includes(item.id)}
                onSelect={toggleSpecies}
                footer={
                  <>
                    {minVolume ? (
                      <Badge tone={tooBig ? "warning" : "neutral"}>
                        min {minVolume} L (demo)
                      </Badge>
                    ) : null}
                    {meta<string>(item, "temperament") === "territorial" ? (
                      <Badge tone="warning">territorial</Badge>
                    ) : null}
                    {meta<number>(item, "tempMinC") ? (
                      <Badge tone="water">
                        {meta<number>(item, "tempMinC")}–{meta<number>(item, "tempMaxC")} °C
                      </Badge>
                    ) : null}
                  </>
                }
              />
            );
          })}
        </OptionGrid>
      </Section>

      {config.aquarium.selectedSpeciesIds.length > 0 ? (
        <Callout tone="info" className="mt-6">
          Selected species appear in the 3D preview. Compatibility results are
          on the Design Validation step — they are architectural checks against
          demo data, not aquatics advice.
        </Callout>
      ) : null}
    </>
  );
}
