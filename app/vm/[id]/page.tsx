"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Server,
  Activity,
} from "lucide-react";
import { useLiveVm, useVmTimeseries } from "@/lib/api/live-hooks";
import type { VmStatus } from "@/lib/types/entities";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatBytes(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB`;
  return `${value.toFixed(0)} B`;
}

function formatBytesPerSec(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

function StatusBadge({ status }: { status: VmStatus }) {
  const map: Record<VmStatus, string> = {
    running:
      "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    pending:
      "bg-status-warning/10 text-status-warning border-status-warning/20",
    stopped: "bg-muted text-muted-foreground border-border",
    failed:
      "bg-status-critical/10 text-status-critical border-status-critical/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
  sub,
  status,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  sub?: string;
  status?: "healthy" | "warning" | "critical";
}) {
  const statusColor =
    status === "critical"
      ? "text-status-critical"
      : status === "warning"
        ? "text-status-warning"
        : "";
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${statusColor}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      )}
    </Card>
  );
}

export default function VmDetailPage() {
  const params = useParams();
  const vmId = useMemo(() => safeDecode(params.id as string), [params.id]);
  const { vm, meta, isLoading, isError, error } = useLiveVm(vmId);
  const [range] = useState("1h");
  const { data: ts } = useVmTimeseries(
    vm?.status === "running" ? vmId : undefined,
    range,
    "5m"
  );

  const diagnostics =
    isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;

  if (isLoading && !vm) {
    return (
      <AppShell>
        <div className="p-6">
          <Card className="p-4 text-sm text-muted-foreground">
            Loading VM detail...
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!vm) {
    return (
      <AppShell>
        <div className="flex h-[50vh] items-center justify-center">
          <Card className="p-8 text-center">
            <Server className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-medium">VM Not Found</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              The virtual machine does not exist in live data.
            </p>
            <Link href="/vm">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to VM
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const memUsedPct =
    vm.memoryDomainBytes && vm.memoryUsedBytes
      ? (vm.memoryUsedBytes / vm.memoryDomainBytes) * 100
      : undefined;
  const cpuUsagePct =
    vm.cpuUsageCores != null && vm.resourceLimits?.cpuCores
      ? (vm.cpuUsageCores / vm.resourceLimits.cpuCores) * 100
      : undefined;

  return (
    <AppShell>
      <CommandBar
        title={`${vm.namespace}/${vm.name}`}
        subtitle={vm.node ? `on ${vm.node}` : vm.id}

      >
        <Link href="/vm">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </CommandBar>

      <div className="space-y-6 p-6">
        {diagnostics && (
          <Card className="border-status-warning/40 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {error && (
                  <div className="text-muted-foreground">{error.message}</div>
                )}
                {meta?.errors?.map((msg) => (
                  <div key={msg} className="text-muted-foreground">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Status header */}
        <div className="flex items-center gap-3">
          <StatusBadge status={vm.status} />
          <span className="text-sm text-muted-foreground">
            Phase: {vm.phase}
          </span>
          {vm.status === "running" ? (
            <CheckCircle className="h-4 w-4 text-status-healthy" />
          ) : null}
        </div>

        {/* Top metric cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="CPU Usage"
            icon={<Cpu className="h-3 w-3" />}
            value={
              vm.cpuUsageCores != null
                ? `${(vm.cpuUsageCores * 1000).toFixed(0)}m`
                : "--"
            }
            sub={
              vm.resourceLimits?.cpuCores
                ? `of ${vm.resourceLimits.cpuCores} core limit`
                : vm.cpuRequestedCores
                  ? `of ${vm.cpuRequestedCores.toFixed(2)} req`
                  : undefined
            }
            status={
              cpuUsagePct != null && cpuUsagePct > 90
                ? "critical"
                : cpuUsagePct != null && cpuUsagePct > 75
                  ? "warning"
                  : undefined
            }
          />
          <MetricCard
            label="Memory Used"
            icon={<MemoryStick className="h-3 w-3" />}
            value={formatBytes(vm.memoryUsedBytes)}
            sub={
              vm.memoryDomainBytes
                ? `of ${formatBytes(vm.memoryDomainBytes)} total`
                : undefined
            }
            status={
              memUsedPct != null && memUsedPct > 90
                ? "critical"
                : memUsedPct != null && memUsedPct > 80
                  ? "warning"
                  : undefined
            }
          />
          <MetricCard
            label="Network Rx"
            icon={<Network className="h-3 w-3" />}
            value={formatBytesPerSec(vm.networkRxBytesPerSec)}
          />
          <MetricCard
            label="Network Tx"
            icon={<Network className="h-3 w-3" />}
            value={formatBytesPerSec(vm.networkTxBytesPerSec)}
          />
          <MetricCard
            label="Disk IOPS"
            icon={<HardDrive className="h-3 w-3" />}
            value={
              vm.storageReadIops != null || vm.storageWriteIops != null
                ? `${(vm.storageReadIops ?? 0).toFixed(0)}R / ${(vm.storageWriteIops ?? 0).toFixed(0)}W`
                : "--"
            }
          />
          <MetricCard
            label="vCPU Delay"
            icon={<Activity className="h-3 w-3" />}
            value={
              vm.vcpuDelaySec != null
                ? `${(vm.vcpuDelaySec * 1000).toFixed(1)}ms`
                : "--"
            }
            sub="steal time / 5m"
            status={
              vm.vcpuDelaySec != null && vm.vcpuDelaySec > 0.1
                ? "warning"
                : undefined
            }
          />
        </div>

        {/* Memory & CPU utilization bars */}
        {(memUsedPct != null || cpuUsagePct != null) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cpuUsagePct != null && (
              <Card className="p-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">CPU Utilization</span>
                  <span className="font-medium tabular-nums">
                    {cpuUsagePct.toFixed(1)}%
                  </span>
                </div>
                <Progress value={cpuUsagePct} className="h-2" />
                <div className="mt-1 text-xs text-muted-foreground">
                  {(vm.cpuUsageCores! * 1000).toFixed(0)}m used of{" "}
                  {vm.resourceLimits!.cpuCores!} core limit
                </div>
              </Card>
            )}
            {memUsedPct != null && (
              <Card className="p-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Memory Utilization
                  </span>
                  <span className="font-medium tabular-nums">
                    {memUsedPct.toFixed(1)}%
                  </span>
                </div>
                <Progress value={memUsedPct} className="h-2" />
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(vm.memoryUsedBytes)} used of{" "}
                  {formatBytes(vm.memoryDomainBytes)}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Time series charts */}
        {vm.status === "running" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">CPU Usage Over Time</h3>
              {ts?.cpu?.length ? (
                <TimeSeriesChart
                  data={ts.cpu.map((p) => ({
                    timestamp: p.ts,
                    value: p.value * 1000,
                    series: "CPU (millicores)",
                  }))}
                  series={["CPU (millicores)"]}
                  unit="count"
                  height={200}
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No CPU data available
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">
                Memory Usage Over Time
              </h3>
              {ts?.memoryUsed?.length ? (
                <TimeSeriesChart
                  data={ts.memoryUsed.map((p) => ({
                    timestamp: p.ts,
                    value: p.value / 1e6,
                    series: "Memory (MB)",
                  }))}
                  series={["Memory (MB)"]}
                  unit="count"
                  height={200}
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No memory data available
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Network Throughput</h3>
              {ts?.networkRx?.length || ts?.networkTx?.length ? (
                <TimeSeriesChart
                  data={[
                    ...(ts?.networkRx?.map((p) => ({
                      timestamp: p.ts,
                      value: p.value,
                      series: "Rx",
                    })) ?? []),
                    ...(ts?.networkTx?.map((p) => ({
                      timestamp: p.ts,
                      value: p.value,
                      series: "Tx",
                    })) ?? []),
                  ]}
                  series={["Rx", "Tx"]}
                  unit="bytesPerSec"
                  height={200}
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No network data available
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Disk IOPS</h3>
              {ts?.diskReadIops?.length || ts?.diskWriteIops?.length ? (
                <TimeSeriesChart
                  data={[
                    ...(ts?.diskReadIops?.map((p) => ({
                      timestamp: p.ts,
                      value: p.value,
                      series: "Read IOPS",
                    })) ?? []),
                    ...(ts?.diskWriteIops?.map((p) => ({
                      timestamp: p.ts,
                      value: p.value,
                      series: "Write IOPS",
                    })) ?? []),
                  ]}
                  series={["Read IOPS", "Write IOPS"]}
                  unit="count"
                  height={200}
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No disk IOPS data available
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Disks */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-medium">Virtual Disks</h3>
            {vm.disks && vm.disks.length > 0 ? (
              <div className="space-y-3">
                {vm.disks.map((disk) => (
                  <div
                    key={disk.device}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-xs">{disk.device}</span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatBytes(disk.allocatedBytes)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  {vm.storageReadBytesPerSec != null && (
                    <span>
                      Read: {formatBytesPerSec(vm.storageReadBytesPerSec)}
                    </span>
                  )}
                  {vm.storageWriteBytesPerSec != null && (
                    <span className="ml-3">
                      Write: {formatBytesPerSec(vm.storageWriteBytesPerSec)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No disk information available
              </div>
            )}
          </Card>

          {/* Resource Requests & Limits */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-medium">Resources</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU Requested</span>
                <span className="font-medium tabular-nums">
                  {vm.cpuRequestedCores != null
                    ? `${vm.cpuRequestedCores.toFixed(2)} cores`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU Limit</span>
                <span className="font-medium tabular-nums">
                  {vm.resourceLimits?.cpuCores != null
                    ? `${vm.resourceLimits.cpuCores} cores`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Requested</span>
                <span className="font-medium">
                  {formatBytes(vm.memoryRequestedBytes)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Limit</span>
                <span className="font-medium">
                  {formatBytes(vm.resourceLimits?.memoryBytes)}
                </span>
              </div>
              {vm.dirtyRateBytesPerSec != null && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">
                    Memory Dirty Rate
                  </span>
                  <span className="font-medium">
                    {formatBytesPerSec(vm.dirtyRateBytesPerSec)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Node Context */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-medium">Node Context</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node</span>
                <span className="font-medium">{vm.node || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allocatable CPU</span>
                <span className="font-medium tabular-nums">
                  {vm.nodeAllocatableCpuCores != null
                    ? `${vm.nodeAllocatableCpuCores.toFixed(1)} cores`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Allocatable Memory
                </span>
                <span className="font-medium">
                  {formatBytes(vm.nodeAllocatableMemoryBytes)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free CPU</span>
                <span className="font-medium tabular-nums">
                  {vm.nodeFreeCpuCores != null
                    ? `${vm.nodeFreeCpuCores.toFixed(1)} cores`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free Memory</span>
                <span className="font-medium">
                  {formatBytes(vm.nodeFreeMemoryBytes)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Free Slots (S/M/L)
                </span>
                <span className="font-medium tabular-nums">
                  {vm.nodeFreeSlots
                    ? `${vm.nodeFreeSlots.small}/${vm.nodeFreeSlots.medium}/${vm.nodeFreeSlots.large}`
                    : "--"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Metadata footer */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">ID:</span>{" "}
              <span className="font-mono">{vm.id}</span>
            </span>
            <span>
              <span className="font-medium text-foreground">Connector:</span>{" "}
              {vm.connectorId}
            </span>
            <span>
              <span className="font-medium text-foreground">Namespace:</span>{" "}
              {vm.namespace}
            </span>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
