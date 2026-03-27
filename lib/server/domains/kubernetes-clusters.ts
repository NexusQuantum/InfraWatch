import "server-only";

import type { KubernetesCluster } from "@/lib/types/entities";
import {
  enabledConnectorBundles,
  queryNumber,
  rangeWindow,
  firstSeriesPoints,
  getConnectorConfig,
  queryRangeWithConfig,
  type ApiResponseMeta,
} from "./shared";
import { getOrFetch } from "@/lib/server/cache";

async function _fetchLiveKubernetesClusters(): Promise<
  ApiResponseMeta<KubernetesCluster[]>
> {
  const bundles = await enabledConnectorBundles();
  const out: KubernetesCluster[] = [];
  const failed: string[] = [];

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [
          nodeCount,
          readyNodeCount,
          podCount,
          unhealthyPodCount,
          deploymentCount,
          unavailableDeploymentCount,
          namespaceCount,
        ] = await Promise.all([
          queryNumber(config, "count(kube_node_info)"),
          queryNumber(
            config,
            "count(kube_node_status_condition{condition='Ready',status='true'})"
          ),
          queryNumber(config, "count(kube_pod_info)"),
          queryNumber(
            config,
            "sum(kube_pod_status_phase{phase=~'Pending|Failed|Unknown'} == 1)"
          ),
          queryNumber(config, "count(kube_deployment_spec_replicas)"),
          queryNumber(
            config,
            "count(kube_deployment_status_replicas_unavailable > 0)"
          ),
          queryNumber(config, "count(kube_namespace_created)"),
        ]);

        if (podCount <= 0 && nodeCount <= 0) return;

        out.push({
          id: `k8s:${connector.id}`,
          name: `${connector.name} Kubernetes`,
          connectorIds: [connector.id],
          site: connector.site,
          datacenter: connector.datacenter,
          environment: connector.environment,
          status:
            unavailableDeploymentCount > 0 || unhealthyPodCount > 0
              ? "warning"
              : readyNodeCount < nodeCount
                ? "warning"
                : "healthy",
          nodeCount: Math.round(nodeCount),
          readyNodeCount: Math.round(readyNodeCount),
          podCount: Math.round(podCount),
          unhealthyPodCount: Math.round(unhealthyPodCount),
          deploymentCount: Math.round(deploymentCount),
          unavailableDeploymentCount: Math.round(unavailableDeploymentCount),
          namespaceCount: Math.round(namespaceCount),
        });
      } catch {
        failed.push(connector.id);
      }
    })
  );

  return {
    data: out,
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

export function fetchLiveKubernetesClusters(): Promise<
  ApiResponseMeta<KubernetesCluster[]>
> {
  return getOrFetch(
    "live:kubernetes-clusters",
    20_000,
    _fetchLiveKubernetesClusters
  );
}

export async function fetchLiveKubernetesClusterTimeseries(
  clusterId: string,
  range = "1h",
  step = "5m"
) {
  const connectorId = clusterId.startsWith("k8s:")
    ? clusterId.slice("k8s:".length)
    : clusterId;
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");
  const window = rangeWindow(range, step);

  const [running, unhealthy] = await Promise.all([
    queryRangeWithConfig(
      config,
      "sum(kube_pod_status_phase{phase='Running'})",
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      "sum(kube_pod_status_phase{phase=~'Pending|Failed|Unknown'})",
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
