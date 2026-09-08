"use client";

import { ADDONS, meta } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { isRequirementMet, requirementLabel } from "@shared/configuration/derive";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";

/** Groups come from the catalog, so a new group is a seed-data change. */
const GROUP_ORDER = ["Lighting", "Comfort", "Planting & Water", "Utility"];

export function AddonsStep() {
  const config = useConfiguratorStore((state) => state.config);
  const toggleAddon = useConfiguratorStore((state) => state.toggleAddon);

  const visible = ADDONS.filter(
    (addon) =>
      config.aquarium.enabled || !addon.requires?.includes("AQUARIUM"),
  );

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((addon) => meta<string>(addon, "group") === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <>
      {groups.map(({ group, items }) => (
        <Section key={group} title={group}>
          <OptionGrid columns={3}>
            {items.map((item) => (
              <OptionCard
                key={item.id}
                item={item}
                multi
                selected={config.addons.includes(item.id)}
                onSelect={toggleAddon}
                footer={
                  item.requires?.length ? (
                    <Badge
                      tone={
                        item.requires.every((id) => isRequirementMet(config, id))
                          ? "ok"
                          : "warning"
                      }
                    >
                      needs {item.requires.map(requirementLabel).join(", ")}
                    </Badge>
                  ) : null
                }
              />
            ))}
          </OptionGrid>
        </Section>
      ))}

      <Callout tone="review" title="Electrical and water work" className="mt-6">
        Any option that needs mains power or a water connection must be
        installed by a qualified trade. Circuit protection, IP ratings, RCD
        provision and separation from water are outside the scope of this
        configurator and are flagged for review.
      </Callout>
    </>
  );
}
