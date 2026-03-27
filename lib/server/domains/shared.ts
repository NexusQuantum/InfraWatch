import "server-only";

import type { ApiResponse as ApiResponseMeta } from "@/lib/types";
import {
  queryInstantWithConfig,
  queryRangeWithConfig,
  type PrometheusConnectorConfig,
} from "@/lib/prometheus/client";
import {
  getConnectorConfig,
  listConnectors,
  type ConnectorPublicRecord,
} from "@/lib/server/connectors-store";

export type { ApiResponseMeta, PrometheusConnectorConfig, ConnectorPublicRecord };

export interface ConnectorBundle {
  connector: ConnectorPublicRecord;
  config: PrometheusConnectorConfig;
}

export const GIB = 1024 * 1024 * 1024;

export const VM_PROFILES = {
  small: { cpu: 1, memoryBytes: 2 * GIB },
  medium: { cpu: 2, memoryBytes: 4 * GIB },
  large: { cpu: 4, memoryBytes: 8 * GIB },
} as const;

export const NOISY_INTERFACE_REGEX =
  "lo|veth.*|docker.*|cali.*|flannel.*|cni.*|tunl.*";

export function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function parseRangeMs(range: string): number {
  if (range.endsWith("h")) return Number(range.replace("h", "")) * 3600_000;
  if (range.endsWith("m")) return Number(range.replace("m", "")) * 60_000;
  return 24 * 3600_000;
}

export function normalizeStep(step: string): string {
  return /^\d+[smhd]$/.test(step) ? step : "5m";
}

export function rangeWindow(range: string, step: string) {
  const now = new Date();
  const rangeMs = parseRangeMs(range);
  return {
    start: new Date(now.getTime() - rangeMs).toISOString(),
    end: now.toISOString(),
    step: normalizeStep(step),
    now: now.toISOString(),
  };
}

export function labelValue(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function regexValue(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function firstSeriesPoints(
  res: Awaited<ReturnType<typeof queryRangeWithConfig>>
) {
  return (
    res.result[0]?.values.map(([ts, value]) => ({
      ts: new Date(ts * 1000).toISOString(),
      value: num(value),
    })) ?? []
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Query failed");
}

export async function queryNumber(
  config: PrometheusConnectorConfig,
  query: string
): Promise<number> {
  const res = await withRetry(() => queryInstantWithConfig(config, query));
  const first = res.result[0];
  if (!first) return 0;
  return num(first.value[1]);
}

export async function queryVector(
  config: PrometheusConnectorConfig,
  query: string
) {
  const res = await withRetry(() => queryInstantWithConfig(config, query));
  return res.result;
}

export function metricNode(metric: Record<string, string>): string {
  const raw = metric.node || metric.nodename || metric.instance || "unknown";
  return raw.includes(":") ? raw.split(":")[0] : raw;
}

export function toNodeValueMap(
  result: Awaited<ReturnType<typeof queryVector>>
): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of result) {
    const node = metricNode(row.metric);
    out.set(node, num(row.value[1]));
  }
  return out;
}

export function calcSlots(freeCpuCores: number, freeMemoryBytes: number) {
  const byProfile = (profile: { cpu: number; memoryBytes: number }) =>
    Math.max(
      0,
      Math.floor(
        Math.min(freeCpuCores / profile.cpu, freeMemoryBytes / profile.memoryBytes)
      )
    );
  return {
    small: byProfile(VM_PROFILES.small),
    medium: byProfile(VM_PROFILES.medium),
    large: byProfile(VM_PROFILES.large),
  };
}

export function statusFromUsage(
  cpu: number,
  mem: number,
  disk: number
): "healthy" | "warning" | "critical" {
  if (cpu >= 90 || mem >= 90 || disk >= 95) return "critical";
  if (cpu >= 75 || mem >= 80 || disk >= 85) return "warning";
  return "healthy";
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function computePressureScore(input: {
  cpu: number;
  memory: number;
  disk: number;
  nodeCount: number;
  warningNodes: number;
  criticalNodes: number;
}): number {
  const { cpu, memory, disk, nodeCount, warningNodes, criticalNodes } = input;
  const riskNodeWeight =
    nodeCount > 0 ? ((warningNodes * 0.5 + criticalNodes) / nodeCount) * 100 : 0;
  const weighted =
    cpu * 0.35 + memory * 0.35 + disk * 0.2 + riskNodeWeight * 0.1;
  return clampPercent(weighted);
}

export function riskReasonsFromUsage(input: {
  cpu: number;
  memory: number;
  disk: number;
  warningNodes: number;
  criticalNodes: number;
}): string[] {
  const out: string[] = [];
  if (input.criticalNodes > 0) out.push("Critical nodes");
  if (input.cpu >= 80) out.push("High CPU");
  if (input.memory >= 85) out.push("High memory");
  if (input.disk >= 90) out.push("High disk");
  if (!out.length && input.warningNodes > 0) out.push("Warning nodes");
  if (out.length > 1) out.push("Mixed pressure");
  if (!out.length) out.push("Stable");
  return out.slice(0, 2);
}

export async function enabledConnectorBundles(): Promise<ConnectorBundle[]> {
  const connectors = await listConnectors();
  const bundles = await Promise.all(
    connectors
      .filter((c) => c.enabled)
      .map(async (connector) => {
        const config = await getConnectorConfig(connector.id);
        if (!config) return null;
        return { connector, config };
      })
  );
  return bundles.filter((b): b is ConnectorBundle => !!b);
}

export { getConnectorConfig, queryRangeWithConfig };
