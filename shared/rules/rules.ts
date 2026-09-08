import { getItem, meta } from "../catalog/index.ts";
import type { CatalogItem } from "../types/catalog.ts";
import type {
  DesignConfiguration,
  ValidationMessage,
} from "../configuration/schema.ts";
import {
  isRequirementMet,
  requirementLabel,
  selectedItemIds,
  selectedItems,
  type DerivedConfiguration,
} from "../configuration/derive.ts";
import type { Rule } from "./types.ts";

/**
 * V1 rule set.
 *
 * Every rule is data-driven where possible: `requires` / `incompatibleWith`
 * on catalog records generate messages automatically, so most new product
 * constraints are a seed-data change rather than a code change.
 *
 * Safety-critical structural, electrical, water, rooftop and aquarium
 * conclusions are always `review_required` — the engine never issues an
 * engineering approval.
 */

/** Filled mass above which a rooftop or raised installation needs review. Assumption. */
export const AQUARIUM_MASS_REVIEW_THRESHOLD_KG = 150;

/** Litres above which a demo tank is flagged as needing verified support. Assumption. */
export const AQUARIUM_VOLUME_REVIEW_THRESHOLD_L = 400;

function message(
  partial: Omit<ValidationMessage, "affectedIds"> &
    Partial<Pick<ValidationMessage, "affectedIds">>,
): ValidationMessage {
  return { affectedIds: [], ...partial };
}

/* ------------------------------------------------------------------ *
 * Catalog-driven rules
 * ------------------------------------------------------------------ */

/**
 * REQ — an item declares `requires` and the requirement is not satisfied.
 * Climbing plant → trellis is expressed this way in the seed data.
 */
const requirementsRule: Rule = {
  id: "REQ",
  name: "Item requirements",
  evaluate(config) {
    const messages: ValidationMessage[] = [];
    for (const item of selectedItems(config)) {
      for (const requirementId of item.requires ?? []) {
        if (isRequirementMet(config, requirementId)) continue;
        messages.push(
          message({
            code: `REQ_${item.id}_${requirementId}`,
            severity: "warning",
            title: `${item.name} needs ${requirementLabel(requirementId)}`,
            message: `${item.name} depends on ${requirementLabel(
              requirementId,
            )}. Add it, or remove ${item.name}, before requesting a quote.`,
            affectedIds: [item.id, requirementId],
            step: stepForItem(item),
          }),
        );
      }
    }
    return messages;
  },
};

/** INCOMPAT — two selected items declare each other incompatible. */
const incompatibilityRule: Rule = {
  id: "INCOMPAT",
  name: "Item incompatibility",
  evaluate(config) {
    const messages: ValidationMessage[] = [];
    const selected = selectedItemIds(config);
    const seen = new Set<string>();

    for (const item of selectedItems(config)) {
      for (const otherId of item.incompatibleWith ?? []) {
        if (!selected.includes(otherId)) continue;
        // Only report each pair once, in a stable order.
        const key = [item.id, otherId].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);

        const other = getItem(otherId);
        messages.push(
          message({
            code: `INCOMPAT_${key.replace("|", "_")}`,
            severity: "incompatible",
            title: `${item.name} cannot be combined with ${other?.name ?? otherId}`,
            message: `${item.name} and ${
              other?.name ?? otherId
            } cannot be built together. Change one of them to continue.`,
            affectedIds: [item.id, otherId],
            step: stepForItem(item),
          }),
        );
      }
    }
    return messages;
  },
};

/** UNAVAILABLE — a non-active item somehow ended up in the configuration. */
const availabilityRule: Rule = {
  id: "UNAVAILABLE",
  name: "Option availability",
  evaluate(config) {
    return selectedItems(config)
      .filter((item) => item.status !== "active")
      .map((item) =>
        message({
          code: `UNAVAILABLE_${item.id}`,
          severity: "incompatible",
          title: `${item.name} is not available yet`,
          message:
            item.unavailableReason ??
            `${item.name} is not part of the current product scope. Choose an available option instead.`,
          affectedIds: [item.id],
          step: stepForItem(item),
        }),
      );
  },
};

