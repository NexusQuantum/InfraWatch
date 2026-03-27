"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { CapacityBreakdown, CapacityBar } from "@/components/charts/capacity-breakdown";
import { RankingPanel } from "@/components/charts/ranking-panel";
import {
  useLiveStorageClusters,
  useLiveHosts,
  useStorageClusterTimeseries,
} from "@/lib/api/live-hooks";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    healthy:
      "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    warning:
      "bg-status-warning/10 text-status-warning border-status-warning/20",
    critical:
      "bg-status-critical/10 text-status-critical border-status-critical/20",
    down: "bg-status-down/10 text-status-down border-status-down/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${variants[status] || variants.unknown}`}
    >
      {status === "healthy" && <CheckCircle className="h-3.5 w-3.5" />}
      {(status === "warning" || status === "critical") && (
        <AlertTriangle className="h-3.5 w-3.5" />
      )}
      {status}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e15) return `${(bytes / 1e15).toFixed(1)} PB`;
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(1)} KB`;
}

function formatBytesPerSec(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B/s";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

function RobustnessBadge({ robustness }: { robustness: string }) {
  const map: Record<string, string> = {
    healthy:
      "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    degraded:
      "bg-status-warning/10 text-status-warning border-status-warning/20",
    faulted:
      "bg-status-critical/10 text-status-critical border-status-critical/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[robustness] || "bg-muted text-muted-foreground border-border"}`}
    >
      {robustness === "healthy" && <CheckCircle className="h-3 w-3" />}
      {robustness === "degraded" && <AlertTriangle className="h-3 w-3" />}
      {robustness === "faulted" && <XCircle className="h-3 w-3" />}
      {robustness}
    </span>
  );
}

