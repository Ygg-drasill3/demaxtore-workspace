# ATT-001 — Workspace Attachment Download Certification

**Date:** 2026-07-16  
**Status:** ATTACHMENTS CERTIFIED FOR CONTROLLED PILOT  
**Previous production commit:** `a4604ab`  
**New production commit:** `2331cf5`  
**Certification branch:** `snapshot/pre-pilot-20260714`  
**Test prefix:** `ATTACHMENT-CERT-20260716` / `FINAL-MCP-CERT-20260716`

## Implementation

### Root cause

Workspace message attachments were uploaded and metadata (`fileName`) was rendered in the Conversation Hub UI, but **no authenticated download endpoint existed** and the frontend showed filenames as static text without click handlers.

### Backend endpoint

```
GET /api/workspaces/:workspaceType/:workspaceId/conversation/attachments/:attachmentId/download
GET /api/workspace-communication/:workspaceType/:workspaceId/attachments/:attachmentId/download
```

### Authorization model

1. JWT authentication required (`requireAuth`)
2. `canAccessCommWorkspace` — workspace participant / tenant check
3. Attachment `workspaceType` + `workspaceId` must match route params
4. If linked to a message: message not deleted + `canViewMessage` visibility check
5. Storage file verified server-side; `storageKey` never exposed to client

### Frontend behavior

- `AttachmentDownloadButton` component with loading state, file size, download icon
- Uses `downloadAuthenticatedDocument` (authenticated blob download)
- Wired in `TimelineItemCard`, `AttachmentLibraryPanel`, `PinnedTimeline`, `WorkspaceCommunicationPanel`

### Files changed

**Backend:** `content-disposition.ts`, `file-storage.ts`, `communication.service.ts`, `communication.controller.ts`, `communication.routes.ts`, `conversation-hub.routes.ts`, attachment-download tests

**Frontend:** `AttachmentDownloadButton.tsx`, hub/comm panels, API clients, tests

**E2E:** `14-workspace-communication.spec.ts` — download byte verification added

### Migration

None required.

## Security results

| Check | Result |
|-------|--------|
| Buyer access | PASS — HTTP 200, PDF bytes returned |
| Supplier access | PASS — HTTP 200, PDF bytes returned |
| Cross-tenant access | PASS — HTTP 403 |
| Logged-out access | PASS — HTTP 401 |
| Direct URL without auth | PASS — 401 |
| Invalid attachment ID | PASS — 404 |
| Path traversal | PASS — `path.basename` + sanitized Content-Disposition |
| Filename sanitization | PASS — CRLF, quotes, slashes stripped; Unicode RFC 5987 |
| File-type validation | PASS — upload uses `validateUpload` allowlist |
| File-size validation | PASS — 25MB max, empty file rejected |
| Storage path exposure | PASS — API returns metadata only; no public static URLs |

## Playwright MCP results

| Scenario | Result | Evidence |
|----------|--------|----------|
| Buyer UI download | PASS | Filename `FINAL-MCP-CERT-20260716 test dosya (1).pdf`, 24 B, `%PDF-1.4` |
| Supplier UI download | PASS | Same filename and content after supplier login |
| Mobile layout (390×844) | PASS | Download button visible and clickable |
| API buyer download | PASS | 200, `%PDF` header, 24 bytes |
| API supplier download | PASS | 200, 24 bytes |
| API logged-out | PASS | 401 |
| API cross-tenant buyer2 | PASS | 403 |
| API invalid attachment ID | PASS | 404 |

## Automated tests

| Suite | Passed | Failed |
|-------|-------:|-------:|
| Backend unit | 227 | 0 |
| Frontend unit (all) | 95 | 0 |
| Contracts | 125 | 0 |
| Frontend attachment component | 2 | 0 |

## Production

| Item | Value |
|------|-------|
| Health | `/api/healthz` → 200 |
| Readiness | `/api/ready` → 200 |
| PM2 | `demaxtore-backend` online (safe restart after orphan cleanup) |
| Rollback commit | `a4604ab` |
| Rollback procedure | `git revert <this-commit>` → rebuild backend → `scripts/pm2-safe-backend-restart.sh` → redeploy frontend |

## Final status

**ATTACHMENTS CERTIFIED FOR CONTROLLED PILOT**
