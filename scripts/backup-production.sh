#!/usr/bin/env bash
# DeMaxtore production backup — DB + uploads as one atomic backup set.
# Designed for unattended cron/systemd execution (no interactive shell required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/apps/backend/.env"
BACKUP_ROOT="${BACKUP_ROOT:-${ROOT}/.data/backups}"
STATE_DIR="${BACKUP_ROOT}/.state"
LOCK_FILE="${BACKUP_ROOT}/.backup.lock"
LOG_TAG="demaxtore-backup"

R4_POD_CANARY="${R4_POD_CANARY:-1a62dab4-57b6-4150-bc21-b9cb4e1f3ca8.pdf}"
R4_MARKER="${R4_MARKER:-MVP-UI17-R4-20260814-R2M5}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STALE_THRESHOLD_HOURS="${STALE_THRESHOLD_HOURS:-26}"

BACKUP_ID=""
OUT_DIR=""
STARTED_AT=""
DB_ARTIFACT=""
UPLOADS_ARTIFACT=""
OVERALL_STATUS="FAILED"
FAIL_REASON=""
OFFHOST_STATUS="not_configured"

log() {
  local level="$1"
  shift
  local msg="[$level] $(date -Is) backupId=${BACKUP_ID:-pending} $*"
  echo "$msg"
  if command -v logger >/dev/null 2>&1; then
    local priority="user.info"
    [[ "$level" == "ERROR" ]] && priority="user.err"
    [[ "$level" == "WARN" ]] && priority="user.warning"
    logger -t "$LOG_TAG" -p "$priority" -- "$*"
  fi
}

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    log ERROR "Missing env file: $ENV_FILE"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  : "${DATABASE_URL:?DATABASE_URL must be set in $ENV_FILE}"
}

