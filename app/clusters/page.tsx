"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { HealthMatrix } from "@/components/charts/health-matrix";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { useLiveComputeClusters, useLiveHosts } from "@/lib/api/live-hooks";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    down: "bg-status-down",
    unknown: "bg-status-unknown",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || colors.unknown}`} />;
}

function ResourceBar({ value, label }: { value: number; label: string }) {
  const status = value >= 90 ? "critical" : value >= 70 ? "warning" : "healthy";
  const colors = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function formatBytesPerSec(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B/s";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

export default function ClustersPage() {
  const [range, setRange] = useState<"1h" | "6h" | "24h">("1h");
  const { clusters: computeClusters, meta, isLoading, isError, error, refresh } = useLiveComputeClusters();
  const { hosts } = useLiveHosts();
  const diagnostics = isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;

  const stats = useMemo(() => {
    const total = computeClusters.length;
    const totalNodes = computeClusters.reduce((acc, c) => acc + c.nodeCount, 0);
    const clustersAtRisk = computeClusters.filter((c) => c.status !== "healthy").length;
    const nodesAtRisk = computeClusters.reduce(
      (acc, c) => acc + (c.atRiskNodeCount ?? c.warningNodeCount + c.criticalNodeCount),
      0
    );
    const avgClusterCpu = total ? computeClusters.reduce((acc, c) => acc + c.avgCpuUsagePct, 0) / total : 0;
    const avgClusterMemory = total ? computeClusters.reduce((acc, c) => acc + c.avgMemoryUsagePct, 0) / total : 0;
    const pressureClusters = computeClusters.filter((c) => c.avgCpuUsagePct >= 80 || c.avgMemoryUsagePct >= 85).length;
    const runningVms = computeClusters.reduce((acc, c) => acc + (c.vmRunningCount ?? 0), 0);
    const estimatedVmSlotsMedium = computeClusters.reduce((acc, c) => acc + (c.vmEstimatedSlots?.medium ?? 0), 0);
    const avgClusterNetworkRx = total
      ? computeClusters.reduce((acc, c) => acc + (c.networkRxBytesPerSec ?? 0), 0) / total
      : 0;
    const avgClusterNetworkTx = total
      ? computeClusters.reduce((acc, c) => acc + (c.networkTxBytesPerSec ?? 0), 0) / total
      : 0;
    const clustersWithNetworkErrors = computeClusters.filter((c) => (c.networkErrorNodeCount ?? 0) > 0).length;
    const healthyClusters = computeClusters.filter((c) => c.status === "healthy").length;

    return {
      total,
      totalNodes,
      clustersAtRisk,
      nodesAtRisk,
      avgClusterCpu,
      avgClusterMemory,
      pressureClusters,
      runningVms,
      estimatedVmSlotsMedium,
      avgClusterNetworkRx,
      avgClusterNetworkTx,
      clustersWithNetworkErrors,
      healthyClusters,
    };
  }, [computeClusters]);

  const topSaturatedClusters = useMemo(
    () =>
      computeClusters
        .map((cluster) => ({
          id: cluster.id,
          name: cluster.name,
          value: cluster.pressureScore ?? (cluster.avgCpuUsagePct * 0.35 + cluster.avgMemoryUsagePct * 0.35 + cluster.avgDiskUsagePct * 0.2),
          status: cluster.status,
          href: `/clusters/${cluster.id}?range=${range}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [computeClusters, range]
  );

  const topCriticalClusters = useMemo(
    () =>
      computeClusters
        .map((cluster) => ({
          id: `${cluster.id}:critical`,
          name: cluster.name,
          value: cluster.criticalNodeCount,
          status: cluster.criticalNodeCount > 0 ? "critical" : cluster.warningNodeCount > 0 ? "warning" : "healthy",
          href: `/clusters/${cluster.id}?range=${range}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [computeClusters, range]
  );

  const topNetworkClusters = useMemo(
    () =>
      computeClusters
        .map((cluster) => ({
          id: `${cluster.id}:network`,
          name: cluster.name,
          value: (cluster.networkRxBytesPerSec ?? 0) + (cluster.networkTxBytesPerSec ?? 0),
          status: (cluster.networkErrorNodeCount ?? 0) > 0 ? "warning" : cluster.status,
          href: `/clusters/${cluster.id}?range=${range}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [computeClusters, range]
  );

  const topNetworkErrorClusters = useMemo(
    () =>
      computeClusters
        .map((cluster) => ({
          id: `${cluster.id}:network-errors`,
          name: cluster.name,
          value: cluster.networkErrorNodeCount ?? 0,
          status: (cluster.networkErrorNodeCount ?? 0) > 0 ? "warning" : "healthy",
          href: `/clusters/${cluster.id}?range=${range}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [computeClusters, range]
  );

  const healthMatrixData = {
    type: "health-matrix" as const,
    title: "Cluster Resource Matrix",
    xAxis: ["CPU", "Memory", "Disk", "Disk IO"],
    yAxis: computeClusters.map((c) => c.name),
    cells: computeClusters.flatMap((cluster) => {
      // Compute avg disk IO across cluster hosts
      const clusterHostsForMatrix = hosts.filter((h) => cluster.connectorIds.includes(h.connectorId));
      const avgDiskIo = clusterHostsForMatrix.length
        ? clusterHostsForMatrix.reduce((acc, h) => acc + (h.current.diskIoUtilPct ?? 0), 0) / clusterHostsForMatrix.length
        : 0;
      return [
        {
          x: "CPU",
          y: cluster.name,
          status: cluster.avgCpuUsagePct > 80 ? ("critical" as const) : cluster.avgCpuUsagePct > 60 ? ("warning" as const) : ("healthy" as const),
          value: cluster.avgCpuUsagePct,
        },
        {
          x: "Memory",
          y: cluster.name,
          status: cluster.avgMemoryUsagePct > 85 ? ("critical" as const) : cluster.avgMemoryUsagePct > 70 ? ("warning" as const) : ("healthy" as const),
          value: cluster.avgMemoryUsagePct,
        },
        {
          x: "Disk",
          y: cluster.name,
          status: cluster.avgDiskUsagePct > 90 ? ("critical" as const) : cluster.avgDiskUsagePct > 75 ? ("warning" as const) : ("healthy" as const),
          value: cluster.avgDiskUsagePct,
        },
        {
          x: "Disk IO",
          y: cluster.name,
          status: avgDiskIo > 80 ? ("critical" as const) : avgDiskIo > 50 ? ("warning" as const) : ("healthy" as const),
          value: avgDiskIo,
        },
      ];
    }),
    updatedAt: new Date().toISOString(),
  };

  return (
    <AppShell>
      <CommandBar
        title="Compute Clusters"
        subtitle={`${stats.total} clusters, ${stats.totalNodes} nodes`}
        onRefresh={() => void refresh()}
      >
        <div className="inline-flex rounded-md border border-border p-0.5">
          {(["1h", "6h", "24h"] as const).map((option) => (
            <Button
              key={option}
              variant={range === option ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setRange(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </CommandBar>

      <div className="p-6 space-y-6">
        {isLoading && <Card className="p-4 text-sm text-muted-foreground">Loading compute clusters...</Card>}

        {diagnostics && (
          <Card className="p-4 border-status-warning/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {error && <div className="text-muted-foreground">{error.message}</div>}
                {meta?.errors?.map((msg) => (
                  <div key={msg} className="text-muted-foreground">
                    {msg}
                  </div>
                ))}
                {meta?.failedConnectors?.length ? (
                  <div className="text-muted-foreground">Failed connectors: {meta.failedConnectors.join(", ")}</div>
                ) : null}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Clusters</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.clustersAtRisk}</div>
            <div className="text-xs text-muted-foreground">Clusters At Risk</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.nodesAtRisk}</div>
            <div className="text-xs text-muted-foreground">Nodes At Risk</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold tabular-nums">{stats.avgClusterCpu.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Avg Cluster CPU</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold tabular-nums">{stats.avgClusterMemory.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Avg Cluster Memory</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.pressureClusters}</div>
            <div className="text-xs text-muted-foreground">Capacity Pressure Clusters</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.runningVms}</div>
            <div className="text-xs text-muted-foreground">Running VMs</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.estimatedVmSlotsMedium}</div>
            <div className="text-xs text-muted-foreground">Estimated Free VM Slots (M)</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{formatBytesPerSec(stats.avgClusterNetworkRx)}</div>
            <div className="text-xs text-muted-foreground">Avg Cluster Network Rx</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{formatBytesPerSec(stats.avgClusterNetworkTx)}</div>
            <div className="text-xs text-muted-foreground">Avg Cluster Network Tx</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.clustersWithNetworkErrors}</div>
            <div className="text-xs text-muted-foreground">Clusters With Network Errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-healthy">{stats.healthyClusters}</div>
            <div className="text-xs text-muted-foreground">Healthy Clusters</div>
          </Card>
        </div>

        <HealthMatrix data={healthMatrixData} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingPanel title="Top Saturated Clusters" items={topSaturatedClusters} unit="%" maxValue={100} colorByStatus />
          <RankingPanel title="Top Clusters by Critical Nodes" items={topCriticalClusters} unit="count" colorByStatus />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingPanel title="Top Clusters by Network Throughput" items={topNetworkClusters} unit="bytesPerSec" colorByStatus />
          <RankingPanel title="Top Clusters by Network Errors" items={topNetworkErrorClusters} unit="count" colorByStatus />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {computeClusters.map((cluster) => (
            <Link key={cluster.id} href={`/clusters/${cluster.id}?range=${range}`}>
              <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StatusDot status={cluster.status} />
                    <span className="font-medium">{cluster.name}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{cluster.nodeCount}</div>
                    <div className="text-xs text-muted-foreground">Nodes</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-status-healthy">{cluster.healthyNodeCount}</div>
                    <div className="text-xs text-muted-foreground">Healthy</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-status-critical">{cluster.criticalNodeCount}</div>
                    <div className="text-xs text-muted-foreground">Critical</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <ResourceBar value={cluster.avgCpuUsagePct} label="CPU" />
                  <ResourceBar value={cluster.avgMemoryUsagePct} label="Memory" />
                  <ResourceBar value={cluster.avgDiskUsagePct} label="Disk" />
                </div>

                <div className="mt-3 text-xs text-muted-foreground truncate">{cluster.riskReasons?.join(" · ") || "Stable"}</div>
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  VMs {cluster.vmRunningCount ?? 0} · Free(M) {cluster.vmEstimatedSlots?.medium ?? 0}
                </div>
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  Rx {formatBytesPerSec(cluster.networkRxBytesPerSec ?? 0)} / Tx {formatBytesPerSec(cluster.networkTxBytesPerSec ?? 0)}
                  {(cluster.networkErrorNodeCount ?? 0) > 0 ? ` · ${cluster.networkErrorNodeCount} error node(s)` : ""}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cluster.site}</span>
                  <span className="tabular-nums">Pressure {(cluster.pressureScore ?? 0).toFixed(0)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
