# DeMaxtore — Sprint 1 Technical Design Document (TDD)

> **Status:** Approved stack — frozen.
> **Audience:** Engineers implementing Sprint 1 on the official DeMaxtore stack.
> **Companion files:**
> - `./sprint-1-prisma-schema.prisma`
> - `./sprint-1-env.example.txt`
> - Reference live prototype (alternate stack — FastAPI + Mongo + CRA): `/app/backend`, `/app/frontend` — to be used as a **visual / UX reference only**, not as code baseline.

---

## 0. Stack lock (FROZEN — do not substitute)

| Layer        | Choice                              | Notes |
|--------------|-------------------------------------|-------|
| Frontend     | **React 18 + Vite 5 + TailwindCSS** | Vite dev server on port 5173, build output to `dist/` |
| State / data | **TanStack Query (server state) + Zustand (auth/ui state)** | No Redux |
| Routing      | **react-router-dom v6**             | |
| Forms        | **react-hook-form + zod**           | |
| UI primitives| **Radix UI + custom Tailwind**      | Match existing prototype aesthetic |
| Icons        | **lucide-react**                    | |
| Toaster      | **sonner**                          | |
| Backend      | **Node.js 20 LTS + Express 4**      | Port 4000 |
| ORM / DB     | **Prisma 5 + PostgreSQL 16**        | |
| Validation   | **zod**                             | Same schema sharing FE ↔ BE through a `packages/contracts` workspace |
| Auth         | **JWT access (60m) + JWT refresh (7d) rotated** | Refresh token in `httpOnly` cookie, access token returned in JSON body |
| Realtime     | **socket.io 4**                     | Sprint 1: gateway exists, only one demo channel emitted |
| Process mgr  | **PM2**                             | Production VPS |
| Reverse proxy| **Nginx**                           | TLS termination, WebSocket upgrade |
| Deploy host  | **Ubuntu 22.04 VPS**                | |

**Explicitly disallowed:** FastAPI, MongoDB, CRA, Django, Laravel, Firebase, Supabase, Next.js.

---

## 1. Monorepo folder structure

A pnpm workspace monorepo. This keeps shared zod contracts in lock-step between FE and BE.

