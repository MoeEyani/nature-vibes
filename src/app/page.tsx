import Link from "next/link";
import { BRAND } from "@/constants/brand";
import { ENVIRONMENTS } from "@/data/catalog";
import { ButtonLink } from "@/components/ui/Button";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HomeHeroPreview } from "@/components/home/HomeHeroPreview";

const PILLARS = [
  { title: "Customizable", body: "Design it your way, within buildable limits." },
  { title: "Indoor & Outdoor", body: "One platform, three environments." },
  { title: "Modular Design", body: "Flexible, expandable, repeatable." },
  { title: "Expert Support", body: "From design through to installation." },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader tone="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-deep-green text-cream">
          <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-20">
            <div>
              <p className="eyebrow text-cream/60">Design · Nature · Wellbeing</p>
              <h1 className="font-display mt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl">
                Create Your
                <br />
                Living Pavilion
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-cream/80">
                Design a space where nature, water and comfort come together —
                then see it, price it and send it to our team.
              </p>

              <div className="mt-8">
                <p className="mb-3 text-sm font-medium text-cream/90">
                  Where will your pavilion be?
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {ENVIRONMENTS.filter((item) => item.status === "active").map((item) => (
                    <Link
                      key={item.id}
                      href="/design/location"
                      className="group rounded-card border border-cream/15 bg-white/5 p-4 transition-colors hover:border-cream/40 hover:bg-white/10"
                    >
                      <span className="block font-medium">{item.name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-cream/60">
                        {item.tags?.join(" · ")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ButtonLink href="/design/location" size="lg" variant="secondary">
                  Start Designing <span aria-hidden>→</span>
                </ButtonLink>
                <Link
                  href="/how-it-works"
                  className="text-sm text-cream/80 underline-offset-4 hover:underline"
                >
                  How it works
                </Link>
              </div>
            </div>

            <HomeHeroPreview />
          </div>

          {/* Pillars */}
          <div className="border-t border-white/10 bg-black/20">
            <ul className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
              {PILLARS.map((pillar) => (
                <li key={pillar.title}>
                  <p className="font-medium">{pillar.title}</p>
                  <p className="mt-0.5 text-sm text-cream/60">{pillar.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What this MVP is */}
        <section className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="eyebrow text-brand-green">About this prototype</p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-ink">
                A working configurator, not a mockup
              </h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                Every option you can pick comes from a central product catalog.
                Your choices drive one configuration object, and that single
                object drives the 3D preview, the price breakdown, the
                compatibility checks and the quote payload.
              </p>
              <p className="mt-3 leading-relaxed text-ink-muted">
                It is deliberately honest about what it does not know: all
                dimensions, weights and prices are placeholder seed values, and
                anything safety-critical is flagged for qualified engineering
                review rather than approved.
              </p>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  term: "Catalog-driven",
                  detail:
                    "Options, prices, dependencies and incompatibilities all live in seed data with stable SKUs.",
                },
                {
                  term: "Live 3D",
                  detail:
                    "Roof, seating, aquarium, planting and add-ons each map to an asset key and visibly change the scene.",
                },
                {
                  term: "Pricing engine",
                  detail:
                    "configuration + catalog → line items → estimated total. No component computes money on its own.",
                },
                {
                  term: "Rules engine",
                  detail:
                    "Explicit rules return OK, Warning, Engineering Review Required or Incompatible — never a silent failure.",
                },
              ].map((entry) => (
                <div key={entry.term} className="rounded-card border border-line bg-white p-5">
                  <dt className="font-medium text-ink">{entry.term}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {entry.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="border-y border-line bg-cream/40">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Ready to configure one?
              </h2>
              <p className="mt-1 text-ink-muted">
                Fourteen steps, from location to a design reference you can quote.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/design/location" size="lg">
                Start Designing <span aria-hidden>→</span>
              </ButtonLink>
              <ButtonLink href="/my-designs" size="lg" variant="secondary">
                My saved designs
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
          <p className="max-w-3xl text-sm leading-relaxed text-ink-subtle">
            <span className="font-medium text-ink-muted">Naming note.</span> The
            original concept imagery for this project uses the temporary name{" "}
            <span className="font-medium">{BRAND.mockupAlias}</span>. That is a
            mockup alias only. The confirmed brand is{" "}
            <span className="font-medium">{BRAND.projectName}</span>, and the
            product name is still an open decision.
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
