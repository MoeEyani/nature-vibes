/**
 * Builds the configurator into ONE self-contained HTML file.
 *
 * This exists so the app can be shared as a single link — no server, no
 * toolchain, no install. It is a demo/distribution path only: `npm run dev`,
 * `npm run build` and the GitHub Pages export are the real builds and are
 * untouched by it.
 *
 * How it works:
 *   1. Tailwind CLI compiles src/app/globals.css (the one source of truth for
 *      the design tokens) into plain CSS.
 *   2. esbuild bundles tools/standalone/entry.tsx, aliasing `next/link` and
 *      `next/navigation` to the hash-router shim so every component in src/
 *      is used unchanged.
 *   3. Both are inlined into one HTML document.
 *
 * Environment: the app reads `process.env.NEXT_PUBLIC_*`, which Next.js inlines
 * at build time. esbuild does not do that on its own, so every variable the app
 * reads is declared in PUBLIC_ENV_KEYS below and inlined here. A variable the
 * app starts reading must be added there, or the bundle will throw
 * "process is not defined" at runtime.
 *
 * Usage:
 *   node tools/standalone/build.mjs [outfile]
 *   node tools/standalone/build.mjs [outfile] --fragment
 *
 * `--fragment` omits the <!doctype>/<html>/<head>/<body> wrapper, for hosts
 * that supply their own document shell (Claude Artifacts, for one).
 */

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Every NEXT_PUBLIC_* variable the application reads. Keep in sync with .env.example. */
const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_APP_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_NOTIFY_WEBHOOK_URL",
  "NEXT_PUBLIC_BASE_PATH",
];

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const asFragment = process.argv.includes("--fragment");
const outFile = args[0] ?? path.join(root, "dist-standalone", "index.html");

/** Redirects Next.js' router imports at the module level. */
const nextShimPlugin = {
  name: "next-shim",
  setup(pluginBuild) {
    const shim = path.join(here, "router.tsx");
    pluginBuild.onResolve({ filter: /^next\/(link|navigation)$/ }, () => ({ path: shim }));
  },
};

console.log("• compiling CSS");
const cssFile = path.join(root, "dist-standalone", "styles.css");
fs.mkdirSync(path.dirname(cssFile), { recursive: true });
execFileSync(
  "npx",
  ["@tailwindcss/cli", "-i", "src/app/globals.css", "-o", cssFile, "--minify"],
  { cwd: root, stdio: "inherit" },
);
const css = fs.readFileSync(cssFile, "utf8");

console.log("• bundling JavaScript");
const result = await build({
  entryPoints: [path.join(here, "entry.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  platform: "browser",
  write: false,
  plugins: [nextShimPlugin],
  loader: { ".svg": "dataurl" },
  define: {
    "process.env.NODE_ENV": '"production"',
    ...Object.fromEntries(
      PUBLIC_ENV_KEYS.map((key) => [
        `process.env.${key}`,
        JSON.stringify(process.env[key] ?? ""),
      ]),
    ),
    // Catch-all so an unlisted lookup yields undefined rather than throwing.
    "process.env": "{}",
  },
  alias: { "@": path.join(root, "src") },
  logLevel: "warning",
});
const js = result.outputFiles[0].text;

const head = `<title>Nature Vibes Configurator</title>
<style>${css}</style>`;
const body = `<div id="nv-root" class="flex min-h-screen flex-col"></div>
<script>${js}</script>`;

const html = asFragment
  ? `${head}\n${body}\n`
  : `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
</head>
<body class="flex min-h-screen flex-col">
${body}
</body>
</html>
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
fs.rmSync(cssFile, { force: true });

const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`✓ ${path.relative(root, outFile)} — ${mb} MB`);
