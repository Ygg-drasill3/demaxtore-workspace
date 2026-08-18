import type { PrismaClient } from "@prisma/client";
import { OPERATIONAL_TASK_AUTOMATION_KEYS } from "@dmx/contracts/operational-task";
import { OperationalTaskService } from "./operational-task.service.js";
import { OperationalConfigurationService } from "../operational-configuration/operational-configuration.service.js";

/** Fire-and-forget safe automation after Order / Inspection / Shipment mutations. */
export async function runOperationalTaskAutomation(
  prisma: PrismaClient,
  event:
    | { type: "inspection.requested"; orderId: string; inspectionId: string; actorUserId?: string }
    | { type: "inspection.failed"; orderId: string; inspectionId: string; actorUserId?: string }
    | { type: "shipment.booked"; orderId: string; shipmentId: string; actorUserId?: string }
    | { type: "po.revised"; orderId: string; revisionId?: string; actorUserId?: string }
    | { type: "order.approved_for_shipment"; orderId: string; actorUserId?: string },
): Promise<void> {
  const config = new OperationalConfigurationService(prisma);
  if (!(await config.isAutomationEnabled(event.type))) return;

  const svc = new OperationalTaskService(prisma);

  async function resolveTemplate(
    baseKey: string,
    fallback: {
      title: string;
      description: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      dueInDays: number;
    },
  ) {
    const tpl = await config.getTaskTemplateForTrigger(baseKey);
    if (!tpl) return fallback;
    const priority = (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(tpl.priority)
      ? tpl.priority
      : fallback.priority) as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    return {
      title: tpl.title,
      description: tpl.description ?? fallback.description,
      priority,
      dueInDays: tpl.dueOffsetDays,
    };
  }

  switch (event.type) {
    case "inspection.requested": {
      const t = await resolveTemplate(OPERATIONAL_TASK_AUTOMATION_KEYS.ASSIGN_INSPECTOR, {
        title: "Assign inspector",
        description: "Assign an inspector and schedule the quality inspection.",
        priority: "HIGH",
        dueInDays: 2,
      });
      await svc.ensureAutomatedTask({
        orderId: event.orderId,
        automationKey: OPERATIONAL_TASK_AUTOMATION_KEYS.ASSIGN_INSPECTOR,
        title: t.title,
        description: t.description,
        priority: t.priority,
        relatedEntityType: "INSPECTION",
        relatedEntityId: event.inspectionId,
        dueInDays: t.dueInDays,
        actorUserId: event.actorUserId,
      });
      break;
    }
    case "inspection.failed": {
      const t = await resolveTemplate(OPERATIONAL_TASK_AUTOMATION_KEYS.RESOLVE_NCR, {
        title: "Resolve NCR",
        description: "Inspection failed — create/close NCR and plan reinspection if required.",
        priority: "CRITICAL",
        dueInDays: 3,
      });
      await svc.ensureAutomatedTask({
        orderId: event.orderId,
        automationKey: `${OPERATIONAL_TASK_AUTOMATION_KEYS.RESOLVE_NCR}:${event.inspectionId}`,
        title: t.title,
        description: t.description,
        priority: t.priority,
        relatedEntityType: "NCR",
        relatedEntityId: event.inspectionId,
        dueInDays: t.dueInDays,
        actorUserId: event.actorUserId,
      });
      break;
    }
    case "shipment.booked": {
      const t = await resolveTemplate(OPERATIONAL_TASK_AUTOMATION_KEYS.UPLOAD_BILL_OF_LADING, {
        title: "Upload Bill of Lading",
        description: "Upload the Bill of Lading to the Commercial Document Center.",
        priority: "HIGH",
        dueInDays: 5,
      });
      await svc.ensureAutomatedTask({
        orderId: event.orderId,
        automationKey: OPERATIONAL_TASK_AUTOMATION_KEYS.UPLOAD_BILL_OF_LADING,
        title: t.title,
        description: t.description,
        priority: t.priority,
        relatedEntityType: "SHIPMENT",
        relatedEntityId: event.shipmentId,
        dueInDays: t.dueInDays,
        actorUserId: event.actorUserId,
      });
      break;
    }
    case "po.revised": {
      const t = await resolveTemplate(OPERATIONAL_TASK_AUTOMATION_KEYS.REVIEW_REVISION, {
        title: "Review Purchase Order revision",
        description: "Review the latest PO revision and acknowledge changes.",
        priority: "HIGH",
        dueInDays: 2,
      });
      await svc.ensureAutomatedTask({
        orderId: event.orderId,
        automationKey: event.revisionId
          ? `${OPERATIONAL_TASK_AUTOMATION_KEYS.REVIEW_REVISION}:${event.revisionId}`
          : OPERATIONAL_TASK_AUTOMATION_KEYS.REVIEW_REVISION,
        title: t.title,
        description: t.description,
        priority: t.priority,
        relatedEntityType: "REVISION",
        relatedEntityId: event.revisionId ?? null,
        dueInDays: t.dueInDays,
        actorUserId: event.actorUserId,
      });
      break;
    }
    case "order.approved_for_shipment": {
      const t = await resolveTemplate(OPERATIONAL_TASK_AUTOMATION_KEYS.CREATE_SHIPMENT_BOOKING, {
        title: "Create shipment booking",
        description: "Open Shipment Workspace and confirm freight booking.",
        priority: "MEDIUM",
        dueInDays: 3,
      });
      await svc.ensureAutomatedTask({
        orderId: event.orderId,
        automationKey: OPERATIONAL_TASK_AUTOMATION_KEYS.CREATE_SHIPMENT_BOOKING,
        title: t.title,
        description: t.description,
        priority: t.priority,
        relatedEntityType: "ORDER",
        relatedEntityId: event.orderId,
        dueInDays: t.dueInDays,
        actorUserId: event.actorUserId,
      });
      break;
    }
    default:
      break;
  }
}
