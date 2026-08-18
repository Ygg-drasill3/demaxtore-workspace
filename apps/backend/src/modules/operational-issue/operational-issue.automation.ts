import type { PrismaClient } from "@prisma/client";
import { OPERATIONAL_ISSUE_AUTOMATION_KEYS } from "@dmx/contracts/operational-issue";
import { OPERATIONAL_TASK_AUTOMATION_KEYS } from "@dmx/contracts/operational-task";
import { evaluateInspectionFailed } from "@dmx/contracts/exception-intelligence";
import { OperationalIssueService } from "./operational-issue.service.js";
import { OperationalTaskService } from "../operational-task/operational-task.service.js";
import { OperationalConfigurationService } from "../operational-configuration/operational-configuration.service.js";

/** Fire-and-forget safe automation after Inspection / ops mutations. */
export async function runOperationalIssueAutomation(
  prisma: PrismaClient,
  event:
    | { type: "inspection.failed"; orderId: string; inspectionId: string; actorUserId?: string },
): Promise<void> {
  const config = new OperationalConfigurationService(prisma);
  if (!(await config.isAutomationEnabled(event.type))) return;

  const issueSvc = new OperationalIssueService(prisma);
  const taskSvc = new OperationalTaskService(prisma);
  const defaults = await config.getDefaults();
  const taskTpl = await config.getTaskTemplateForTrigger(OPERATIONAL_TASK_AUTOMATION_KEYS.RESOLVE_NCR);
  const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  const issueSeverity = (severities.includes(defaults.issueSeverity as (typeof severities)[number])
    ? defaults.issueSeverity
    : "CRITICAL") as (typeof severities)[number];
  const taskPriority = (severities.includes((taskTpl?.priority ?? "CRITICAL") as (typeof severities)[number])
    ? (taskTpl?.priority ?? "CRITICAL")
    : "CRITICAL") as (typeof severities)[number];

  switch (event.type) {
    case "inspection.failed": {
      const task = await taskSvc.ensureAutomatedTask({
        orderId: event.orderId,
        automationKey: `${OPERATIONAL_TASK_AUTOMATION_KEYS.RESOLVE_NCR}:${event.inspectionId}`,
        title: taskTpl?.title ?? "Resolve NCR",
        description:
          taskTpl?.description
          ?? "Inspection failed — create/close NCR and plan reinspection if required.",
        priority: taskPriority,
        relatedEntityType: "NCR",
        relatedEntityId: event.inspectionId,
        dueInDays: taskTpl?.dueOffsetDays ?? 3,
        actorUserId: event.actorUserId,
      });

      const intel = evaluateInspectionFailed();
      await issueSvc.ensureAutomatedIssue({
        orderId: event.orderId,
        automationKey: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.INSPECTION_FAILURE}:${event.inspectionId}`,
        title: intel.title,
        description: intel.description,
        category: "INSPECTION_FAILURE",
        severity: issueSeverity,
        relatedEntityType: "INSPECTION",
        relatedEntityId: event.inspectionId,
        assignedTaskId: task.id,
        actorUserId: event.actorUserId,
        impactType: intel.impactType,
        ownerRole: intel.ownerRole,
        recommendedAction: intel.recommendedAction,
        sourceEventType: intel.eventType,
        sourceRuleId: intel.ruleId,
      });
      break;
    }
    default:
      break;
  }
}
