import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/brand";
import { DEFAULT_SERVICE_IDS, normalizeServiceIds } from "@shared/catalog/services";
import { createDefaultConfiguration } from "@shared/seed/defaultConfiguration";
import { normalizeConfiguration } from "@shared/configuration/normalize";
import {
  designConfigurationSchema,
  designSessionSchema,
  savedDesignSchema,
  type DesignSession,
  type SavedDesign,
} from "@shared/configuration/schema";
import { readJson, removeKey, writeJson } from "@/lib/storage";

/**
 * Persistence with migration.
 *
 * Everything read from storage is validated before use, and anything that
 * fails validation is discarded rather than crashing the app: a schema change
 * must never leave a returning visitor stuck on a broken saved state.
 *
 * The v1 keys are read once and left in place. Migration is additive, so a
 * visitor who somehow loads an older build still finds their v1 data intact.
 */

export type SessionLoad = {
  session: DesignSession;
  /** How the session was obtained, for diagnostics and tests. */
  origin: "v2" | "migrated-v1" | "default";
};

export function createDefaultSession(): DesignSession {
  return {
    schemaVersion: 2,
    configuration: createDefaultConfiguration(),
    selectedServiceIds: [...DEFAULT_SERVICE_IDS],
    reference: null,
  };
}

export function loadSession(): SessionLoad {
  // 1. Current format.
  const v2 = designSessionSchema.safeParse(readJson<unknown>(STORAGE_KEYS.session));
  if (v2.success) {
    return { session: sanitize(v2.data), origin: "v2" };
  }

  // 2. A v1 draft held only the configuration; services default.
  const v1 = designConfigurationSchema.safeParse(
    readJson<unknown>(LEGACY_STORAGE_KEYS.draft),
  );
  if (v1.success) {
    const migrated: DesignSession = {
      schemaVersion: 2,
      configuration: v1.data,
      selectedServiceIds: [...DEFAULT_SERVICE_IDS],
      reference: null,
    };
    const session = sanitize(migrated);
    saveSession(session);
    return { session, origin: "migrated-v1" };
  }

  return { session: createDefaultSession(), origin: "default" };
}

export function saveSession(session: DesignSession): void {
  writeJson(STORAGE_KEYS.session, session);
}

export function clearSession(): void {
  removeKey(STORAGE_KEYS.session);
}

export type SavedDesignsLoad = {
  designs: SavedDesign[];
  migratedFromV1: number;
};

export function loadSavedDesigns(): SavedDesignsLoad {
  const current = parseDesigns(readJson<unknown[]>(STORAGE_KEYS.savedDesigns) ?? []);

  const legacyRaw = readJson<unknown[]>(LEGACY_STORAGE_KEYS.savedDesigns) ?? [];
  if (legacyRaw.length === 0) return { designs: current, migratedFromV1: 0 };

  // v1 records lack `selectedServiceIds`; the schema default supplies it.
  const known = new Set(current.map((design) => design.reference));
  const migrated = parseDesigns(legacyRaw).filter(
    (design) => !known.has(design.reference),
  );
  if (migrated.length === 0) return { designs: current, migratedFromV1: 0 };

  const designs = [...current, ...migrated];
  saveSavedDesigns(designs);
  return { designs, migratedFromV1: migrated.length };
}

export function saveSavedDesigns(designs: SavedDesign[]): void {
  writeJson(STORAGE_KEYS.savedDesigns, designs);
}

function parseDesigns(raw: unknown[]): SavedDesign[] {
  return raw
    .map((entry) => savedDesignSchema.safeParse(entry))
    .filter((result) => result.success)
    .map((result) => ({
      ...result.data,
      selectedServiceIds: normalizeServiceIds(result.data.selectedServiceIds),
    }));
}

/** Re-run the domain invariants over anything that came from storage. */
function sanitize(session: DesignSession): DesignSession {
  return {
    ...session,
    configuration: normalizeConfiguration(session.configuration),
    selectedServiceIds: normalizeServiceIds(session.selectedServiceIds),
  };
}
