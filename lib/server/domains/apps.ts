import "server-only";

import type { Application } from "@/lib/types/entities";
import {
  enabledConnectorBundles,
  queryVector,
  num,
  rangeWindow,
  firstSeriesPoints,
  labelValue,
  getConnectorConfig,
  queryRangeWithConfig,
  type ApiResponseMeta,
} from "./shared";

export async function fetchLiveApplications(): Promise<
  ApiResponseMeta<Application[]>
> {
  const bundles = await enabledConnectorBundles();
  const out: Application[] = [];
  const failed: string[] = [];

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [runningPods, unhealthyPods] = await Promise.all([
          queryVector(
            config,
            "sum by(namespace) (kube_pod_status_phase{phase='Running'})"
          ),
          queryVector(
            config,
            "sum by(namespace) (kube_pod_status_phase{phase=~'Pending|Failed|Unknown'})"
          ),
        ]);

        const running = new Map<string, number>();
        const unhealthy = new Map<string, number>();
        for (const row of runningPods) {
          const namespace = row.metric.namespace;
          if (!namespace || namespace === "kube-system") continue;
          running.set(namespace, num(row.value[1]));
        }
        for (const row of unhealthyPods) {
          const namespace = row.metric.namespace;
          if (!namespace || namespace === "kube-system") continue;
          unhealthy.set(namespace, num(row.value[1]));
        }

        const allNamespaces = new Set<string>([
          ...running.keys(),
          ...unhealthy.keys(),
        ]);
        for (const namespace of allNamespaces) {
          const runningCount = running.get(namespace) ?? 0;
          const unhealthyCount = unhealthy.get(namespace) ?? 0;
          const instanceCount = Math.round(runningCount + unhealthyCount);
          const status =
            unhealthyCount >= 3
              ? "critical"
              : unhealthyCount > 0
                ? "warning"
                : "healthy";

          out.push({
            id: `${connector.id}:ns:${namespace}`,
            name: namespace,
            connectorIds: [connector.id],
            environment: connector.environment,
            site: connector.site,
            status,
            namespace,
            clusterIds: [`k8s:${connector.id}`],
            instanceCount,
            current: {},
          });
        }
      } catch {
        failed.push(connector.id);
      }
    })
  );

  return {
    data: out.sort((a, b) => a.name.localeCompare(b.name)),
    meta: {
      timestamp: new Date().toISOString(),
      partial: failed.length > 0,
      stale: false,
      errors: failed.length
        ? [`Failed connectors: ${failed.join(", ")}`]
        : undefined,
      failedConnectors: failed.length ? failed : undefined,
    },
  };
}

export async function fetchLiveApplicationTimeseries(
  appId: string,
  range = "1h",
  step = "5m"
) {
  const parts = appId.split(":ns:");
  if (parts.length !== 2) throw new Error("Invalid app id");
  const connectorId = parts[0];
  const namespace = parts[1];
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");
  const window = rangeWindow(range, step);
  const ns = labelValue(namespace);

  const [running, unhealthy] = await Promise.all([
    queryRangeWithConfig(
      config,
      `sum(kube_pod_status_phase{namespace="${ns}",phase='Running'})`,
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      `sum(kube_pod_status_phase{namespace="${ns}",phase=~'Pending|Failed|Unknown'})`,
      window.start,
      window.end,
      window.step
    ),
  ]);

  return {
    data: {
      running: firstSeriesPoints(running),
      unhealthy: firstSeriesPoints(unhealthy),
      range,
      step: window.step,
      updatedAt: window.now,
      source: "prometheus" as const,
    },
    meta: {
      timestamp: window.now,
      partial: false,
      stale: false,
    },
  };
}