```
demaxtore/
├── pnpm-workspace.yaml
├── package.json
├── README.md
├── .editorconfig
├── .gitignore
├── .nvmrc                              # 20.x
│
├── packages/
│   └── contracts/                      # SHARED zod schemas + TS types
│       ├── package.json                # "name": "@dmx/contracts"
│       ├── tsconfig.json
│       └── src/
│           ├── auth.ts                 # LoginInput, TokenPair, etc.
│           ├── user.ts                 # UserDTO, Role
│           ├── workspace.ts            # WorkspaceDTO, WorkspaceType, State
│           ├── notification.ts         # NotificationDTO, NotificationType
│           ├── socket.ts               # SocketEventMap (typed channels)
│           └── index.ts
│
├── apps/
│   ├── backend/                        # Express + Prisma + socket.io
│   │   ├── package.json                # "name": "@dmx/backend"
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # ← copy of /docs/sprint-1-prisma-schema.prisma
│   │   │   ├── migrations/             # generated
│   │   │   └── seed.ts                 # idempotent admin/buyer/supplier seed
│   │   └── src/
│   │       ├── index.ts                # entrypoint — boots HTTP + socket.io
│   │       ├── app.ts                  # express factory (no listen)
│   │       ├── env.ts                  # zod-validated process.env
│   │       ├── logger.ts               # pino instance
│   │       ├── db.ts                   # PrismaClient singleton
│   │       │
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── auth.routes.ts
│   │       │   │   ├── auth.controller.ts
│   │       │   │   ├── auth.service.ts
│   │       │   │   ├── auth.middleware.ts   # requireAuth, requireRole
│   │       │   │   ├── jwt.ts               # sign/verify access+refresh
│   │       │   │   ├── password.ts          # bcrypt helpers
│   │       │   │   └── auth.test.ts
│   │       │   ├── users/
│   │       │   │   ├── users.routes.ts      # /api/users/me etc.
│   │       │   │   └── users.service.ts
│   │       │   ├── workspaces/
│   │       │   │   ├── workspaces.routes.ts # /api/workspaces, /api/workspaces/:id
│   │       │   │   ├── workspaces.controller.ts
│   │       │   │   ├── workspaces.service.ts
│   │       │   │   └── workspaces.policy.ts # participant-based authz
│   │       │   └── notifications/
│   │       │       ├── notifications.routes.ts
│   │       │       ├── notifications.controller.ts
│   │       │       └── notifications.service.ts
│   │       │
│   │       ├── realtime/
│   │       │   ├── socket.ts                 # io = new Server(httpServer)
│   │       │   ├── socket.auth.ts            # JWT handshake middleware
│   │       │   ├── socket.rooms.ts           # room helpers (user:{id}, ws:{id}, role:{ROLE})
│   │       │   └── emitters/
│   │       │       └── notifications.emitter.ts
│   │       │
│   │       ├── middlewares/
│   │       │   ├── errorHandler.ts
│   │       │   ├── requestId.ts
│   │       │   └── rateLimit.ts
│   │       │
│   │       └── utils/
│   │           ├── asyncHandler.ts
│   │           ├── httpErrors.ts             # AppError, 400/401/403/404/409
│   │           └── seedNotifications.ts
│   │
│   └── frontend/                       # Vite + React + Tailwind
│       ├── package.json                # "name": "@dmx/frontend"
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── tsconfig.json
│       ├── .env.example
│       └── src/
│           ├── main.tsx                # createRoot
│           ├── App.tsx                 # <BrowserRouter><Routes>…
│           ├── index.css               # tailwind + fonts (Outfit + Inter)
│           │
│           ├── lib/
│           │   ├── api.ts              # axios instance, refresh-rotation
│           │   ├── socket.ts           # socket.io client singleton
│           │   ├── env.ts              # import.meta.env access
│           │   └── cn.ts               # clsx + tailwind-merge
│           │
│           ├── store/
│           │   └── auth.store.ts       # Zustand: user, accessToken, hydrate()
│           │
│           ├── routes/
│           │   ├── ProtectedRoute.tsx
│           │   ├── RoleRoute.tsx
│           │   └── routeMap.ts         # central source of truth
│           │
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AppShell.tsx
│           │   │   ├── Sidebar.tsx
│           │   │   ├── TopNav.tsx
│           │   │   ├── NotificationBell.tsx
│           │   │   └── UserMenu.tsx
│           │   ├── common/
│           │   │   ├── StatusBadge.tsx
│           │   │   ├── WidgetCard.tsx
│           │   │   └── EmptyState.tsx
│           │   └── ui/                 # primitive components (Button, Input, etc.)
│           │
│           ├── features/
│           │   ├── auth/
│           │   │   ├── LoginPage.tsx
│           │   │   ├── ForgotPasswordPage.tsx
│           │   │   └── ResetPasswordPage.tsx
│           │   ├── dashboards/
│           │   │   ├── BuyerDashboard.tsx
│           │   │   ├── SupplierDashboard.tsx
│           │   │   └── AdminDashboard.tsx
│           │   ├── workspaces/
│           │   │   └── WorkspacePage.tsx    # placeholder shell
│           │   └── notifications/
│           │       ├── NotificationsPage.tsx
│           │       └── useNotifications.ts  # TanStack Query + socket merge
│           │
│           └── pages/
│               ├── UnauthorizedPage.tsx
│               └── PlaceholderPage.tsx  # for sidebar links not built yet
│
└── ops/
    ├── nginx/demaxtore.conf            # see §10
    ├── pm2/ecosystem.config.cjs        # see §10
    └── scripts/
        ├── deploy.sh
        └── postgres-bootstrap.sql
```

**Why a monorepo?** Sprint 2 needs Buyer/Supplier/Admin to share workspace types + state-machine descriptors. Putting those in `@dmx/contracts` from day one prevents the FE and BE from drifting on enums (e.g. `WorkspaceState`).

