#!/usr/bin/env bash
# Deprecated example wrapper — production cron should call backup-production.sh directly.
exec "$(cd "$(dirname "$0")" && pwd)/backup-production.sh" "$@"
