import { api } from "@/lib/api";
import type {
  OperationalConfigurationDto,
  OpsAutomationRuleDto,
  OpsConfigAuditDto,
  OpsMilestoneTemplateDto,
  OpsTaskTemplateDto,
} from "@dmx/contracts/operational-configuration";
import type {
  PatchAutomationRuleInput,
  PatchMilestoneTemplateInput,
  PatchTaskTemplateInput,
  UpdateOperationalConfigurationInput,
  UpsertMilestoneTemplateInput,
  UpsertTaskTemplateInput,
} from "@dmx/contracts/operational-configuration.zod";

export const opsConfigApi = {
  getConfiguration: () =>
    api.get("/operations/configuration").then((r) => r.data as OperationalConfigurationDto),

  updateConfiguration: (body: UpdateOperationalConfigurationInput) =>
    api.patch("/operations/configuration", body).then((r) => r.data as OperationalConfigurationDto),

  listAutomation: () =>
    api.get("/operations/automation").then((r) => r.data as OpsAutomationRuleDto[]),

  patchAutomation: (id: string, body: PatchAutomationRuleInput) =>
    api.patch(`/operations/automation/${id}`, body).then((r) => r.data as OpsAutomationRuleDto),

  listTaskTemplates: () =>
    api.get("/operations/templates/tasks").then((r) => r.data as OpsTaskTemplateDto[]),

  createTaskTemplate: (body: UpsertTaskTemplateInput) =>
    api.post("/operations/templates/tasks", body).then((r) => r.data as OpsTaskTemplateDto),

  patchTaskTemplate: (id: string, body: PatchTaskTemplateInput) =>
    api.patch(`/operations/templates/tasks/${id}`, body).then((r) => r.data as OpsTaskTemplateDto),

  listMilestoneTemplates: () =>
    api.get("/operations/templates/milestones").then((r) => r.data as OpsMilestoneTemplateDto[]),

  createMilestoneTemplate: (body: UpsertMilestoneTemplateInput) =>
    api
      .post("/operations/templates/milestones", body)
      .then((r) => r.data as OpsMilestoneTemplateDto),

  patchMilestoneTemplate: (id: string, body: PatchMilestoneTemplateInput) =>
    api
      .patch(`/operations/templates/milestones/${id}`, body)
      .then((r) => r.data as OpsMilestoneTemplateDto),

  listAudits: (limit = 40) =>
    api
      .get(`/operations/configuration/audits?limit=${limit}`)
      .then((r) => r.data as OpsConfigAuditDto[]),
};
