import "server-only";

import type { FleetOverview } from "@/lib/types/entities";
import {
  enabledConnectorBundles,
  num,
  queryRangeWithConfig,
  type ApiResponseMeta,
} from "./shared";
import { fetchLiveConnectors } from "./connectors";
import { fetchLiveHosts } from "./hosts";
import { fetchLiveComputeClusters } from "./compute-clusters";
import { fetchLiveStorageClusters } from "./storage-clusters";
import { fetchLiveKubernetesClusters } from "./kubernetes-clusters";
import { fetchLiveVmOverview } from "./vm";
import { getOrFetch } from "@/lib/server/cache";

async function _fetchLiveOverview(): Promise<ApiResponseMeta<FleetOverview>> {
  const [connectors, hosts, compute, storage, k8s, vm] = await Promise.all([
    fetchLiveConnectors(),
    fetchLiveHosts(),
    fetchLiveComputeClusters(),
    fetchLiveStorageClusters(),
    fetchLiveKubernetesClusters(),
    fetchLiveVmOverview(),
  ]);

  const healthyHosts = hosts.data.filter((h) => h.status === "healthy").length;
  const warningHosts = hosts.data.filter((h) => h.status === "warning").length;
  const criticalHosts = hosts.data.filter(
    (h) => h.status === "critical"
  ).length;
  const downHosts = hosts.data.filter((h) => h.status === "down").length;
  const unknownHosts = hosts.data.filter((h) => h.status === "unknown").length;
  const staleHosts = hosts.data.filter((h) => h.freshness.stale).length;

  const connectorHealthy = connectors.data.filter(
    (c) => c.status === "healthy"
  ).length;
  const connectorDegraded = connectors.data.filter(
    (c) => c.status === "degraded"
  ).length;
  const connectorDown = connectors.data.filter(
    (c) => c.status === "down"
  ).length;

  return {
    data: {
      health: {
        totalHosts: hosts.data.length,
        healthyHosts,
        warningHosts,
        criticalHosts,
        downHosts,
        unknownHosts,
        staleHosts,
      },
      capabilities: {
        hasHostMetrics: connectors.data.some(
          (c) => c.capabilities.hostMetrics
        ),
        hasClusterMetrics: connectors.data.some(
          (c) => c.capabilities.clusterMetrics
        ),
        hasStorageMetrics: connectors.data.some(
          (c) => c.capabilities.storageMetrics
        ),
        hasKubernetesMetrics: connectors.data.some(
          (c) => c.capabilities.kubernetesMetrics
        ),
        hasAppMetrics: connectors.data.some(
          (c) => c.capabilities.appMetrics
        ),
        totalConnectors: connectors.data.length,
        healthyConnectors: connectorHealthy,
        degradedConnectors: connectorDegraded,
        downConnectors: connectorDown,
      },
      computeClusters: {
        total: compute.data.length,
        healthy: compute.data.filter((c) => c.status === "healthy").length,
        degraded: compute.data.filter((c) => c.status !== "healthy").length,
      },
      storageClusters: {
        total: storage.data.length,
        healthy: storage.data.filter((c) => c.status === "healthy").length,
        degraded: storage.data.filter((c) => c.status !== "healthy").length,
      },
      kubernetesClusters: {
        total: k8s.data.length,
        healthy: k8s.data.filter((c) => c.status === "healthy").length,
        degraded: k8s.data.filter((c) => c.status !== "healthy").length,
      },
      applications: {
        total: 0,
        healthy: 0,
        degraded: 0,
      },
      vm: vm.data,
      lastUpdatedAt: new Date().toISOString(),
      partialData:
        connectors.meta.partial ||
        hosts.meta.partial ||
        compute.meta.partial ||
        storage.meta.partial ||
        k8s.meta.partial ||
        vm.meta.partial,
      failedConnectors: Array.from(
        new Set([
          ...(connectors.meta.failedConnectors ?? []),
          ...(hosts.meta.failedConnectors ?? []),
          ...(compute.meta.failedConnectors ?? []),
          ...(storage.meta.failedConnectors ?? []),
          ...(k8s.meta.failedConnectors ?? []),
          ...(vm.meta.failedConnectors ?? []),
        ])
      ),
    },
    meta: {
      timestamp: new Date().toISOString(),
      partial:
        connectors.meta.partial ||
        hosts.meta.partial ||
        compute.meta.partial ||
        storage.meta.partial ||
        k8s.meta.partial ||
        vm.meta.partial,
      stale: false,
      errors: [
        ...(connectors.meta.errors ?? []),
        ...(hosts.meta.errors ?? []),
        ...(compute.meta.errors ?? []),
        ...(storage.meta.errors ?? []),
        ...(k8s.meta.errors ?? []),
        ...(vm.meta.errors ?? []),
      ],
    },
  };
}

export function fetchLiveOverview(): Promise<ApiResponseMeta<FleetOverview>> {
  return getOrFetch("live:overview", 25_000, _fetchLiveOverview);
}

