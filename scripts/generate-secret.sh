#!/usr/bin/env bash
# Generate cryptographically secure secrets for DeMaxtore production env.
# Usage:
#   ./scripts/generate-secret.sh                    # print one secret (64 hex chars)
#   ./scripts/generate-secret.sh --min-bytes 32   # custom byte length (min 32)
#   ./scripts/generate-secret.sh --verify "$VAL"  # exit 0 if length >= 32
set -euo pipefail

MIN_BYTES=32

while [[ $# -gt 0 ]]; do
  case "$1" in
    --min-bytes) MIN_BYTES="${2:?}"; shift 2 ;;
    --verify)
      VAL="${2:?}"
      if [[ ${#VAL} -lt 32 ]]; then
        echo "FAIL: secret length ${#VAL} < 32" >&2
        exit 1
      fi
      echo "OK: length ${#VAL} >= 32"
      exit 0
      ;;
    -h|--help)
      echo "Usage: $0 [--min-bytes N] [--verify VALUE]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ "$MIN_BYTES" -lt 32 ]]; then
  echo "MIN_BYTES must be >= 32" >&2
  exit 1
fi

openssl rand -hex "$MIN_BYTES"