/* ------------------------------------------------------------------ *
 * Completeness rules
 * ------------------------------------------------------------------ */

/** DIM — the review step cannot be completed without the core dimensions. */
const requiredDimensionsRule: Rule = {
  id: "DIM",
  name: "Required dimensions",
  evaluate(config) {
    const messages: ValidationMessage[] = [];
    const { widthMm, lengthMm, heightMm } = config.pavilion;

    if (!widthMm || !lengthMm || !heightMm) {
      messages.push(
        message({
          code: "DIM_PAVILION_MISSING",
          severity: "incompatible",
          title: "Pavilion dimensions are missing",
          message:
            "Choose a size preset so the pavilion has a width, length and height.",
          affectedIds: ["pavilion"],
          step: "pavilion",
        }),
      );
    }

    if (config.aquarium.enabled) {
      const { lengthMm: aqL, widthMm: aqW, heightMm: aqH } = config.aquarium;
      if (!aqL || !aqW || !aqH) {
        messages.push(
          message({
            code: "DIM_AQUARIUM_MISSING",
            severity: "incompatible",
            title: "Aquarium dimensions are missing",
            message:
              "Enter the tank length, width and height so the water volume can be estimated.",
            affectedIds: ["aquarium"],
            step: "aquarium",
          }),
        );
      }
      if (!config.aquarium.positionId) {
        messages.push(
          message({
            code: "DIM_AQUARIUM_POSITION",
            severity: "incompatible",
            title: "Aquarium position not selected",
            message: "Choose where the aquarium sits within the pavilion.",
            affectedIds: ["aquarium"],
            step: "aquarium",
          }),
        );
      }
    }

    if (config.seating.enabled && !config.seating.layoutId) {
      messages.push(
        message({
          code: "DIM_SEATING_LAYOUT",
          severity: "incompatible",
          title: "Seating layout not selected",
          message: "Choose a seating layout, or turn seating off.",
          affectedIds: ["seating"],
          step: "seating",
        }),
      );
    }

    return messages;
  },
};

/** SPACE — the configured pavilion does not fit the space the customer gave us. */
const spaceFitRule: Rule = {
  id: "SPACE",
  name: "Space fit",
  evaluate(config, derived) {
    const messages: ValidationMessage[] = [];
    const { clearance } = derived;

    const axes: { key: keyof typeof clearance; label: string }[] = [
      { key: "widthM", label: "width" },
      { key: "lengthM", label: "length" },
      { key: "heightM", label: "height" },
    ];

    for (const axis of axes) {
      const value = clearance[axis.key];
      if (value === undefined) continue;
      if (value < 0) {
        messages.push(
          message({
            code: `SPACE_TOO_SMALL_${axis.label.toUpperCase()}`,
            severity: "incompatible",
            title: `Pavilion is wider than the available ${axis.label}`,
            message: `The selected size exceeds the available ${axis.label} by ${Math.abs(
              value,
            ).toFixed(2)} m. Choose a smaller size preset or re-measure the space.`,
            affectedIds: ["space", "pavilion"],
            step: "pavilion",
          }),
        );
      } else if (value < 0.3) {
        messages.push(
          message({
            code: `SPACE_TIGHT_${axis.label.toUpperCase()}`,
            severity: "warning",
            title: `Very little clearance on ${axis.label}`,
            message: `Only ${value.toFixed(
              2,
            )} m of clearance remains on ${axis.label}. Access for delivery, assembly and maintenance should be checked on site.`,
            affectedIds: ["space", "pavilion"],
            step: "space",
          }),
        );
      }
    }

    if (
      config.space.people !== undefined &&
      config.seating.enabled &&
      derived.estimatedSeats > 0 &&
      derived.estimatedSeats < config.space.people
    ) {
      messages.push(
        message({
          code: "SPACE_SEAT_COUNT",
          severity: "warning",
          title: "Fewer seats than people",
          message: `The selected layout gives roughly ${derived.estimatedSeats} seats for ${config.space.people} people. Consider a larger footprint or a fuller seating layout.`,
          affectedIds: ["seating", "space"],
          step: "seating",
        }),
      );
    }

    return messages;
  },
};

