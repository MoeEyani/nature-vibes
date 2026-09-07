import {
  APP_MODE,
  IS_PRODUCTION,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/constants/appConfig";
import { LocalDemoQuoteRepository } from "./localRepository";
import { RemoteQuoteRepository } from "./supabaseRepository";
import type { QuoteRepository } from "./types";

export * from "./types";
export { LocalDemoQuoteRepository } from "./localRepository";
export { RemoteQuoteRepository } from "./supabaseRepository";
export { validateQuoteRequest } from "./validation";
export { notifyTeam, buildNotificationPayload } from "./notifications";

let cached: QuoteRepository | null = null;

/**
 * The repository the app should use, chosen from the build's configuration.
 *
 * `APP_MODE` already falls back to demo when Supabase is not configured, so
 * this can never hand back a remote repository that cannot work.
 */
export function getQuoteRepository(): QuoteRepository {
  if (!cached) {
    cached = IS_PRODUCTION
      ? new RemoteQuoteRepository({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY })
      : new LocalDemoQuoteRepository();
  }
  return cached;
}

/** Test seam: replace or reset the repository the app uses. */
export function setQuoteRepository(repository: QuoteRepository | null): void {
  cached = repository;
}

export { APP_MODE };
