"use client";

import { FINISHES, MATERIALS } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { SwatchOption } from "@/components/ui/SwatchOption";
import { OptionGrid, Section } from "@/components/ui/Section";

export function StructureStep() {
  const config = useConfiguratorStore((state) => state.config);
  const setMaterial = useConfiguratorStore((state) => state.setMaterial);
  const setFinish = useConfiguratorStore((state) => state.setFinish);

  return (
    <>
      <Section
        title="Frame material"
        description="Priced per square metre of pavilion footprint."
      >
        <OptionGrid columns={4}>
          {MATERIALS.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              compact
              selected={config.structure.materialId === item.id}
              onSelect={setMaterial}
            />
          ))}
        </OptionGrid>
      </Section>

      <Section title="Frame finish">
        <div className="nv-scroll flex gap-3 overflow-x-auto pb-2" role="group">
          {FINISHES.map((item) => (
            <SwatchOption
              key={item.id}
              item={item}
              selected={config.structure.finishId === item.id}
              onSelect={setFinish}
            />
          ))}
        </div>
      </Section>

      <Callout tone="warning" title="Material properties are indicative" className="mt-6">
        Descriptions such as “lightweight” or “corrosion-resistant” are
        general characteristics, not verified engineering claims. Section sizes,
        spans, load capacities, coatings and fixings must all be specified and
        approved by a qualified engineer before manufacturing.
      </Callout>
    </>
  );
}
