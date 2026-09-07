import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SavedDesignsList } from "@/components/configurator/SavedDesignsList";

export const metadata: Metadata = { title: "My Designs" };

export default function MyDesignsPage() {
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
            V1 stores designs in this browser only. There are no accounts yet, so
            clearing your browser data removes them.
          </p>
        </header>
        <SavedDesignsList />
      </main>
      <SiteFooter />
    </>
  );
}