/* ------------------------------------------------------------------ *
 * Safety / engineering rules — always review_required, never approval
 * ------------------------------------------------------------------ */

/** ROOFTOP_AQUARIUM — the headline safety rule from the brief. */
const rooftopAquariumRule: Rule = {
  id: "ROOFTOP_AQUARIUM",
  name: "Rooftop aquarium load",
  evaluate(config, derived) {
    if (config.environment !== "ENV-ROOFTOP" || !config.aquarium.enabled) return [];

    const mass = derived.aquarium.estimatedFilledMassKg;
    const massNote = derived.aquarium.hasDimensions
      ? ` The current tank is an estimated ${Math.round(mass)} kg when filled, before the pavilion's own weight.`
      : "";

    return [
      message({
        code: "ROOFTOP_AQUARIUM_REVIEW",
        severity: "review_required",
        title: "Engineering review required",
        message: `Aquarium installations on rooftops require verified structural capacity, waterproofing and anchoring before they can be approved.${massNote}`,
        affectedIds: ["ENV-ROOFTOP", config.aquarium.positionId ?? "aquarium"],
        step: "aquarium",
      }),
    ];
  },
};

/** ROOFTOP_WIND — exposed installations need anchoring and wind verification. */
const rooftopStructureRule: Rule = {
  id: "ROOFTOP_WIND",
  name: "Rooftop wind and anchoring",
  evaluate(config) {
    if (config.environment !== "ENV-ROOFTOP") return [];

    const hasScreens = config.addons.includes("ADD-PRIVACY");
    return [
      message({
        code: "ROOFTOP_ANCHORING_REVIEW",
        severity: "review_required",
        title: "Rooftop anchoring needs verification",
        message: hasScreens
          ? "Rooftop installations need verified anchoring and wind loading. Privacy screens increase the wind area and must be included in that check."
          : "Rooftop installations need verified anchoring and wind loading before manufacturing.",
        affectedIds: hasScreens ? ["ENV-ROOFTOP", "ADD-PRIVACY"] : ["ENV-ROOFTOP"],
        step: "location",
      }),
    ];
  },
};

/** AQ_LOAD — a large tank needs verified support in any environment. */
const aquariumLoadRule: Rule = {
  id: "AQ_LOAD",
  name: "Aquarium load",
  evaluate(config, derived) {
    if (!config.aquarium.enabled || !derived.aquarium.hasDimensions) return [];

    const messages: ValidationMessage[] = [];
    const { estimatedFilledMassKg, operatingVolumeL } = derived.aquarium;

    if (
      estimatedFilledMassKg > AQUARIUM_MASS_REVIEW_THRESHOLD_KG ||
      operatingVolumeL > AQUARIUM_VOLUME_REVIEW_THRESHOLD_L
    ) {
      messages.push(
        message({
          code: "AQ_LOAD_REVIEW",
          severity: "review_required",
          title: "Tank support needs engineering verification",
          message: `An estimated ${Math.round(
            estimatedFilledMassKg,
          )} kg filled mass exceeds the ${AQUARIUM_MASS_REVIEW_THRESHOLD_KG} kg placeholder threshold for a standard pavilion base. Glass thickness, stand design and floor capacity must be verified by a qualified engineer.`,
          affectedIds: ["aquarium"],
          step: "aquarium",
        }),
      );
    }

    // Water plus electricity is always a qualified-trade item.
    const electricalAddons = config.addons.filter((id) =>
      getItem(id)?.tags?.includes("electrical"),
    );
    if (electricalAddons.length > 0) {
      messages.push(
        message({
          code: "AQ_ELECTRICAL_REVIEW",
          severity: "review_required",
          title: "Electrical work near water needs a qualified installer",
          message:
            "The design combines an aquarium with electrical items. Circuit protection, IP rating and separation must be specified and signed off by a qualified electrician.",
          affectedIds: ["aquarium", ...electricalAddons],
          step: "addons",
        }),
      );
    }

    return messages;
  },
};

