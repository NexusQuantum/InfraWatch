"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowUpRight,
  Database,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { useResourceUtilization } from "@/lib/api/prometheus-hooks";
import {
  useLiveComputeClusters,
  useLiveConnectors,
  useLiveHosts,
  useLiveOverview,
  useLiveStorageClusters,
} from "@/lib/api/live-hooks";

type RangeOption = "1h" | "6h" | "24h";

const STEP_BY_RANGE: Record<RangeOption, string> = {
  "1h": "1m",
  "6h": "5m",
  "24h": "15m",
};

function bytesToGiB(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}

function formatBytes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)} TB`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB`;
  return `${(value / 1e3).toFixed(1)} KB`;
}

function formatBytesPerSec(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

export default function Page() {
  const [range, setRange] = useState<RangeOption>("24h");

  const { connectors, refresh: refreshConnectors } = useLiveConnectors();
  const { hosts, refresh: refreshHosts } = useLiveHosts();
  const { clusters: computeClusters, refresh: refreshCompute } = useLiveComputeClusters();
  const { clusters: storageClusters, refresh: refreshStorage } = useLiveStorageClusters();
  const {
    overview,
    isError: overviewError,
    error: overviewErrObj,
    refresh: refreshOverview,
  } = useLiveOverview();

  const {
    data: utilization,
    isError: utilizationError,
    error: utilizationErrObj,
    refresh: refreshUtilization,
  } = useResourceUtilization(range, STEP_BY_RANGE[range]);

  const onRefreshAll = () => {
    refreshOverview();
    refreshHosts();
    refreshConnectors();
    refreshCompute();
    refreshStorage();
    refreshUtilization();
  };

  const topHostsByCpu = useMemo(
    () =>
      hosts
        .slice()
        .sort((a, b) => (b.current?.cpuUsagePct ?? 0) - (a.current?.cpuUsagePct ?? 0))
        .slice(0, 5)
        .map((h) => ({
          id: h.id,
          name: h.hostname,
          value: h.current?.cpuUsagePct ?? 0,
          status: h.status,
          href: `/nodes/${encodeURIComponent(h.id)}`,
        })),
    [hosts]
  );

  const topStoragePressure = useMemo(
    () =>
      storageClusters
        .slice()
        .sort((a, b) => b.capacity.usedPct - a.capacity.usedPct)
        .slice(0, 5)
        .map((cluster) => ({
          id: cluster.id,
          name: cluster.name,
          value: cluster.capacity.usedPct,
          status: cluster.status,
          href: `/storage/${cluster.id}`,
        })),
    [storageClusters]
  );

  const connectorLatency = useMemo(
    () =>
      connectors
        .slice()
        .sort((a, b) => b.latencyMs - a.latencyMs)
        .slice(0, 5)
        .map((connector) => ({
          id: connector.id,
          name: connector.name,
          value: connector.latencyMs,
          status: connector.status === "degraded" ? "warning" : connector.status,
          href: `/connectors/${connector.id}`,
        })),
    [connectors]
  );

  const hostsAtRisk =
    (overview?.health.warningHosts ?? hosts.filter((h) => h.status === "warning").length) +
    (overview?.health.criticalHosts ?? hosts.filter((h) => h.status === "critical").length) +
    (overview?.health.downHosts ?? hosts.filter((h) => h.status === "down").length) +
    (overview?.health.unknownHosts ?? hosts.filter((h) => h.status === "unknown").length);

  const healthyConnectors = overview?.capabilities.healthyConnectors ?? connectors.filter((c) => c.status === "healthy").length;
  const totalConnectors = overview?.capabilities.totalConnectors ?? connectors.length;
  const degradedDownConnectors =
    (overview?.capabilities.degradedConnectors ?? connectors.filter((c) => c.status === "degraded").length) +
    (overview?.capabilities.downConnectors ?? connectors.filter((c) => c.status === "down").length);

  const computeAtRisk =
    overview?.computeClusters.degraded ?? computeClusters.filter((c) => c.status !== "healthy").length;
  const storageAtRisk =
    overview?.storageClusters.degraded ?? storageClusters.filter((c) => c.status !== "healthy").length;

  const failedConnectorCount = overview?.failedConnectors.length ?? 0;
  const partialData = Boolean(overview?.partialData || failedConnectorCount > 0);
  const vm = overview?.vm;
  const vmPartial = vm?.partialData ?? false;
  const avgNetworkRx =
    utilization?.networkRxCurrent ??
    (hosts.length
      ? hosts.reduce((acc, h) => acc + (h.current.networkRxBytesPerSec ?? 0), 0) / hosts.length
      : 0);
  const avgNetworkTx =
    utilization?.networkTxCurrent ??
    (hosts.length
      ? hosts.reduce((acc, h) => acc + (h.current.networkTxBytesPerSec ?? 0), 0) / hosts.length
      : 0);
  const nodesWithNetworkErrors =
    utilization?.nodesWithNetworkErrors ??
    hosts.filter((h) => (h.current.networkErrorRate ?? 0) > 0).length;

  const topVmDenseHosts = useMemo(
    () =>
      (vm?.topVmDenseHosts ?? []).map((host) => ({
        id: host.hostId,
        name: host.hostName,
        value: host.runningVms,
        status: host.runningVms > 0 ? "warning" : "healthy",
        href: "/nodes",
      })),
    [vm]
  );

  const topVmCapacityHosts = useMemo(
    () =>
      (vm?.topCapacityHosts ?? []).map((host) => ({
        id: `${host.hostId}:slots`,
        name: host.hostName,
        value: host.slotsMedium,
        status: host.slotsMedium > 0 ? "healthy" : "warning",
        href: "/nodes",
      })),
    [vm]
  );

  const avgDisk = hosts.length
    ? hosts.reduce((acc, h) => acc + (h.current?.diskUsagePct ?? 0), 0) / hosts.length
    : 0;

  const avgLoad1 = hosts.length
    ? hosts.reduce((acc, h) => acc + (h.current?.load1 ?? 0), 0) / hosts.length
    : 0;

  const avgDiskIoUtil = hosts.length
    ? hosts.reduce((acc, h) => acc + (h.current?.diskIoUtilPct ?? 0), 0) / hosts.length
    : 0;

  const storageVolumeSummary = useMemo(() => {
    let total = 0, healthy = 0, degraded = 0;
    for (const sc of storageClusters) {
      total += sc.volumeSummary?.total ?? 0;
      healthy += sc.volumeSummary?.healthy ?? 0;
      degraded += (sc.volumeSummary?.degraded ?? 0) + (sc.volumeSummary?.faulted ?? 0);
    }
    return { total, healthy, degraded };
  }, [storageClusters]);

  const topNodesByLoad = useMemo(
    () =>
      hosts
        .slice()
        .filter((h) => (h.current.load1 ?? 0) > 0)
        .map((h) => ({
          id: `${h.id}:load`,
          name: h.hostname,
          value: h.current.load1 ?? 0,
          status: (h.current.load1 ?? 0) > (h.current.cpuLogicalCount ?? 4) * 2 ? "critical" : (h.current.load1 ?? 0) > (h.current.cpuLogicalCount ?? 4) ? "warning" : h.status,
          href: `/nodes/${encodeURIComponent(h.id)}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [hosts]
  );

  const topNodesByDiskIo = useMemo(
    () =>
      hosts
        .slice()
        .filter((h) => (h.current.diskIoUtilPct ?? 0) > 0)
        .map((h) => ({
          id: `${h.id}:diskio`,
          name: h.hostname,
          value: h.current.diskIoUtilPct ?? 0,
          status: (h.current.diskIoUtilPct ?? 0) > 80 ? "critical" : (h.current.diskIoUtilPct ?? 0) > 50 ? "warning" : h.status,
          href: `/nodes/${encodeURIComponent(h.id)}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [hosts]
  );

  const topNodesByNetworkThroughput = useMemo(
    () =>
      hosts
        .slice()
        .map((h) => ({
          id: `${h.id}:network`,
          name: h.hostname,
          value: (h.current.networkRxBytesPerSec ?? 0) + (h.current.networkTxBytesPerSec ?? 0),
          status: (h.current.networkErrorRate ?? 0) > 0 ? "warning" : h.status,
          href: `/nodes/${encodeURIComponent(h.id)}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [hosts]
  );

  return (
    <AppShell>
      <CommandBar
        title="NQRust-InfraWatch Overview"
        subtitle={`${overview?.health.totalHosts ?? hosts.length} Nodes · ${totalConnectors} Connectors · ${(overview?.computeClusters.total ?? computeClusters.length) + (overview?.storageClusters.total ?? storageClusters.length)} Clusters`}
        onRefresh={onRefreshAll}
      >
        <div className="inline-flex rounded-md border border-border p-0.5">
          {(["1h", "6h", "24h"] as RangeOption[]).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={range === option ? "secondary" : "ghost"}
              onClick={() => setRange(option)}
              className="h-8 px-3 text-xs"
            >
              {option}
            </Button>
          ))}
        </div>
      </CommandBar>

      <div className="min-h-screen bg-background text-foreground">
        <main className="p-6 space-y-4">
          {(() => {
            const totalStorageBytes = storageClusters.reduce((acc, c) => acc + c.capacity.totalBytes, 0);
            const usedStorageBytes = storageClusters.reduce((acc, c) => acc + c.capacity.usedBytes, 0);
            const totalClusters = (overview?.computeClusters.total ?? computeClusters.length) + (overview?.storageClusters.total ?? storageClusters.length);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 gap-1">
                  <div className="text-xs text-muted-foreground">Total Clusters</div>
                  <div className="text-2xl font-semibold">{totalClusters}</div>
                  <div className="text-xs text-muted-foreground">
                    {overview?.computeClusters.total ?? computeClusters.length} compute · {overview?.storageClusters.total ?? storageClusters.length} storage
                  </div>
                </Card>
                <Card className="p-3 gap-1">
                  <div className="text-xs text-muted-foreground">Total Nodes</div>
                  <div className="text-2xl font-semibold">{overview?.health.totalHosts ?? hosts.length}</div>
                  <div className="text-xs text-muted-foreground">
                    {hostsAtRisk > 0 ? <span className="text-status-warning">{hostsAtRisk} at risk</span> : "all healthy"}
                  </div>
                </Card>
                <Card className={`p-3 gap-1 ${vmPartial ? "border border-status-warning/40" : ""}`}>
                  <div className="text-xs text-muted-foreground">Total VMs</div>
                  <div className="text-2xl font-semibold">{vm?.totalRunning ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{vm?.hostsWithVms ?? 0} hosts · {vm?.totalEstimatedSlots?.medium ?? 0} free slots (M)</div>
                </Card>
                <Card className="p-3 gap-1">
                  <div className="text-xs text-muted-foreground">Total Storage</div>
                  <div className="text-2xl font-semibold">{formatBytes(totalStorageBytes)}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalStorageBytes > 0 ? `${((usedStorageBytes / totalStorageBytes) * 100).toFixed(0)}% used` : "no data"}
                    {storageVolumeSummary.degraded > 0 && <span className="text-status-warning"> · {storageVolumeSummary.degraded} degraded vol</span>}
                  </div>
                </Card>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-2 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Resource Utilization</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{utilizationError ? "Prometheus Unavailable" : `Live: Prometheus (${range})`}</Badge>
                  <Link href="/clusters" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Clusters <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <TimeSeriesChart
                title=""
                data={utilization?.series ?? []}
                series={["CPU", "Memory"]}
                height={220}
              />
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Top Nodes by CPU</h3>
                <Link href="/nodes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Nodes <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topHostsByCpu} maxValue={100} unit="%" colorByStatus />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Connector Latency</h3>
                <Link href="/connectors" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Connectors <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={connectorLatency} unit="count" colorByStatus />
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Top Nodes by Load Average</h3>
                <Link href="/nodes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Nodes <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topNodesByLoad} unit="count" colorByStatus />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Top Nodes by Disk IO Utilization</h3>
                <Link href="/nodes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Nodes <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topNodesByDiskIo} maxValue={100} unit="%" colorByStatus />
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2"><Database className="h-4 w-4" />Top Storage Pressure</h3>
                <Link href="/storage" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Storage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topStoragePressure} maxValue={100} unit="%" colorByStatus />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Network Throughput Trend</h3>
                <Badge variant="outline">{`Live: Prometheus (${range})`}</Badge>
              </div>
              <TimeSeriesChart
                title=""
                data={utilization?.networkSeries ?? []}
                series={["Network Rx", "Network Tx"]}
                height={220}
                unit="bytesPerSec"
              />
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Top Nodes by Network Throughput</h3>
                <Link href="/nodes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Nodes <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topNodesByNetworkThroughput} unit="bytesPerSec" colorByStatus />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={`p-4 ${vmPartial ? "border-status-warning/40" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Top Nodes by VM Count</h3>
                <Link href="/nodes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Nodes <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topVmDenseHosts} unit="count" colorByStatus />
            </Card>

            <Card className={`p-4 ${vmPartial ? "border-status-warning/40" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Top Nodes by VM Capacity (M)</h3>
                <Link href="/nodes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Nodes <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel items={topVmCapacityHosts} unit="count" colorByStatus />
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">System Metrics</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average CPU</span>
                  <span className="text-sm font-medium tabular-nums">
                    {utilization?.cpuCurrent == null ? "--" : `${utilization.cpuCurrent.toFixed(1)}%`}
                  </span>
                </div>
                <Progress value={utilization?.cpuCurrent ?? 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Memory</span>
                  <span className="text-sm font-medium tabular-nums">
                    {utilization?.memoryCurrent == null ? "--" : `${utilization.memoryCurrent.toFixed(1)}%`}
                  </span>
                </div>
                <Progress value={utilization?.memoryCurrent ?? 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Disk</span>
                  <span className="text-sm font-medium tabular-nums">{avgDisk.toFixed(1)}%</span>
                </div>
                <Progress value={avgDisk} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Disk IO Utilization</span>
                  <span className="text-sm font-medium tabular-nums">{avgDiskIoUtil.toFixed(1)}%</span>
                </div>
                <Progress value={avgDiskIoUtil} className="h-2" />
              </div>
            </div>
          </Card>

          {(utilizationError || overviewError || partialData) && (
            <Card className="p-4 border-status-warning/40 bg-status-warning/5">
              <div className="flex items-start gap-2 text-status-warning text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div className="space-y-1">
                  {overviewError && <div>Overview query failed: {overviewErrObj?.message}</div>}
                  {utilizationError && <div>Resource utilization query failed: {utilizationErrObj?.message}</div>}
                  {partialData && (
                    <div>
                      Partial data detected. Failed connectors: {overview?.failedConnectors.join(", ") || "unknown"}
                    </div>
                  )}
                  {vm?.errors?.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                  {vm?.topCapacityHosts?.[0] && (
                    <div>
                      Top VM-capacity host: {vm.topCapacityHosts[0].hostName} ({vm.topCapacityHosts[0].slotsMedium} medium slots,{" "}
                      {vm.topCapacityHosts[0].freeCpuCores.toFixed(2)} cores free, {bytesToGiB(vm.topCapacityHosts[0].freeMemoryBytes)} free)
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </AppShell>
  );
}
