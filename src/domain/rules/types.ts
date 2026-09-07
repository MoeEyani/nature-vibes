import type {
  DesignConfiguration,
  ValidationMessage,
  ValidationSeverity,
} from "@/domain/configuration/schema";
import type { DerivedConfiguration } from "@/domain/configuration/derive";

/**
 * A rule is a pure function of (configuration, derived values) that returns
 * zero or more validation messages. Rules never touch React or the store.
 */
export type Rule = {
  /** Stable code prefix, also used in docs/rules.md. */
  id: string;
  /** Human title for the rules documentation. */
  name: string;
  evaluate: (
    config: DesignConfiguration,
    derived: DerivedConfiguration,
  ) => ValidationMessage[];
};

export const SEVERITY_ORDER: Record<ValidationSeverity, number> = {
  ok: 0,
  warning: 1,
  review_required: 2,
  incompatible: 3,
};

export function worstSeverity(
  messages: readonly ValidationMessage[],
): ValidationSeverity {
  return messages.reduce<ValidationSeverity>(
    (worst, message) =>
      SEVERITY_ORDER[message.severity] > SEVERITY_ORDER[worst]
        ? message.severity
        : worst,
    "ok",
  );
}

export const SEVERITY_LABEL: Record<ValidationSeverity, string> = {
  ok: "OK",
  warning: "Warning",
  review_required: "Engineering Review Required",
  incompatible: "Incompatible",
};
