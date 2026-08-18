import { env } from "./env.js";
export function isOrchestratorEnabled() {
    return env.FSM_ORCHESTRATOR_ENABLED === true;
}
export function isOrchestratorShadowMode() {
    if (!isOrchestratorEnabled())
        return true;
    return env.FSM_ORCHESTRATOR_SHADOW_MODE !== false;
}
export function isOrchestratorAutoApply() {
    return isOrchestratorEnabled() && env.FSM_ORCHESTRATOR_AUTO_APPLY === true;
}
export function orchestratorConfigForClient() {
    return {
        enabled: isOrchestratorEnabled(),
        shadowMode: isOrchestratorShadowMode(),
        autoApply: isOrchestratorAutoApply(),
        hideOrderLogisticsActions: isOrchestratorAutoApply(),
    };
}
//# sourceMappingURL=orchestrator.js.map