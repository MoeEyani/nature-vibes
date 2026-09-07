import { ButtonLink } from "@/components/ui/Button";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="eyebrow text-brand-green">404</p>
        <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
          That page does not exist
        </h1>
        <p className="mt-2 text-ink-muted">
          The link may be out of date, or the design step may not be part of the
          current flow.
        </p>
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
