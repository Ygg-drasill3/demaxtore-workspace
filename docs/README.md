# DeMaxtore — Sprint 1 Deliverables Index

> Stack lock for Sprint 1 (and forward): **React + Vite + TailwindCSS / Node.js + Express / PostgreSQL + Prisma / JWT + Refresh Token / Socket.io / Ubuntu VPS + PM2 + Nginx**.
> Disallowed: FastAPI, MongoDB, CRA, Django, Laravel, Firebase, Supabase, Next.js.

## Platform reference

- **`proje-rehberi.md`** — Kapsamlı Türkçe proje rehberi: mimari, modüller, FSM, API, frontend, veritabanı, auth, realtime, test ve deployment (uçtan uca).
- **`system-inventory.md`** — Complete system inventory: 24 modules with purpose, PostgreSQL models, APIs, frontend screens, user roles, workflows, dependencies, completion %, and future improvements.
- **`flexport-gap-analysis.md`** — Sprint 15 preparation: DeMaxtore vs Flexport digital execution gap analysis, maturity scores, and 15A–15F roadmap.

## Read these in order

**Sprint 1 (foundation):**
1. **`sprint-1-developer-handoff.md`** — odaklı, yazılımcıya teslim edilmek üzere 5 başlığı (klasör yapısı / Prisma schema / route yapısı / auth akışı / dashboard mimarisi) net şekilde içeren teslim belgesi.
2. **`sprint-1-tdd.md`** — kapsamlı 14-bölümlü TDD.
3. **`sprint-1-prisma-schema.prisma`** — copy-paste into `apps/backend/prisma/schema.prisma`.
4. **`sprint-1-env.example.txt`** — backend + frontend `.env` skeleton.

**Sprint 2 öncesi state machine onayları (kod öncesi sözleşmeler):**

5. **`rfq-state-machine.md`** — RFQ workspace state machine descriptor (15 state · 40 transition · 12 karar onaylı).
6. **`commoditybid-state-machine.md`** — CommodityBid workspace descriptor (13 state · 43 transition · 15 karar — currency lock, no-rating, RLS Sprint 2.5).
7. **`order-state-machine.md`** — Order workspace descriptor (17 state · 31 transition · 12 karar — port-to-port, no customs/last_mile).

**Sprint 2 implementation:**

8. **`sprint-2-implementation-plan.md`** — Sprint 2 master plan (20 bölüm: API contracts, folder structure, FSM integration, Next Action engine, audit/timeline architecture, testing plan, DoD). Plan-Mode çıktısı.
9. **`sprint-2-reference-code/`** — kopyala-yapıştır ready dosyalar:
   - `rfq.fsm.ts` — 40 transition TypeScript descriptor (`packages/contracts/src/`)
   - `rfq.next-actions.ts` — pure function CTA üretici
   - `rfq.service.ts` — `applyTransition()` reference implementation (`apps/backend/src/modules/rfq/`)
   - `prisma-sprint2-rfq.prisma` — schema additions
   - `migrations/state-guard-trigger.sql` — Postgres invariant triggers (state-guard, currency-immutability, audit append-only, deadline-extension limits)

## Reference (NOT code baseline)

A working visual + UX prototype exists at `/app/backend` (FastAPI + Mongo) and `/app/frontend` (CRA + Tailwind). **Do not use as code baseline.** It is preserved only as a reference for:
- UI/UX direction (sidebar, dashboard widgets, workspace placeholder)
- Endpoint shapes (auth + notifications)
- Test ID naming for Playwright

When implementing Sprint 1 on the approved stack, follow the TDD — not the prototype's source files.

## How to build (high-level, see TDD §10 for full deploy)

```bash
# 1. scaffold
mkdir demaxtore && cd demaxtore
pnpm init && pnpm dlx create-vite apps/frontend --template react-ts
mkdir -p apps/backend packages/contracts ops/{nginx,pm2,scripts}

# 2. backend
cd apps/backend
pnpm init && pnpm add express cors helmet cookie-parser bcrypt jsonwebtoken zod \
  prisma @prisma/client socket.io pino
pnpm add -D typescript tsx vitest supertest @types/express @types/node
pnpm prisma init --datasource-provider postgresql
# copy /app/docs/sprint-1-prisma-schema.prisma → prisma/schema.prisma
pnpm prisma migrate dev --name sprint1_foundation
pnpm prisma db seed

# 3. frontend
cd ../frontend
pnpm add react-router-dom @tanstack/react-query zustand axios socket.io-client \
  react-hook-form zod @hookform/resolvers lucide-react sonner clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
# implement src/ per TDD §6

# 4. run dev
pnpm --filter @dmx/backend dev          # http://localhost:4000
pnpm --filter @dmx/frontend dev         # http://localhost:5173
```

## Sprint 1 Definition of Done
See `sprint-1-tdd.md` §12.
