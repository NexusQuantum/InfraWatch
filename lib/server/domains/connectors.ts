import "server-only";

import type {
  Connector,
  ConnectorCapabilities,
  ConnectorCoverage,
  ConnectorStatus,
} from "@/lib/types/entities";
import { listConnectors } from "@/lib/server/connectors-store";
import {
  queryNumber,
  getConnectorConfig,
  type ApiResponseMeta,
  type ConnectorPublicRecord,
  type PrometheusConnectorConfig,
} from "./shared";
import { getOrFetch } from "@/lib/server/cache";

function toConnectorCapabilities(flags: {
  hasHost: boolean;
  hasCluster: boolean;
  hasStorage: boolean;
  hasK8s: boolean;
  hasApp: boolean;
}): ConnectorCapabilities {
  return {
    hostMetrics: flags.hasHost,
    clusterMetrics: flags.hasCluster,
    storageMetrics: flags.hasStorage,
    kubernetesMetrics: flags.hasK8s,
    appMetrics: flags.hasApp,
  };
}

async function connectorCapabilities(
  config: PrometheusConnectorConfig
): Promise<ConnectorCapabilities> {
  const checks = await Promise.allSettled([
    queryNumber(config, "count(node_uname_info)"),
    queryNumber(config, "count(node_uname_info)"),
    queryNumber(config, "count(longhorn_volume_actual_size_bytes)"),
    queryNumber(config, "count(kube_pod_info)"),
    queryNumber(config, "count(container_cpu_usage_seconds_total)"),
  ]);

  return toConnectorCapabilities({
    hasHost: checks[0].status === "fulfilled" && checks[0].value > 0,
    hasCluster: checks[1].status === "fulfilled" && checks[1].value > 0,
    hasStorage: checks[2].status === "fulfilled" && checks[2].value > 0,
    hasK8s: checks[3].status === "fulfilled" && checks[3].value > 0,
    hasApp: checks[4].status === "fulfilled" && checks[4].value > 0,
  });
}

async function connectorCoverage(
  config: PrometheusConnectorConfig
): Promise<ConnectorCoverage> {
  const [hosts, pods, volumes, nodes] = await Promise.all([
    queryNumber(config, "count(node_uname_info)"),
    queryNumber(config, "count(kube_pod_info)"),
    queryNumber(config, "count(longhorn_volume_actual_size_bytes)"),
    queryNumber(config, "count(kube_node_info)"),
  ]);
  return {
    hosts: Math.round(hosts),
    clusters: nodes > 0 ? 1 : 0,
    storageClusters: volumes > 0 ? 1 : 0,
    kubernetesClusters: pods > 0 ? 1 : 0,
    apps: 0,
  };
}

function connectorStatus(base: ConnectorPublicRecord): ConnectorStatus {
  if (!base.enabled) return "down";
  return base.status;
}

async function _fetchLiveConnectors(): Promise<ApiResponseMeta<Connector[]>> {
  const connectors = await listConnectors();
  const enriched = await Promise.all(
    connectors.map(async (connector) => {
      const config = await getConnectorConfig(connector.id);
      let capabilities: ConnectorCapabilities = {
        hostMetrics: false,
        clusterMetrics: false,
        storageMetrics: false,
        kubernetesMetrics: false,
        appMetrics: false,
      };
      let coverage: ConnectorCoverage = {
        hosts: 0,
        clusters: 0,
        storageClusters: 0,
        kubernetesClusters: 0,
        apps: 0,
      };
      if (config && connector.enabled) {
        try {
          [capabilities, coverage] = await Promise.all([
            connectorCapabilities(config),
            connectorCoverage(config),
          ]);
        } catch {
          // keep zeros on failure
        }
      }

      const value: Connector = {
        id: connector.id,
        name: connector.name,
        connectorType: connector.connectorType,
        typeMeta: connector.typeMeta,
        baseUrl: connector.baseUrl,
        environment: connector.environment,
        site: connector.site,
        datacenter: connector.datacenter,
        enabled: connector.enabled,
        status: connectorStatus(connector),
        lastCheckedAt: connector.lastCheckedAt,
        latencyMs: connector.latencyMs,
        capabilities,
        coverage,
        authMode: connector.authMode,
        notes: connector.notes,
        healthNotes: connector.healthNotes,
      };
      return value;
    })
  );

  return {
    data: enriched,
    meta: {
      timestamp: new Date().toISOString(),
      partial: false,
      stale: false,
    },
  };
}

export function fetchLiveConnectors(): Promise<ApiResponseMeta<Connector[]>> {
  return getOrFetch("live:connectors", 60_000, _fetchLiveConnectors);
}
