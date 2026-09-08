import type { DesignConfiguration } from "@shared/configuration/schema";

export type StepId =
  | "location"
  | "space"
  | "pavilion"
  | "structure"
  | "roof"
  | "seating"
  | "aquarium"
  | "aquatic-life"
  | "plants"
  | "addons"
  | "review"
  | "validation"
  | "quote"
  | "success";

export type StepDefinition = {
  id: StepId;
  /** Short label used in the compact stepper. */
  label: string;
  /** Long label used in headings and "Next: …" buttons. */
  title: string;
  /** Eyebrow text above the step heading. */
  eyebrow: string;
  subtitle: string;
  /** Steps that only exist for some configurations (e.g. aquatic life). */
  isVisible?: (config: DesignConfiguration) => boolean;
  /** Steps after the configuration itself (review/quote/success). */
  group: "configure" | "finish";
  /** Success is terminal: no back/next chrome. */
  terminal?: boolean;
};

export const STEPS: StepDefinition[] = [
  {
    id: "location",
    label: "Location",
    title: "Location",
    eyebrow: "Where it lives",
    subtitle:
      "Choose the environment so we can recommend the right structure and flag anything that needs review.",
    group: "configure",
  },
  {
    id: "space",
    label: "Space",
    title: "Space & Size",
    eyebrow: "Your space",
    subtitle:
      "Tell us the space you have available and how many people you want to seat.",
    group: "configure",
  },
  {
    id: "pavilion",
    label: "Pavilion",
    title: "Pavilion",
    eyebrow: "Pavilion configuration",
    subtitle: "Pick the platform, shape and size preset for your pavilion.",
    group: "configure",
  },
  {
    id: "structure",
    label: "Structure",
    title: "Structure & Material",
    eyebrow: "Pavilion configuration",
    subtitle:
      "Choose the frame material and finish. Material properties shown here are indicative, not certified engineering data.",
    group: "configure",
  },
  {
    id: "roof",
    label: "Roof",
    title: "Roof & Shade",
    eyebrow: "Pavilion configuration",
    subtitle: "Choose how the pavilion is covered and shaded.",
    group: "configure",
  },
  {
    id: "seating",
    label: "Seating",
    title: "Seating",
    eyebrow: "Comfort",
    subtitle: "Choose the seating layout, style and cushion fabric.",
    group: "configure",
  },
  {
    id: "aquarium",
    label: "Aquarium",
    title: "Aquarium",
    eyebrow: "Water feature",
    subtitle:
      "Add an optional integrated aquarium. Volume and filled mass are calculated as estimates.",
    group: "configure",
  },
  {
    id: "aquatic-life",
    label: "Aquatic Life",
    title: "Aquatic Life",
    eyebrow: "Water feature",
    subtitle:
      "Select demo species for the aquarium. Stocking advice must be verified with a qualified aquatics specialist.",
    group: "configure",
    isVisible: (config) => config.aquarium.enabled,
  },
  {
    id: "plants",
    label: "Plants",
    title: "Plants & Planters",
    eyebrow: "Greenery",
    subtitle: "Choose planter modules and the planting that fills them.",
    group: "configure",
  },
  {
    id: "addons",
    label: "Add-ons",
    title: "Add-ons & Comfort",
    eyebrow: "Finishing touches",
    subtitle: "Lighting, climate comfort, irrigation and utility options.",
    group: "configure",
  },
  {
    id: "review",
    label: "Review",
    title: "Review Your Design",
    eyebrow: "Almost there",
    subtitle: "Take a final look at your configuration and estimated price.",
    group: "finish",
  },
  {
    id: "validation",
    label: "Validation",
    title: "Design Validation",
    eyebrow: "Checks",
    subtitle:
      "We check your design for logical compatibility and flag anything that needs qualified engineering review.",
    group: "finish",
  },
  {
    id: "quote",
    label: "Quote",
    title: "Save or Request a Quote",
    eyebrow: "Next step",
    subtitle:
      "Save the design to this browser, or send it to our team for a detailed proposal.",
    group: "finish",
  },
  {
    id: "success",
    label: "Done",
    title: "Request Received",
    eyebrow: "Thank you",
    subtitle: "Your design reference is below.",
    group: "finish",
    terminal: true,
  },
];

export const STEP_BY_ID: Record<StepId, StepDefinition> = Object.fromEntries(
  STEPS.map((step) => [step.id, step]),
) as Record<StepId, StepDefinition>;

export const STEP_IDS: StepId[] = STEPS.map((step) => step.id);

/** Steps that are reachable for a given configuration, in wizard order. */
export function visibleSteps(config: DesignConfiguration): StepDefinition[] {
  return STEPS.filter((step) => !step.isVisible || step.isVisible(config));
}

export function isStepId(value: string): value is StepId {
  return STEP_IDS.includes(value as StepId);
}
