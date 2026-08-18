# =============================================================================
# DeMaxtore — Sprint 2 Frontend Completion Report
# =============================================================================
# Goal: Production-ready frontend implementation consuming `@dmx/contracts`
#       and the approved RFQ FSM as the single source of truth.
# Tech: React 18 + Vite 5 + TailwindCSS 3 + TanStack Query 5 + Zustand 4 +
#       Socket.io 4 + react-hook-form + zod + lucide-react.
# Repo: /app/docs/sprint-2-reference-code/  (monorepo · yarn workspaces)
# =============================================================================

## 1 · Architecture overview

```
demaxtore/
├── package.json                 ← workspaces: apps/*, packages/*
├── tsconfig.base.json
│
├── packages/
│   └── contracts/               ← @dmx/contracts (SOURCE OF TRUTH)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                 ← barrel
│           ├── rfq.fsm.ts               ← 40 transitions  (mirror of /app/docs/rfq-state-machine.md)
│           ├── rfq.next-actions.ts      ← pure CTA engine
│           ├── rfq.zod.ts               ← input/output schemas
│           ├── auth.ts                  ← LoginInput, UserDTO, ROLE_DASHBOARD
│           ├── notifications.ts         ← NotificationDTO, listing schemas
│           ├── socket-events.ts         ← typed event names + payloads
│           ├── api.ts                   ← ApiError envelope, ErrorCodes
│           ├── rfq.fsm.test.ts          ← contract integrity
│           └── rfq.next-actions.test.ts ← engine behaviour
│
└── apps/
    └── frontend/                ← React + Vite
        ├── package.json
        ├── vite.config.ts       ← path aliases + dev proxy to :4000
        ├── vitest.config.ts
        ├── tailwind.config.js
        ├── tsconfig.json
        ├── index.html
        ├── .env.example
        └── src/
            ├── main.tsx                ← Query / Router / ToastHost providers
            ├── App.tsx                 ← rehydrates session on mount
            ├── index.css               ← @tailwind base/components/utilities + tokens
            │
            ├── lib/
            │   ├── api.ts              ← axios + 401-refresh interceptor + idempotency-key
            │   ├── socket.ts           ← shared Socket.io client + useWorkspaceSocket()
            │   ├── queryClient.ts      ← TanStack defaults
            │   └── utils.ts            ← cn(), initials(), formatRelative()
            │
            ├── store/                  ← Zustand — UI/session state ONLY
            │   ├── auth.store.ts       ← persisted sessionStorage; hydrate/login/refresh/logout
            │   ├── ui.store.ts         ← sidebar collapsed, notification drawer open
            │   └── toast.store.ts      ← toasts queue (replaces sonner)
            │
            ├── components/ui/          ← 11 internal primitives, TailwindCSS only
            │   ├── Button.tsx          ← variant: primary | secondary | ghost | destructive
            │   ├── Card.tsx            ← Card / Header / Title / Eyebrow / Body / Footer
            │   ├── Badge.tsx           ← 8 tones, optional pulse dot
            │   ├── Modal.tsx           ← portal + ESC + backdrop close
            │   ├── Drawer.tsx          ← right-anchored, used by NotificationDrawer
            │   ├── Table.tsx           ← Table primitives + <DataTable />
            │   ├── EmptyState.tsx      ← icon + title + body + action
            │   ├── SkeletonLoader.tsx  ← Skeleton, WorkspaceSkeleton, TableRowSkeleton
            │   ├── StatusBadge.tsx     ← typed by NotificationType
            │   ├── Input.tsx           ← Field, Input, Textarea, Select
            │   └── ToastHost.tsx       ← top-right stacked toaster
            │
            ├── layouts/
            │   ├── AuthLayout.tsx      ← split brand panel / form panel
            │   ├── AppLayout.tsx       ← Sidebar + Header + <Outlet/> + NotificationDrawer
            │   └── components/
            │       ├── Sidebar.tsx           ← role-driven, NAV_BY_ROLE config
            │       ├── Header.tsx            ← breadcrumb + bell + user menu
            │       ├── NotificationBell.tsx  ← unread badge, opens drawer
            │       ├── NotificationDrawer.tsx← realtime, mark-all/one read
            │       └── UserMenu.tsx          ← dropdown, sign out
            │
            ├── routes/
            │   ├── index.tsx               ← AppRoutes — full router tree
            │   ├── navigation.ts           ← NAV_BY_ROLE[ BUYER | SUPPLIER | ADMIN ]
            │   └── guards/
            │       ├── RequireAuth.tsx     ← gates authenticated branches
            │       └── RequireRole.tsx     ← role-aware redirect
            │
            ├── features/
            │   ├── auth/
            │   │   ├── lib/auth.api.ts
            │   │   ├── pages/LoginPage.tsx
            │   │   └── pages/ForgotPasswordPage.tsx
            │   ├── dashboard/
            │   │   ├── components/StatCard.tsx
            │   │   └── pages/{Buyer,Supplier,Admin}DashboardPage.tsx
            │   ├── notifications/
            │   │   ├── lib/notifications.api.ts
            │   │   ├── hooks.ts
            │   │   └── pages/NotificationsPage.tsx
            │   ├── system/
            │   │   ├── NotFoundPage.tsx
            │   │   └── PlaceholderPage.tsx  ← used by CommodityBid/Order routes (Sprint 3)
            │   └── rfq/                    ← Sprint 2 RFQ workspace
            │       ├── hooks/index.ts      ← useRfqList, useRfqWorkspace, useRfqTimeline,
            │       │                          useRfqClarifications, useRfqNextActions,
            │       │                          useApplyRfqAction, usePostClarification,
            │       │                          useRfqRealtime
            │       ├── lib/rfq.api.ts      ← REST client, ACTION_PATHS map
            │       ├── components/
            │       │   ├── RfqStateBadge.tsx     ← 15-state palette
            │       │   ├── RfqProgressBar.tsx    ← 7-step ladder; closed banner for terminal
            │       │   ├── RfqTimeline.tsx       ← append-only event feed
            │       │   ├── RfqClarificationPanel.tsx
            │       │   ├── RfqDocumentsPanel.tsx ← attachments
            │       │   ├── RfqParticipants.tsx
            │       │   └── RfqNextActions.tsx    ← FSM-driven CTA list + reason modal
            │       └── pages/
            │           ├── RfqListPage.tsx
            │           ├── RfqCreatePage.tsx
            │           └── RfqWorkspacePage.tsx
            │
            └── test/
                ├── setup.ts                ← jest-dom, socket mock, crypto polyfill
                └── utils.tsx               ← renderWithProviders, makeTestQueryClient
```

