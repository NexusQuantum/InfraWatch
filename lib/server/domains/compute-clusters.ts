import "server-only";

import type { ComputeCluster } from "@/lib/types/entities";
import {
  clampPercent,
  computePressureScore,
  riskReasonsFromUsage,
  rangeWindow,
  firstSeriesPoints,
  getConnectorConfig,
  queryRangeWithConfig,
  type ApiResponseMeta,
} from "./shared";
import { fetchLiveHosts } from "./hosts";
import { fetchLiveConnectors } from "./connectors";
import { fetchLiveVmByConnector } from "./vm";
import { getOrFetch } from "@/lib/server/cache";

async function _fetchLiveComputeClusters(): Promise<
  ApiResponseMeta<ComputeCluster[]>
> {
  const hostsRes = await fetchLiveHosts();
  const byConnector = new Map<string, typeof hostsRes.data>();
  for (const host of hostsRes.data) {
    const arr = byConnector.get(host.connectorId) ?? [];
    arr.push(host);
    byConnector.set(host.connectorId, arr);
  }

  const connectors = await fetchLiveConnectors();
  const vmMap = await fetchLiveVmByConnector();
  const vmErrors = vmMap.errors;
  const vmFailedConnectors = vmMap.failedConnectors;

  const clusters: ComputeCluster[] = connectors.data.map((c) => {
    const hosts = byConnector.get(c.id) ?? [];
    const nodeCount = hosts.length;
    const healthyNodeCount = hosts.filter((h) => h.status === "healthy").length;
    const warningNodeCount = hosts.filter((h) => h.status === "warning").length;
    const criticalNodeCount = hosts.filter(
      (h) => h.status === "critical" || h.status === "down"
    ).length;
    const avgCpuUsagePct = hosts.length
      ? hosts.reduce((acc, h) => acc + h.current.cpuUsagePct, 0) / hosts.length
      : 0;
    const avgMemoryUsagePct = hosts.length
      ? hosts.reduce((acc, h) => acc + h.current.memoryUsagePct, 0) /
        hosts.length
      : 0;
    const avgDiskUsagePct = hosts.length
      ? hosts.reduce((acc, h) => acc + h.current.diskUsagePct, 0) / hosts.length
      : 0;
    const networkRxBytesPerSec = hosts.reduce(
      (acc, h) => acc + (h.current.networkRxBytesPerSec ?? 0),
      0
    );
    const networkTxBytesPerSec = hosts.reduce(
      (acc, h) => acc + (h.current.networkTxBytesPerSec ?? 0),
      0
    );
    const networkErrorNodeCount = hosts.filter(
      (h) => (h.current.networkErrorRate ?? 0) > 0
    ).length;
    const atRiskNodeCount = warningNodeCount + criticalNodeCount;
    const headroomCpuPct = clampPercent(100 - avgCpuUsagePct);
    const headroomMemoryPct = clampPercent(100 - avgMemoryUsagePct);
    const pressureScore = computePressureScore({
      cpu: avgCpuUsagePct,
      memory: avgMemoryUsagePct,
      disk: avgDiskUsagePct,
      nodeCount,
      warningNodes: warningNodeCount,
      criticalNodes: criticalNodeCount,
    });
    const riskReasons = riskReasonsFromUsage({
      cpu: avgCpuUsagePct,
      memory: avgMemoryUsagePct,
      disk: avgDiskUsagePct,
      warningNodes: warningNodeCount,
      criticalNodes: criticalNodeCount,
    });
    const vm = vmMap.byConnector.get(c.id);

    return {
      id: `compute:${c.id}`,
      name: `${c.name} Compute`,
      connectorIds: [c.id],
      site: c.site,
      datacenter: c.datacenter,
      environment: c.environment,
      status:
        criticalNodeCount > 0
          ? "critical"
          : warningNodeCount > 0
            ? "warning"
            : "healthy",
      nodeCount,
      healthyNodeCount,
      warningNodeCount,
      criticalNodeCount,
      atRiskNodeCount,
      avgCpuUsagePct,
      avgMemoryUsagePct,
      avgDiskUsagePct,
      headroomCpuPct,
      headroomMemoryPct,
      pressureScore,
      riskReasons,
      vmRunningCount: vm?.runningVms ?? 0,
      vmHostsWithVms: vm?.hostsWithVms ?? 0,
      vmEstimatedSlots: vm?.totalEstimatedSlots ?? {
        small: 0,
        medium: 0,
        large: 0,
      },
      vmTopHosts: vm?.topVmHosts ?? [],
      networkRxBytesPerSec,
      networkTxBytesPerSec,
      networkErrorNodeCount,
      hottestNodes: hosts
        .slice()
        .sort((a, b) => b.current.cpuUsagePct - a.current.cpuUsagePct)
        .slice(0, 5)
        .map((h) => ({
          hostId: h.id,
          hostname: h.hostname,
          cpuUsagePct: h.current.cpuUsagePct,
          memoryUsagePct: h.current.memoryUsagePct,
        })),
    };
  });

  return {
    data: clusters,
    meta: {
      timestamp: new Date().toISOString(),
      partial: hostsRes.meta.partial || vmFailedConnectors.length > 0,
      stale: false,
      errors: [...(hostsRes.meta.errors ?? []), ...vmErrors].length
        ? [...(hostsRes.meta.errors ?? []), ...vmErrors]
        : undefined,
      failedConnectors: Array.from(
        new Set([
          ...(hostsRes.meta.failedConnectors ?? []),
          ...vmFailedConnectors,
        ])
      ).length
        ? Array.from(
            new Set([
              ...(hostsRes.meta.failedConnectors ?? []),
              ...vmFailedConnectors,
            ])
          )
        : undefined,
    },
  };
}

export function fetchLiveComputeClusters(): Promise<
  ApiResponseMeta<ComputeCluster[]>
> {
  return getOrFetch(
    "live:compute-clusters",
    20_000,
    _fetchLiveComputeClusters
  );
}

export async function fetchLiveComputeClusterTimeseries(
  clusterId: string,
  range = "1h",
  step = "5m"
) {
  const connectorId = clusterId.startsWith("compute:")
    ? clusterId.slice("compute:".length)
    : clusterId;
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");
  const window = rangeWindow(range, step);
  try {
    const [avgCpu, avgMemory, networkRx, networkTx] = await Promise.all([
      queryRangeWithConfig(
        config,
        "100 * (1 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m])))",
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        "100 * (1 - (sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)))",
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        "sum(rate(node_network_receive_bytes_total{device!~'lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*'}[5m]))",
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        "sum(rate(node_network_transmit_bytes_total{device!~'lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*'}[5m]))",
        window.start,
        window.end,
        window.step
      ),
    ]);

    return {
      data: {
        avgCpu: firstSeriesPoints(avgCpu),
        avgMemory: firstSeriesPoints(avgMemory),
        networkRx: firstSeriesPoints(networkRx),
        networkTx: firstSeriesPoints(networkTx),
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
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to query compute cluster timeseries";
    return {
      data: {
        avgCpu: [],
        avgMemory: [],
        networkRx: [],
        networkTx: [],
        range,
        step: window.step,
        updatedAt: window.now,
        source: "prometheus" as const,
      },
      meta: {
        timestamp: window.now,
        partial: true,
        stale: false,
        errors: [message],
        failedConnectors: [connectorId],
      },
    };
  }
}