---

## 2. Database — Prisma schema

The full schema lives in **`/app/docs/sprint-1-prisma-schema.prisma`** (copy-paste into `apps/backend/prisma/schema.prisma`).

### Sprint 1 tables
| Table | Why it exists in Sprint 1 |
|---|---|
| `users` | Auth + RBAC subject |
| `refresh_tokens` | Server-side refresh rotation + revocation list |
| `password_reset_tokens` | Forgot-password flow |
| `login_attempts` | Brute-force throttling |
| `workspaces` | Routing skeleton — exactly one row needed per `/workspace/:type/:id` URL. No business fields. |
| `workspace_participants` | RBAC for workspace-scoped routes + Socket.io room membership |
| `timeline_events` | Append-only log — Sprint 1 seeds one `"workspace.created"` event so the Timeline panel renders |
| `notifications` | INFO / SUCCESS / WARNING / ERROR feed (per-user or role-broadcast) |

### Tables explicitly NOT in Sprint 1
RFQ details, CommodityBid lots/lanes, Quotations, Proformas, Purchase Orders, FreightIQ rate cards, Inspection reports, Shipment events, Documents, Exceptions.
**Each will arrive as a 1:1 satellite table to `workspaces` in its own sprint** — schema-only, no foreign keys are added retroactively.

### Migrations
```bash
cd apps/backend
pnpm prisma migrate dev --name sprint1_foundation
pnpm prisma db seed     # runs prisma/seed.ts (idempotent)
```

---

## 3. Backend — Express app composition

### 3.1 Entrypoint
```ts
// apps/backend/src/index.ts
import http from "node:http";
import { Server as SocketServer } from "socket.io";
import { createApp } from "./app";
import { env } from "./env";
import { logger } from "./logger";
import { attachSocket } from "./realtime/socket";

const app = createApp();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: env.FRONTEND_ORIGIN, credentials: true },
});
attachSocket(io);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "DeMaxtore API up");
});
```

### 3.2 `createApp()`
```ts
// apps/backend/src/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env";
import { requestId } from "./middlewares/requestId";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { workspacesRouter } from "./modules/workspaces/workspaces.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestId);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/workspaces", workspacesRouter);
  app.use("/api/notifications", notificationsRouter);

  app.use(errorHandler);
  return app;
}
```

### 3.3 Error handling convention
- Controllers throw `AppError(status, code, message, details?)`.
- `errorHandler` middleware serialises to:
  ```json
  { "error": { "code": "INVALID_CREDENTIALS", "message": "…", "details": {} } }
  ```
- Validation errors (zod) are translated by a `zValidate(schema)` middleware into HTTP 422.

---

## 4. Authentication flow

### 4.1 Tokens
- **Access token** — JWT signed with `JWT_ACCESS_SECRET`, claims `{ sub, role, type:"access", exp:+60m }`. Sent by FE as `Authorization: Bearer <token>`.
- **Refresh token** — JWT signed with `JWT_REFRESH_SECRET`, claims `{ sub, type:"refresh", jti, exp:+7d }`. The **hash** (`sha256`) is stored in `refresh_tokens` row. Sent to FE as `httpOnly; SameSite=Lax (or None+Secure cross-origin)` cookie at path `/api/auth`.

### 4.2 Refresh-token rotation
On every `POST /api/auth/refresh`:
1. Verify the refresh JWT signature + expiry.
2. Look up `refresh_tokens` row by `tokenHash`. Reject if missing / revoked / replaced.
3. Mark current row `revokedAt = now()` and set `replacedBy = newId`.
4. Insert new `refresh_tokens` row.
5. Return new access token in JSON body, set new refresh cookie.

A re-use of an already-rotated refresh token MUST revoke the entire chain (treat as theft).

### 4.3 Endpoints

