"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/constants/brand";
import { quoteRequestSchema, type QuoteRequest } from "@/domain/configuration/schema";
import { useConfiguratorStore, usePriceBreakdown, useValidation } from "@/store/useConfiguratorStore";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { SeverityBadge } from "../ValidationList";

const CITIES = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Makkah", "Madinah", "Other"];

const SERVICES = [
  { id: "SVC-DELIVERY", label: "Delivery & installation" },
  { id: "SVC-MAINTENANCE", label: "Maintenance plan" },
  { id: "SVC-CONSULT", label: "Customization consultation" },
  { id: "SVC-SITE-VISIT", label: "Site visit & measurement" },
];

type Tab = "save" | "quote";

export function QuoteStep() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("quote");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Save or request a quote"
        className="grid gap-2 rounded-pill bg-sand/50 p-1 sm:max-w-md sm:grid-cols-2"
      >
        {(
          [
            { id: "save" as const, label: "Save your design" },
            { id: "quote" as const, label: "Request a quote" },
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

      {tab === "save" ? <SavePanel /> : <QuoteForm onSubmitted={() => router.push("/design/success")} />}
    </div>
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
          V1 saves designs in this browser only, using localStorage. There are no
          accounts and nothing is sent to a server. Clearing your browser data
          removes saved designs.
        </Callout>

        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Save design
        </Button>

        {saved ? (
          <p className="rounded-card border border-ok/25 bg-ok/5 p-3 text-sm text-ink-muted">
            Saved as{" "}
            <span className="font-mono font-medium text-ok">{saved.reference}</span>.
            You can reopen it from{" "}
            <a href="/my-designs" className="font-medium text-brand-green underline underline-offset-2">
              My Designs
            </a>
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

function QuoteForm({ onSubmitted }: { onSubmitted: () => void }) {
  const submitQuote = useConfiguratorStore((state) => state.submitQuote);
  const breakdown = usePriceBreakdown();
  const validation = useValidation();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [services, setServices] = useState<string[]>(["SVC-DELIVERY"]);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<QuoteRequest | null>(null);

  const blocked = !validation.canRequestQuote;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;

    const form = new FormData(event.currentTarget);
    const candidate = {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      city: String(form.get("city") ?? ""),
      preferredContact: String(form.get("preferredContact") ?? "email"),
      message: String(form.get("message") ?? "") || undefined,
    };

    const parsed = quoteRequestSchema.shape.customer.safeParse(candidate);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        nextErrors[key] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    // V1 has no backend. The structured payload is built and persisted
    // locally; swapping in a real POST is a one-line change here.
    const quote = submitQuote({
      customer: parsed.data,
      additionalServices: services,
    });
    setPayload(quote);

    window.setTimeout(() => {
      setSubmitting(false);
      onSubmitted();
    }, 350);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
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
          <Field label="Installation city" required error={errors.city}>
            <Select name="city" defaultValue="Riyadh">
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Preferred contact method">
          <Select name="preferredContact" defaultValue="email">
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Additional services</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={services.includes(service.id)}
                  onChange={() =>
                    setServices((current) =>
                      current.includes(service.id)
                        ? current.filter((id) => id !== service.id)
                        : [...current, service.id],
                    )
                  }
                  className="size-4 accent-[var(--color-brand-green)]"
                />
                {service.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Message" hint="Anything else we should know about the site or the design?">
          <TextArea
            name="message"
            placeholder="I'm interested in this design. Please include delivery and installation."
          />
        </Field>

        {blocked ? (
          <Callout tone="danger" title="Resolve the blocking issues first">
            {validation.blocking.length} selection
            {validation.blocking.length === 1 ? "" : "s"} in this design cannot be
            built together. Go back to{" "}
            <a href="/design/validation" className="font-medium text-danger underline underline-offset-2">
              Design Validation
            </a>{" "}
            to see what needs changing.
          </Callout>
        ) : null}

        <Button type="submit" size="lg" disabled={blocked || submitting} className="w-full sm:w-auto">
          {submitting ? "Sending…" : "Send request"}
        </Button>

        <p className="text-xs text-ink-subtle">
          Our team reviews your design and responds within {BRAND.quoteResponseDays}.
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
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Validation</dt>
              <dd>
                <SeverityBadge severity={validation.status} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Price status</dt>
              <dd>
                <Badge tone="warning">
                  {breakdown.isEstimate ? "Placeholder" : "Confirmed"}
                </Badge>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
            The full configuration, price breakdown and validation results are
            attached to the request as a structured payload.
          </p>
        </div>

        {payload ? (
          <details className="rounded-card border border-line bg-white p-5">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Quote request payload
            </summary>
            <pre className="nv-scroll mt-3 max-h-72 overflow-auto rounded-lg bg-deep-green p-3 text-[10px] leading-relaxed text-cream">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </details>
        ) : null}
      </aside>
    </form>
  );
}
