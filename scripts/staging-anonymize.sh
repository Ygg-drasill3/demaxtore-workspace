#!/usr/bin/env bash
# Anonymize staging DB clone — refuses to run on production database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/apps/backend"
STAGING_DB="${STAGING_DB:-demaxtore_unified_staging}"
PROD_DB="${PROD_DB:-demaxtore}"

if [[ -f "$BACKEND/.env" ]]; then
  BASE_URL="$(grep -E '^DATABASE_URL=' "$BACKEND/.env" | head -1 | cut -d= -f2- | tr -d '"')"
  DB_NAME="${BASE_URL##*/}"
  DB_NAME="${DB_NAME%%\?*}"
else
  DB_NAME=""
fi

if [[ -n "${FORCE_STAGING_ANONYMIZE:-}" ]]; then
  export DATABASE_URL="${BASE_URL%/*}/$STAGING_DB"
elif [[ "$DB_NAME" == "$PROD_DB" ]]; then
  echo "REFUSED: DATABASE_URL points to production ($PROD_DB). Set FORCE_STAGING_ANONYMIZE=1 to target $STAGING_DB"
  export DATABASE_URL="${BASE_URL%/*}/$STAGING_DB"
else
  export DATABASE_URL="${BASE_URL%/*}/$STAGING_DB"
fi
echo "==> Anonymizing staging DB: $STAGING_DB"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE users SET
  email = 'user_' || substr(id::text, 1, 8) || '@staging.local',
  display_name = 'User ' || substr(id::text, 1, 8),
  whatsapp_phone = NULL
WHERE email NOT LIKE '%@staging.local';

UPDATE workspace_messages SET body = '[anonymized staging message]'
WHERE body IS NOT NULL AND body NOT LIKE '[anonymized%';

UPDATE direct_messages SET body = '[anonymized]'
WHERE body IS NOT NULL;

UPDATE whatsapp_messages SET body = '[anonymized]'
WHERE body IS NOT NULL;
SQL

echo "==> Staging anonymization complete"
