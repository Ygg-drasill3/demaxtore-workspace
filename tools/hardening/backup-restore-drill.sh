#!/usr/bin/env bash
# Sprint 9B — logical backup + optional restore drill (run manually in staging).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${ROOT}/.data/drills/${STAMP}"
mkdir -p "$OUT_DIR"

: "${DATABASE_URL:?Set DATABASE_URL}"

echo "==> Backup to ${OUT_DIR}"
START=$(date +%s)
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="${OUT_DIR}/dmx.dump"
DUMP_SEC=$(( $(date +%s) - START ))

STORAGE_DIR="${STORAGE_DIR:-${ROOT}/.data/uploads}"
if [ -d "$STORAGE_DIR" ]; then
  tar -czf "${OUT_DIR}/uploads.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
fi

cat > "${OUT_DIR}/manifest.json" <<EOF
{
  "stamp": "${STAMP}",
  "dumpSeconds": ${DUMP_SEC},
  "databaseUrlRedacted": true,
  "storageIncluded": $([ -f "${OUT_DIR}/uploads.tar.gz" ] && echo true || echo false)
}
EOF

echo "Backup complete in ${DUMP_SEC}s"
echo "Manifest: ${OUT_DIR}/manifest.json"

if [ "${RUN_RESTORE_DRILL:-0}" = "1" ]; then
  echo "==> Restore drill requires isolated DB — see docs/sprint-9b-backup-restore-validation-report.md"
fi
