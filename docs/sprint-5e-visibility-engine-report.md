# Sprint 5E — Visibility Engine Report

## Principle

Visibility is enforced **only on the server** in `communication.visibility.ts`. The frontend selector is a hint; unauthorized visibility values are rejected at create time.

## Rules

| Visibility | Buyer | Supplier | Admin |
|------------|-------|----------|-------|
| ALL_PARTICIPANTS | ✓ (if participant) | ✓ (if participant) | ✓ |
| BUYER_ONLY | ✓ | ✗ | ✓ |
| SUPPLIER_ONLY | ✗ | ✓ | ✓ |
| ADMIN_ONLY | ✗ | ✗ | ✓ |
| BUYER_ADMIN | ✓ | ✗ | ✓ |
| SUPPLIER_ADMIN | ✗ | ✓ | ✓ |

## Special types

- `INTERNAL_NOTE` — only `ADMIN` may create; typically paired with `ADMIN_ONLY` visibility.
- Notification fanout uses the same `canViewMessage()` check per recipient.

## PO / FreightIQ resolution

- **PO**: `workspace_id` = purchase order id; audit/timeline/socket room = linked **order** workspace id.
- **FREIGHTIQ**: `workspace_id` = order id; same audit workspace.

## API filtering

List and search endpoints filter messages through `canViewMessage()` before returning DTOs — buyers never receive admin-only content in JSON responses.
