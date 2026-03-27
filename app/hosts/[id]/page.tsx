"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  Clock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { useHostNetworkInterfaces, useHostTimeseries, useHostVm, useLiveHosts } from "@/lib/api/live-hooks";

function formatBytesPerSec(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B/s";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} TB`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB`;
  return `${value.toFixed(0)} B`;
}

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

function MetricCard({
  label,
  value,
  unit,
  status,
  precision = 1,
}: {
  label: string;
  value: number | string;
  unit?: string;
  status?: "healthy" | "warning" | "critical";
  precision?: number;
}) {
  const statusColors = {
    healthy: "text-status-healthy",
    warning: "text-status-warning",
    critical: "text-status-critical",
  };

  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${status ? statusColors[status] : ""}`}>
        {typeof value === "number" ? `${value.toFixed(precision)}${unit ?? ""}` : value}
      </div>
    </Card>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function NodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeNodeId = params.id as string;
  const nodeId = useMemo(() => safeDecode(routeNodeId), [routeNodeId]);
  const { hosts, meta: hostsMeta, isLoading, isError: isHostsError, error: hostsError } = useLiveHosts();
  const { data: timeseries, meta: timeseriesMeta, isError: isTimeseriesError, error: timeseriesError } =
    useHostTimeseries(nodeId, "1h", "5m");
  const {
    data: interfaces,
    meta: interfacesMeta,
    isError: isInterfacesError,
    error: interfacesError,
  } = useHostNetworkInterfaces(nodeId);
  const { data: vm, meta: vmMeta, isError: isVmError, error: vmError } = useHostVm(nodeId);

  const host = useMemo(
    () =>
      hosts.find((h) => {
        const raw = h.id;
        const decoded = safeDecode(h.id);
        return raw === routeNodeId || raw === nodeId || decoded === nodeId;
      }),
    [hosts, routeNodeId, nodeId]
  );
  const diagnostics =
    isHostsError ||
    isTimeseriesError ||
    isInterfacesError ||
    isVmError ||
    hostsMeta?.partial ||
    timeseriesMeta?.partial ||
    interfacesMeta?.partial ||
    vmMeta?.partial ||
    (hostsMeta?.errors?.length ?? 0) > 0 ||
    (timeseriesMeta?.errors?.length ?? 0) > 0 ||
    (interfacesMeta?.errors?.length ?? 0) > 0 ||
    (vmMeta?.errors?.length ?? 0) > 0;

  if (isLoading && !host) {
    return (
      <AppShell>
        <div className="p-6">
          <Card className="p-4 text-sm text-muted-foreground">Loading node details...</Card>
        </div>
      </AppShell>
    );
  }

  if (!host) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Server className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Node Not Found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The node you are looking for does not exist.
            </p>
            <Link href="/nodes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Nodes
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const cpuStatus = host.current.cpuUsagePct > 90 ? "critical" : host.current.cpuUsagePct > 70 ? "warning" : "healthy";
  const memStatus = host.current.memoryUsagePct > 90 ? "critical" : host.current.memoryUsagePct > 70 ? "warning" : "healthy";
  const diskStatus = host.current.diskUsagePct > 90 ? "critical" : host.current.diskUsagePct > 75 ? "warning" : "healthy";
  const now = host.freshness.lastScrapeAt || new Date().toISOString();
  const cpuPoints = timeseries?.cpu.length ? timeseries.cpu : [{ ts: now, value: host.current.cpuUsagePct }];
  const memoryPoints = timeseries?.memory.length ? timeseries.memory : [{ ts: now, value: host.current.memoryUsagePct }];
  const networkRxPoints = timeseries?.networkRx.length ? timeseries.networkRx : [{ ts: now, value: host.current.networkRxBytesPerSec }];
  const networkTxPoints = timeseries?.networkTx.length ? timeseries.networkTx : [{ ts: now, value: host.current.networkTxBytesPerSec }];
  const updatedAt = timeseries?.updatedAt || now;
  const nodeRx = host.current.networkRxBytesPerSec ?? 0;
  const nodeTx = host.current.networkTxBytesPerSec ?? 0;
  const netErrors = host.current.networkErrorRate ?? 0;
  const topInterfacesByThroughput = interfaces
    .slice(0, 8)
    .map((row) => ({
      id: row.interface,
      name: row.interface,
      value: row.throughputBytesPerSec,
      status: row.errorRate > 0 ? "warning" : "healthy",
    }));
  const topInterfacesByErrors = interfaces
    .filter((row) => row.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 8)
    .map((row) => ({
      id: row.interface,
      name: row.interface,
      value: row.errorRate,
      status: row.errorRate > 0 ? "warning" : "healthy",
    }));
  const vmInventoryRows = vm?.inventory ?? [];
  const vmPartial = (vm?.partialData ?? false) || !!vmMeta?.partial || isVmError;
  const hasVmInventory = vmInventoryRows.some((row) => row.name || row.namespace || row.phase);

  const cpuChartData = {
    type: "timeseries" as const,
    title: "CPU Usage",
    unit: "percent" as const,
    series: [{ id: "cpu", name: "CPU", points: cpuPoints }],
    updatedAt,
  };

  const memoryChartData = {
    type: "timeseries" as const,
    title: "Memory Usage",
    unit: "percent" as const,
    series: [{ id: "memory", name: "Memory", points: memoryPoints }],
    updatedAt,
  };

  const networkChartData = {
    type: "timeseries" as const,
    title: "Network Throughput",
    unit: "bytesPerSec" as const,
    series: [
      { id: "rx", name: "Receive", points: networkRxPoints },
      { id: "tx", name: "Transmit", points: networkTxPoints },
    ],
    updatedAt,
  };

  return (
    <AppShell>
      <CommandBar title={host.hostname} subtitle={host.ipAddress || undefined}>
        <Link href="/nodes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </CommandBar>

      <div className="p-6 space-y-6">
        {diagnostics && (
          <Card className="p-4 border-status-warning/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {hostsError && <div className="text-muted-foreground">{hostsError.message}</div>}
                {timeseriesError && <div className="text-muted-foreground">{timeseriesError.message}</div>}
                {interfacesError && <div className="text-muted-foreground">{interfacesError.message}</div>}
                {vmError && <div className="text-muted-foreground">{vmError.message}</div>}
                {hostsMeta?.errors?.map((msg) => (
                  <div key={`hosts-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
                {timeseriesMeta?.errors?.map((msg) => (
                  <div key={`ts-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
                {interfacesMeta?.errors?.map((msg) => (
                  <div key={`if-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
                {vmMeta?.errors?.map((msg) => (
                  <div key={`vm-meta-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
                {vm?.errors?.map((msg) => (
                  <div key={`vm-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
              </div>
            </div>
          </Card>
        )}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold">{host.hostname}</h1>
                <StatusBadge status={host.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{host.ipAddress || "n/a"}</span>
                <span>·</span>
                <span>{host.os || "Unknown OS"}</span>
                <span>·</span>
                <Badge variant="outline" className="capitalize">{host.role}</Badge>
              </div>
            </div>
          </div>
          {host.freshness.stale && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-stale/10 text-status-stale text-sm">
              <Clock className="h-4 w-4" />
              Data may be stale
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="vCPU Count" value={host.current.cpuLogicalCount ?? 0} precision={0} />
          <MetricCard label="CPU Usage" value={host.current.cpuUsagePct} unit="%" status={cpuStatus} />
          <MetricCard label="Memory Usage" value={host.current.memoryUsagePct} unit="%" status={memStatus} />
          <MetricCard label="Disk Usage" value={host.current.diskUsagePct} unit="%" status={diskStatus} />
          <MetricCard label="Node Rx" value={formatBytesPerSec(nodeRx)} />
          <MetricCard label="Node Tx" value={formatBytesPerSec(nodeTx)} />
          <MetricCard label="Network Error Rate" value={`${netErrors.toFixed(3)}/s`} status={netErrors > 0 ? "warning" : "healthy"} />
          <MetricCard label="Active Interfaces" value={host.current.networkInterfaceCount ?? interfaces.length} precision={0} />
          <MetricCard label="Load (1m / 5m / 15m)" value={`${(host.current.load1 ?? 0).toFixed(2)} / ${(host.current.load5 ?? 0).toFixed(2)} / ${(host.current.load15 ?? 0).toFixed(2)}`} />
          <MetricCard label="Uptime (Days)" value={(host.current.uptimeSeconds ?? 0) / 86400} unit="" />
          <MetricCard label="Disk IO Util" value={host.current.diskIoUtilPct ?? 0} unit="%" status={
            (host.current.diskIoUtilPct ?? 0) > 80 ? "critical" : (host.current.diskIoUtilPct ?? 0) > 50 ? "warning" : "healthy"
          } />
          <MetricCard label="Disk IOPS (R/W)" value={`${(host.current.diskReadIops ?? 0).toFixed(0)} / ${(host.current.diskWriteIops ?? 0).toFixed(0)}`} />
          <MetricCard label="Running VMs" value={vm?.runningVms ?? 0} precision={0} />
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Free VM Slots (M)</div>
            <div className="text-2xl font-semibold tabular-nums">{vm?.slots.medium ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">
              S:{vm?.slots.small ?? 0} / L:{vm?.slots.large ?? 0}
            </div>
          </Card>
          <MetricCard label="VM CPU Requested" value={(vm?.vmCpuRequestedCores ?? 0).toFixed(2)} />
          <MetricCard label="VM Memory Requested" value={formatBytes(vm?.vmMemoryRequestedBytes ?? 0)} />
          <MetricCard label="VM CPU Consumption" value={vm?.vmCpuRequestedPct ?? 0} unit="%" />
          <MetricCard label="VM Memory Consumption" value={vm?.vmMemoryRequestedPct ?? 0} unit="%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeSeriesChart data={cpuChartData} height={200} variant="area" />
          <TimeSeriesChart data={memoryChartData} height={200} variant="area" />
        </div>

        <TimeSeriesChart data={networkChartData} height={180} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingPanel
            title="Top Interfaces by Throughput"
            items={topInterfacesByThroughput}
            unit="bytesPerSec"
            colorByStatus
          />
          <RankingPanel
            title="Network Errors by Interface"
            items={topInterfacesByErrors}
            unit="rate"
            colorByStatus
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className={`p-4 ${vmPartial ? "border-status-warning/40" : ""}`}>
            <h3 className="text-sm font-medium mb-4">VM Capacity Snapshot</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Running VMs</span>
                <span className="font-medium">{vm?.runningVms ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Free CPU Cores</span>
                <span className="font-medium tabular-nums">{(vm?.freeCpuCores ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Free Memory</span>
                <span className="font-medium">{formatBytes(vm?.freeMemoryBytes ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Free Slots (S/M/L)</span>
                <span className="font-medium tabular-nums">
                  {(vm?.slots.small ?? 0)} / {(vm?.slots.medium ?? 0)} / {(vm?.slots.large ?? 0)}
                </span>
              </div>
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                Slot model: S=1vCPU/2GiB, M=2vCPU/4GiB, L=4vCPU/8GiB
              </div>
            </div>
          </Card>

          <Card className={`p-4 ${vmPartial ? "border-status-warning/40" : ""}`}>
            <h3 className="text-sm font-medium mb-4">VM Inventory</h3>
            {hasVmInventory ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Phase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vmInventoryRows.slice(0, 20).map((row, idx) => {
                    const vmId = row.name && row.namespace
                      ? `${host.connectorId}:${row.namespace}:${row.name}`
                      : null;
                    return (
                      <TableRow
                        key={`${row.name || "vm"}-${idx}`}
                        className={vmId ? "cursor-pointer hover:bg-muted/40" : ""}
                        onClick={vmId ? () => router.push(`/vm/${encodeURIComponent(vmId)}`) : undefined}
                      >
                        <TableCell className="font-medium text-primary">{row.name || "-"}</TableCell>
                        <TableCell>{row.namespace || "-"}</TableCell>
                        <TableCell>{row.phase || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">
                VM inventory labels are unavailable for this node. Running/count and capacity metrics are still shown.
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Node Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hostname</span>
                <span className="font-medium">{host.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IP Address</span>
                <span className="font-medium font-mono">{host.ipAddress || "n/a"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instance</span>
                <span className="font-medium font-mono">{host.instance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operating System</span>
                <span className="font-medium">{host.os || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connector</span>
                <span className="font-medium">{host.connectorId}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Location & Labels</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site</span>
                <span className="font-medium">{host.site}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datacenter</span>
                <span className="font-medium">{host.datacenter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">{host.environment}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="text-muted-foreground mb-2">Labels</div>
                {Object.keys(host.labels).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(host.labels).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">{key}: {value}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No labels</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
