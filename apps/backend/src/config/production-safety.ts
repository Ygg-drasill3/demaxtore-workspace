import { env, isProd } from "./env.js";
import { logger } from "./logger.js";

export type SafetyGateKey =
  | "PAYMENT_GATES_ENABLED"
  | "INCOTERMS_PRECONDITIONS_ENABLED"
  | "EXCEPTION_ENGINE_V2_ENABLED"
  | "RBAC_EXPANDED_ROLES_ENABLED";

export type SafetyGateStatus = {
  key: SafetyGateKey;
  enabled: boolean;
  requiredInProduction: boolean;
};

const PRODUCTION_REQUIRED_GATES: SafetyGateKey[] = [
  "PAYMENT_GATES_ENABLED",
  "INCOTERMS_PRECONDITIONS_ENABLED",
  "EXCEPTION_ENGINE_V2_ENABLED",
  "RBAC_EXPANDED_ROLES_ENABLED",
];

export function getSafetyGateStatuses(): SafetyGateStatus[] {
  const values: Record<SafetyGateKey, boolean> = {
    PAYMENT_GATES_ENABLED: env.PAYMENT_GATES_ENABLED === true,
    INCOTERMS_PRECONDITIONS_ENABLED: env.INCOTERMS_PRECONDITIONS_ENABLED === true,
    EXCEPTION_ENGINE_V2_ENABLED: env.EXCEPTION_ENGINE_V2_ENABLED === true,
    RBAC_EXPANDED_ROLES_ENABLED: env.RBAC_EXPANDED_ROLES_ENABLED === true,
  };

  return PRODUCTION_REQUIRED_GATES.map((key) => ({
    key,
    enabled: values[key],
    requiredInProduction: true,
  }));
}

export function areProductionSafetyGatesSatisfied(): boolean {
  if (!isProd) return true;
  return getSafetyGateStatuses().every((g) => g.enabled);
}

export function getDisabledProductionSafetyGates(): SafetyGateKey[] {
  return getSafetyGateStatuses()
    .filter((g) => g.requiredInProduction && !g.enabled)
    .map((g) => g.key);
}

/**
 * Fail-fast in production when mandatory enterprise safety gates are off.
 * Skipped in development and test to preserve local ergonomics.
 */
export function validateProductionSafetyGates(): void {
  if (!isProd) {
    const disabled = getSafetyGateStatuses().filter((g) => !g.enabled);
    if (disabled.length) {
      logger.warn(
        { disabledGates: disabled.map((g) => g.key) },
        "Enterprise safety gates are disabled (allowed in non-production)",
      );
    }
    return;
  }

  const missing = getDisabledProductionSafetyGates();
  if (missing.length) {
    logger.fatal(
      { missingGates: missing },
      "Production startup blocked: mandatory enterprise safety gates are disabled",
    );
    process.exit(1);
  }

  logger.info(
    { gates: getSafetyGateStatuses().map((g) => ({ key: g.key, enabled: g.enabled })) },
    "Enterprise safety gates active",
  );
}
