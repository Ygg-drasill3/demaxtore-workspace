#!/usr/bin/env bash
# Build workspace frontend and merge into dist (keeps old hashed chunks until manual cleanup).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="$ROOT/apps/frontend/dist-staging"
DIST="$ROOT/apps/frontend/dist"

cd "$ROOT/apps/frontend"
npm run typecheck
npx vite build --outDir dist-staging
mkdir -p "$DIST"
rsync -a "$STAGING/" "$DIST/"
rm -rf "$STAGING"
echo "Deployed to $DIST (old asset chunks retained for in-flight browsers)."
