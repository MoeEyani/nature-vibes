-- Nature Vibes Configurator — quote requests
--
-- Run in the Supabase SQL editor, or with `supabase db push`.
--
-- Security model, in short: the browser holds only the anon key, so the
-- database is the security boundary, not the client.
--
--   * anon may INSERT a lead, and only as status 'new'.
--   * anon may NOT SELECT this table. A design reference is short enough to
--     guess, and must never be a key to somebody's name, email and phone.
--   * reads for the success screen go through get_quote_summary(), which
--     returns confirmation fields and the configuration snapshot but no
--     personal data.
--   * the estimated total is stored for review only. It is a placeholder
--     figure produced by the client and is not authoritative for billing.

create extension if not exists "pgcrypto";

-- Lifecycle of a lead. Only 'new' is ever set by the customer app; the rest
-- exists so the future admin workflow has somewhere to go.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type quote_status as enum (
      'new', 'contacted', 'qualified', 'quoted', 'won', 'lost'
    );
  end if;
end
$$;

create table if not exists public.quote_requests (
  id                       uuid primary key default gen_random_uuid(),
  reference                text        not null,
  submitted_at             timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  status                   quote_status not null default 'new',
  schema_version           integer     not null default 1,
  source                   text        not null default 'web-configurator',

  customer_name            text        not null,
  customer_email           text        not null,
  customer_phone           text        not null,
  customer_city            text        not null,
  preferred_contact        text        not null,
  message                  text,
  consent                  boolean     not null default false,

  -- Immutable snapshots. JSONB so the shape can evolve without a migration.
  additional_services_json jsonb       not null default '[]'::jsonb,
  configuration_json       jsonb       not null,
  pricing_json             jsonb       not null,
  validation_json          jsonb       not null,

  constraint quote_requests_reference_key unique (reference),
  constraint quote_requests_reference_format
    check (reference ~ '^NV-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  constraint quote_requests_name_len
    check (char_length(customer_name) between 2 and 120),
  constraint quote_requests_email_format
    check (customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  constraint quote_requests_email_len
    check (char_length(customer_email) <= 200),
  constraint quote_requests_phone_len
    check (char_length(customer_phone) between 6 and 40),
  -- "Other" must have been replaced with a real location by the client.
  constraint quote_requests_city_real
    check (char_length(customer_city) between 2 and 120
           and lower(customer_city) <> 'other'),
  constraint quote_requests_contact_method
    check (preferred_contact in ('email', 'phone', 'whatsapp')),
  constraint quote_requests_message_len
    check (message is null or char_length(message) <= 4000),
  -- A lead may only be created with recorded consent.
  constraint quote_requests_consent check (consent = true),
  constraint quote_requests_services_is_array
    check (jsonb_typeof(additional_services_json) = 'array')
);

create index if not exists quote_requests_submitted_at_idx
  on public.quote_requests (submitted_at desc);
create index if not exists quote_requests_status_idx
  on public.quote_requests (status);
create index if not exists quote_requests_email_idx
  on public.quote_requests (lower(customer_email));

-- Keep updated_at honest.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quote_requests_set_updated_at on public.quote_requests;
create trigger quote_requests_set_updated_at
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.quote_requests enable row level security;

-- Insert-only for the public app. No select, update or delete policy exists
-- for anon, so none of those are permitted.
drop policy if exists "anon can create a new lead" on public.quote_requests;
create policy "anon can create a new lead"
  on public.quote_requests
  for insert
  to anon
  with check (status = 'new' and consent = true);

-- Staff access goes through an authenticated role once the admin app exists.
drop policy if exists "authenticated can read leads" on public.quote_requests;
create policy "authenticated can read leads"
  on public.quote_requests
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Public read-back, without personal data
-- ---------------------------------------------------------------------------

-- Lets the success screen confirm a request by reference after a reload,
-- while keeping name, email, phone and message unreadable to anon.
create or replace function public.get_quote_summary(p_reference text)
returns table (
  reference                text,
  submitted_at             timestamptz,
  status                   text,
  pricing_json             jsonb,
  validation_status        text,
  additional_services_json jsonb,
  configuration_json       jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    q.reference,
    q.submitted_at,
    q.status::text,
    q.pricing_json,
    coalesce(q.validation_json ->> 'status', 'warning') as validation_status,
    q.additional_services_json,
    q.configuration_json
  from public.quote_requests q
  where q.reference = p_reference
  limit 1;
$$;

revoke all on function public.get_quote_summary(text) from public;
grant execute on function public.get_quote_summary(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Anti-spam extension point
-- ---------------------------------------------------------------------------
--
-- The client has a honeypot and a timing check; neither is a real control.
-- When abuse appears, put one of these in front of the insert:
--
--   * a Supabase edge function that verifies a Turnstile/hCaptcha token and
--     performs the insert with the service role, with anon INSERT revoked;
--   * a per-IP or per-email rate limit enforced in that edge function;
--   * a BEFORE INSERT trigger rejecting more than N rows per email per hour.
--
-- Example of the last one, left commented until it is needed:
--
-- create or replace function public.limit_quote_rate()
-- returns trigger language plpgsql as $$
-- begin
--   if (select count(*) from public.quote_requests
--       where lower(customer_email) = lower(new.customer_email)
--         and created_at > now() - interval '1 hour') >= 5 then
--     raise exception 'rate limit exceeded';
--   end if;
--   return new;
-- end $$;
