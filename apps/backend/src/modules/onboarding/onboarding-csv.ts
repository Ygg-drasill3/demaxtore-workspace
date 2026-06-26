import type { OnboardingService } from "./onboarding.service.js";
import { onboardingAudit } from "./onboarding-audit.js";
import { OnboardingAuditAction } from "@dmx/contracts/onboarding";
import { prisma } from "../../db.js";

const esc = (v: string | number | boolean | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function exportOnboardingCsv(
  reportType: string,
  service: OnboardingService,
  actorUserId: string,
): Promise<string> {
  await onboardingAudit(prisma, actorUserId, OnboardingAuditAction.LEARNING_OPENED, { export: reportType });

  const lines: string[] = [];

  switch (reportType) {
    case "onboarding-users": {
      const rows = await service.listAllProgress();
      lines.push("user_id,role,status,completion_pct,current_step,first_trade,tour_completed");
      for (const r of rows) {
        lines.push([
          r.userId, r.role, r.status, r.completionPercent,
          r.currentStep, r.firstTradeCompleted, r.tourCompleted,
        ].map(esc).join(","));
      }
      break;
    }
    case "onboarding-progress": {
      const rows = await service.listAllProgress();
      lines.push("user_id,role,step,label,completed,current");
      for (const r of rows) {
        for (const item of r.checklist) {
          lines.push([
            r.userId, r.role, item.step, item.label, item.completed, item.current,
          ].map(esc).join(","));
        }
      }
      break;
    }
    case "first-trade-success": {
      const rows = (await service.listAllProgress()).filter((r) => r.firstTradeCompleted);
      lines.push("user_id,role,completed_at_pct,steps_completed");
      for (const r of rows) {
        lines.push([
          r.userId, r.role, r.completionPercent, r.completedSteps.join("|"),
        ].map(esc).join(","));
      }
      break;
    }
    case "role-completion": {
      const metrics = await service.getDashboardMetrics();
      lines.push("role,total,completed,first_trade");
      for (const [role, data] of Object.entries(metrics.roleBreakdown)) {
        lines.push([role, data.total, data.completed, data.firstTrade].map(esc).join(","));
      }
      break;
    }
    default:
      throw new Error(`Unknown onboarding export: ${reportType}`);
  }

  return lines.join("\n");
}
