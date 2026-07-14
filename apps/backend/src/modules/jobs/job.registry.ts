import type { JobRegistryEntry } from "@dmx/contracts/enterprise-readiness";
import { env } from "../../config/env.js";
import { SchedulerLockId } from "../../db/scheduler-lock.js";

/** Central registry of background workloads (Sprint 8A). */
export const JOB_REGISTRY: JobRegistryEntry[] = [
  {
    name: "proforma_sla_email",
    label: "Proforma SLA email",
    description: "Sends proforma deadline reminders to selected suppliers",
    intervalMs: env.SLA_WORKER_INTERVAL_MS,
    advisoryLockId: String(SchedulerLockId.PROFORMA_SLA),
    enabled: true,
    category: "email",
  },
  {
    name: "commoditybid_system_fsm",
    label: "CommodityBid system FSM",
    description: "Deadline close and award acceptance SLA transitions",
    intervalMs: env.SLA_WORKER_INTERVAL_MS,
    advisoryLockId: String(SchedulerLockId.COMMODITYBID),
    enabled: true,
    category: "scheduler",
  },
  {
    name: "control_tower_alert_scan",
    label: "Control Tower alert scan",
    description: "RFQ/CB/order/shipment/freight/docs/PO/comms + scale/growth/market scans",
    intervalMs: env.SLA_WORKER_INTERVAL_MS,
    advisoryLockId: String(SchedulerLockId.CONTROL_TOWER),
    enabled: true,
    category: "scan",
  },
  {
    name: "maritime_tracking_sync",
    label: "Maritime tracking sync",
    description: "Syncs linked shipment tracking snapshots",
    intervalMs: env.TRACKING_SYNC_INTERVAL_MS,
    advisoryLockId: String(SchedulerLockId.TRACKING),
    enabled: true,
    category: "sync",
  },
  {
    name: "whatsapp_bridge_retry",
    label: "WhatsApp bridge retry",
    description: "Retries failed WhatsApp Notification Bridge deliveries with exponential backoff",
    intervalMs: env.WHATSAPP_BRIDGE_RETRY_INTERVAL_MS,
    advisoryLockId: String(SchedulerLockId.WHATSAPP_BRIDGE),
    enabled: true,
    category: "email",
  },
  {
    name: "email_bridge_retry",
    label: "Email bridge retry",
    description: "Retries failed Email Notification Bridge deliveries with exponential backoff",
    intervalMs: env.EMAIL_BRIDGE_RETRY_INTERVAL_MS,
    advisoryLockId: String(SchedulerLockId.EMAIL_BRIDGE),
    enabled: true,
    category: "email",
  },
];

export function getJobDefinition(name: string): JobRegistryEntry | undefined {
  return JOB_REGISTRY.find((j) => j.name === name);
}
