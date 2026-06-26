import { env } from "./env.js";

export function isOrchestratorEnabled(): boolean {
  return env.FSM_ORCHESTRATOR_ENABLED === true;
}

export function isOrchestratorShadowMode(): boolean {
  if (!isOrchestratorEnabled()) return true;
  return env.FSM_ORCHESTRATOR_SHADOW_MODE !== false;
}

export function isOrchestratorAutoApply(): boolean {
  return isOrchestratorEnabled() && env.FSM_ORCHESTRATOR_AUTO_APPLY === true;
}

export function orchestratorConfigForClient(): {
  enabled: boolean;
  shadowMode: boolean;
  autoApply: boolean;
  hideOrderLogisticsActions: boolean;
} {
  return {
    enabled: isOrchestratorEnabled(),
    shadowMode: isOrchestratorShadowMode(),
    autoApply: isOrchestratorAutoApply(),
    hideOrderLogisticsActions: isOrchestratorAutoApply(),
  };
}
