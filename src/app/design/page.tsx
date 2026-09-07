"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * /design has no content of its own — it is the entry point to the wizard.
 *
 * This redirects on the client rather than with `redirect()` so the route
 * still works under a static export (GitHub Pages), which has no server to
 * issue a redirect response.
 */
export default function DesignIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/design/location");
  }, [router]);

  return (
    <p className="p-8 text-sm text-ink-muted" role="status">
      Opening the configurator…
    </p>
  );
}
