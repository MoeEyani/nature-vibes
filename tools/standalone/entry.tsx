"use client";

/**
 * Entry point for the single-file standalone demo build.
 *
 * It renders the same page components the Next.js app renders, selected by the
 * hash route. Nothing in `src/` is duplicated or modified.
 */

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { isStepId, type StepId } from "@/constants/steps";
import { ConfiguratorShell } from "@/components/configurator/ConfiguratorShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SavedDesignsList } from "@/components/configurator/SavedDesignsList";
import { ButtonLink } from "@/components/ui/Button";
import HomePage from "@/app/page";
import HowItWorksPage from "@/app/how-it-works/page";
import { usePathname } from "./router";

function MyDesignsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8 max-w-2xl">
          <p className="eyebrow text-brand-green">Saved locally</p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-ink sm:text-4xl">
            My Designs
          </h1>
          <p className="mt-2 leading-relaxed text-ink-muted">
            Designs are stored in this browser only. There are no accounts yet,
            so clearing your browser data removes them.
          </p>
        </header>
        <SavedDesignsList />
      </main>
      <SiteFooter />
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="eyebrow text-brand-green">404</p>
        <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
          That page does not exist
        </h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/design/location">Start designing</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back home
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function App() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "") return <HomePage />;
  if (pathname === "/how-it-works") return <HowItWorksPage />;
  if (pathname === "/my-designs") return <MyDesignsPage />;

  if (pathname === "/design" || pathname === "/design/") {
    return (
      <>
        <SiteHeader />
        <ConfiguratorShell stepId="location" />
      </>
    );
  }

  const match = pathname.match(/^\/design\/([a-z-]+)\/?$/);
  if (match && isStepId(match[1])) {
    return (
      <>
        <SiteHeader />
        <ConfiguratorShell stepId={match[1] as StepId} />
      </>
    );
  }

  return <NotFoundPage />;
}

const container = document.getElementById("nv-root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
