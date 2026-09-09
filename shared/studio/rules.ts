import type { ValidationMessage, ValidationSeverity } from "../configuration/schema.ts";
import { worstSeverity } from "../rules/types.ts";
import { estimateAquarium } from "../aquarium/volume.ts";
import { getElementType } from "./catalog.ts";
import { findCollisions, gapBetween, isInsideSite } from "./geometry.ts";
import { expandDesign, parentOf } from "./assemblies.ts";
import type { StudioDesign, StudioElement } from "./schema.ts";

/**
 * Studio validation.
 *
 * Same contract as the configurator's rules engine — the same
 * `ValidationMessage` shape and the same four severities — so the existing
 * validation UI renders studio findings unchanged, and the same discipline
 * applies: safety-critical conclusions are `review_required`, never approval.
 *
 * Messages carry `affectedIds` of element ids so the canvas can highlight
 * exactly what a finding is about.
 */

/** Minimum walking gap between solid elements. An Assumption, not a standard. */
export const MIN_CIRCULATION_MM = 600;

/** Filled mass above which a tank needs verified support. Assumption. */
export const AQUARIUM_MASS_REVIEW_KG = 150;

export type StudioValidationResult = {
  status: ValidationSeverity;
  messages: ValidationMessage[];
  blocking: ValidationMessage[];
  counts: Record<ValidationSeverity, number>;
};

function message(
  partial: Omit<ValidationMessage, "affectedIds"> &
    Partial<Pick<ValidationMessage, "affectedIds">>,
): ValidationMessage {
  return { affectedIds: [], ...partial };
}

function nameOf(element: StudioElement): string {
  return element.label?.trim() || getElementType(element.typeId)?.name || "Element";
}

