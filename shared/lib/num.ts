/**
 * Numeric helpers with no domain knowledge.
 *
 * They live here rather than in `studio/geometry.ts` so that modules geometry
 * itself depends on can use them: geometry imports `assemblies.ts` to expand a
 * design, and an assembly that reached back into geometry for `clamp` would
 * close the cycle.
 */

/** Round `value` to the nearest multiple of `step`. A step of 0 means no snap. */
export function snap(value: number, step: number): number {
  if (!step || step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
