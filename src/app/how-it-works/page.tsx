import type { Metadata } from "next";
import { BRAND, DISCLAIMERS } from "@/constants/brand";
import { STEPS } from "@/constants/steps";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "How It Works" };

const REAL_VS_PLACEHOLDER = [
  {
    heading: "Real in this MVP",
    tone: "ok" as const,
    items: [
      "The customer journey, step by step, with state preserved across back/next and page refresh.",
      "A central product catalog with stable ids and SKUs behind every selectable option.",
      "One configuration object driving the 3D scene, the price, the rules and the quote payload.",
      "The pricing engine: line items, quantities, unit prices, subtotals and price status.",
      "The rules engine: dependencies, incompatibilities, geometry, space fit, utilities and safety escalation.",
      "Aquarium volume and mass arithmetic derived from the dimensions you enter.",
      "Local save/resume, a structured quote-request payload and a stable design reference.",
    ],
  },
  {
    heading: "Placeholder — not confirmed",
    tone: "warning" as const,
    items: [
      "Every price. All amounts are seed values marked `placeholder` in the catalog.",
      "Pavilion dimensions, including the 3 × 3 m concept size, frame sections and heights.",
      "Material properties. Descriptions are characteristics, not verified engineering claims.",
      "Aquarium glass thickness, stand design, filtration sizing and load thresholds.",
      "The demo species catalog and every compatibility trait in it.",
      "Plant suitability by climate, orientation and irrigation.",
      "Roof construction, anchoring, wind loading and rooftop capacity.",
      "The 3D geometry, which is procedural placeholder massing rather than a manufacturing model.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-10 sm:px-6">
        <header className="max-w-2xl">
          <p className="eyebrow text-brand-green">The process</p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-ink sm:text-4xl">
            How the configurator works
          </h1>
          <p className="mt-3 leading-relaxed text-ink-muted">
            {BRAND.configuratorName} guides you from where the pavilion will live
            through to a design reference our team can quote against.
          </p>
        </header>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.id} className="rounded-card border border-line bg-white p-5">
              <span className="eyebrow text-ink-subtle">Step {index + 1}</span>
              <h2 className="mt-1.5 font-medium text-ink">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {step.subtitle}
              </p>
              {step.isVisible ? (
                <p className="mt-2 text-xs text-warn">
                  Only shown when the aquarium is enabled.
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink">
            What is real and what is a placeholder
          </h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-muted">
            This prototype validates architecture and customer journey. It does
            not claim product data it does not have.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {REAL_VS_PLACEHOLDER.map((column) => (
              <Callout key={column.heading} tone={column.tone} title={column.heading}>
                <ul className="mt-1 space-y-2">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Callout>
            ))}
          </div>

          <Callout tone="review" title="Safety-critical decisions stay open" className="mt-4">
            {DISCLAIMERS.engineering} Structural capacity, anchoring, rooftop
            limits, electrical work near water, aquarium loads and permitted
            species are all deliberately left as open decisions.
          </Callout>
        </section>

        <div className="mt-12">
          <ButtonLink href="/design/location" size="lg">
            Start designing <span aria-hidden>→</span>
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