/** GEOMETRY — anything outside the supported V1 geometry is a bespoke project. */
const geometryRule: Rule = {
  id: "GEOMETRY",
  name: "Supported geometry",
  evaluate(config) {
    const shape = getItem(config.pavilion.shapeId);
    const size = getItem(config.pavilion.sizePresetId);
    const messages: ValidationMessage[] = [];

    const isSupportedShape = shape?.status === "active";
    const isSupportedSize = size?.status === "active";

    if (!isSupportedShape || !isSupportedSize) {
      messages.push(
        message({
          code: "GEOMETRY_CUSTOM_REVIEW",
          severity: "review_required",
          title: "Engineering review required",
          message:
            "Custom or unsupported geometry is designed per project. Frame sections, roof construction and anchoring have to be engineered before this design can be priced or built.",
          affectedIds: [config.pavilion.shapeId, config.pavilion.sizePresetId],
          step: "pavilion",
        }),
      );
    }

    // A size preset that does not belong to the chosen shape.
    if (
      size?.compatibleWith?.length &&
      !size.compatibleWith.includes(config.pavilion.shapeId)
    ) {
      messages.push(
        message({
          code: "GEOMETRY_SIZE_SHAPE_MISMATCH",
          severity: "incompatible",
          title: "Size does not match the selected shape",
          message: `${size.name} is not offered for the ${
            shape?.name ?? "selected"
          } shape. Choose a different size preset.`,
          affectedIds: [size.id, config.pavilion.shapeId],
          step: "pavilion",
        }),
      );
    }

    // A roof that does not list the chosen shape as compatible.
    const roof = getItem(config.roof.roofId);
    if (
      roof?.compatibleWith?.length &&
      !roof.compatibleWith.includes(config.pavilion.shapeId)
    ) {
      messages.push(
        message({
          code: "GEOMETRY_ROOF_SHAPE_MISMATCH",
          severity: "incompatible",
          title: "Roof does not fit the selected shape",
          message: `${roof.name} is not available for the ${
            shape?.name ?? "selected"
          } shape.`,
          affectedIds: [roof.id, config.pavilion.shapeId],
          step: "roof",
        }),
      );
    }

    return messages;
  },
};

/* ------------------------------------------------------------------ *
 * Product logic rules
 * ------------------------------------------------------------------ */

/** UTIL — options that need a power or water supply on site. */
const utilitiesRule: Rule = {
  id: "UTIL",
  name: "Services and utilities",
  evaluate(config) {
    const messages: ValidationMessage[] = [];
    const addons = config.addons.map(getItem).filter(Boolean) as CatalogItem[];

    const powered = addons.filter((addon) => meta<boolean>(addon, "requiresPower"));
    const hasPowerModule = config.addons.includes("ADD-POWER");
    if (powered.length > 0 && !hasPowerModule) {
      messages.push(
        message({
          code: "UTIL_POWER_SUPPLY",
          severity: "warning",
          title: "A power supply is needed",
          message: `${powered
            .map((addon) => addon.name)
            .join(", ")} need mains power. Add the Power & Sockets option, or confirm that a supply already exists at the installation point.`,
          affectedIds: powered.map((addon) => addon.id),
          step: "addons",
        }),
      );
    }

    const watered = addons.filter((addon) => meta<boolean>(addon, "requiresWater"));
    if (watered.length > 0 || config.aquarium.enabled) {
      const names = watered.map((addon) => addon.name);
      if (config.aquarium.enabled) names.push("the aquarium");
      messages.push(
        message({
          code: "UTIL_WATER_SUPPLY",
          severity: "warning",
          title: "A water supply and drainage point are needed",
          message: `${names.join(
            ", ",
          )} need a water supply and a way to drain. Availability at the installation point has to be confirmed on site.`,
          affectedIds: watered.map((addon) => addon.id),
          step: "addons",
        }),
      );
    }

    return messages;
  },
};

