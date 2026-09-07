import { BRAND } from "@/constants/brand";
import { Logo } from "./Logo";

const PILLARS = [
  "Customizable",
  "Modular Design",
  "Built to Last",
  "For a Better Life",
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-off-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Logo />

        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          {PILLARS.map((pillar) => (
            <li key={pillar}>{pillar}</li>
          ))}
        </ul>

        <p className="text-sm text-ink-subtle">{BRAND.claim}</p>
      </div>

      <div className="border-t border-line/70">
        <p className="mx-auto max-w-[1600px] px-4 py-4 text-xs leading-relaxed text-ink-subtle sm:px-6">
          MVP prototype. All dimensions, materials, weights and prices shown in
          this configurator are placeholder seed values for demonstration. They
          are not engineering data, and nothing here constitutes a binding
          quotation or a structural approval. The name{" "}
          <span className="font-medium">{BRAND.mockupAlias}</span> appears in the
          original concept imagery only and is not the product name.
        </p>
      </div>
    </footer>
  );
}