| Method | Path                          | Auth | Description |
|--------|-------------------------------|------|-------------|
| POST   | `/api/auth/login`             | —    | `{ email, password } → { accessToken, user }` + sets refresh cookie |
| POST   | `/api/auth/refresh`           | cookie | `→ { accessToken }` + rotates refresh cookie |
| POST   | `/api/auth/logout`            | Bearer | revokes current refresh chain + clears cookie |
| GET    | `/api/auth/me`                | Bearer | `→ UserDTO` |
| POST   | `/api/auth/forgot-password`   | —    | `{ email } → { ok:true }` (always 200; out-of-band: email link in Sprint 2) |
| POST   | `/api/auth/reset-password`    | —    | `{ token, newPassword } → { ok:true }` |

All bodies validated by `@dmx/contracts` zod schemas.

### 4.4 Sample controller — login
```ts
// apps/backend/src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import { LoginInput } from "@dmx/contracts";
import { AuthService } from "./auth.service";
import { setRefreshCookie } from "./jwt";

export async function login(req: Request, res: Response) {
  const input = LoginInput.parse(req.body);          // 422 if invalid
  const { user, accessToken, refreshToken } =
    await AuthService.login(input, req.ip, req.headers["user-agent"]);
  setRefreshCookie(res, refreshToken);
  return res.json({ accessToken, user });
}
```

### 4.5 `requireAuth` middleware
```ts
// apps/backend/src/modules/auth/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt";
import { AppError } from "../../utils/httpErrors";

declare global {
  namespace Express { interface Request { user?: { id: string; role: Role } } }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "UNAUTHENTICATED");
  const payload = verifyAccessToken(header.slice(7));   // throws on bad/expired
  req.user = { id: payload.sub, role: payload.role };
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      throw new AppError(403, "FORBIDDEN");
    next();
  };
```

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Roles
`BUYER`, `SUPPLIER`, `ADMIN`. Role is a single enum on `users.role` (Sprint 1 — no multi-role users).

### 5.2 Two layers of authorization
1. **Route-level** — `requireRole("BUYER")` etc. Pure role gate (e.g. `/api/users/admin/*`).
2. **Resource-level** — `workspaces.policy.ts::canAccessWorkspace(user, workspaceId)`:
   - `ADMIN` ⇒ always allowed.
   - else ⇒ must appear in `workspace_participants` for that workspace.

### 5.3 Sprint 1 RBAC matrix
| Endpoint / Page                   | BUYER | SUPPLIER | ADMIN |
|-----------------------------------|:-----:|:--------:|:-----:|
| `/api/auth/*`                     |   ✓   |    ✓     |   ✓   |
| `GET /api/users/me`               |   ✓   |    ✓     |   ✓   |
| `GET /api/workspaces?mine=true`   |   ✓   |    ✓     |   ✓   |
| `GET /api/workspaces/:id`         | own*  |   own*   |   ✓   |
| `GET /api/notifications`          |   ✓   |    ✓     |   ✓   |
| `/buyer/*` pages                  |   ✓   |    ✗     |   ✗   |
| `/supplier/*` pages               |   ✗   |    ✓     |   ✗   |
| `/admin/*` pages                  |   ✗   |    ✗     |   ✓   |
| `/workspace/:type/:id` page       | own*  |   own*   |   ✓   |
| `/notifications` page             |   ✓   |    ✓     |   ✓   |

`own*` = the user must be a `WorkspaceParticipant` of that workspace.

### 5.4 FE enforcement
- `ProtectedRoute` redirects to `/login` if `accessToken` missing/expired and refresh fails.
- `RoleRoute allow={["BUYER"]}` redirects to `/unauthorized` if role mismatch.

---

## 6. Frontend — App composition & routing

### 6.1 Bootstrap
```tsx
// apps/frontend/src/main.tsx
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}><App /></QueryClientProvider>,
);
```

