import "server-only";

import type { StorageCluster } from "@/lib/types/entities";
import {
  enabledConnectorBundles,
  queryNumber,
  queryVector,
  num,
  rangeWindow,
  firstSeriesPoints,
  getConnectorConfig,
  queryRangeWithConfig,
  type ApiResponseMeta,
} from "./shared";
import { getOrFetch } from "@/lib/server/cache";

async function _fetchLiveStorageClusters(): Promise<
  ApiResponseMeta<StorageCluster[]>
> {
  const bundles = await enabledConnectorBundles();
  const out: StorageCluster[] = [];
  const failed: string[] = [];

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [
          totalBytes, usedBytes, readBytesPerSec, writeBytesPerSec, nodeCount,
          scheduledBytes, volStateRows, volRobustnessRows,
          volCapRows, volActualRows, volReadIopsRows, volWriteIopsRows,
          volReadLatRows, volWriteLatRows,
        ] = await Promise.all([
            queryNumber(config, "sum(longhorn_volume_capacity_bytes)"),
            queryNumber(config, "sum(longhorn_volume_actual_size_bytes)"),
            queryNumber(config, "sum(rate(longhorn_volume_read_throughput[5m]))"),
            queryNumber(config, "sum(rate(longhorn_volume_write_throughput[5m]))"),
            queryNumber(config, "count(longhorn_node_status)"),
            queryNumber(config, "sum(longhorn_node_storage_scheduled_bytes)"),
            queryVector(config, "longhorn_volume_state"),
            queryVector(config, "longhorn_volume_robustness"),
            queryVector(config, "longhorn_volume_capacity_bytes"),
            queryVector(config, "longhorn_volume_actual_size_bytes"),
            queryVector(config, "longhorn_volume_read_iops"),
            queryVector(config, "longhorn_volume_write_iops"),
            queryVector(config, "longhorn_volume_read_latency"),
            queryVector(config, "longhorn_volume_write_latency"),
          ]);
        if (totalBytes <= 0) return;
        const freeBytes = Math.max(0, totalBytes - usedBytes);
        const usedPct = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
        const overcommitPct = totalBytes > 0 ? (scheduledBytes / totalBytes) * 100 : 0;

        // Build volume details
        const volMap = new Map<string, {
          state: string; robustness: string;
          capacityBytes: number; actualSizeBytes: number;
          readIops: number; writeIops: number;
          readLatency: number; writeLatency: number;
        }>();
        const ensureVol = (v: string) => {
          if (!volMap.has(v)) volMap.set(v, { state: "", robustness: "", capacityBytes: 0, actualSizeBytes: 0, readIops: 0, writeIops: 0, readLatency: 0, writeLatency: 0 });
          return volMap.get(v)!;
        };
        for (const r of volStateRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).state = r.metric.state || "unknown"; }
        for (const r of volRobustnessRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).robustness = r.metric.robustness || "unknown"; }
        for (const r of volCapRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).capacityBytes = num(r.value[1]); }
        for (const r of volActualRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).actualSizeBytes = num(r.value[1]); }
        for (const r of volReadIopsRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).readIops = num(r.value[1]); }
        for (const r of volWriteIopsRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).writeIops = num(r.value[1]); }
        for (const r of volReadLatRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).readLatency = num(r.value[1]); }
        for (const r of volWriteLatRows) { const v = r.metric.volume || r.metric.pv; if (v) ensureVol(v).writeLatency = num(r.value[1]); }

        const volumes = Array.from(volMap.entries()).map(([name, v]) => ({ name, ...v }));
        const degradedCount = volumes.filter((v) => v.robustness === "degraded" || v.robustness === "faulted").length;

        out.push({
          id: `storage:${connector.id}`,
          name: `${connector.name} Storage`,
          connectorIds: [connector.id],
          site: connector.site,
          datacenter: connector.datacenter,
          environment: connector.environment,
          status:
            usedPct > 90 ? "critical" : usedPct > 80 ? "warning" : degradedCount > 0 ? "warning" : "healthy",
          nodeCount: Math.round(nodeCount),
          healthyNodeCount: Math.round(nodeCount),
          capacity: { totalBytes, usedBytes, freeBytes, usedPct },
          throughput: { readBytesPerSec, writeBytesPerSec },
          degradedComponentsCount: degradedCount,
          hottestNodes: [],
          scheduledBytes,
          overcommitPct,
          volumes,
          volumeSummary: {
            total: volumes.length,
            healthy: volumes.filter((v) => v.robustness === "healthy").length,
            degraded: volumes.filter((v) => v.robustness === "degraded").length,
            faulted: volumes.filter((v) => v.robustness === "faulted").length,
          },
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

export function fetchLiveStorageClusters(): Promise<
  ApiResponseMeta<StorageCluster[]>
> {
  return getOrFetch(
    "live:storage-clusters",
    20_000,
    _fetchLiveStorageClusters
  );
}

export async function fetchLiveStorageClusterTimeseries(
  clusterId: string,
  range = "1h",
  step = "5m"
) {
  const connectorId = clusterId.startsWith("storage:")
    ? clusterId.slice("storage:".length)
    : clusterId;
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");
  const window = rangeWindow(range, step);

  const [read, write] = await Promise.all([
    queryRangeWithConfig(
      config,
      "sum(rate(longhorn_volume_read_throughput[5m]))",
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      "sum(rate(longhorn_volume_write_throughput[5m]))",
      window.start,
      window.end,
      window.step
    ),
  ]);

  return {
    data: {
      read: firstSeriesPoints(read),
      write: firstSeriesPoints(write),
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
