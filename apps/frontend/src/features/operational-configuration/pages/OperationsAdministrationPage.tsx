import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { opsConfigApi } from "../lib/ops-config.api";
import type { OpsAutomationRuleDto, OpsMilestoneTemplateDto } from "@dmx/contracts/operational-configuration";

export default function OperationsAdministrationPage() {
  const qc = useQueryClient();
  const configQ = useQuery({
    queryKey: ["ops-config"],
    queryFn: opsConfigApi.getConfiguration,
  });
  const tasksQ = useQuery({
    queryKey: ["ops-task-templates"],
    queryFn: opsConfigApi.listTaskTemplates,
  });
  const milestonesQ = useQuery({
    queryKey: ["ops-milestone-templates"],
    queryFn: opsConfigApi.listMilestoneTemplates,
  });
  const auditsQ = useQuery({
    queryKey: ["ops-config-audits"],
    queryFn: () => opsConfigApi.listAudits(30),
  });

  const [taskName, setTaskName] = useState("");
  const [riskAtRisk, setRiskAtRisk] = useState(1);
  const [riskDelayed, setRiskDelayed] = useState(1440);
  const [etaBuffer, setEtaBuffer] = useState(24);
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [docsRequired, setDocsRequired] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [syncedVersion, setSyncedVersion] = useState<number | null>(null);

  useEffect(() => {
    const cfg = configQ.data;
    if (!cfg) return;
    if (syncedVersion === cfg.version) return;
    setRiskAtRisk(cfg.risk.atRiskMinutes);
    setRiskDelayed(cfg.risk.delayedMinutes);
    setEtaBuffer(cfg.defaults.etaBufferHours);
    setIssueSeverity(cfg.defaults.issueSeverity);
    setTaskPriority(cfg.defaults.taskPriority);
    setDocsRequired(cfg.defaults.completionDocsRequired);
    setSyncedVersion(cfg.version);
  }, [configQ.data, syncedVersion]);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["ops-config"] }),
      qc.invalidateQueries({ queryKey: ["ops-task-templates"] }),
      qc.invalidateQueries({ queryKey: ["ops-milestone-templates"] }),
      qc.invalidateQueries({ queryKey: ["ops-config-audits"] }),
    ]);
  };

  const patchAutomation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      opsConfigApi.patchAutomation(id, { enabled }),
    onSuccess: async () => {
      setSaveMsg("Automation updated");
      await invalidateAll();
    },
  });

  const createTask = useMutation({
    mutationFn: () =>
      opsConfigApi.createTaskTemplate({
        name: taskName.trim(),
        category: "GENERAL",
        priority: "MEDIUM",
        dueOffsetDays: 3,
        enabled: true,
        description: "Created from Operations Administration",
      }),
    onSuccess: async () => {
      setTaskName("");
      setSaveMsg("Task template created");
      await invalidateAll();
    },
  });

  const patchMilestone = useMutation({
    mutationFn: ({ id, sequence }: { id: string; sequence: number }) =>
      opsConfigApi.patchMilestoneTemplate(id, { sequence }),
    onSuccess: async () => {
      setSaveMsg("Milestone template updated");
      await invalidateAll();
    },
  });

  const saveConfig = useMutation({
    mutationFn: () => {
      const cfg = configQ.data!;
      return opsConfigApi.updateConfiguration({
        version: cfg.version,
        risk: {
          atRiskMinutes: riskAtRisk,
          delayedMinutes: riskDelayed,
        },
        defaults: {
          etaBufferHours: etaBuffer,
          issueSeverity: issueSeverity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          taskPriority: taskPriority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          completionDocsRequired: docsRequired,
        },
      });
    },
    onSuccess: async () => {
      setSaveMsg("Configuration saved");
      setSyncedVersion(null);
      await invalidateAll();
    },
  });

  if (configQ.isLoading) {
    return (
      <div data-testid="ops-admin-loading" className="p-8 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (configQ.isError || !configQ.data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load operational configuration.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void configQ.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const cfg = configQ.data;
  const canManageAll = cfg.permissions.canManageAll;
  const canManageTemplates = cfg.permissions.canManageTemplates;

  return (
    <div data-testid="ops-admin-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Operations Administration</h1>
          <p className="text-sm text-zinc-500">
            Configure automation, templates, risk thresholds and defaults. Changes apply to future
            operations only.
          </p>
        </div>
        <div className="text-xs text-zinc-500" data-testid="ops-admin-version">
          Config version {cfg.version}
        </div>
      </header>

      {saveMsg && (
        <p className="text-sm text-emerald-700" data-testid="ops-admin-save-msg" role="status">
          {saveMsg}
        </p>
      )}

      <p className="md:hidden text-xs text-zinc-500" data-testid="ops-admin-mobile-readonly">
        On small screens, review cards below. Editing is intended for tablet/desktop.
      </p>

      <section
        className="dmx-card p-4 space-y-3"
        data-testid="ops-admin-automation"
        aria-labelledby="ops-admin-automation-heading"
      >
        <h2 id="ops-admin-automation-heading" className="text-sm font-semibold">
          Automation
        </h2>
        <ul className="space-y-2">
          {cfg.automation.map((rule: OpsAutomationRuleDto) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0"
              data-testid={`ops-automation-row-${rule.key}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{rule.name}</p>
                <p className="text-xs text-zinc-500">{rule.description}</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <span>{rule.enabled ? "Enabled" : "Disabled"}</span>
                <input
                  type="checkbox"
                  data-testid={`ops-automation-toggle-${rule.key}`}
                  checked={rule.enabled}
                  disabled={!canManageAll || patchAutomation.isPending}
                  aria-label={`Toggle ${rule.name}`}
                  onChange={(e) =>
                    patchAutomation.mutate({ id: rule.id, enabled: e.target.checked })
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div
          className="dmx-card p-4 space-y-3"
          data-testid="ops-admin-task-templates"
          aria-labelledby="ops-admin-tasks-heading"
        >
          <h2 id="ops-admin-tasks-heading" className="text-sm font-semibold">
            Task templates
          </h2>
          <ul className="text-xs space-y-1 max-h-48 overflow-auto">
            {(tasksQ.data ?? []).map((t) => (
              <li key={t.id} data-testid={`ops-task-template-${t.id}`}>
                {t.name} · {t.priority} · due +{t.dueOffsetDays}d {t.enabled ? "" : "(disabled)"}
              </li>
            ))}
          </ul>
          {canManageTemplates && (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (taskName.trim().length >= 2) createTask.mutate();
              }}
            >
              <input
                className="dmx-input text-sm flex-1 min-w-[12rem]"
                placeholder="New task template name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                data-testid="ops-task-template-name"
                aria-label="New task template name"
              />
              <button
                type="submit"
                className="dmx-btn-primary text-sm"
                data-testid="ops-task-template-create"
                disabled={createTask.isPending || taskName.trim().length < 2}
              >
                Create
              </button>
            </form>
          )}
        </div>

        <div
          className="dmx-card p-4 space-y-3"
          data-testid="ops-admin-milestone-templates"
          aria-labelledby="ops-admin-milestones-heading"
        >
          <h2 id="ops-admin-milestones-heading" className="text-sm font-semibold">
            Milestone templates
          </h2>
          <ul className="space-y-2">
            {(milestonesQ.data ?? []).map((m: OpsMilestoneTemplateDto) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                data-testid={`ops-milestone-template-${m.type}`}
              >
                <span>
                  {m.sequence}. {m.name} ({m.type})
                </span>
                {canManageTemplates && (
                  <button
                    type="button"
                    className="dmx-btn-secondary text-xs"
                    data-testid={`ops-milestone-bump-${m.type}`}
                    disabled={patchMilestone.isPending}
                    onClick={() =>
                      patchMilestone.mutate({ id: m.id, sequence: m.sequence + 1 })
                    }
                  >
                    Bump sequence
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div
          className="dmx-card p-4 space-y-3"
          data-testid="ops-admin-risk"
          aria-labelledby="ops-admin-risk-heading"
        >
          <h2 id="ops-admin-risk-heading" className="text-sm font-semibold">
            Risk thresholds
          </h2>
          <label className="block text-xs space-y-1">
            <span>AT_RISK (minutes)</span>
            <input
              type="number"
              className="dmx-input text-sm w-full"
              data-testid="ops-risk-at-risk"
              value={riskAtRisk}
              disabled={!canManageAll}
              onChange={(e) => setRiskAtRisk(Number(e.target.value))}
              aria-label="At risk threshold minutes"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span>DELAYED (minutes)</span>
            <input
              type="number"
              className="dmx-input text-sm w-full"
              data-testid="ops-risk-delayed"
              value={riskDelayed}
              disabled={!canManageAll}
              onChange={(e) => setRiskDelayed(Number(e.target.value))}
              aria-label="Delayed threshold minutes"
            />
          </label>
        </div>

        <div
          className="dmx-card p-4 space-y-3"
          data-testid="ops-admin-defaults"
          aria-labelledby="ops-admin-defaults-heading"
        >
          <h2 id="ops-admin-defaults-heading" className="text-sm font-semibold">
            Defaults
          </h2>
          <label className="block text-xs space-y-1">
            <span>ETA buffer (hours)</span>
            <input
              type="number"
              className="dmx-input text-sm w-full"
              data-testid="ops-default-eta-buffer"
              value={etaBuffer}
              disabled={!canManageAll}
              onChange={(e) => setEtaBuffer(Number(e.target.value))}
              aria-label="Default ETA buffer hours"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span>Default issue severity</span>
            <select
              className="dmx-input text-sm w-full"
              data-testid="ops-default-issue-severity"
              value={issueSeverity}
              disabled={!canManageAll}
              onChange={(e) => setIssueSeverity(e.target.value)}
              aria-label="Default issue severity"
            >
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span>Default task priority</span>
            <select
              className="dmx-input text-sm w-full"
              data-testid="ops-default-task-priority"
              value={taskPriority}
              disabled={!canManageAll}
              onChange={(e) => setTaskPriority(e.target.value)}
              aria-label="Default task priority"
            >
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              data-testid="ops-default-docs-required"
              checked={docsRequired}
              disabled={!canManageAll}
              onChange={(e) => setDocsRequired(e.target.checked)}
              aria-label="Completion documents required"
            />
            Completion documents required
          </label>
        </div>
      </section>

      {canManageAll && (
        <div className="flex justify-end">
          <button
            type="button"
            className="dmx-btn-primary text-sm"
            data-testid="ops-admin-save"
            disabled={saveConfig.isPending}
            onClick={() => saveConfig.mutate()}
          >
            Save configuration
          </button>
        </div>
      )}

      <section
        className="dmx-card p-4 space-y-2"
        data-testid="ops-admin-system-health"
        aria-labelledby="ops-admin-health-heading"
      >
        <h2 id="ops-admin-health-heading" className="text-sm font-semibold">
          System health · Audit
        </h2>
        <p className="text-xs text-zinc-500">
          Configuration changes are audited here (not on operational timelines). Cache TTL 60s with
          invalidation on write.
        </p>
        <ul className="text-xs space-y-1 max-h-40 overflow-auto" data-testid="ops-admin-audits">
          {(auditsQ.data ?? []).map((a) => (
            <li key={a.id}>
              {a.createdAt} · <span data-testid={`ops-audit-${a.action}`}>{a.action}</span> ·{" "}
              {a.actorEmail ?? "system"}
            </li>
          ))}
          {!auditsQ.data?.length && <li className="text-zinc-500">No audit entries yet</li>}
        </ul>
      </section>
    </div>
  );
}