/** ROOF_FIT — add-ons that depend on what the roof actually does. */
const roofBehaviourRule: Rule = {
  id: "ROOF_FIT",
  name: "Roof behaviour",
  evaluate(config) {
    const messages: ValidationMessage[] = [];
    const roof = getItem(config.roof.roofId);
    if (!roof) return messages;

    const rainProtection = meta<boolean>(roof, "rainProtection") ?? true;

    if (!rainProtection && config.aquarium.enabled) {
      messages.push(
        message({
          code: "ROOF_OPEN_AQUARIUM",
          severity: "warning",
          title: "Open roof over an open tank",
          message: `${roof.name} does not shed rain or block direct sun. An uncovered tank collects debris and heats up, so a tank cover and shading plan should be included.`,
          affectedIds: [roof.id, "aquarium"],
          step: "roof",
        }),
      );
    }

    if (!rainProtection && config.seating.enabled) {
      const style = getItem(config.seating.styleId);
      if (meta<boolean>(style, "cushion")) {
        messages.push(
          message({
            code: "ROOF_OPEN_CUSHIONS",
            severity: "warning",
            title: "Cushions under an open roof",
            message: `${roof.name} gives partial cover only. Cushions will need weather-resistant fabric and somewhere to be stored.`,
            affectedIds: [roof.id, style!.id],
            step: "seating",
          }),
        );
      }
    }

    // Climbing plants want something to climb: the pergola is ideal.
    const hasClimbing = config.plants.plantIds.some(
      (id) => meta<string>(getItem(id), "habit") === "climbing",
    );
    if (hasClimbing && roof.id === "ROOF-FLAT") {
      messages.push(
        message({
          code: "ROOF_FLAT_CLIMBING",
          severity: "warning",
          title: "Climbing plants have nowhere to spread",
          message:
            "A flat roof gives climbing plants no overhead structure. A pergola or louvered roof gives a much better result.",
          affectedIds: [roof.id],
          step: "roof",
        }),
      );
    }

    return messages;
  },
};

/** PLANT_FIT — demo suitability checks for planting. */
const plantingRule: Rule = {
  id: "PLANT_FIT",
  name: "Planting suitability",
  evaluate(config) {
    const messages: ValidationMessage[] = [];
    const plants = config.plants.plantIds.map(getItem).filter(Boolean) as CatalogItem[];
    if (plants.length === 0) return messages;

    const roof = getItem(config.roof.roofId);
    const shadesFully = meta<boolean>(roof, "shadesFully") ?? false;
    const sunLovers = plants.filter(
      (plant) => meta<string>(plant, "light") === "sun",
    );

    if (config.environment === "ENV-INDOOR" && sunLovers.length > 0) {
      messages.push(
        message({
          code: "PLANT_INDOOR_LIGHT",
          severity: "warning",
          title: "Sun-loving plants indoors",
          message: `${sunLovers
            .map((plant) => plant.name)
            .join(", ")} normally need direct sun. Indoors they will need a bright position or supplementary grow lighting.`,
          affectedIds: sunLovers.map((plant) => plant.id),
          step: "plants",
        }),
      );
    } else if (shadesFully && sunLovers.length > 0) {
      messages.push(
        message({
          code: "PLANT_SHADE_UNDER_ROOF",
          severity: "warning",
          title: "Sun-loving plants under a solid roof",
          message: `${sunLovers
            .map((plant) => plant.name)
            .join(", ")} will be shaded by ${
            roof?.name ?? "the roof"
          }. Position them at the open edges, or choose shade-tolerant planting.`,
          affectedIds: sunLovers.map((plant) => plant.id),
          step: "plants",
        }),
      );
    }

    if (config.plants.planterIds.length === 0) {
      messages.push(
        message({
          code: "PLANT_NO_PLANTER",
          severity: "warning",
          title: "Plants selected without a planter",
          message:
            "Plants need somewhere to grow. Add at least one planter module, or remove the planting.",
          affectedIds: plants.map((plant) => plant.id),
          step: "plants",
        }),
      );
    }

    if (!config.addons.includes("ADD-IRRIGATION")) {
      messages.push(
        message({
          code: "PLANT_MAINTENANCE",
          severity: "warning",
          title: "Planting needs regular watering",
          message:
            "Without automatic irrigation the planting depends on manual watering. Final plant suitability also depends on local climate and orientation, which has to be confirmed on site.",
          affectedIds: ["plants"],
          step: "plants",
        }),
      );
    }

    return messages;
  },
};

