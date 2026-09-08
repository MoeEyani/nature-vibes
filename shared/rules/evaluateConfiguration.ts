import type {
  DesignConfiguration,
  ValidationMessage,
  ValidationSeverity,
} from "../configuration/schema.ts";
import { derive } from "../configuration/derive.ts";
import { RULES } from "./rules.ts";
import { SEVERITY_ORDER, worstSeverity } from "./types.ts";

export type ValidationResult = {
  status: ValidationSeverity;
  messages: ValidationMessage[];
  /** Messages that must be resolved before a quote can be requested. */
  blocking: ValidationMessage[];
  /** True when nothing blocks the customer from continuing. */
  canRequestQuote: boolean;
  counts: Record<ValidationSeverity, number>;
};

/**
 * Run every rule against a configuration.
 *
 * Pure and UI-free: the same configuration always produces the same result,
 * which is what makes the engine testable and reusable server-side later.
 */
export function evaluateConfiguration(
  config: DesignConfiguration,
): ValidationResult {
  const derived = derive(config);

  const messages = RULES.flatMap((rule) => {
    try {
      return rule.evaluate(config, derived);
    } catch (error) {
      // A broken rule must never take down the configurator.
      return [
        {
          code: `RULE_ERROR_${rule.id}`,
          severity: "warning" as const,
          title: "A design check could not run",
          message: `The "${rule.name}" check failed to complete (${
            error instanceof Error ? error.message : "unknown error"
          }). Please mention this when requesting a quote.`,
          affectedIds: [],
        },
      ];
    }
  });

  // Most severe first, so the UI leads with what actually blocks the customer.
  const sorted = [...messages].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );

  const blocking = sorted.filter((m) => m.severity === "incompatible");

  const counts: Record<ValidationSeverity, number> = {
    ok: 0,
    warning: 0,
    review_required: 0,
    incompatible: 0,
  };
  for (const m of sorted) counts[m.severity] += 1;

  return {
    status: worstSeverity(sorted),
    messages: sorted,
    blocking,
    canRequestQuote: blocking.length === 0,
    counts,
  };
}

/**
 * Named check groups shown on the validation screen.
 *
 * Every group reports OK unless a rule produced a message for it, so the
 * customer sees a complete checklist rather than only the problems.
 */
export const CHECK_GROUPS: { id: string; label: string; codes: string[] }[] = [
  {
    id: "structure",
    label: "Structure & anchoring",
    codes: ["ROOFTOP_ANCHORING_REVIEW", "GEOMETRY_CUSTOM_REVIEW", "UNAVAILABLE"],
  },
  {
    id: "space",
    label: "Space & dimensions",
    codes: ["SPACE_", "DIM_", "GEOMETRY_SIZE", "GEOMETRY_ROOF"],
  },
  { id: "seating", label: "Seating configuration", codes: ["SEAT_", "ROOF_OPEN_CUSHIONS"] },
  {
    id: "aquarium",
    label: "Aquarium load & support",
    codes: ["ROOFTOP_AQUARIUM", "AQ_LOAD", "INDOOR_FLOOR_LOAD", "DIM_AQUARIUM"],
  },
  {
    id: "water",
    label: "Water systems",
    codes: ["UTIL_WATER", "ROOF_OPEN_AQUARIUM", "INDOOR_MISTING"],
  },
  { id: "life", label: "Aquatic life", codes: ["SPECIES_"] },
  {
    id: "plants",
    label: "Plant compatibility",
    codes: ["PLANT_", "ROOF_FLAT_CLIMBING", "INDOOR_CLIMBING"],
  },
  {
    id: "electrical",
    label: "Electrical & lighting",
    codes: ["UTIL_POWER", "AQ_ELECTRICAL"],
  },
  { id: "requirements", label: "Option dependencies", codes: ["REQ_", "INCOMPAT_"] },
  { id: "data", label: "Data confidence", codes: ["DATA_"] },
];

export type CheckGroupResult = {
  id: string;
  label: string;
  status: ValidationSeverity;
  messages: ValidationMessage[];
};

/** Fold the flat message list into the named checklist shown to the customer. */
export function groupChecks(result: ValidationResult): CheckGroupResult[] {
  const claimed = new Set<ValidationMessage>();

  const groups = CHECK_GROUPS.map((group) => {
    const messages = result.messages.filter(
      (m) => !claimed.has(m) && group.codes.some((code) => m.code.startsWith(code)),
    );
    for (const m of messages) claimed.add(m);
    return {
      id: group.id,
      label: group.label,
      status: worstSeverity(messages),
      messages,
    };
  });

  // Anything a group did not claim still has to be visible somewhere.
  const unclaimed = result.messages.filter((m) => !claimed.has(m));
  if (unclaimed.length > 0) {
    groups.push({
      id: "other",
      label: "Overall design",
      status: worstSeverity(unclaimed),
      messages: unclaimed,
    });
  }

  return groups;
}

export { worstSeverity, SEVERITY_LABEL } from "./types.ts";