## 2 · Compliance with approved constraints

| Constraint                                              | Implementation                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TailwindCSS only — no shadcn/ui, Radix, MUI, Ant Design | 11 internal primitives in `src/components/ui/`. `sonner` was removed and replaced by `toast.store` + `<ToastHost />` |
| Vitest + RTL                                            | `vitest.config.ts`, 12 test files spanning contracts, components, pages, hooks, guards                               |
| TanStack Query for server state                         | All API access via `useQuery` / `useMutation`. No fetched data is mirrored to Zustand                                |
| Zustand for UI state only                               | `ui.store` (sidebar, drawer), `toast.store` (queue), `auth.store` (session-only, not entity data)                    |
| No FSM duplication in React                             | `RfqNextActions` is a pure map over `computeRfqNextActions()`. Buttons rendered from descriptor. Zero hardcoded JSX  |
| No hardcoded transitions/next actions                   | All action constants live in `@dmx/contracts/rfq.fsm` and `rfq.next-actions`. Imported by both backend and frontend  |
| useRfqSocket realtime + auto cache invalidation         | `useRfqRealtime(workspaceId)` subscribes to `workspace:{id}` and invalidates the right query keys on every event     |
| RBAC guards                                             | `RequireAuth` + `RequireRole`; unauthorized users bounced to their own dashboard via `ROLE_DASHBOARD`                |
| Full app shell                                          | AuthLayout, AppLayout, Sidebar (role-driven nav), Header, NotificationBell, NotificationDrawer, UserMenu             |

## 3 · @dmx/contracts surface