### 6.2 Routes (`routeMap.ts`)
| Path                              | Component                         | Guard |
|-----------------------------------|-----------------------------------|-------|
| `/login`                          | `LoginPage`                       | public |
| `/forgot-password`                | `ForgotPasswordPage`              | public |
| `/reset-password`                 | `ResetPasswordPage`               | public |
| `/unauthorized`                   | `UnauthorizedPage`                | public |
| `/`                               | redirect → role dashboard         | `ProtectedRoute` |
| `/buyer/dashboard`                | `BuyerDashboard`                  | role=BUYER |
| `/buyer/*` (other)                | `PlaceholderPage`                 | role=BUYER |
| `/supplier/dashboard`             | `SupplierDashboard`               | role=SUPPLIER |
| `/supplier/*`                     | `PlaceholderPage`                 | role=SUPPLIER |
| `/admin/dashboard`                | `AdminDashboard`                  | role=ADMIN |
| `/admin/*`                        | `PlaceholderPage`                 | role=ADMIN |
| `/notifications`                  | `NotificationsPage`               | auth |
| `/workspace/:type/:id`            | `WorkspacePage`                   | auth + participant policy |
| `*`                               | redirect → `/`                    | — |

### 6.3 Axios + refresh interceptor
```ts
// apps/frontend/src/lib/api.ts
import axios from "axios";
import { useAuth } from "../store/auth.store";
import { env } from "./env";

export const api = axios.create({ baseURL: env.API_BASE_URL, withCredentials: true });

api.interceptors.request.use((cfg) => {
  const t = useAuth.getState().accessToken;
  if (t) cfg.headers!.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing: Promise<string> | null = null;
api.interceptors.response.use(undefined, async (err) => {
  const original = err.config;
  if (err.response?.status !== 401 || original._retried) throw err;
  original._retried = true;
  refreshing ??= api.post<{ accessToken: string }>("/auth/refresh")
    .then((r) => { useAuth.getState().setAccessToken(r.data.accessToken); return r.data.accessToken; })
    .finally(() => { refreshing = null; });
  const newToken = await refreshing;
  original.headers.Authorization = `Bearer ${newToken}`;
  return api(original);
});
```

### 6.4 Layout structure
- `AppShell` = `<Sidebar />` (fixed 256px, role-aware menu) + `<TopNav />` (sticky 64px with search + `<NotificationBell />` + `<UserMenu />`) + `<main>{children}</main>`.
- Tailwind tokens locked in `tailwind.config.ts`:
  - Background `#FAFAFA`, surface white, primary `zinc-950`, accent `blue-600`.
  - Display font `Outfit`, body `Inter`, mono `JetBrains Mono`.
  - Radius `1rem`, soft shadows.

### 6.5 Dashboard widget grid
All three dashboards share `<WidgetCard label value delta icon />`. Sprint 1 widgets pull from a single `useDashboardMock()` hook so each role's screen feels alive without backend business data.

---

## 7. Notification framework

### 7.1 REST endpoints
| Method | Path                              | Description |
|--------|-----------------------------------|-------------|
| GET    | `/api/notifications`              | List for current user (own + role-broadcast). Pagination: `?cursor&limit`. |
| POST   | `/api/notifications/:id/read`     | Mark one read |
| POST   | `/api/notifications/read-all`     | Mark all read |

### 7.2 Server-side publish helper
```ts
// apps/backend/src/modules/notifications/notifications.service.ts
export async function publish(opts: {
  userId?: string;
  role?: Role;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const n = await prisma.notification.create({ data: opts });
  // also push over socket.io (see §8)
  notificationEmitter.emit(n);
  return n;
}
```

### 7.3 Frontend behaviour
`useNotifications()` hook:
1. Initial fetch via TanStack Query (`["notifications"]`).
2. Subscribes to `socket.on("notification:new", n => queryClient.setQueryData(["notifications"], prev => [n, ...prev]))`.
3. `NotificationBell` shows unread count from `useMemo` over the list.
4. `<NotificationsPage>` adds filter chips (`ALL | INFO | SUCCESS | WARNING | ERROR`).

---

## 8. Socket.io preparation

