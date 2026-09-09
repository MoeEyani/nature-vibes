import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/design/location", label: "Design" },
  { href: "/studio", label: "Studio" },
  { href: "/my-designs", label: "My Designs" },
  { href: "/how-it-works", label: "How It Works" },
];

export function SiteHeader({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const light = tone === "light";

  return (
    <header
      className={
        light
          ? "border-b border-white/10 bg-deep-green"
          : "border-b border-line bg-off-white/90 backdrop-blur"
      }
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo tone={tone} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className={
                light
                  ? "rounded-pill px-3 py-2 text-sm text-cream/80 transition-colors hover:text-cream"
                  : "rounded-pill px-3 py-2 text-sm text-ink-muted transition-colors hover:text-brand-green"
              }
            >
              {entry.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ButtonLink
            href="/design/location"
            size="sm"
            variant={light ? "secondary" : "primary"}
          >
            Start Designing
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
