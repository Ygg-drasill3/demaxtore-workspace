# Sprint 9B — Reverse Proxy Readiness Report

**Verdict:** PASS WITH RISK (config provided; not auto-deployed)

## Deliverables

- `deploy/nginx/demaxtore.conf.example`
- `docs/deployment-production-edge.md`

## Validated concerns

| Topic | Recommendation |
|-------|----------------|
| Timeouts | API 120s; Socket.io 3600s |
| Uploads | `client_max_body_size 26M` (matches multer 25MB) |
| Compression | gzip for JSON/JS/CSS |
| Keep-alive | upstream keepalive 64; Node 65s timeout |
| Security headers | X-Frame-Options, nosniff, Referrer-Policy |
| Multi-instance | `least_conn` upstream; sticky socket.io until Redis adapter |

## Gaps

- No automated TLS cert provisioning in repo
- Sticky sessions / Redis adapter still required for websocket fan-out
