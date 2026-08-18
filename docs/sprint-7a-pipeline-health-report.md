# Sprint 7A — Pipeline Health Report

## Purpose

Detect stalled trade pipelines and surface health scores (0–100) without modifying any FSM.

## Engine

`ScalePipelineService` evaluates open RFQ, ORDER, and SHIPMENT workspaces:

| Signal | Score impact |
|--------|----------------|
| No update in 7+ days | −30 (`stale_activity`) |
| Open Control Tower alerts | −10 per alert (max −40) |
| RFQ submitted, no suppliers | −25 (`rfq_stalled`) |
| PO / order waiting states | −15 (`po_waiting`) |
| Shipment delay alerts | −25 (`shipment_delayed`) |
| Trade doc issues | −20 (`documentation_blocked`) |

**Stalled** when health &lt; 50 or critical issue flags.

## API

`GET /api/scale/pipeline/health` → `PipelineHealthSummary`

Audit: `health.score.updated`

## Control Tower

| alertKey | When |
|----------|------|
| `pipeline.stalled` | Workspace marked stalled by health engine |

Integrated via `scanScaleReadinessAlerts` in the alert engine full scan.

## E2E

Spec 18 tests 04–05.

## Status

**PASS**
