"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Server,
  Cpu,
  HardDrive,
  Network,
  Clock,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { hosts } from "@/lib/mocks/hosts";

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

function MetricCard({ label, value, unit, status }: { label: string; value: number; unit: string; status?: "healthy" | "warning" | "critical" }) {
  const statusColors = {
    healthy: "text-status-healthy",
    warning: "text-status-warning",
    critical: "text-status-critical",
  };

  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${status ? statusColors[status] : ""}`}>
        {value.toFixed(1)}{unit}
      </div>
    </Card>
  );
}

// Static chart data to avoid hydration mismatch
const STATIC_CPU_DATA = [
  { ts: "2026-03-26T08:00:00Z", value: 42 },
  { ts: "2026-03-26T08:15:00Z", value: 45 },
  { ts: "2026-03-26T08:30:00Z", value: 48 },
  { ts: "2026-03-26T08:45:00Z", value: 52 },
  { ts: "2026-03-26T09:00:00Z", value: 58 },
  { ts: "2026-03-26T09:15:00Z", value: 55 },
  { ts: "2026-03-26T09:30:00Z", value: 51 },
  { ts: "2026-03-26T09:45:00Z", value: 48 },
  { ts: "2026-03-26T10:00:00Z", value: 52 },
  { ts: "2026-03-26T10:15:00Z", value: 56 },
  { ts: "2026-03-26T10:30:00Z", value: 62 },
  { ts: "2026-03-26T10:45:00Z", value: 58 },
];

const STATIC_MEMORY_DATA = [
  { ts: "2026-03-26T08:00:00Z", value: 68 },
  { ts: "2026-03-26T08:15:00Z", value: 67 },
  { ts: "2026-03-26T08:30:00Z", value: 69 },
  { ts: "2026-03-26T08:45:00Z", value: 72 },
  { ts: "2026-03-26T09:00:00Z", value: 74 },
  { ts: "2026-03-26T09:15:00Z", value: 71 },
  { ts: "2026-03-26T09:30:00Z", value: 68 },
  { ts: "2026-03-26T09:45:00Z", value: 66 },
  { ts: "2026-03-26T10:00:00Z", value: 69 },
  { ts: "2026-03-26T10:15:00Z", value: 73 },
  { ts: "2026-03-26T10:30:00Z", value: 75 },
  { ts: "2026-03-26T10:45:00Z", value: 72 },
];

const STATIC_NETWORK_RX = [
  { ts: "2026-03-26T08:00:00Z", value: 125000000 },
  { ts: "2026-03-26T08:15:00Z", value: 142000000 },
  { ts: "2026-03-26T08:30:00Z", value: 138000000 },
  { ts: "2026-03-26T08:45:00Z", value: 155000000 },
  { ts: "2026-03-26T09:00:00Z", value: 168000000 },
  { ts: "2026-03-26T09:15:00Z", value: 152000000 },
  { ts: "2026-03-26T09:30:00Z", value: 145000000 },
  { ts: "2026-03-26T09:45:00Z", value: 138000000 },
  { ts: "2026-03-26T10:00:00Z", value: 148000000 },
  { ts: "2026-03-26T10:15:00Z", value: 162000000 },
  { ts: "2026-03-26T10:30:00Z", value: 175000000 },
  { ts: "2026-03-26T10:45:00Z", value: 158000000 },
];

const STATIC_NETWORK_TX = [
  { ts: "2026-03-26T08:00:00Z", value: 85000000 },
  { ts: "2026-03-26T08:15:00Z", value: 92000000 },
  { ts: "2026-03-26T08:30:00Z", value: 88000000 },
  { ts: "2026-03-26T08:45:00Z", value: 95000000 },
  { ts: "2026-03-26T09:00:00Z", value: 108000000 },
  { ts: "2026-03-26T09:15:00Z", value: 102000000 },
  { ts: "2026-03-26T09:30:00Z", value: 95000000 },
  { ts: "2026-03-26T09:45:00Z", value: 88000000 },
  { ts: "2026-03-26T10:00:00Z", value: 98000000 },
  { ts: "2026-03-26T10:15:00Z", value: 112000000 },
  { ts: "2026-03-26T10:30:00Z", value: 125000000 },
  { ts: "2026-03-26T10:45:00Z", value: 108000000 },
];

export default function HostDetailPage() {
  const params = useParams();
  const hostId = params.id as string;

  const host = useMemo(() => {
    return hosts.find(h => h.id === hostId);
  }, [hostId]);

  if (!host) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Server className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Host Not Found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The host you are looking for does not exist.
            </p>
            <Link href="/hosts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Hosts
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const cpuStatus = (host.current?.cpuUsagePct ?? 0) > 90 ? "critical" : (host.current?.cpuUsagePct ?? 0) > 70 ? "warning" : "healthy";
  const memStatus = (host.current?.memoryUsagePct ?? 0) > 90 ? "critical" : (host.current?.memoryUsagePct ?? 0) > 70 ? "warning" : "healthy";
  const diskStatus = (host.current?.diskUsagePct ?? 0) > 90 ? "critical" : (host.current?.diskUsagePct ?? 0) > 75 ? "warning" : "healthy";

  const cpuChartData = {
    type: "timeseries" as const,
    title: "CPU Usage",
    unit: "percent" as const,
    series: [{ id: "cpu", name: "CPU", points: STATIC_CPU_DATA }],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const memoryChartData = {
    type: "timeseries" as const,
    title: "Memory Usage",
    unit: "percent" as const,
    series: [{ id: "memory", name: "Memory", points: STATIC_MEMORY_DATA }],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const networkChartData = {
    type: "timeseries" as const,
    title: "Network Throughput",
    unit: "bytesPerSec" as const,
    series: [
      { id: "rx", name: "Receive", points: STATIC_NETWORK_RX },
      { id: "tx", name: "Transmit", points: STATIC_NETWORK_TX },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  return (
    <AppShell>
      <CommandBar title={host.hostname} subtitle={host.ipAddress || undefined}>
        <Link href="/hosts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </CommandBar>

      <div className="p-6 space-y-6">
        {/* Host identity */}
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
                <span>{host.ipAddress}</span>
                <span>·</span>
                <span>{host.os}</span>
                <span>·</span>
                <Badge variant="outline" className="capitalize">{host.role}</Badge>
              </div>
            </div>
          </div>
          {host.freshness?.stale && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-stale/10 text-status-stale text-sm">
              <Clock className="h-4 w-4" />
              Data may be stale
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard label="CPU Usage" value={host.current?.cpuUsagePct ?? 0} unit="%" status={cpuStatus} />
          <MetricCard label="Memory Usage" value={host.current?.memoryUsagePct ?? 0} unit="%" status={memStatus} />
          <MetricCard label="Disk Usage" value={host.current?.diskUsagePct ?? 0} unit="%" status={diskStatus} />
          <MetricCard label="Load (1m)" value={host.current?.load1 ?? 0} unit="" />
          <MetricCard label="Network Errors" value={host.current?.networkErrorRate ?? 0} unit="%" />
          <MetricCard label="Uptime" value={(host.current?.uptimeSeconds ?? 0) / 86400} unit=" days" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeSeriesChart data={cpuChartData} height={200} variant="area" />
          <TimeSeriesChart data={memoryChartData} height={200} variant="area" />
        </div>

        <TimeSeriesChart data={networkChartData} height={180} />

        {/* Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Host Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hostname</span>
                <span className="font-medium">{host.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IP Address</span>
                <span className="font-medium font-mono">{host.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instance</span>
                <span className="font-medium font-mono">{host.instance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operating System</span>
                <span className="font-medium">{host.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline" className="capitalize">{host.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">{host.environment}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Cluster Membership</h3>
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
                <span className="text-muted-foreground">Compute Cluster</span>
                {host.serverClusterId ? (
                  <Link href={`/clusters/${host.serverClusterId}`} className="text-primary hover:underline flex items-center gap-1">
                    {host.serverClusterId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Cluster</span>
                {host.storageClusterId ? (
                  <Link href={`/storage/${host.storageClusterId}`} className="text-primary hover:underline flex items-center gap-1">
                    {host.storageClusterId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kubernetes Cluster</span>
                {host.kubernetesClusterId ? (
                  <Link href={`/kubernetes/${host.kubernetesClusterId}`} className="text-primary hover:underline flex items-center gap-1">
                    {host.kubernetesClusterId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connector</span>
                <Link href={`/connectors/${host.connectorId}`} className="text-primary hover:underline flex items-center gap-1">
                  {host.connectorId}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Labels */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Labels</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(host.labels || {}).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}: {value}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