export async function fetchLiveResourceUtilization(
  range = "24h",
  step = "5m"
) {
  const bundles = await enabledConnectorBundles();
  const now = new Date();
  const rangeMs = range.endsWith("h")
    ? Number(range.replace("h", "")) * 3600_000
    : range.endsWith("m")
      ? Number(range.replace("m", "")) * 60_000
      : 24 * 3600_000;
  const start = new Date(now.getTime() - rangeMs).toISOString();
  const end = now.toISOString();
  const normalizedStep = /^\d+[smhd]$/.test(step) ? step : "5m";

  const merged = new Map<
    string,
    { cpu: number[]; mem: number[]; rx: number[]; tx: number[] }
  >();
  const errorsByNode = new Set<string>();
  const failed: string[] = [];

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [cpu, mem, rx, tx, err] = await Promise.all([
          queryRangeWithConfig(
            config,
            "100 * (1 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m])))",
            start,
            end,
            normalizedStep
          ),
          queryRangeWithConfig(
            config,
            "100 * (1 - (sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)))",
            start,
            end,
            normalizedStep
          ),
          queryRangeWithConfig(
            config,
            "sum(rate(node_network_receive_bytes_total{device!~'lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*'}[5m]))",
            start,
            end,
            normalizedStep
          ),
          queryRangeWithConfig(
            config,
            "sum(rate(node_network_transmit_bytes_total{device!~'lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*'}[5m]))",
            start,
            end,
            normalizedStep
          ),
          queryRangeWithConfig(
            config,
            "sum by(instance) (rate(node_network_receive_errs_total{device!~'lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*'}[5m]) + rate(node_network_transmit_errs_total{device!~'lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*'}[5m]))",
            start,
            end,
            normalizedStep
          ),
        ]);

        const fold = (
          values: Array<[number, string]>,
          key: "cpu" | "mem" | "rx" | "tx"
        ) => {
          for (const [ts, raw] of values) {
            const stamp = new Date(ts * 1000).toISOString();
            const value = num(raw);
            const item = merged.get(stamp) ?? {
              cpu: [],
              mem: [],
              rx: [],
              tx: [],
            };
            item[key].push(value);
            merged.set(stamp, item);
          }
        };

        cpu.result.forEach((r) => fold(r.values, "cpu"));
        mem.result.forEach((r) => fold(r.values, "mem"));
        rx.result.forEach((r) => fold(r.values, "rx"));
        tx.result.forEach((r) => fold(r.values, "tx"));
        err.result.forEach((series) => {
          const latest = series.values[series.values.length - 1];
          if (latest && num(latest[1]) > 0) {
            const instance = series.metric.instance || "unknown";
            errorsByNode.add(`${connector.id}:${instance}`);
          }
        });
      } catch {
        failed.push(connector.id);
      }
    })
  );

  const series: Array<{
    timestamp: string;
    value: number;
    series: "CPU" | "Memory";
  }> = [];
  const networkSeries: Array<{
    timestamp: string;
    value: number;
    series: "Network Rx" | "Network Tx";
  }> = [];
  let cpuCurrent: number | null = null;
  let memoryCurrent: number | null = null;
  let networkRxCurrent: number | null = null;
  let networkTxCurrent: number | null = null;
  const sorted = Array.from(merged.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [timestamp, value] of sorted) {
    const cpuAvg = value.cpu.length
      ? value.cpu.reduce((acc, n) => acc + n, 0) / value.cpu.length
      : null;
    const memAvg = value.mem.length
      ? value.mem.reduce((acc, n) => acc + n, 0) / value.mem.length
      : null;
    const rxSum = value.rx.length
      ? value.rx.reduce((acc, n) => acc + n, 0)
      : null;
    const txSum = value.tx.length
      ? value.tx.reduce((acc, n) => acc + n, 0)
      : null;
    if (cpuAvg !== null)
      series.push({ timestamp, value: cpuAvg, series: "CPU" });
    if (memAvg !== null)
      series.push({ timestamp, value: memAvg, series: "Memory" });
    if (rxSum !== null)
      networkSeries.push({ timestamp, value: rxSum, series: "Network Rx" });
    if (txSum !== null)
      networkSeries.push({ timestamp, value: txSum, series: "Network Tx" });
    if (cpuAvg !== null) cpuCurrent = cpuAvg;
    if (memAvg !== null) memoryCurrent = memAvg;
    if (rxSum !== null) networkRxCurrent = rxSum;
    if (txSum !== null) networkTxCurrent = txSum;
  }

  return {
    source: "prometheus" as const,
    cpuCurrent,
    memoryCurrent,
    networkRxCurrent,
    networkTxCurrent,
    nodesWithNetworkErrors: errorsByNode.size,
    series,
    networkSeries,
    range,
    step: normalizedStep,
    updatedAt: now.toISOString(),
    partial: failed.length > 0,
    errors: failed.length
      ? [`Failed connectors: ${failed.join(", ")}`]
      : undefined,
  };
}