export function evaluateStudioDesign(design: StudioDesign): StudioValidationResult {
  const messages: ValidationMessage[] = [];
  // Rules run on the parts an assembly stands for, so a pavilion is checked
  // as posts, beams and a roof — which is what it is.
  const elements = expandDesign(design);

  // --- Nothing placed yet -------------------------------------------------
  if (design.elements.length === 0) {
    messages.push(
      message({
        code: "STUDIO_EMPTY",
        severity: "warning",
        title: "Nothing placed yet",
        message:
          "Drag an element from the palette onto the canvas to start your design.",
      }),
    );
  }

  // --- Unknown types ------------------------------------------------------
  const unknown = elements.filter((element) => !getElementType(element.typeId));
  if (unknown.length > 0) {
    messages.push(
      message({
        code: "STUDIO_UNKNOWN_TYPE",
        severity: "incompatible",
        title: "Unrecognised element",
        message:
          "This design contains an element type that is not in the catalog. Delete it and place a current one.",
        affectedIds: unknown.map((element) => element.id),
      }),
    );
  }

  // --- Overlapping solids -------------------------------------------------
  const collisions = findCollisions(design);
  if (collisions.length > 0) {
    messages.push(
      message({
        code: "STUDIO_OVERLAP",
        severity: "incompatible",
        title: `${collisions.length} element${collisions.length === 1 ? "" : "s"} overlap`,
        message: `${collisions
          .slice(0, 3)
          .map(([a, b]) => `${nameOf(a)} and ${nameOf(b)}`)
          .join("; ")}${
          collisions.length > 3 ? `, and ${collisions.length - 3} more` : ""
        } occupy the same space. Move them apart before requesting a quote.`,
        affectedIds: collisions.flatMap(([a, b]) => [a.id, b.id]),
      }),
    );
  }

  // --- Outside the site ---------------------------------------------------
  const outside = elements.filter((element) => !isInsideSite(element, design.site));
  if (outside.length > 0) {
    messages.push(
      message({
        code: "STUDIO_OUTSIDE_SITE",
        severity: "warning",
        title: "Elements outside the working area",
        message: `${outside
          .map(nameOf)
          .slice(0, 3)
          .join(", ")} extend beyond the area you set. Enlarge the site or move them in.`,
        affectedIds: outside.map((element) => element.id),
      }),
    );
  }

  // --- Circulation --------------------------------------------------------
  const tight: string[] = [];
  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      const a = elements[i];
      const b = elements[j];
      const typeA = getElementType(a.typeId);
      const typeB = getElementType(b.typeId);
      if (!typeA?.solid || !typeB?.solid) continue;
      // Posts within one pavilion are meant to be a bay apart; that is the
      // design, not a circulation problem.
      if (parentOf(a) && parentOf(a) === parentOf(b)) continue;

      const gap = gapBetween(a, b);
      if (gap > 0 && gap < MIN_CIRCULATION_MM) {
        tight.push(a.id, b.id);
      }
    }
  }
  if (tight.length > 0) {
    messages.push(
      message({
        code: "STUDIO_CIRCULATION",
        severity: "warning",
        title: "Tight circulation",
        message: `Some elements are closer than ${MIN_CIRCULATION_MM} mm apart, which is uncomfortable to walk between. This is a comfort guideline, not an accessibility standard.`,
        affectedIds: [...new Set(tight)],
      }),
    );
  }

  // --- Water --------------------------------------------------------------
  const water = elements.filter(
    (element) => getElementType(element.typeId)?.meta?.water === true,
  );
  const aquaria = elements.filter((element) => element.typeId === "EL-AQUARIUM");

  for (const tank of aquaria) {
    const estimates = estimateAquarium({
      enabled: true,
      shapeId: "AQSHAPE-RECT",
      lengthMm: tank.widthMm,
      widthMm: tank.depthMm,
      heightMm: tank.heightMm,
      selectedSpeciesIds: [],
    });

    if (estimates.estimatedFilledMassKg > AQUARIUM_MASS_REVIEW_KG) {
      messages.push(
        message({
          code: `STUDIO_AQ_LOAD_${tank.id}`,
          severity: "review_required",
          title: "Tank support needs engineering verification",
          message: `${nameOf(tank)} is an estimated ${Math.round(
            estimates.estimatedFilledMassKg,
          )} kg when filled, above the ${AQUARIUM_MASS_REVIEW_KG} kg placeholder threshold. Glass thickness, stand design and floor capacity must be verified by a qualified engineer.`,
          affectedIds: [tank.id],
        }),
      );
    }

    if (tank.elevationMm > 0) {
      messages.push(
        message({
          code: `STUDIO_AQ_RAISED_${tank.id}`,
          severity: "review_required",
          title: "Raised tank needs a verified stand",
          message: `${nameOf(tank)} sits ${tank.elevationMm} mm above the floor. A stand carrying a filled tank is a structural element and must be engineered, not assumed.`,
          affectedIds: [tank.id],
        }),
      );
    }
  }

  // --- Electrics near water ----------------------------------------------
  const electrical = elements.filter(
    (element) => getElementType(element.typeId)?.meta?.electrical === true,
  );
  if (water.length > 0 && electrical.length > 0) {
    messages.push(
      message({
        code: "STUDIO_ELECTRICAL_WATER",
        severity: "review_required",
        title: "Electrical work near water needs a qualified installer",
        message:
          "This design places lighting and water together. Circuit protection, IP rating and separation must be specified and signed off by a qualified electrician.",
        affectedIds: [...water, ...electrical].map((element) => element.id),
      }),
    );
  }
  if (electrical.length > 0) {
    messages.push(
      message({
        code: "STUDIO_POWER_SUPPLY",
        severity: "warning",
        title: "A power supply is needed",
        message:
          "Lighting needs mains power at the installation point. Availability has to be confirmed on site.",
        affectedIds: electrical.map((element) => element.id),
      }),
    );
  }

  // --- Planting -----------------------------------------------------------
  const plants = elements.filter((element) => element.typeId === "EL-PLANT");
  const containers = elements.filter(
    (element) => getElementType(element.typeId)?.kind === "planter",
  );
  if (plants.length > 0 && containers.length === 0) {
    messages.push(
      message({
        code: "STUDIO_PLANT_NO_CONTAINER",
        severity: "warning",
        title: "Planting without a planter",
        message:
          "Plants need somewhere to grow. Add a planter box or a pot, or remove the planting.",
        affectedIds: plants.map((element) => element.id),
      }),
    );
  }
  if (plants.length > 0) {
    messages.push(
      message({
        code: "STUDIO_PLANT_SUITABILITY",
        severity: "warning",
        title: "Plant suitability is unconfirmed",
        message:
          "Final plant choice depends on climate, orientation, light and irrigation, and must be confirmed on site.",
        affectedIds: plants.map((element) => element.id),
      }),
    );
  }

  // --- Structure ----------------------------------------------------------
  const beams = elements.filter((element) => element.typeId === "EL-BEAM");
  const posts = elements.filter((element) => element.typeId === "EL-POST");
  if (beams.length > 0 && posts.length < 2) {
    messages.push(
      message({
        code: "STUDIO_BEAM_UNSUPPORTED",
        severity: "warning",
        title: "Beams without enough posts",
        message:
          "A beam needs support at both ends. Add posts beneath it, or remove the beam.",
        affectedIds: beams.map((element) => element.id),
      }),
    );
  }
  if (posts.length > 0 || beams.length > 0) {
    messages.push(
      message({
        code: "STUDIO_STRUCTURE_REVIEW",
        severity: "review_required",
        title: "Structural layout needs engineering review",
        message:
          "Post spacing, beam spans, section sizes, fixings and anchoring are not calculated by this tool. A qualified engineer must verify them before anything is manufactured.",
        affectedIds: [...posts, ...beams].map((element) => element.id),
      }),
    );
  }

  // --- Screens ------------------------------------------------------------
  const screens = elements.filter(
    (element) => getElementType(element.typeId)?.meta?.windLoad === true,
  );
  if (screens.length > 0) {
    messages.push(
      message({
        code: "STUDIO_WIND_LOAD",
        severity: "review_required",
        title: "Screens add wind load",
        message:
          "Privacy screens present a large surface to the wind. Anchoring and wind loading must be verified for the installation site.",
        affectedIds: screens.map((element) => element.id),
      }),
    );
  }

  // --- Standing data notice ----------------------------------------------
  messages.push(
    message({
      code: "STUDIO_DATA_PLACEHOLDER",
      severity: "warning",
      title: "Sizes and prices are placeholders",
      message:
        "Every dimension, material and price in the studio is a seed value for this prototype. Nothing here is an engineering approval or a binding quotation.",
    }),
  );

  const sorted = [...messages].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
  const blocking = sorted.filter((entry) => entry.severity === "incompatible");

  const counts: Record<ValidationSeverity, number> = {
    ok: 0,
    warning: 0,
    review_required: 0,
    incompatible: 0,
  };
  for (const entry of sorted) counts[entry.severity] += 1;

  return { status: worstSeverity(sorted), messages: sorted, blocking, counts };
}

function severityRank(severity: ValidationSeverity): number {
  return { ok: 0, warning: 1, review_required: 2, incompatible: 3 }[severity];
}