> Sprint 1 only **prepares** the gateway. It connects, authenticates, and broadcasts the `notification:new` event. RFQ / CommodityBid / Order events arrive in Sprint 2+.

### 8.1 Server gateway
```ts
// apps/backend/src/realtime/socket.ts
import type { Server } from "socket.io";
import { socketAuth } from "./socket.auth";
import { joinUserRoom, joinRoleRoom } from "./socket.rooms";

export function attachSocket(io: Server) {
  io.use(socketAuth);          // verifies JWT from handshake.auth.token
  io.on("connection", (socket) => {
    joinUserRoom(socket);      // user:{userId}
    joinRoleRoom(socket);      // role:{ROLE}
    socket.on("workspace:subscribe", async (workspaceId: string) => {
      // verified by WorkspaceParticipant lookup in Sprint 2+
      socket.join(`ws:${workspaceId}`);
    });
  });
}
```

### 8.2 Channel & event catalogue
| Room               | Members                                  | Events emitted (Sprint 1) |
|--------------------|------------------------------------------|---------------------------|
| `user:{userId}`    | only that user's sockets                  | `notification:new`        |
| `role:{ROLE}`      | every connected user with that role       | `notification:new` (broadcast) |
| `ws:{workspaceId}` | all participants of that workspace        | reserved for Sprint 2+    |

### 8.3 Client
```ts
// apps/frontend/src/lib/socket.ts
import { io, Socket } from "socket.io-client";
import { useAuth } from "../store/auth.store";
import { env } from "./env";

let socket: Socket | null = null;
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(env.SOCKET_URL, {
    withCredentials: true,
    autoConnect: true,
    auth: (cb) => cb({ token: useAuth.getState().accessToken }),
  });
  return socket;
}
```
On `accessToken` rotation in the auth store, call `socket?.disconnect()` and reconnect so the JWT in `auth` is fresh.

---

## 9. Seeding & demo data (idempotent)

`apps/backend/prisma/seed.ts`:
1. Upsert 3 users from `SEED_*` env vars.
2. Insert demo notifications (3 per role) — only if `notifications.count() === 0`.
3. Insert 3 demo workspaces (one per `WorkspaceType`) with the seeded buyer as creator + supplier as counterparty + admin as operator, plus one `timeline_events` row "workspace.created".

Run on every deploy via `pnpm prisma migrate deploy && pnpm tsx prisma/seed.ts`.

---

## 10. Deployment — Ubuntu VPS + PM2 + Nginx

### 10.1 Server prerequisites
```bash
# As root
apt update && apt install -y nodejs-20 postgresql-16 nginx
npm install -g pnpm pm2
useradd -m -s /bin/bash demaxtore
```

### 10.2 Postgres bootstrap
```sql
-- ops/scripts/postgres-bootstrap.sql
CREATE USER demaxtore WITH PASSWORD '<<set in vault>>';
CREATE DATABASE demaxtore OWNER demaxtore;
\c demaxtore
GRANT ALL ON SCHEMA public TO demaxtore;
```

### 10.3 PM2 config
```js
// ops/pm2/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "demaxtore-api",
    cwd: "/srv/demaxtore/apps/backend",
    script: "dist/index.js",
    instances: 1,
    exec_mode: "fork",      // keep "fork" until socket.io sticky-session is set up
    env: { NODE_ENV: "production" },
    max_memory_restart: "512M",
  }],
};
```
Frontend is static (`vite build` → `apps/frontend/dist`) — served directly by Nginx, no PM2 entry.

### 10.4 Nginx
```nginx
# ops/nginx/demaxtore.conf
server {
  listen 443 ssl http2;
  server_name app.demaxtore.com;
  ssl_certificate     /etc/letsencrypt/live/app.demaxtore.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.demaxtore.com/privkey.pem;

  # Frontend (Vite build output)
  root /srv/demaxtore/apps/frontend/dist;
  index index.html;
  location / { try_files $uri /index.html; }

  # REST API
  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Socket.io — must allow WebSocket upgrade
  location /socket.io/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host       $host;
    proxy_read_timeout 60s;
  }
}
server { listen 80; server_name app.demaxtore.com; return 301 https://$host$request_uri; }
```

