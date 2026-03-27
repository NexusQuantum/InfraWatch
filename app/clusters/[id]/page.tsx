"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { useComputeClusterTimeseries, useLiveComputeClusters, useLiveHosts } from "@/lib/api/live-hooks";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    healthy: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    critical: "bg-status-critical/10 text-status-critical border-status-critical/20",
    down: "bg-status-down/10 text-status-down border-status-down/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${variants[status] || variants.unknown}`}>
      {status === "healthy" && <CheckCircle className="h-3.5 w-3.5" />}
      {(status === "warning" || status === "critical") && <AlertTriangle className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

function formatBytesPerSec(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B/s";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

export default function ClusterDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const routeClusterId = params.id as string;
  const clusterId = useMemo(() => {
    try {
      return decodeURIComponent(routeClusterId);
    } catch {
      return routeClusterId;
    }
  }, [routeClusterId]);
  const connectorScopedId = useMemo(
    () => (clusterId.startsWith("compute:") ? clusterId : `compute:${clusterId}`),
    [clusterId]
  );

  const initialRange = searchParams.get("range");
  const [range, setRange] = useState<"1h" | "6h" | "24h">(
    initialRange === "6h" || initialRange === "24h" ? initialRange : "1h"
  );

  useEffect(() => {
    const candidate = searchParams.get("range");
    if (candidate === "1h" || candidate === "6h" || candidate === "24h") {
      setRange(candidate);
    }
  }, [searchParams]);

  const { clusters, meta: clustersMeta, isLoading, isError: isClustersError, error: clustersError, refresh: refreshClusters } =
    useLiveComputeClusters();
  const { hosts, meta: hostsMeta, isError: isHostsError, error: hostsError, refresh: refreshHosts } = useLiveHosts();
  const {
    data: timeseries,
    meta: timeseriesMeta,
    isError: isTimeseriesError,
    error: timeseriesError,
    refresh: refreshTimeseries,
  } = useComputeClusterTimeseries(connectorScopedId, range, "5m");

  const cluster = useMemo(
    () =>
      clusters.find((c) => {
        if (c.id === clusterId || c.id === connectorScopedId) return true;
        const rawClusterId = c.id.startsWith("compute:") ? c.id.slice("compute:".length) : c.id;
        const rawRouteId = clusterId.startsWith("compute:") ? clusterId.slice("compute:".length) : clusterId;
        return rawClusterId === rawRouteId;
      }),
    [clusters, clusterId, connectorScopedId]
  );
  const diagnostics =
    isClustersError ||
    isHostsError ||
    isTimeseriesError ||
    clustersMeta?.partial ||
    hostsMeta?.partial ||
    timeseriesMeta?.partial ||
    (clustersMeta?.errors?.length ?? 0) > 0 ||
    (hostsMeta?.errors?.length ?? 0) > 0 ||
    (timeseriesMeta?.errors?.length ?? 0) > 0;

  const clusterHosts = useMemo(() => {
    if (!cluster) return [];
    return hosts.filter((h) => cluster.connectorIds.includes(h.connectorId));
  }, [cluster, hosts]);

  const dataQualityFailedCount = useMemo(() => {
    const set = new Set<string>([
      ...(clustersMeta?.failedConnectors ?? []),
      ...(hostsMeta?.failedConnectors ?? []),
      ...(timeseriesMeta?.failedConnectors ?? []),
    ]);
    return set.size;
  }, [clustersMeta?.failedConnectors, hostsMeta?.failedConnectors, timeseriesMeta?.failedConnectors]);

  const riskBreakdown = useMemo(() => {
    const highCpu = clusterHosts.filter((h) => h.current.cpuUsagePct >= 80).length;
    const highMemory = clusterHosts.filter((h) => h.current.memoryUsagePct >= 85).length;
    const highDisk = clusterHosts.filter((h) => h.current.diskUsagePct >= 90).length;
    const warning = clusterHosts.filter((h) => h.status === "warning").length;
    const critical = clusterHosts.filter((h) => h.status === "critical" || h.status === "down").length;
    return [
      { id: "high-cpu", name: "High CPU Nodes", value: highCpu, status: highCpu > 0 ? "warning" : "healthy" },
      { id: "high-memory", name: "High Memory Nodes", value: highMemory, status: highMemory > 0 ? "warning" : "healthy" },
      { id: "high-disk", name: "High Disk Nodes", value: highDisk, status: highDisk > 0 ? "warning" : "healthy" },
      { id: "warning", name: "Warning Status", value: warning, status: warning > 0 ? "warning" : "healthy" },
      { id: "critical", name: "Critical/Down", value: critical, status: critical > 0 ? "critical" : "healthy" },
    ];
  }, [clusterHosts]);

  const constrainedNodes = useMemo(
    () =>
      clusterHosts
        .map((host) => {
          const score = host.current.cpuUsagePct * 0.45 + host.current.memoryUsagePct * 0.45 + host.current.diskUsagePct * 0.1;
          return {
            id: host.id,
            name: host.hostname,
            value: score,
            status: host.status,
            href: `/nodes/${encodeURIComponent(host.id)}`,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [clusterHosts]
  );

  const topNetworkNodes = useMemo(
    () =>
      clusterHosts
        .map((host) => ({
          id: `${host.id}:net`,
          name: host.hostname,
          value: (host.current.networkRxBytesPerSec ?? 0) + (host.current.networkTxBytesPerSec ?? 0),
          status: (host.current.networkErrorRate ?? 0) > 0 ? "warning" : host.status,
          href: `/nodes/${encodeURIComponent(host.id)}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [clusterHosts]
  );

  const topVmHosts = useMemo(
    () =>
      (cluster?.vmTopHosts ?? []).map((row) => ({
        id: row.hostId,
        name: row.hostName,
        value: row.runningVms,
        status: row.runningVms > 0 ? "healthy" : "unknown",
      })),
    [cluster?.vmTopHosts]
  );

  const refreshAll = () => {
    void refreshClusters();
    void refreshHosts();
    void refreshTimeseries();
  };

  if (isLoading && !cluster) {
    return (
      <AppShell>
        <div className="p-6">
          <Card className="p-4 text-sm text-muted-foreground">Loading cluster details...</Card>
        </div>
      </AppShell>
    );
  }

  if (!cluster) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Cluster Not Found</h3>
            <Link href="/clusters">
              <Button variant="outline" size="sm" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clusters
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const now = new Date().toISOString();
  const cpuPoints = timeseries?.avgCpu.length ? timeseries.avgCpu : [{ ts: now, value: cluster.avgCpuUsagePct }];
  const memoryPoints = timeseries?.avgMemory.length ? timeseries.avgMemory : [{ ts: now, value: cluster.avgMemoryUsagePct }];
  const updatedAt = timeseries?.updatedAt || now;
  const utilizationChartData = {
    type: "timeseries" as const,
    title: "Cluster Utilization",
    unit: "percent" as const,
    series: [
      { id: "avg-cpu", name: "Avg CPU", points: cpuPoints },
      { id: "avg-mem", name: "Avg Memory", points: memoryPoints },
    ],
    updatedAt,
  };
  const networkRxPoints = timeseries?.networkRx.length ? timeseries.networkRx : [{ ts: now, value: cluster.networkRxBytesPerSec ?? 0 }];
  const networkTxPoints = timeseries?.networkTx.length ? timeseries.networkTx : [{ ts: now, value: cluster.networkTxBytesPerSec ?? 0 }];
  const networkChartData = {
    type: "timeseries" as const,
    title: "Cluster Network Throughput",
    unit: "bytesPerSec" as const,
    series: [
      { id: "rx", name: "Network Rx", points: networkRxPoints },
      { id: "tx", name: "Network Tx", points: networkTxPoints },
    ],
    updatedAt,
  };

  const hotNodesData = {
    type: "ranking" as const,
    title: "Hottest Nodes",
    unit: "percent" as const,
    rows: cluster.hottestNodes.map((n) => ({
      id: n.hostId,
      label: n.hostname,
      value: n.cpuUsagePct,
      status: n.cpuUsagePct > 90 ? ("critical" as const) : n.cpuUsagePct > 75 ? ("warning" as const) : ("healthy" as const),
      href: `/nodes/${encodeURIComponent(n.hostId)}`,
    })),
    updatedAt,
  };

  return (
    <AppShell>
      <CommandBar title={cluster.name} subtitle={`${cluster.nodeCount} nodes`} onRefresh={refreshAll}>
        <Link href="/clusters">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
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
        {diagnostics && (
          <Card className="p-4 border-status-warning/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {clustersError && <div className="text-muted-foreground">{clustersError.message}</div>}
                {hostsError && <div className="text-muted-foreground">{hostsError.message}</div>}
                {timeseriesError && <div className="text-muted-foreground">{timeseriesError.message}</div>}
                {clustersMeta?.errors?.map((msg) => (
                  <div key={`clusters-${msg}`} className="text-muted-foreground">
                    {msg}
                  </div>
                ))}
                {hostsMeta?.errors?.map((msg) => (
                  <div key={`hosts-${msg}`} className="text-muted-foreground">
                    {msg}
                  </div>
                ))}
                {timeseriesMeta?.errors?.map((msg) => (
                  <div key={`ts-${msg}`} className="text-muted-foreground">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold">{cluster.name}</h1>
              <StatusBadge status={cluster.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{cluster.site}</span>
              <span>·</span>
              <span>{cluster.datacenter}</span>
              <span>·</span>
              <Badge variant="outline">{cluster.environment}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total Nodes</div>
            <div className="text-2xl font-semibold">{cluster.nodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Healthy Nodes</div>
            <div className="text-2xl font-semibold text-status-healthy">{cluster.healthyNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Warning Nodes</div>
            <div className="text-2xl font-semibold text-status-warning">{cluster.warningNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Nodes At Risk</div>
            <div className="text-2xl font-semibold text-status-warning">{cluster.atRiskNodeCount ?? cluster.warningNodeCount + cluster.criticalNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Critical Nodes</div>
            <div className="text-2xl font-semibold text-status-critical">{cluster.criticalNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">CPU Headroom</div>
            <div className="text-2xl font-semibold tabular-nums">{(cluster.headroomCpuPct ?? Math.max(0, 100 - cluster.avgCpuUsagePct)).toFixed(1)}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Memory Headroom</div>
            <div className="text-2xl font-semibold tabular-nums">{(cluster.headroomMemoryPct ?? Math.max(0, 100 - cluster.avgMemoryUsagePct)).toFixed(1)}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Disk Pressure</div>
            <div className="text-2xl font-semibold tabular-nums">{cluster.avgDiskUsagePct.toFixed(1)}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Running VMs</div>
            <div className="text-2xl font-semibold">{cluster.vmRunningCount ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Estimated Free Slots (M)</div>
            <div className="text-2xl font-semibold">{cluster.vmEstimatedSlots?.medium ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Cluster Rx</div>
            <div className="text-2xl font-semibold">{formatBytesPerSec(cluster.networkRxBytesPerSec ?? 0)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Cluster Tx</div>
            <div className="text-2xl font-semibold">{formatBytesPerSec(cluster.networkTxBytesPerSec ?? 0)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total Network Throughput</div>
            <div className="text-2xl font-semibold">
              {formatBytesPerSec((cluster.networkRxBytesPerSec ?? 0) + (cluster.networkTxBytesPerSec ?? 0))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Nodes With Network Errors</div>
            <div className="text-2xl font-semibold text-status-warning">{cluster.networkErrorNodeCount ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Pressure Score</div>
            <div className="text-2xl font-semibold tabular-nums">{(cluster.pressureScore ?? 0).toFixed(1)}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Avg Load (1m)</div>
            <div className="text-2xl font-semibold tabular-nums">
              {clusterHosts.length ? (clusterHosts.reduce((acc, h) => acc + (h.current.load1 ?? 0), 0) / clusterHosts.length).toFixed(2) : "--"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Avg Disk IO Util</div>
            {(() => {
              const avgIo = clusterHosts.length ? clusterHosts.reduce((acc, h) => acc + (h.current.diskIoUtilPct ?? 0), 0) / clusterHosts.length : 0;
              return <div className={`text-2xl font-semibold tabular-nums ${avgIo > 80 ? "text-status-critical" : avgIo > 50 ? "text-status-warning" : ""}`}>{avgIo.toFixed(0)}%</div>;
            })()}
          </Card>
          <Card className={`p-4 border ${diagnostics ? "border-status-warning/40" : "border-status-healthy/30"}`}>
            <div className="text-xs text-muted-foreground">Data Quality</div>
            <div className="mt-2 flex items-center gap-2">
              <ShieldAlert className={`h-4 w-4 ${diagnostics ? "text-status-warning" : "text-status-healthy"}`} />
              <span className={`text-sm font-medium ${diagnostics ? "text-status-warning" : "text-status-healthy"}`}>
                {diagnostics ? "Partial" : "Healthy"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{dataQualityFailedCount} failed connector{dataQualityFailedCount === 1 ? "" : "s"}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TimeSeriesChart data={utilizationChartData} height={220} variant="area" />
          </div>
          <RankingPanel data={hotNodesData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TimeSeriesChart data={networkChartData} height={220} variant="line" unit="bytesPerSec" />
          </div>
          <RankingPanel title="Top Nodes by Network Throughput" items={topNetworkNodes} unit="bytesPerSec" colorByStatus />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingPanel title="Risk Breakdown" items={riskBreakdown} unit="count" colorByStatus />
          <RankingPanel title="Most Constrained Nodes" items={constrainedNodes} unit="%" maxValue={100} colorByStatus />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <RankingPanel title="Top Nodes by VM Count" items={topVmHosts} unit="count" colorByStatus />
        </div>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Cluster Nodes ({clusterHosts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusterHosts.slice(0, 9).map((host) => (
              <Link key={host.id} href={`/nodes/${encodeURIComponent(host.id)}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      host.status === "healthy" ? "bg-status-healthy" : host.status === "warning" ? "bg-status-warning" : "bg-status-critical"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{host.hostname}</div>
                    <div className="text-xs text-muted-foreground">
                      CPU: {host.current.cpuUsagePct.toFixed(0)}% · Mem: {host.current.memoryUsagePct.toFixed(0)}%
                      {host.current.diskIoUtilPct != null && ` · IO: ${host.current.diskIoUtilPct.toFixed(0)}%`}
                      {host.current.load1 != null && ` · Load: ${host.current.load1.toFixed(1)}`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {clusterHosts.length > 9 && (
            <div className="mt-4 text-center">
              <Link
                href={`/nodes?connectorId=${encodeURIComponent(cluster.connectorIds[0] ?? "")}&clusterId=${encodeURIComponent(cluster.id)}`}
                className="text-sm text-primary hover:underline"
              >
                View all {clusterHosts.length} nodes
              </Link>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