export default function StorageDetailPage() {
  const params = useParams();
  const storageId = useMemo(() => {
    try { return decodeURIComponent(params.id as string); } catch { return params.id as string; }
  }, [params.id]);
  const [range, setRange] = useState<"1h" | "6h" | "24h">("1h");
  const {
    clusters,
    meta: clustersMeta,
    isLoading,
    isError: isClustersError,
    error: clustersError,
  } = useLiveStorageClusters();
  const { hosts } = useLiveHosts();
  const {
    data: timeseries,
    meta: timeseriesMeta,
    isError: isTimeseriesError,
    error: timeseriesError,
  } = useStorageClusterTimeseries(storageId, range, "5m");

  const cluster = useMemo(
    () => clusters.find((c) => c.id === storageId),
    [clusters, storageId]
  );
  const diagnostics =
    isClustersError ||
    isTimeseriesError ||
    clustersMeta?.partial ||
    timeseriesMeta?.partial ||
    (clustersMeta?.errors?.length ?? 0) > 0 ||
    (timeseriesMeta?.errors?.length ?? 0) > 0;
  const storageHosts = useMemo(() => {
    if (!cluster) return [];
    return hosts.filter((h) => cluster.connectorIds.includes(h.connectorId));
  }, [cluster, hosts]);

  if (isLoading && !cluster) {
    return (
      <AppShell>
        <div className="p-6">
          <Card className="p-4 text-sm text-muted-foreground">
            Loading storage cluster details...
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!cluster) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Database className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">
              Storage Cluster Not Found
            </h3>
            <Link href="/storage">
              <Button variant="outline" size="sm" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Storage
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const now = new Date().toISOString();
  const readPoints = timeseries?.read.length
    ? timeseries.read
    : [{ ts: now, value: cluster.throughput.readBytesPerSec }];
  const writePoints = timeseries?.write.length
    ? timeseries.write
    : [{ ts: now, value: cluster.throughput.writeBytesPerSec }];
  const updatedAt = timeseries?.updatedAt || now;

  const capacityData = {
    type: "capacity-breakdown" as const,
    title: "Cluster Capacity",
    segments: [
      { label: "Used", value: cluster.capacity.usedBytes },
      {
        label: "Free",
        value: cluster.capacity.freeBytes,
        status: "healthy" as const,
      },
    ],
    unit: "bytes" as const,
    updatedAt,
  };

  const throughputChartData = {
    type: "timeseries" as const,
    title: "Storage Throughput",
    unit: "bytesPerSec" as const,
    series: [
      { id: "read", name: "Read", points: readPoints },
      { id: "write", name: "Write", points: writePoints },
    ],
    updatedAt,
  };

  const volumes = cluster.volumes ?? [];
  const volumeSummary = cluster.volumeSummary;

  const topVolumesBySize = useMemo(
    () =>
      volumes
        .slice()
        .sort((a, b) => b.actualSizeBytes - a.actualSizeBytes)
        .slice(0, 8)
        .map((v) => ({
          id: v.name,
          name: v.name.length > 20 ? `...${v.name.slice(-17)}` : v.name,
          value: v.actualSizeBytes,
          status:
            v.robustness === "faulted"
              ? "critical"
              : v.robustness === "degraded"
                ? "warning"
                : "healthy",
        })),
    [volumes]
  );

  return (
    <AppShell>
      <CommandBar
        title={cluster.name}
        subtitle={`${cluster.nodeCount} storage nodes · ${volumes.length} volumes`}
      >
        <Link href="/storage">
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
                {clustersError && (
                  <div className="text-muted-foreground">
                    {clustersError.message}
                  </div>
                )}
                {timeseriesError && (
                  <div className="text-muted-foreground">
                    {timeseriesError.message}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Database className="h-6 w-6" />
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
          {cluster.degradedComponentsCount > 0 && (
            <Badge
              variant="outline"
              className="text-status-warning border-status-warning/30"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {cluster.degradedComponentsCount} degraded
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Total Capacity</div>
            <div className="text-2xl font-semibold">
              {formatBytes(cluster.capacity.totalBytes)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Used</div>
            <div className="text-2xl font-semibold">
              {formatBytes(cluster.capacity.usedBytes)}
            </div>
            <div className="text-xs text-muted-foreground">
              {cluster.capacity.usedPct.toFixed(1)}%
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Free</div>
            <div className="text-2xl font-semibold">
              {formatBytes(cluster.capacity.freeBytes)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Scheduled</div>
            <div className="text-2xl font-semibold">
              {formatBytes(cluster.scheduledBytes ?? 0)}
            </div>
            <div
              className={`text-xs ${(cluster.overcommitPct ?? 0) > 100 ? "text-status-warning" : "text-muted-foreground"}`}
            >
              {(cluster.overcommitPct ?? 0).toFixed(0)}% of capacity
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Throughput</div>
            <div className="text-sm font-semibold">
              R: {formatBytesPerSec(cluster.throughput.readBytesPerSec)}
            </div>
            <div className="text-sm font-semibold">
              W: {formatBytesPerSec(cluster.throughput.writeBytesPerSec)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Nodes</div>
            <div className="text-2xl font-semibold">{cluster.nodeCount}</div>
          </Card>
        </div>

        {/* Capacity bar */}
        <Card className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Capacity Usage</span>
            <span className="font-medium tabular-nums">
              {cluster.capacity.usedPct.toFixed(1)}%
            </span>
          </div>
          <Progress value={cluster.capacity.usedPct} className="h-3" />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(cluster.capacity.usedBytes)} used</span>
            <span>{formatBytes(cluster.capacity.freeBytes)} free</span>
          </div>
          {cluster.overcommitPct != null && cluster.overcommitPct > 80 && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Overcommit: </span>
              <span
                className={
                  cluster.overcommitPct > 100
                    ? "text-status-warning font-medium"
                    : ""
                }
              >
                {cluster.overcommitPct.toFixed(0)}% scheduled vs capacity
              </span>
            </div>
          )}
        </Card>

        {/* Volume Health Summary */}
        {volumeSummary && volumeSummary.total > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">
              Volume Health ({volumeSummary.total} volumes)
            </h3>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-status-healthy" />
                <span>{volumeSummary.healthy} healthy</span>
              </div>
              {volumeSummary.degraded > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-status-warning" />
                  <span className="text-status-warning">
                    {volumeSummary.degraded} degraded
                  </span>
                </div>
              )}
              {volumeSummary.faulted > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-status-critical" />
                  <span className="text-status-critical">
                    {volumeSummary.faulted} faulted
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Throughput chart + Top volumes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TimeSeriesChart data={throughputChartData} height={220} />
          </div>
          <RankingPanel
            title="Top Volumes by Size"
            items={topVolumesBySize}
            unit="bytes"
            colorByStatus
          />
        </div>

        {/* Volume table */}
        {volumes.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">
              Longhorn Volumes ({volumes.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Volume</th>
                    <th className="pb-2 pr-4 font-medium">State</th>
                    <th className="pb-2 pr-4 font-medium">Robustness</th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Capacity
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Actual Size
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Usage
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Read IOPS
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Write IOPS
                    </th>
                    <th className="pb-2 font-medium text-right">
                      Write Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {volumes.map((vol) => {
                    const usagePct =
                      vol.capacityBytes > 0
                        ? (vol.actualSizeBytes / vol.capacityBytes) * 100
                        : 0;
                    return (
                      <tr
                        key={vol.name}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <span className="font-mono text-xs">
                            {vol.name.length > 30
                              ? `${vol.name.slice(0, 12)}...${vol.name.slice(-12)}`
                              : vol.name}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="text-xs">
                            {vol.state}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <RobustnessBadge robustness={vol.robustness} />
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {formatBytes(vol.capacityBytes)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {formatBytes(vol.actualSizeBytes)}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${usagePct > 90 ? "bg-status-critical" : usagePct > 75 ? "bg-status-warning" : "bg-status-healthy"}`}
                                style={{
                                  width: `${Math.min(usagePct, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-xs w-10 text-right">
                              {usagePct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {vol.readIops.toFixed(0)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {vol.writeIops.toFixed(0)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {vol.writeLatency > 0
                            ? `${vol.writeLatency.toFixed(2)}ms`
                            : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Storage nodes */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">
            Storage Nodes ({storageHosts.length})
          </h3>
          <div className="space-y-3">
            {storageHosts.map((host) => (
              <Link key={host.id} href={`/nodes/${encodeURIComponent(host.id)}`}>
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{host.hostname}</div>
                    <div className="text-xs text-muted-foreground">
                      {host.ipAddress || "n/a"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>
                      CPU: {host.current.cpuUsagePct.toFixed(0)}% · Mem:{" "}
                      {host.current.memoryUsagePct.toFixed(0)}%
                    </div>
                    {host.current.diskIoUtilPct != null && (
                      <div>Disk IO: {host.current.diskIoUtilPct.toFixed(0)}%</div>
                    )}
                  </div>
                  <div className="w-24">
                    <CapacityBar
                      used={host.current.diskUsagePct}
                      total={100}
                      showValues={false}
                    />
                  </div>
                  <span className="text-sm tabular-nums w-12 text-right">
                    {host.current.diskUsagePct.toFixed(0)}%
                  </span>
                </div>
              </Link>
            ))}
            {storageHosts.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No storage nodes discovered
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
