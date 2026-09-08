#!/usr/bin/env bash
# Is the live site serving the current source?
#
# https://moeeyani.github.io/nature-vibes/ is served from the gh-pages branch,
# and nothing rebuilds that branch automatically. So gh-pages goes stale the
# moment source changes, and visitors keep seeing the previous version until
# someone runs `npm run deploy:pages`.
#
# This answers the question in one command instead of an ad-hoc investigation.
#
#   npm run pages:check      # exit 0 = live site matches HEAD, 1 = stale
#
# Why it is not a plain diff: Next.js embeds a random build ID in every page
# and in one asset directory name, so no two builds are ever byte-identical.
# The reliable signals are the content-hashed files under _next/static/chunks
# and the HTML compared with the build ID normalised away.

set -uo pipefail

BRANCH="gh-pages"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

say() { printf '%s\n' "$*"; }

git fetch -q origin "$BRANCH" 2>/dev/null || {
  say "Could not fetch origin/$BRANCH."; exit 1;
}

HEAD_SHA="$(git rev-parse --short HEAD)"
PAGES_SHA="$(git rev-parse --short "origin/$BRANCH")"
PAGES_SUBJECT="$(git log -1 --format=%s "origin/$BRANCH")"

say "source HEAD      : $HEAD_SHA"
say "origin/$BRANCH   : $PAGES_SHA  ($PAGES_SUBJECT)"

if [ -n "$(git status --porcelain)" ]; then
  say ""
  say "NOTE: the working tree has uncommitted changes, so this compares the"
  say "      live site against your working tree, not against a commit."
fi

say ""
say "building from the current source..."
rm -rf out
if ! npm run --silent build:pages > "$WORK/build.log" 2>&1; then
  say "BUILD FAILED — see the log:"; tail -20 "$WORK/build.log"; exit 1
fi
touch out/.nojekyll

mkdir -p "$WORK/live"
git archive "origin/$BRANCH" | tar -x -C "$WORK/live"

# 1. Content-hashed assets. Identical source produces identical files here.
( cd "$WORK/live/_next/static" && find . -type f -not -path './*/_*Manifest.js' \
    -exec sha256sum {} \; | sort -k2 ) > "$WORK/live.txt"
( cd out/_next/static && find . -type f -not -path './*/_*Manifest.js' \
    -exec sha256sum {} \; | sort -k2 ) > "$WORK/fresh.txt"

ASSETS_OK=0
diff -q "$WORK/live.txt" "$WORK/fresh.txt" >/dev/null || ASSETS_OK=1

# 2. Rendered pages, with both spellings of the build ID normalised. Next
#    writes it with '-' in the directory name and '_' in an HTML comment.
LIVE_ID="$(ls "$WORK/live/_next/static" | grep -vE '^(chunks|css|media)$' | head -1)"
NEW_ID="$(ls out/_next/static | grep -vE '^(chunks|css|media)$' | head -1)"
LIVE_ALT="${LIVE_ID//-/_}"; NEW_ALT="${NEW_ID//-/_}"

PAGES_DIFF=0
while IFS= read -r f; do
  a="$(sed -e "s/$LIVE_ID/BID/g" -e "s/$LIVE_ALT/BID/g" "$WORK/live/$f" 2>/dev/null | sha256sum)"
  b="$(sed -e "s/$NEW_ID/BID/g" -e "s/$NEW_ALT/BID/g" "out/$f" | sha256sum)"
  [ "$a" = "$b" ] || { say "  page differs: $f"; PAGES_DIFF=$((PAGES_DIFF + 1)); }
done < <(cd out && find . \( -name '*.html' -o -name '*.txt' \) | sort)

say ""
say "assets  : $([ $ASSETS_OK -eq 0 ] && echo 'identical' || echo 'DIFFERENT')"
say "pages   : $([ $PAGES_DIFF -eq 0 ] && echo 'identical' || echo "$PAGES_DIFF differ")"
say ""

if [ $ASSETS_OK -eq 0 ] && [ $PAGES_DIFF -eq 0 ]; then
  say "IN SYNC — the live site is serving the current source."
  exit 0
fi

say "STALE — the live site does NOT match the current source."
say "Run: npm run deploy:pages"
exit 1
