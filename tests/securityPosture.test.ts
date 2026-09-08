import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guards on the security posture.
 *
 * Postgres and Deno cannot run in this test environment, so these assert on
 * the artefacts themselves. They exist to stop a future edit quietly
 * re-opening the door that Round 2.1 closed — the failure mode this round was
 * created to fix.
 */

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const MIGRATION_0001 = "supabase/migrations/0001_quote_requests.sql";
const MIGRATION_0002 = "supabase/migrations/0002_trusted_boundary.sql";
const FUNCTION = "supabase/functions/submit-quote/index.ts";

describe("database permissions", () => {
  const lockdown = read(MIGRATION_0002);

  it("drops the anonymous insert policy from 0001", () => {
    expect(read(MIGRATION_0001)).toContain('create policy "anon can create a new lead"');
    expect(lockdown).toMatch(/drop policy if exists "anon can create a new lead"/);
  });

  it("revokes insert from anon at the table level too", () => {
    expect(lockdown).toMatch(/revoke\s+insert\s+on\s+public\.quote_requests\s+from\s+anon/i);
  });

  it("never grants anon SELECT on the table", () => {
    const all = read(MIGRATION_0001) + lockdown;
    expect(all).not.toMatch(/grant\s+select\s+on\s+public\.quote_requests\s+to\s+[^;]*anon/i);
    expect(lockdown).toMatch(/revoke\s+select\s+on\s+public\.quote_requests\s+from\s+anon/i);
  });

  it("adds no new insert policy for anon", () => {
    // A policy granting anon INSERT is exactly what this round removed.
    expect(lockdown).not.toMatch(/create\s+policy[\s\S]{0,200}for\s+insert[\s\S]{0,80}to\s+anon/i);
  });

  it("keeps the safe summary RPC available for success reload", () => {
    expect(read(MIGRATION_0001)).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.get_quote_summary\(text\)\s+to\s+anon/i,
    );
  });

  it("keeps the rate-limit function away from anon", () => {
    expect(lockdown).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.count_recent_quotes\(text,\s*integer\)\s+from\s+anon/i,
    );
    expect(lockdown).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.count_recent_quotes\(text,\s*integer\)\s+to\s+service_role/i,
    );
  });
});

describe("edge function", () => {
  const fn = read(FUNCTION);

  it("exists alongside its Deno import map", () => {
    expect(existsSync(join(root, "supabase/functions/submit-quote/deno.json"))).toBe(true);
  });

  it("reuses the shared boundary rather than reimplementing it", () => {
    expect(fn).toContain("shared/boundary/handleSubmitQuote.ts");
    // No parallel copy of the rules or pricing may creep in here.
    expect(fn).not.toMatch(/function\s+calculatePrice/);
    expect(fn).not.toMatch(/function\s+evaluateConfiguration/);
  });

  it("reads its secrets from the server environment only", () => {
    expect(fn).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(fn).toContain('Deno.env.get("NATURE_VIBES_NOTIFY_WEBHOOK_URL")');
    expect(fn).toContain('Deno.env.get("TURNSTILE_SECRET_KEY")');
    // Nothing server-side may be *read from* a browser-visible variable.
    // (The file mentions NEXT_PUBLIC_ in a comment explaining why not, so
    // match the env lookup itself rather than the string.)
    expect(fn).not.toMatch(/Deno\.env\.get\(\s*["'`]NEXT_PUBLIC_/);
  });

  it("resolves its shared imports to files that exist", () => {
    const specifiers = [...fn.matchAll(/from\s+"(\.\.[^"]+)"/g)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      const resolved = join(root, "supabase/functions/submit-quote", specifier);
      expect(existsSync(resolved), `${specifier} should exist`).toBe(true);
    }
  });
});

describe("client bundle", () => {
  it("no longer references a public notification webhook", () => {
    // Round 2 shipped NEXT_PUBLIC_NOTIFY_WEBHOOK_URL; notification is now
    // server-side, behind a Supabase secret.
    const appConfig = read("src/constants/appConfig.ts");
    expect(appConfig).not.toContain("NEXT_PUBLIC_NOTIFY_WEBHOOK_URL");
    expect(read(".env.example")).not.toContain("NEXT_PUBLIC_NOTIFY_WEBHOOK_URL");
  });

  it("never mentions the service role key", () => {
    const appConfig = read("src/constants/appConfig.ts");
    const repository = read("src/domain/quotes/supabaseRepository.ts");
    for (const source of [appConfig, repository]) {
      expect(source).not.toContain("SERVICE_ROLE");
      expect(source).not.toContain("service_role");
    }
  });

  it("has no browser code that writes to the quote_requests table", () => {
    const repository = read("src/domain/quotes/supabaseRepository.ts");
    expect(repository).toContain("/functions/v1/submit-quote");
    expect(repository).not.toContain("/rest/v1/quote_requests");
  });
});
