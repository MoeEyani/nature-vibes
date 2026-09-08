#!/usr/bin/env bash
# Publish the static demo build to the gh-pages branch.
#
# GitHub Pages serves this branch directly ("Deploy from a branch"), which is
# why it must be republished after every source change — Actions cannot do it
# on this account. Run from the repository root.
#
#   ./tools/publish-gh-pages.sh
#
# Note: Next.js embeds a random build ID in every page, so the diff is never
# empty even when nothing changed. Compare the _next/static/chunks hashes to
# tell a real change from a rebuild.

set -euo pipefail

REPO_URL="${REPO_URL:-$(git config --get remote.origin.url)}"
BRANCH="gh-pages"
SOURCE_SHA="$(git rev-parse --short HEAD)"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first so the published build" >&2
  echo "matches a real commit." >&2
  exit 1
fi

echo "• building static export from $SOURCE_SHA"
rm -rf out
npm run build:pages
# Without this, GitHub Pages' Jekyll step drops the _next/ directory.
touch out/.nojekyll

echo "• staging $BRANCH"
cp -r out/. "$STAGING/"
cd "$STAGING"
git init -q
git checkout -qb "$BRANCH"
git add -A
git -c user.name="Nature Vibes Build" -c user.email="build@local" commit -q -m "Publish static build from $SOURCE_SHA

Built with NEXT_OUTPUT_EXPORT=1 and NEXT_PUBLIC_BASE_PATH=/nature-vibes.
Demo mode: quote requests are saved in the visitor's browser only.

Build output only — regenerate with tools/publish-gh-pages.sh."

echo "• pushing to $BRANCH"
git remote add origin "$REPO_URL"
git push -f -u origin "$BRANCH"

echo "✓ published $SOURCE_SHA — GitHub Pages redeploys within a minute or two"
