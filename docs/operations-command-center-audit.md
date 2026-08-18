# Operations Command Center Audit — Sprint 10C

**Date:** 2026-06-05  
**Scope:** Operations UX + visibility only (no FSM/runtime changes)

## Previous state (pre-10C)

| Surface | Route | State |
|---------|-------|-------|
| Admin Dashboard | `/admin/dashboard` | **Mock data** — StatCards, fake activity |
| Control Tower | `/operations` | Live — alerts, funnels, SLA, tracking |
| Executive | `/operations/executive` | Live — scale/forecast |
| Growth | `/operations/growth` | Live — funnel, conversion |
| Market Intelligence | `/operations/market-intelligence` | Live |
| Freight Commercial | `/operations/freight-commercial` | Live — Sprint 6A/6B revenue |
| Freight Ops | `/operations/freight` | Live |
| System Operations | `/operations/system` | Live — Sprint 8A |
| Workload API | `GET /scale/workload` | Live — **no UI** |

## Problems identified

1. **Fragmented ops experience** — 7+ screens for routine monitoring
2. **Mock landing page** — Admin login landed on fake dashboard (`ROLE_DASHBOARD` → `/admin/dashboard`)
3. **No intervention inbox** — Control Tower alerts buried in separate page
4. **Workload invisible** — Sprint 7A operator load API unused in UI
5. **Revenue disconnected** — Freight commercial data required navigation to specialty page
6. **No trade board** — RFQ/Order/Shipment status spread across funnels and workspace lists

## Post-10C changes

- `/admin/dashboard` → **Operations Command Center** (live aggregation)
- Home nav group with Command Center as primary landing
- Admin quick actions (5 shortcuts)
- 12 operational widgets with `oc-*` testIds
- Control Tower summary embedded — full tower still at `/operations`
- Personalization modes: `operations_agent` | `operations_manager` | `executive`

## Files modified

| Area | Path |
|------|------|
| Aggregator | `apps/frontend/src/features/dashboard/lib/operations-command-center.ts` |
| Hook | `apps/frontend/src/features/dashboard/hooks/useOperationsCommandCenter.ts` |
| Widgets | `apps/frontend/src/features/dashboard/components/operations-command-center/*` |
| Dashboard | `apps/frontend/src/features/dashboard/pages/AdminDashboardPage.tsx` |
| Navigation | `apps/frontend/src/routes/navigation.ts` |
