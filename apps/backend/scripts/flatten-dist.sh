#!/usr/bin/env bash
# tsc may emit under dist/apps/backend/src when path aliases pull in monorepo sources.
set -euo pipefail
NESTED="dist/apps/backend/src"
if [ -d "$NESTED" ]; then
  cp -a "$NESTED/." dist/
  rm -rf dist/apps dist/packages
fi
node scripts/fix-esm-imports.mjs