```ts
import { RFQ_TRANSITIONS, findRfqTransition, isRfqTerminal,
         type RfqState, type RfqAction } from "@dmx/contracts/rfq.fsm";
import { computeRfqNextActions, type NextAction } from "@dmx/contracts/rfq.next-actions";
import { CreateRfqDraftInput, RfqDTO,
         ListRfqQuery } from "@dmx/contracts/rfq.zod";
import { LoginInput, UserDTO, ROLE_DASHBOARD,
         type Role } from "@dmx/contracts/auth";
import { NotificationDTO, NotificationType,
         ListNotificationsQuery } from "@dmx/contracts/notifications";
import { SocketEvents,
         type ServerToClientEvents,
         type RfqStateChangedPayload } from "@dmx/contracts/socket-events";
import { ApiError, ErrorCodes } from "@dmx/contracts/api";
```

The same package is consumed by `apps/backend/src/modules/rfq/rfq.service.ts` —
the FSM table is authored exactly once.

## 4 · Realtime invalidation contract

`useRfqRealtime(workspaceId)` binds to the `workspace:{id}` room and reacts to:

| Event                        | Invalidates                              |
| ---------------------------- | ---------------------------------------- |
| `rfq.state.changed`          | `["rfq", workspaceId]`                   |
| `rfq.timeline.appended`     | `["rfq", workspaceId, "timeline"]`       |
| `rfq.clarification.posted`  | `["rfq", workspaceId, "clarifications"]` |
| `rfq.participants.changed`   | `["rfq", workspaceId]`                   |

Personal channel `user:{id}` is bound implicitly via `useUnreadNotificationCount()`:
- `notification:new` → bumps the bell counter cache and pushes a toast.

There are zero manual `refetch()` calls anywhere in the app. The user never
needs to press a refresh button.

## 5 · Route map

| Path                                | Guard                  | Page                               |
| ----------------------------------- | ---------------------- | ---------------------------------- |
| `/login`                            | public                 | LoginPage                          |
| `/forgot-password`                  | public                 | ForgotPasswordPage                 |
| `/`                                 | RequireAuth            | RootRedirect → ROLE_DASHBOARD      |
| `/buyer/dashboard`                  | RequireRole BUYER      | BuyerDashboardPage                 |
| `/buyer/rfq`                        | RequireRole BUYER      | RfqListPage                        |
| `/buyer/rfq/new`                    | RequireRole BUYER      | RfqCreatePage                      |
| `/buyer/commoditybid`               | RequireRole BUYER      | PlaceholderPage (Sprint 3)         |
| `/buyer/orders`                     | RequireRole BUYER      | PlaceholderPage (Sprint 3)         |
| `/buyer/documents`                  | RequireRole BUYER      | PlaceholderPage (Sprint 3)         |
| `/supplier/dashboard`               | RequireRole SUPPLIER   | SupplierDashboardPage              |
| `/supplier/rfq`                     | RequireRole SUPPLIER   | RfqListPage                        |
| `/supplier/{commoditybid,orders,documents}` | RequireRole SUPPLIER | PlaceholderPage                 |
| `/admin/dashboard`                  | RequireRole ADMIN      | AdminDashboardPage                 |
| `/admin/rfq`                        | RequireRole ADMIN      | RfqListPage                        |
| `/admin/{commoditybid,orders,suppliers,documents,messages,settings}` | RequireRole ADMIN | PlaceholderPage |
| `/notifications`                    | RequireAuth            | NotificationsPage                  |
| `/workspace/rfq/:id`                | RequireAuth            | RfqWorkspacePage                   |
| `/workspace/commoditybid/:id`       | RequireAuth            | PlaceholderPage (Sprint 3 FSM)     |
| `/workspace/order/:id`              | RequireAuth            | PlaceholderPage (Sprint 3 FSM)     |
| `*`                                 | RequireAuth            | NotFoundPage                       |

## 6 · Test suite

**12 test files** · all run via `yarn test`:

