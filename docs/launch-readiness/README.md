# Launch Readiness Sprint

Sales and GTM materials for DeMaxtore v0.2. **No backend or production logic changes** — copy, landing, onboarding UX, and sales enablement only.

## Deliverables

| Document | Purpose |
|----------|---------|
| [demo-video-script.md](./demo-video-script.md) | 3-minute product video narration + shot list |
| [product-screenshot-list.md](./product-screenshot-list.md) | Capture checklist for website, deck, and CRM |
| [buyer-onboarding-copy.md](./buyer-onboarding-copy.md) | Buyer welcome + checklist messaging reference |
| [supplier-onboarding-copy.md](./supplier-onboarding-copy.md) | Supplier welcome + checklist messaging reference |
| [sales-demo-checklist.md](./sales-demo-checklist.md) | Pre-call, live demo, and post-call checklist |
| [crm-lead-flow.md](./crm-lead-flow.md) | Lead → pilot → customer lifecycle (process doc) |

## Related product docs

- [customer-demo-guide.md](../customer-demo-guide.md) — ABC Foods 5-min live demo
- [platform-readiness-report.md](../platform-readiness-report.md) — technical GO decision

## In-app surfaces updated (Launch Sprint)

| Surface | Route / file |
|---------|----------------|
| Public landing | `/welcome` — `apps/frontend/src/features/marketing/pages/LandingPage.tsx` |
| Auth brand panel | `/login` — `apps/frontend/src/layouts/AuthLayout.tsx` |
| Buyer onboarding welcome | `/buyer/dashboard` — `OnboardingSection.tsx` |
| Supplier onboarding welcome | `/supplier/dashboard` — `SupplierOnboardingSection.tsx` |
| Copy source of truth | `apps/frontend/src/content/launch-copy.ts` |

## Seed before screenshots / demos

```bash
yarn demo:seed
```

Demo accounts: see [customer-demo-guide.md](../customer-demo-guide.md).
