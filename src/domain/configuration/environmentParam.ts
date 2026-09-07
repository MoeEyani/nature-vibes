import { getItem } from "@/data/catalog";
import { environmentIdSchema, type EnvironmentId } from "./schema";

/** Query parameter the home page's environment cards use. */
export const ENVIRONMENT_PARAM = "environment";

/**
 * Resolve `?environment=…` into a selectable environment.
 *
 * Returns null for anything unknown, inactive or not an environment, so a
 * hand-edited URL can never push the configuration into an invalid state.
 */
export function resolveEnvironmentParam(
  value: string | null | undefined,
): EnvironmentId | null {
  if (!value) return null;

  const parsed = environmentIdSchema.safeParse(value);
  if (!parsed.success) return null;

  const item = getItem(parsed.data);
  if (item?.category !== "environment" || item.status !== "active") return null;

  return parsed.data;
}

/** Link target for an environment card. */
export function environmentHref(environmentId: string): string {
  return `/design/location?${ENVIRONMENT_PARAM}=${encodeURIComponent(environmentId)}`;
}