* `packages/contracts/src/rfq.fsm.test.ts` — 10 contract invariants (40 transitions, cancel reachability, decision-rule preconditions, terminal hygiene, wildcard resolution)
* `packages/contracts/src/rfq.next-actions.test.ts` — 10 role × participant × semantic permission cases
* `apps/frontend/.../RfqStateBadge.test.tsx` — 3 cases incl. defensive unknown-state
* `apps/frontend/.../RfqProgressBar.test.tsx` — 3 cases (open ladder + 2 closed-banner variants)
* `apps/frontend/.../RfqNextActions.test.tsx` — 4 cases (BUYER draft CTAs, SUPPLIER non-counterparty empty, reason modal, terminal empty)
* `apps/frontend/.../useRfqRealtime.test.tsx` — 2 socket→cache invalidation flows
* `apps/frontend/.../RequireRole.test.tsx` — 4 RBAC redirect cases
* `apps/frontend/.../Button.test.tsx` — variant + loading + handler binding
* `apps/frontend/.../Modal.test.tsx` — ESC + backdrop close + open/close lifecycle
* `apps/frontend/.../LoginPage.test.tsx` — Zod validation + server error surfacing
* `apps/frontend/.../BuyerDashboardPage.test.tsx` — widget presence + greeting
* `apps/frontend/.../useUnreadNotificationCount.test.tsx` — socket-driven counter bump

Run commands:
```
yarn test                       # all packages
yarn test:contracts             # FSM contract tests only
yarn test:frontend              # React component / hook / page tests
yarn workspace @dmx/frontend test:watch
```

## 7 · How to develop locally

```bash
cd /path/to/demaxtore           # repo root (this folder)
yarn install                    # workspaces resolve @dmx/contracts via symlinks
cp apps/frontend/.env.example apps/frontend/.env.local

# Run the backend (separate terminal — Sprint 2 backend reference is in /apps/backend)
yarn dev:backend                # :4000

# Run the frontend
yarn dev:frontend               # :5173 — auto-proxies /api + /socket.io to :4000
```

## 8 · Deliverables checklist (this report ↔ user's order)

| #  | Deliverable                       | Status | Location                                                                |
| -- | --------------------------------- | ------ | ----------------------------------------------------------------------- |
| 1  | Complete folder structure         | Done   | This document §1; on disk at `/app/docs/sprint-2-reference-code/`       |
| 2  | @dmx/contracts package structure  | Done   | `packages/contracts/` (8 source files + 2 tests)                        |
| 3  | React components                  | Done   | `apps/frontend/src/components/ui/` + feature `components/`              |
| 4  | Pages                             | Done   | Login, Forgot, 3 Dashboards, Notifications, RFQ List/Create/Workspace, 404, Placeholder |
| 5  | Layouts                           | Done   | AuthLayout, AppLayout + Sidebar/Header/Drawer/Bell/UserMenu             |
| 6  | Query hooks                       | Done   | `features/rfq/hooks/index.ts`, `features/notifications/hooks.ts`        |
| 7  | Services layer (API clients)      | Done   | `features/*/lib/*.api.ts` + shared `lib/api.ts`                         |
| 8  | Zustand stores                    | Done   | `store/auth.store.ts`, `store/ui.store.ts`, `store/toast.store.ts`      |
| 9  | Socket integration                | Done   | `lib/socket.ts` + `useRfqRealtime` + `useUnreadNotificationCount`       |
| 10 | Route guards                      | Done   | `routes/guards/RequireAuth.tsx`, `RequireRole.tsx`                      |
| 11 | Test suite                        | Done   | Vitest config + 12 test files (contracts, components, hooks, guards)    |
| 12 | Frontend completion report        | Done   | This file                                                               |

## 9 · Non-goals (deferred to Sprint 3)

* CommodityBid Workspace UI (FSM exists; placeholder page wired)
* Order Workspace UI (FSM exists; placeholder page wired)
* Document upload UI (download-only viewer is implemented; uploader Sprint 3)
* Admin supplier-assignment wizard (the RFQ list page is wired for ADMIN
  but the multi-step assignment drawer is Sprint 3)
* Row Level Security frontend hints for CommodityBid suppliers (Sprint 2.5)

—
**Frozen for hand-off to implementing engineer.**
