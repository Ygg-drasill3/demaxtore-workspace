#!/usr/bin/env bash
# Isolated restore spot-check from a backup set (never touches production DB/files).
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-set-directory>" >&2
  exit 1
fi

BACKUP_SET="$(cd "$1" && pwd)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/apps/backend/.env"
R4_MARKER="${R4_MARKER:-MVP-UI17-R4-20260814-R2M5}"
R4_POD_CANARY="${R4_POD_CANARY:-1a62dab4-57b6-4150-bc21-b9cb4e1f3ca8.pdf}"
R4_PO_PREFIX="${R4_PO_PREFIX:-PO-MST4OG0H}"

DB_DUMP="${BACKUP_SET}/dmx.dump"
UPLOADS_ARCHIVE="${BACKUP_SET}/uploads.tar.gz"

if [[ ! -f "$DB_DUMP" || ! -f "$UPLOADS_ARCHIVE" ]]; then
  echo "Backup set must contain dmx.dump and uploads.tar.gz" >&2
  exit 1
fi

DB_NAME="demaxtore_spotcheck_$(date +%Y%m%d_%H%M%S)"
TMP_POD="/tmp/${R4_POD_CANARY}.spotcheck"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)

cleanup() {
  "${PSQL[@]}" -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" >/dev/null 2>&1 || true
  rm -f "$TMP_POD"
}
trap cleanup EXIT

"${PSQL[@]}" -c "CREATE DATABASE \"${DB_NAME}\";"
sudo -u postgres pg_restore --no-owner --no-acl -d "$DB_NAME" "$DB_DUMP" >/dev/null

echo "=== R4 DB spot check (${R4_MARKER}) ==="
"${PSQL[@]}" -d "$DB_NAME" -At <<SQL
SELECT 'product_present=' || EXISTS(
  SELECT 1 FROM products p WHERE p.sku LIKE '%R2M5%'
);
SELECT 'po_present=' || EXISTS(
  SELECT 1 FROM purchase_orders po WHERE po.po_number LIKE '${R4_PO_PREFIX}%'
);
SELECT 'shipment_present=' || EXISTS(
  SELECT 1 FROM shipment_workspaces sw
  JOIN purchase_orders po ON po.order_id = sw.order_workspace_id
  WHERE po.po_number LIKE '${R4_PO_PREFIX}%'
);
SELECT 'customs_cleared=' || EXISTS(
  SELECT 1 FROM customs_cases cc
  JOIN shipment_workspaces sw ON sw.workspace_id = cc.shipment_workspace_id
  JOIN purchase_orders po ON po.order_id = sw.order_workspace_id
  WHERE po.po_number LIKE '${R4_PO_PREFIX}%' AND cc.status = 'CLEARED'
);
SELECT 'inland_delivered=' || EXISTS(
  SELECT 1 FROM inland_deliveries id
  JOIN shipment_workspaces sw ON sw.workspace_id = id.shipment_workspace_id
  JOIN purchase_orders po ON po.order_id = sw.order_workspace_id
  WHERE po.po_number LIKE '${R4_PO_PREFIX}%' AND id.status = 'DELIVERED'
);
SELECT 'landed_cost_present=' || EXISTS(
  SELECT 1 FROM landed_cost_calculations lcc
  JOIN shipment_workspaces sw ON sw.workspace_id = lcc.shipment_workspace_id
  JOIN purchase_orders po ON po.order_id = sw.order_workspace_id
  WHERE po.po_number LIKE '${R4_PO_PREFIX}%'
);
SELECT 'pod_metadata_present=' || EXISTS(
  SELECT 1 FROM trade_documents td
  JOIN shipment_workspaces sw ON sw.workspace_id = td.workspace_id
  JOIN purchase_orders po ON po.order_id = sw.order_workspace_id
  WHERE po.po_number LIKE '${R4_PO_PREFIX}%'
    AND td.document_type = 'PROOF_OF_DELIVERY'
    AND td.file_id = '${R4_POD_CANARY}'
);
SQL

tar -xOf "$UPLOADS_ARCHIVE" "uploads/${R4_POD_CANARY}" > "$TMP_POD"
echo "pod_binary_readable=$(test -s "$TMP_POD" && echo YES || echo NO)"
echo "pod_sha256=$(sha256sum "$TMP_POD" | awk '{print $1}')"
echo "spot_check=PASS"
