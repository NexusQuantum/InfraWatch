import "server-only";

import type { Host, ComputeCluster, StorageCluster, KubernetesCluster } from "@/lib/types/entities";
import {
  listAlertRules,
  batchFindActiveAlerts,
  batchCreateAlerts,
  batchAutoResolve,
  purgeOldAlerts,
  type AlertRule,
} from "./alerts-store";

// ---------------------------------------------------------------------------
// Metric extractors per entity type
// ---------------------------------------------------------------------------

type MetricExtractor = (entity: Record<string, unknown>) => number | undefined;

const HOST_METRICS: Record<string, MetricExtractor> = {
  cpuUsagePct: (e) => (e.current as Record<string, number>)?.cpuUsagePct,
  memoryUsagePct: (e) => (e.current as Record<string, number>)?.memoryUsagePct,
  diskUsagePct: (e) => (e.current as Record<string, number>)?.diskUsagePct,
  networkErrorRate: (e) => (e.current as Record<string, number>)?.networkErrorRate,
};

const COMPUTE_CLUSTER_METRICS: Record<string, MetricExtractor> = {
  avgCpuUsagePct: (e) => e.avgCpuUsagePct as number,
  avgMemoryUsagePct: (e) => e.avgMemoryUsagePct as number,
  avgDiskUsagePct: (e) => e.avgDiskUsagePct as number,
  pressureScore: (e) => e.pressureScore as number,
};

const STORAGE_CLUSTER_METRICS: Record<string, MetricExtractor> = {
  storageUsedPct: (e) => (e.capacity as Record<string, number>)?.usedPct,
};

const KUBERNETES_CLUSTER_METRICS: Record<string, MetricExtractor> = {
  unhealthyPodCount: (e) => e.unhealthyPodCount as number,
  unavailableDeploymentCount: (e) => e.unavailableDeploymentCount as number,
};

const ENTITY_METRICS: Record<string, Record<string, MetricExtractor>> = {
  host: HOST_METRICS,
  compute_cluster: COMPUTE_CLUSTER_METRICS,
  storage_cluster: STORAGE_CLUSTER_METRICS,
  kubernetes_cluster: KUBERNETES_CLUSTER_METRICS,
};

// ---------------------------------------------------------------------------
// Throttle: evaluate at most once per EVAL_INTERVAL_MS
// ---------------------------------------------------------------------------

const EVAL_INTERVAL_MS = 60_000; // 60 seconds
let lastEvalAt = 0;
let evalInFlight = false;

// ---------------------------------------------------------------------------
// Comparison operators
// ---------------------------------------------------------------------------

function compare(
  actual: number,
  operator: AlertRule["operator"],
  threshold: number
): boolean {
  switch (operator) {
    case "gt":
      return actual > threshold;
    case "gte":
      return actual >= threshold;
    case "lt":
      return actual < threshold;
    case "lte":
      return actual <= threshold;
    case "eq":
      return actual === threshold;
    default:
      return false;
  }
}

function operatorSymbol(op: AlertRule["operator"]): string {
  switch (op) {
    case "gt": return ">";
    case "gte": return ">=";
    case "lt": return "<";
    case "lte": return "<=";
    case "eq": return "==";
    default: return op;
  }
}

function entityName(entity: Record<string, unknown>): string {
  return (
    (entity.hostname as string) ||
    (entity.name as string) ||
    (entity.id as string) ||
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Main evaluator (batched — O(1) DB queries regardless of entity count)
// ---------------------------------------------------------------------------

export async function evaluateAlerts(data: {
  hosts?: Host[];
  computeClusters?: ComputeCluster[];
  storageClusters?: StorageCluster[];
  kubernetesClusters?: KubernetesCluster[];
}): Promise<void> {
  // Throttle: skip if evaluated recently or already running
  const now = Date.now();
  if (now - lastEvalAt < EVAL_INTERVAL_MS || evalInFlight) return;

  evalInFlight = true;
  lastEvalAt = now;

  try {
    const rules = await listAlertRules();
    const enabledRules = rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) {
      // Still run purge even with no rules
      await purgeOldAlerts();
      return;
    }

    const entitySources: Record<string, Record<string, unknown>[]> = {
      host: (data.hosts ?? []) as unknown as Record<string, unknown>[],
      compute_cluster: (data.computeClusters ?? []) as unknown as Record<string, unknown>[],
      storage_cluster: (data.storageClusters ?? []) as unknown as Record<string, unknown>[],
      kubernetes_cluster: (data.kubernetesClusters ?? []) as unknown as Record<string, unknown>[],
    };

    // Batch fetch ALL active alerts for all enabled rules in ONE query
    const ruleIds = enabledRules.map((r) => r.id);
    const activeAlerts = await batchFindActiveAlerts(ruleIds);

    // Evaluate all rules and collect batch operations
    const toCreate: Array<{
      ruleId: string;
      entityId: string;
      entityType: string;
      entityName: string;
      severity: string;
      metric: string;
      threshold: number;
      actualValue: number;
      message: string;
    }> = [];
    const toResolve: Array<{ ruleId: string; entityId: string }> = [];
    // Track which active alerts are still relevant (to auto-resolve stale ones)
    const touchedKeys = new Set<string>();

    for (const rule of enabledRules) {
      const entities = entitySources[rule.entityType] ?? [];
      const metricExtractors = ENTITY_METRICS[rule.entityType];
      if (!metricExtractors) continue;

      const extractor = metricExtractors[rule.metric];
      if (!extractor) continue;

      for (const entity of entities) {
        const entityId = entity.id as string;
        const value = extractor(entity);
        if (value === undefined) continue;

        const key = `${rule.id}:${entityId}`;
        const triggered = compare(value, rule.operator, rule.threshold);
        const existing = activeAlerts.get(key);
        touchedKeys.add(key);

        if (triggered && !existing) {
          toCreate.push({
            ruleId: rule.id,
            entityId,
            entityType: rule.entityType,
            entityName: entityName(entity),
            severity: rule.severity,
            metric: rule.metric,
            threshold: rule.threshold,
            actualValue: value,
            message: `${entityName(entity)}: ${rule.metric} is ${value.toFixed(1)} (${operatorSymbol(rule.operator)} ${rule.threshold})`,
          });
        } else if (!triggered && existing) {
          toResolve.push({ ruleId: rule.id, entityId });
        }
      }
    }

    // Execute batch operations (2 queries total instead of N*M)
    await Promise.all([
      toCreate.length > 0 ? batchCreateAlerts(toCreate) : Promise.resolve(0),
      toResolve.length > 0 ? batchAutoResolve(toResolve) : Promise.resolve(0),
    ]);

    // Periodically purge old resolved alerts
    await purgeOldAlerts();
  } catch (error) {
    console.error("[alert-evaluator] Error evaluating alerts:", error);
  } finally {
    evalInFlight = false;
  }
}
