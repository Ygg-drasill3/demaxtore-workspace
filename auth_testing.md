# DeMaxtore Auth Testing Playbook

Reference for the testing agent. Auth implementation: Node.js + Express + Prisma/PostgreSQL + JWT (access 15min, refresh 7d, rotation).

## DB Verification

```bash
PGPASSWORD=dmx_dev psql -h 127.0.0.1 -U dmx -d dmx -c "SELECT email, role FROM users;"
PGPASSWORD=dmx_dev psql -h 127.0.0.1 -U dmx -d dmx -c "SELECT count(*) FROM refresh_tokens;"
```

Verify: bcrypt hashes start with `$2a$` or `$2b$`. `users.email` is unique.

## API Smoke Tests

Backend on port 8001. All endpoints under `/api/auth`.

```bash
# 1. Login (sets refresh cookie, returns access token in JSON)
curl -c /tmp/dmx.cookies -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demaxtore.local","password":"Passw0rd!"}'

# Expected: 200 { accessToken, user: { id, email, role, displayName } }

# 2. /me with Bearer token
TOKEN=<accessToken from step 1>
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/auth/me
# Expected: 200 { id, email, role, ... }

# 3. Refresh (uses cookie)
curl -b /tmp/dmx.cookies -X POST http://localhost:8001/api/auth/refresh
# Expected: 200 { accessToken }, new refresh cookie (rotation)

# 4. Bad password
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demaxtore.local","password":"wrong"}'
# Expected: 401 { error: { code: "INVALID_CREDENTIALS" } }

# 5. Logout
curl -b /tmp/dmx.cookies -X POST http://localhost:8001/api/auth/logout
# Expected: 200; refresh cookie cleared, DB row revoked.

# 6. Forgot password (always 200)
curl -X POST http://localhost:8001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer1@acme.test"}'
# Expected: 200 { ok: true }, reset link logged to server console.
```

## RBAC test

```bash
# /api/notifications requires authenticated user.
curl http://localhost:8001/api/notifications
# Expected: 401

curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/notifications
# Expected: 200 { items: [...] }
```

## Health

```bash
curl http://localhost:8001/api/healthz
# Expected: 200 { status: "ok", db: "up" }
```

## Seeded test users (password = `Passw0rd!`)

- `admin@demaxtore.local` · ADMIN
- `buyer1@acme.test` · BUYER
- `buyer2@beta.test` · BUYER
- `supplier1@acme-mfg.test` · SUPPLIER
- `supplier1@beta-industries.test` · SUPPLIER
