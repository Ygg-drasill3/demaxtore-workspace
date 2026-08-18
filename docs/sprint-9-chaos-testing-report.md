# Sprint 9 — Chaos Testing Report

**Verdict:** PASS WITH RISK

Automated recovery polls completed. Manual drills required for process kill and DB restart.

- Backend SIGTERM → confirm healthz recovers after restart
- Postgres restart → confirm API returns 503 then recovers
- Network partition → confirm clients retry idempotent mutations
