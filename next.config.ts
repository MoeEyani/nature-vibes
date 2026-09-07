import type { NextConfig } from "next";

/**
 * `NEXT_PUBLIC_BASE_PATH` is set by the GitHub Pages workflow (to
 * `/<repo-name>`) because a project site is served from a sub-path.
 * Locally it is empty, so `npm run dev` and `npm start` behave normally.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * `NEXT_OUTPUT_EXPORT=1` produces a fully static site in `out/`, which is what
 * GitHub Pages serves. The app has no server-side behaviour — no API routes,
 * no server actions, no dynamic rendering — so nothing is lost by exporting.
 */
const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  ...(isStaticExport
    ? {
        output: "export" as const,
        // Static hosts serve `/design/location/index.html`, not `/design/location`.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
