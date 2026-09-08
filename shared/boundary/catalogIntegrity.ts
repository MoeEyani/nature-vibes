import { getItem } from "../catalog/index.ts";
import { SERVICE_INDEX } from "../catalog/services.ts";
import type { DesignConfiguration } from "../configuration/schema.ts";
import { selectedItemIds } from "../configuration/derive.ts";

/**
 * Every catalog id a configuration references must actually exist.
 *
 * The rules engine flags items that exist but are not `active`. It cannot flag
 * an id that is simply invented, because lookups of unknown ids return
 * undefined and get filtered out — which would let a crafted payload smuggle
 * an unrecognised id into a stored lead. The trusted boundary checks
 * existence explicitly.
 */
export function findUnknownCatalogIds(config: DesignConfiguration): string[] {
  return selectedItemIds(config).filter((id) => !getItem(id));
}

export function findUnknownServiceIds(serviceIds: readonly string[]): string[] {
  return serviceIds.filter((id) => !SERVICE_INDEX[id]);
}
