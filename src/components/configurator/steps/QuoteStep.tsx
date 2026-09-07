"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { APP_MODE, IS_DEMO, PRODUCTION_MISCONFIGURED } from "@/constants/appConfig";
import { BRAND } from "@/constants/brand";
import { quoteCustomerSchema } from "@/domain/configuration/schema";
import { checkForSpam, HONEYPOT_FIELD } from "@/domain/quotes/antiSpam";
import {
  useConfiguratorStore,
  usePriceBreakdown,
  useValidation,
} from "@/store/useConfiguratorStore";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { ServicesPicker } from "../ServicesPicker";
import { SeverityBadge } from "../ValidationList";

const CITIES = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Makkah", "Madinah"];
const OTHER_CITY = "__other__";

type Tab = "save" | "quote";

export function QuoteStep() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("quote");

  return (
    <div className="space-y-6">
      <ModeBanner />

      <div
        role="tablist"
        aria-label="Save or request a quote"
        className="grid gap-2 rounded-pill bg-sand/50 p-1 sm:max-w-md sm:grid-cols-2"
      >
        {(
          [
            { id: "save" as const, label: "Save your design" },
            {
              id: "quote" as const,
              label: IS_DEMO ? "Create demo request" : "Request a quote",
            },
          ]
        ).map((entry) => (
          <button
            key={entry.id}
            role="tab"
            type="button"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={cn(
              "rounded-pill px-4 py-2 text-sm font-medium transition-colors",
              tab === entry.id
                ? "bg-brand-green text-cream shadow-soft"
                : "text-ink-muted hover:text-brand-green",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "save" ? (
        <SavePanel />
      ) : (
        <QuoteForm
          onSubmitted={(reference) =>
            router.push(`/design/success?ref=${encodeURIComponent(reference)}`)
          }
        />
      )}
    </div>
  );
}

/** States plainly which mode the build is in, and what that means. */
function ModeBanner() {
  if (PRODUCTION_MISCONFIGURED) {
    return (
      <Callout tone="danger" title="Demo mode — production was requested but is not configured">
        This build asked for production mode, but no backend credentials are
        present, so requests cannot be sent anywhere. It has fallen back to demo
        mode rather than telling customers their request was received. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to enable it.
      </Callout>
    );
  }

  if (IS_DEMO) {
    return (
      <Callout tone="warning" title="Demo mode">
        This is a prototype. Anything you submit here is saved{" "}
        <span className="font-medium text-ink">in this browser only</span> and is{" "}
        <span className="font-medium text-ink">not sent to {BRAND.projectName}</span>.
        Nobody will contact you.
      </Callout>
    );
  }

  return (
    <Callout tone="ok" title="Your request will reach our team">
      Submitting this form sends your design and contact details to{" "}
      {BRAND.projectName}. We respond within {BRAND.quoteResponseDays}.
    </Callout>
  );
}

function SavePanel() {
  const saveDesign = useConfiguratorStore((state) => state.saveDesign);
  const savedDesigns = useConfiguratorStore((state) => state.savedDesigns);
  const breakdown = usePriceBreakdown();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState<{ reference: string } | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form
        className="space-y-4 rounded-card border border-line bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const design = saveDesign({ name, description });
          setSaved({ reference: design.reference });
        }}
      >
        <Field label="Design name" required>
          <TextInput
            value={name}
            required
            minLength={2}
            placeholder="My Nature Vibes pavilion"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="Description" hint="Optional. A note to your future self.">
          <TextArea
            value={description}
            placeholder="A calm garden pavilion with a centre aquarium and climbing planting."
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Callout tone="info">
          Saving keeps the design in this browser, using localStorage. There are
          no accounts, and nothing is sent to a server. Your selected services
          are saved with it, so reopening restores the same estimate.
        </Callout>

        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Save design
        </Button>

        {saved ? (
          <p className="rounded-card border border-ok/25 bg-ok/5 p-3 text-sm text-ink-muted">
            Saved as{" "}
            <span className="font-mono font-medium text-ok">{saved.reference}</span>.
            You can reopen it from{" "}
            <Link
              href="/my-designs"
              className="font-medium text-brand-green underline underline-offset-2"
            >
              My Designs
            </Link>
            .
          </p>
        ) : null}
      </form>

      <aside className="rounded-card border border-line bg-white p-5">
        <h3 className="eyebrow text-ink-subtle">Saved in this browser</h3>
        {savedDesigns.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing saved yet. Estimated total for the current design is{" "}
            <span className="font-medium text-ink">{formatCurrency(breakdown.total)}</span>.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {savedDesigns.slice(0, 5).map((design) => (
              <li key={design.reference} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-ink">{design.name}</span>
                  <span className="font-mono text-[11px] text-ink-subtle">
                    {design.reference}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-subtle">
                  {formatDate(design.savedAt)} · {formatCurrency(design.estimatedTotal)} (est.)
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function QuoteForm({ onSubmitted }: { onSubmitted: (reference: string) => void }) {
  const submitQuote = useConfiguratorStore((state) => state.submitQuote);
  const selectedServiceIds = useConfiguratorStore((state) => state.selectedServiceIds);
  const breakdown = usePriceBreakdown();
  const validation = useValidation();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cityChoice, setCityChoice] = useState(CITIES[0]);

  // Used by the timing half of the anti-spam check.
  const mountedAt = useRef(Date.now());

  const blocked = !validation.canRequestQuote;
  const isOtherCity = cityChoice === OTHER_CITY;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || submitting) return;

    const form = new FormData(event.currentTarget);

    const spam = checkForSpam({
      honeypotValue: String(form.get(HONEYPOT_FIELD) ?? ""),
      elapsedMs: Date.now() - mountedAt.current,
    });
    if (spam.spam) {
      setSubmitError(
        "That submission looked automated. Please take a moment and try again.",
      );
      return;
    }

    const city = isOtherCity
      ? String(form.get("cityOther") ?? "")
      : String(form.get("city") ?? "");

    const candidate = {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      city,
      preferredContact: String(form.get("preferredContact") ?? "email"),
      message: String(form.get("message") ?? "") || undefined,
      consent: form.get("consent") === "on",
    };

    const parsed = quoteCustomerSchema.safeParse(candidate);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        nextErrors[key] ??= issue.message;
      }
      // The free-text field is what the customer actually sees for "Other".
      if (isOtherCity && nextErrors.city) {
        nextErrors.cityOther = nextErrors.city;
      }
      setErrors(nextErrors);
      setSubmitError(null);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    // Success is shown only after the repository confirms the write. On
    // failure the form keeps everything the customer typed, so retry is free.
    const result = await submitQuote({ customer: parsed.data });
    setSubmitting(false);

    if (result.ok) {
      onSubmitted(result.reference);
      return;
    }
    setSubmitError(
      result.error.retryable
        ? `${result.error.message} Your details are still here — press the button again to retry.`
        : result.error.message,
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4 rounded-card border border-line bg-white p-5">
        <h3 className="font-display text-lg font-semibold text-ink">Your information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.fullName}>
            <TextInput name="fullName" autoComplete="name" placeholder="Your name" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <TextInput name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Phone number" required error={errors.phone}>
            <TextInput name="phone" type="tel" autoComplete="tel" placeholder="+966 5X XXX XXXX" />
          </Field>
          <Field label="Installation city" required error={isOtherCity ? undefined : errors.city}>
            <Select
              name="city"
              value={cityChoice}
              onChange={(event) => setCityChoice(event.target.value)}
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              <option value={OTHER_CITY}>Other…</option>
            </Select>
          </Field>
        </div>

        {/* "Other" must capture a real location, not the word "Other". */}
        {isOtherCity ? (
          <Field
            label="Which city or area?"
            required
            error={errors.cityOther ?? errors.city}
            hint="Tell us where the pavilion will be installed."
          >
            <TextInput
              name="cityOther"
              autoComplete="address-level2"
              placeholder="e.g. Abha, or a district name"
            />
          </Field>
        ) : null}

        <Field label="Preferred contact method">
          <Select name="preferredContact" defaultValue="email">
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Additional services
          </legend>
          <ServicesPicker productSubtotal={breakdown.productSubtotal} />
          <p className="mt-2 text-xs text-ink-subtle">
            The estimate on the right updates with these — it always matches what
            you submit.
          </p>
        </fieldset>

        <Field label="Message" hint="Anything else we should know about the site or the design?">
          <TextArea
            name="message"
            placeholder="I'm interested in this design. Please include delivery and installation."
          />
        </Field>

        {/* Honeypot: hidden from people, tempting to naive bots. */}
        <div aria-hidden className="hidden">
          <label>
            Company website
            <input
              type="text"
              name={HONEYPOT_FIELD}
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </label>
        </div>

        <Field label="" error={errors.consent}>
          <label className="flex items-start gap-2.5 text-sm text-ink-muted">
            <input
              type="checkbox"
              name="consent"
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-green)]"
            />
            <span>
              {IS_DEMO ? (
                <>
                  I understand this is a demo and that nothing is sent to{" "}
                  {BRAND.projectName}.
                </>
              ) : (
                <>
                  I agree that {BRAND.projectName} may store this design and
                  contact me about it. We keep your name, email, phone, location
                  and message for that purpose only, and do not sell or share
                  them.
                </>
              )}
            </span>
          </label>
        </Field>

        {blocked ? (
          <Callout tone="danger" title="Resolve the blocking issues first">
            {validation.blocking.length} selection
            {validation.blocking.length === 1 ? "" : "s"} in this design cannot be
            built together. Go to{" "}
            <Link
              href="/design/validation"
              className="font-medium text-danger underline underline-offset-2"
            >
              Design Validation
            </Link>{" "}
            to see what needs changing.
          </Callout>
        ) : null}

        {submitError ? (
          <Callout tone="danger" title="Your request was not sent">
            {submitError}
          </Callout>
        ) : null}

        <Button type="submit" size="lg" disabled={blocked || submitting} className="w-full sm:w-auto">
          {submitting
            ? IS_DEMO
              ? "Saving…"
              : "Sending…"
            : IS_DEMO
              ? "Create demo request"
              : "Send request"}
        </Button>

        <p className="text-xs text-ink-subtle">
          {IS_DEMO
            ? "Demo mode: the request is stored in this browser and is not sent to anyone."
            : `Our team reviews your design and responds within ${BRAND.quoteResponseDays}.`}
        </p>
      </div>

      <aside className="space-y-4">
        <div className="rounded-card border border-line bg-white p-5">
          <h3 className="eyebrow text-ink-subtle">This request includes</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Estimated total</dt>
              <dd className="font-medium tabular-nums text-ink">
                {formatCurrency(breakdown.total)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Line items</dt>
              <dd className="tabular-nums text-ink">{breakdown.lines.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Services</dt>
              <dd className="tabular-nums text-ink">{selectedServiceIds.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Validation</dt>
              <dd>
                <SeverityBadge severity={validation.status} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Delivery</dt>
              <dd>
                <Badge tone={IS_DEMO ? "warning" : "ok"}>
                  {IS_DEMO ? "This browser only" : "Sent to our team"}
                </Badge>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
            The full configuration, price breakdown and validation results are
            attached to the request. Mode: <span className="font-mono">{APP_MODE}</span>.
          </p>
        </div>

        <Callout tone="info" title="A design review is not an approval">
          Anything marked Engineering Review Required stays open until a
          qualified professional signs it off. Sending this request starts that
          conversation; it does not resolve it.
        </Callout>
      </aside>
    </form>
  );
}