/**
 * SPECIES — demo aquatic-life compatibility.
 *
 * This is architecture, not aquatics advice. The traits come from a demo
 * catalog and every message says so.
 */
const speciesRule: Rule = {
  id: "SPECIES",
  name: "Aquatic life compatibility (demo)",
  evaluate(config, derived) {
    if (!config.aquarium.enabled) return [];
    const species = config.aquarium.selectedSpeciesIds
      .map(getItem)
      .filter(Boolean) as CatalogItem[];
    if (species.length === 0) return [];

    const messages: ValidationMessage[] = [];
    const volume = derived.aquarium.operatingVolumeL;

    // Volume: does the tank meet each species' demo minimum?
    if (derived.aquarium.hasDimensions) {
      const tooBig = species.filter(
        (item) => (meta<number>(item, "minVolumeL") ?? 0) > volume,
      );
      if (tooBig.length > 0) {
        messages.push(
          message({
            code: "SPECIES_VOLUME",
            severity: "warning",
            title: "Tank is smaller than the demo minimum",
            message: `${tooBig
              .map(
                (item) =>
                  `${item.name} (demo minimum ${meta<number>(item, "minVolumeL")} L)`,
              )
              .join(
                ", ",
              )} exceed the estimated ${Math.round(volume)} L operating volume. Stocking must be confirmed with a qualified aquatics specialist.`,
            affectedIds: tooBig.map((item) => item.id),
            step: "aquatic-life",
          }),
        );
      }

      // Temperature: is there a band that suits every selected species?
      const lowerBound = Math.max(
        ...species.map((item) => meta<number>(item, "tempMinC") ?? -Infinity),
      );
      const upperBound = Math.min(
        ...species.map((item) => meta<number>(item, "tempMaxC") ?? Infinity),
      );
      if (species.length > 1 && lowerBound > upperBound) {
        messages.push(
          message({
            code: "SPECIES_TEMPERATURE",
            severity: "incompatible",
            title: "No shared temperature range",
            message: `The selected species have no overlapping temperature band in the demo catalog (needs ≥ ${lowerBound} °C and ≤ ${upperBound} °C at the same time). Remove one of them.`,
            affectedIds: species.map((item) => item.id),
            step: "aquatic-life",
          }),
        );
      }
    }

    // Temperament: demo territoriality check.
    const territorial = species.filter(
      (item) => meta<string>(item, "temperament") === "territorial",
    );
    if (territorial.length > 0 && species.length > 1) {
      messages.push(
        message({
          code: "SPECIES_TEMPERAMENT",
          severity: "warning",
          title: "Territorial species in a mixed tank",
          message: `${territorial
            .map((item) => item.name)
            .join(
              ", ",
            )} is marked territorial in the demo catalog and may not share a tank. A qualified aquatics specialist should confirm the final stocking list.`,
          affectedIds: territorial.map((item) => item.id),
          step: "aquatic-life",
        }),
      );
    }

    // Every species record in V1 is unverified — say so once, clearly.
    if (species.some((item) => meta<boolean>(item, "verified") !== true)) {
      messages.push(
        message({
          code: "SPECIES_UNVERIFIED",
          severity: "warning",
          title: "Species data is a demo catalog",
          message:
            "Species compatibility, stocking levels, filtration and water chemistry in this configurator are placeholders. They must be confirmed with a qualified aquatics specialist before livestock is ordered.",
          affectedIds: species.map((item) => item.id),
          step: "aquatic-life",
        }),
      );
    }

    return messages;
  },
};

