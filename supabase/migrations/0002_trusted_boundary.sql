-- Round 2.1 — move quote creation behind a trusted server boundary.
--
-- Run after 0001_quote_requests.sql.
--
-- Before: the browser held the anon key and inserted into quote_requests
-- directly, so client-side validation was the only thing standing between a
-- crafted payload and a stored lead.
--
-- After: only the `submit-quote` Edge Function writes, using the service role.
-- anon can no longer insert at all.

-- ---------------------------------------------------------------------------
-- 1. Revoke anonymous INSERT
-- ---------------------------------------------------------------------------

drop policy if exists "anon can create a new lead" on public.quote_requests;

-- Belt and braces: even without a policy, no table-level grant should remain.
revoke insert on public.quote_requests from anon;
revoke all on public.quote_requests from anon;

-- anon has never had SELECT on this table, and must not gain it. Reads for the
-- success screen go through get_quote_summary(), which returns no personal
-- data. Re-assert it here so the intent survives a future edit to 0001.
revoke select on public.quote_requests from anon;

-- The service role bypasses RLS by design, so the Edge Function needs no
-- policy of its own. `authenticated` keeps the read policy from 0001 for the
-- future admin app.

-- ---------------------------------------------------------------------------
-- 2. Rate limiting support
-- ---------------------------------------------------------------------------

-- Counts recent leads for an email address. Called by the Edge Function with
-- the service role; never exposed to anon.
create or replace function public.count_recent_quotes(
  p_email text,
  p_within_minutes integer default 60
)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.quote_requests
  where lower(customer_email) = lower(p_email)
    and created_at > now() - make_interval(mins => greatest(p_within_minutes, 1));
$$;

revoke all on function public.count_recent_quotes(text, integer) from public;
revoke all on function public.count_recent_quotes(text, integer) from anon;
grant execute on function public.count_recent_quotes(text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Verifying the lock-down
-- ---------------------------------------------------------------------------
--
-- With the anon key, this must now fail:
--
--   curl -X POST "$SUPABASE_URL/rest/v1/quote_requests" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H "Content-Type: application/json" -d '[{"reference":"NV-TEST-0001"}]'
--   -> 401/403, "new row violates row-level security policy"
--
-- And this must return no rows (not an error, and not data):
--
--   curl "$SUPABASE_URL/rest/v1/quote_requests?select=*" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
--
-- The safe summary must still work, because the success screen depends on it:
--
--   curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_quote_summary" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H "Content-Type: application/json" -d '{"p_reference":"NV-XXXX-XXXX"}'
--
-- Policy inventory after this migration:
--
--   select policyname, roles, cmd from pg_policies
--   where tablename = 'quote_requests';
--   -> only "authenticated can read leads" (SELECT, authenticated)