resolve_storage_dir() {
  local configured="${STORAGE_DIR:-./.data/uploads}"
  local resolved=""
  if [[ "$configured" == /* ]]; then
    resolved="$configured"
  else
    resolved="${ROOT}/apps/backend/${configured#./}"
  fi
  echo "$resolved"
}

validate_storage_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    FAIL_REASON="STORAGE_DIR missing: $dir"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  if [[ ! -r "$dir" ]]; then
    FAIL_REASON="STORAGE_DIR not readable: $dir"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  if [[ ! -f "${dir}/${R4_POD_CANARY}" ]]; then
    FAIL_REASON="R4 POD canary missing in storage: ${dir}/${R4_POD_CANARY}"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  log INFO "STORAGE_DIR validated: $dir (R4 POD canary present)"
}

write_state() {
  local file="$1"
  local payload="$2"
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$payload" > "$file"
}

mark_failure() {
  local reason="${1:-unknown}"
  OVERALL_STATUS="FAILED"
  FAIL_REASON="$reason"
  if [[ -n "$OUT_DIR" && -d "$OUT_DIR" ]]; then
    printf '%s\n' "$reason" > "${OUT_DIR}/.backup-failed"
    rm -f "${OUT_DIR}/.backup-complete"
  fi
  write_state "${STATE_DIR}/latest-failure.json" "$(cat <<EOF
{
  "backupId": "${BACKUP_ID}",
  "status": "FAILED",
  "reason": "${reason}",
  "failedAt": "$(date -Is)",
  "outDir": "${OUT_DIR}"
}
EOF
)"
  write_state "${STATE_DIR}/last-run.json" "$(cat <<EOF
{
  "backupId": "${BACKUP_ID}",
  "status": "FAILED",
  "startedAt": "${STARTED_AT}",
  "completedAt": "$(date -Is)",
  "reason": "${reason}"
}
EOF
)"
  log ERROR "BACKUP FAILED: $reason"
}

mark_success() {
  OVERALL_STATUS="SUCCESS"
  touch "${OUT_DIR}/.backup-complete"
  rm -f "${OUT_DIR}/.backup-failed"
  write_state "${STATE_DIR}/latest-success.json" "$(cat <<EOF
{
  "backupId": "${BACKUP_ID}",
  "status": "SUCCESS",
  "completedAt": "$(date -Is)",
  "outDir": "${OUT_DIR}",
  "databaseArtifact": "${DB_ARTIFACT}",
  "uploadsArtifact": "${UPLOADS_ARTIFACT}"
}
EOF
)"
  write_state "${STATE_DIR}/last-run.json" "$(cat <<EOF
{
  "backupId": "${BACKUP_ID}",
  "status": "SUCCESS",
  "startedAt": "${STARTED_AT}",
  "completedAt": "$(date -Is)",
  "outDir": "${OUT_DIR}"
}
EOF
)"
  log INFO "BACKUP SUCCESS: ${OUT_DIR}"
}

validate_db_artifact() {
  local file="$1"
  if [[ ! -s "$file" ]]; then
    FAIL_REASON="Database artifact missing or zero bytes: $file"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  if ! pg_restore --list "$file" >/dev/null 2>&1; then
    FAIL_REASON="Database artifact failed pg_restore --list validation"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  log INFO "Database artifact validated ($(stat -c%s "$file") bytes)"
}

validate_uploads_artifact() {
  local file="$1"
  local storage_dir="$2"
  local tar_member="uploads/${R4_POD_CANARY}"
  if [[ ! -s "$file" ]]; then
    FAIL_REASON="Uploads artifact missing or zero bytes: $file"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  if ! tar -tzf "$file" >/dev/null 2>&1; then
    FAIL_REASON="Uploads artifact is not a readable tar.gz archive"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  if ! tar -tzf "$file" "$tar_member" >/dev/null 2>&1; then
    FAIL_REASON="R4 POD canary not found in uploads archive at ${tar_member}"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  log INFO "Uploads artifact validated ($(stat -c%s "$file") bytes, R4 POD present)"
}

write_manifest() {
  local status="$1"
  mkdir -p "$OUT_DIR"
  if [[ ! -f "${OUT_DIR}/${DB_ARTIFACT}" || ! -f "${OUT_DIR}/${UPLOADS_ARTIFACT}" ]]; then
    cat > "${OUT_DIR}/manifest.json" <<EOF
{
  "backupId": "${BACKUP_ID}",
  "startedAt": "${STARTED_AT}",
  "completedAt": "$(date -Is)",
  "status": "${status}",
  "storageDir": "${STORAGE_DIR_ABS:-}",
  "offHostStatus": "${OFFHOST_STATUS}",
  "failureReason": "${FAIL_REASON}",
  "applicationRoot": "${ROOT}"
}
EOF
    return 0
  fi
  local db_size uploads_size db_sha uploads_sha
  db_size="$(stat -c%s "${OUT_DIR}/${DB_ARTIFACT}")"
  uploads_size="$(stat -c%s "${OUT_DIR}/${UPLOADS_ARTIFACT}")"
  db_sha="$(sha256sum "${OUT_DIR}/${DB_ARTIFACT}" | awk '{print $1}')"
  uploads_sha="$(sha256sum "${OUT_DIR}/${UPLOADS_ARTIFACT}" | awk '{print $1}')"
  cat > "${OUT_DIR}/manifest.json" <<EOF
{
  "backupId": "${BACKUP_ID}",
  "startedAt": "${STARTED_AT}",
  "completedAt": "$(date -Is)",
  "status": "${status}",
  "databaseArtifact": "${DB_ARTIFACT}",
  "databaseSizeBytes": ${db_size},
  "databaseSha256": "${db_sha}",
  "databaseValidation": "${status}",
  "uploadsArtifact": "${UPLOADS_ARTIFACT}",
  "uploadsSizeBytes": ${uploads_size},
  "uploadsSha256": "${uploads_sha}",
  "uploadsValidation": "${status}",
  "storageDir": "${STORAGE_DIR_ABS}",
  "r4PodCanary": "${R4_POD_CANARY}",
  "r4Marker": "${R4_MARKER}",
  "offHostStatus": "${OFFHOST_STATUS}",
  "applicationRoot": "${ROOT}"
}
EOF
}

replicate_offhost() {
  local dest="${BACKUP_OFFHOST_DIR:-}"
  if [[ -z "$dest" ]]; then
    OFFHOST_STATUS="not_configured"
    log WARN "Off-host replication not configured (BACKUP_OFFHOST_DIR unset)"
    return 0
  fi
  if [[ ! -d "$dest" ]]; then
    OFFHOST_STATUS="failed"
    FAIL_REASON="Off-host destination missing: $dest"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  local remote="${dest%/}/${BACKUP_ID}"
  mkdir -p "$remote"
  cp -a "${OUT_DIR}/." "$remote/"
  if [[ ! -f "${remote}/.backup-complete" ]]; then
    OFFHOST_STATUS="failed"
    FAIL_REASON="Off-host replication verification failed"
    log ERROR "$FAIL_REASON"
    return 1
  fi
  OFFHOST_STATUS="success"
  log INFO "Off-host replication complete: $remote"
}

apply_retention() {
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
    ! -name '.state' \
    -mtime "+${RETENTION_DAYS}" \
    -exec rm -rf {} +
  log INFO "Retention applied (${RETENTION_DAYS} days)"
}

run_backup() {
  STARTED_AT="$(date -Is)"
  BACKUP_ID="$(date +%Y%m%d-%H%M%S)"
  OUT_DIR="${BACKUP_ROOT}/${BACKUP_ID}"
  DB_ARTIFACT="dmx.dump"
  UPLOADS_ARTIFACT="uploads.tar.gz"
  mkdir -p "$OUT_DIR" "$STATE_DIR"

  log INFO "Backup started"

  STORAGE_DIR_ABS="$(resolve_storage_dir)"
  if [[ "${BACKUP_TEST_INVALID_STORAGE:-}" == "1" ]]; then
    STORAGE_DIR_ABS="/tmp/demaxtore-backup-invalid-storage-${BACKUP_ID}"
  fi
  if ! validate_storage_dir "$STORAGE_DIR_ABS"; then
    mark_failure "$FAIL_REASON"
    write_manifest "FAILED"
    return 1
  fi

  log INFO "Database backup started"
  if ! pg_dump "$DATABASE_URL" --format=custom --no-owner --file="${OUT_DIR}/${DB_ARTIFACT}"; then
    mark_failure "pg_dump failed"
    write_manifest "FAILED"
    return 1
  fi
  if ! validate_db_artifact "${OUT_DIR}/${DB_ARTIFACT}"; then
    mark_failure "$FAIL_REASON"
    write_manifest "FAILED"
    return 1
  fi
  log INFO "Database backup complete"

  if [[ "${BACKUP_TEST_SKIP_UPLOADS:-}" == "1" ]]; then
    mark_failure "Simulated uploads failure (BACKUP_TEST_SKIP_UPLOADS=1)"
    write_manifest "FAILED"
    return 1
  fi

  log INFO "Uploads backup started from ${STORAGE_DIR_ABS}"
  if ! tar -czf "${OUT_DIR}/${UPLOADS_ARTIFACT}" -C "$(dirname "$STORAGE_DIR_ABS")" "$(basename "$STORAGE_DIR_ABS")"; then
    mark_failure "uploads tar failed"
    write_manifest "FAILED"
    return 1
  fi
  if ! validate_uploads_artifact "${OUT_DIR}/${UPLOADS_ARTIFACT}" "$STORAGE_DIR_ABS"; then
    mark_failure "$FAIL_REASON"
    write_manifest "FAILED"
    return 1
  fi
  log INFO "Uploads backup complete"

  if ! replicate_offhost; then
    mark_failure "$FAIL_REASON"
    write_manifest "FAILED"
    return 1
  fi

  write_manifest "SUCCESS"
  mark_success
  apply_retention
  return 0
}

main() {
  load_env
  mkdir -p "$BACKUP_ROOT" "$STATE_DIR"
  exec 200>"$LOCK_FILE"
  if ! flock -n 200; then
    log ERROR "Another backup run is in progress"
    exit 1
  fi

  local start_ts end_ts duration
  start_ts="$(date +%s)"
  if run_backup; then
    end_ts="$(date +%s)"
    duration=$((end_ts - start_ts))
    log INFO "Finished SUCCESS duration=${duration}s"
    exit 0
  fi
  end_ts="$(date +%s)"
  duration=$((end_ts - start_ts))
  log ERROR "Finished FAILED duration=${duration}s reason=${FAIL_REASON}"
  exit 1
}

main "$@"