/** INDOOR — indoor-specific practicalities. */
const indoorRule: Rule = {
  id: "INDOOR",
  name: "Indoor suitability",
  evaluate(config) {
    if (config.environment !== "ENV-INDOOR") return [];
    const messages: ValidationMessage[] = [];

    if (config.addons.includes("ADD-MISTING")) {
      messages.push(
        message({
          code: "INDOOR_MISTING",
          severity: "incompatible",
          title: "Misting is not suitable indoors",
          message:
            "Evaporative misting raises humidity and wets surrounding surfaces. It is an outdoor option only.",
          affectedIds: ["ADD-MISTING", "ENV-INDOOR"],
          step: "addons",
        }),
      );
    }

    if (config.aquarium.enabled) {
      messages.push(
        message({
          code: "INDOOR_FLOOR_LOAD",
          severity: "review_required",
          title: "Indoor floor loading needs verification",
          message:
            "A filled tank concentrates significant mass on a small area. Floor capacity at the installation point must be verified before installation.",
          affectedIds: ["aquarium", "ENV-INDOOR"],
          step: "aquarium",
        }),
      );
    }

    if (config.plants.plantIds.includes("PLANT-CLIMB-002")) {
      messages.push(
        message({
          code: "INDOOR_CLIMBING_ROSE",
          severity: "warning",
          title: "Climbing rose indoors",
          message:
            "Climbing roses need strong direct light and airflow. Indoors they rarely thrive; an indoor climber is a better choice.",
          affectedIds: ["PLANT-CLIMB-002"],
          step: "plants",
        }),
      );
    }

    return messages;
  },
};

/** SEAT_FIT — seating layout against the rest of the design. */
const seatingRule: Rule = {
  id: "SEAT_FIT",
  name: "Seating fit",
  evaluate(config, derived) {
    const messages: ValidationMessage[] = [];

    if (
      config.seating.enabled &&
      config.aquarium.enabled &&
      config.aquarium.positionId === "AQ-CENTER" &&
      derived.footprintM2 < 7
    ) {
      messages.push(
        message({
          code: "SEAT_CENTER_TANK_CIRCULATION",
          severity: "warning",
          title: "Tight circulation around a centre tank",
          message: `A centre tank inside a ${derived.footprintM2.toFixed(
            1,
          )} m² pavilion leaves little room to walk past the seating. A larger footprint or a side tank gives better circulation.`,
          affectedIds: ["AQ-CENTER", config.seating.layoutId ?? "seating"],
          step: "aquarium",
        }),
      );
    }

    if (!config.seating.enabled && config.space.people !== undefined) {
      messages.push(
        message({
          code: "SEAT_NONE_WITH_PEOPLE",
          severity: "warning",
          title: "No seating selected",
          message: `You told us the pavilion is for ${config.space.people} people but no seating is included. Add a layout, or plan to bring your own furniture.`,
          affectedIds: ["seating"],
          step: "seating",
        }),
      );
    }

    return messages;
  },
};

/** DATA — the standing reminder that every number here is seed data. */
const placeholderDataRule: Rule = {
  id: "DATA",
  name: "Placeholder data",
  evaluate() {
    return [
      message({
        code: "DATA_PLACEHOLDER",
        severity: "warning",
        title: "Prices and specifications are placeholders",
        message:
          "All dimensions, materials, weights and prices in this configurator are seed values for the MVP. Nothing here constitutes an engineering approval or a binding quotation.",
        affectedIds: [],
        step: "review",
      }),
    ];
  },
};

/** Which wizard step an item belongs to, for the "fix this" links. */
function stepForItem(item: CatalogItem): string {
  switch (item.category) {
    case "environment":
      return "location";
    case "pavilion":
    case "shape":
    case "sizePreset":
      return "pavilion";
    case "material":
    case "finish":
      return "structure";
    case "roof":
      return "roof";
    case "seatingLayout":
    case "seatingStyle":
    case "fabric":
      return "seating";
    case "aquariumPosition":
    case "aquariumShape":
      return "aquarium";
    case "species":
      return "aquatic-life";
    case "plant":
    case "planter":
      return "plants";
    case "addon":
      return "addons";
    default:
      return "review";
  }
}

export const RULES: Rule[] = [
  requiredDimensionsRule,
  availabilityRule,
  incompatibilityRule,
  requirementsRule,
  geometryRule,
  spaceFitRule,
  rooftopAquariumRule,
  rooftopStructureRule,
  aquariumLoadRule,
  indoorRule,
  roofBehaviourRule,
  seatingRule,
  plantingRule,
  speciesRule,
  utilitiesRule,
  placeholderDataRule,
];

export type { DerivedConfiguration, DesignConfiguration };