### 10.5 Deploy script (outline)
```bash
# ops/scripts/deploy.sh
set -euo pipefail
cd /srv/demaxtore
git pull
pnpm install --frozen-lockfile
pnpm --filter @dmx/contracts build
pnpm --filter @dmx/backend prisma:generate
pnpm --filter @dmx/backend prisma:migrate:deploy
pnpm --filter @dmx/backend build
pnpm --filter @dmx/frontend build
pm2 reload ops/pm2/ecosystem.config.cjs --update-env
nginx -s reload
```

---

## 11. Testing strategy (Sprint 1)

| Layer    | Tooling                          | Coverage target |
|----------|----------------------------------|-----------------|
| Backend  | **Vitest + supertest**           | 80% on auth/users/notifications |
| Backend  | Prisma test DB (`demaxtore_test`)| Reset before each test file |
| Frontend | **Vitest + React Testing Library** | All guards (ProtectedRoute, RoleRoute) |
| E2E      | **Playwright**                   | Smoke: login → dashboard → bell → workspace → logout |

CI: GitHub Actions — `pnpm install → typecheck → test → build` on every PR.

---

## 12. Sprint 1 — Definition of Done (DoD)

A Sprint 1 build is "done" when ALL of the below are green:

1. ✅ `pnpm install && pnpm -r build` succeeds with zero errors.
2. ✅ `prisma migrate deploy` applies cleanly on a fresh Postgres 16 DB.
3. ✅ Seeded buyer/supplier/admin accounts log in successfully (returns access token + sets refresh cookie).
4. ✅ Cross-role navigation (`buyer → /admin/dashboard`) redirects to `/unauthorized`.
5. ✅ Refresh-token rotation works: replaying an old refresh token → 401 + chain revoked.
6. ✅ `/workspace/:type/:id` renders the placeholder shell with Timeline / Documents / Next-Actions / Participants sections.
7. ✅ Socket.io handshake succeeds with a valid JWT; without JWT → handshake rejected.
8. ✅ Creating a notification via the service helper appears in real-time in the bell + page for the target user.
9. ✅ Nginx config passes `nginx -t`; PM2 boots `demaxtore-api` and stays up across `pm2 restart`.
10. ✅ Playwright smoke suite passes against the deployed URL.

No business workflow (RFQ/Quotation/PO/FreightIQ/Inspection/Shipment) is in scope. Their absence is **not** a Sprint 1 defect.

---

## 13. What changes in Sprint 2 (preview, not committed)

- Add 1:1 satellite tables: `rfq_details`, `commoditybid_details`, `order_details`.
- Introduce `WorkspaceStateMachine` per type (descriptor lives in `@dmx/contracts`).
- Introduce the **Next-Action Engine** as a pure function `(workspace, participants, role) → NextAction[]`.
- Expand Socket.io event catalogue per workspace type.
- Document upload + signing.
- Real email provider for password reset.

---

## 14. Mapping back to the Sprint 1 prompt requirements

| Requirement in prompt                 | Where covered in this TDD |
|---------------------------------------|----------------------------|
| Authentication System                 | §3, §4 |
| Role-Based Access Control             | §5 |
| React + Vite Frontend Foundation      | §1, §6 |
| Express Backend Foundation            | §1, §3 |
| PostgreSQL + Prisma Foundation        | §2, schema file |
| Buyer / Supplier / Admin Dashboards   | §6.4, §6.5 |
| Sidebar Navigation                    | §6.4 |
| Workspace Routing Structure           | §1 + §6.2 + §2 (`workspaces`) |
| Notification Framework                | §2 + §7 |
| Socket.io Preparation                 | §8 |
| One Workspace / Timeline / State Machine / Next-Action principles | §2 (workspaces+timeline_events) + §13 |
| Three workspace types only            | §2 (`WorkspaceType` enum, frozen) |

---

*End of Sprint 1 TDD.*
