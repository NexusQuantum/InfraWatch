"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, ArrowLeft, AlertTriangle, CheckCircle, HardDrive } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { CapacityBreakdown, CapacityBar } from "@/components/charts/capacity-breakdown";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { storageClusters } from "@/lib/mocks/clusters";
import { hosts } from "@/lib/mocks/hosts";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    healthy: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    critical: "bg-status-critical/10 text-status-critical border-status-critical/20",
    down: "bg-status-down/10 text-status-down border-status-down/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${variants[status] || "bg-muted"}`}>
      {status === "healthy" && <CheckCircle className="h-3.5 w-3.5" />}
      {(status === "warning" || status === "critical") && <AlertTriangle className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e15) return `${(bytes / 1e15).toFixed(1)} PB`;
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

// Static chart data to avoid hydration mismatch
const STATIC_READ_THROUGHPUT = [
  { ts: "2026-03-26T08:00:00Z", value: 850000000 },
  { ts: "2026-03-26T08:15:00Z", value: 920000000 },
  { ts: "2026-03-26T08:30:00Z", value: 880000000 },
  { ts: "2026-03-26T08:45:00Z", value: 950000000 },
  { ts: "2026-03-26T09:00:00Z", value: 1020000000 },
  { ts: "2026-03-26T09:15:00Z", value: 980000000 },
  { ts: "2026-03-26T09:30:00Z", value: 910000000 },
  { ts: "2026-03-26T09:45:00Z", value: 870000000 },
  { ts: "2026-03-26T10:00:00Z", value: 940000000 },
  { ts: "2026-03-26T10:15:00Z", value: 1010000000 },
  { ts: "2026-03-26T10:30:00Z", value: 1080000000 },
  { ts: "2026-03-26T10:45:00Z", value: 990000000 },
];

const STATIC_WRITE_THROUGHPUT = [
  { ts: "2026-03-26T08:00:00Z", value: 420000000 },
  { ts: "2026-03-26T08:15:00Z", value: 480000000 },
  { ts: "2026-03-26T08:30:00Z", value: 450000000 },
  { ts: "2026-03-26T08:45:00Z", value: 510000000 },
  { ts: "2026-03-26T09:00:00Z", value: 560000000 },
  { ts: "2026-03-26T09:15:00Z", value: 520000000 },
  { ts: "2026-03-26T09:30:00Z", value: 480000000 },
  { ts: "2026-03-26T09:45:00Z", value: 440000000 },
  { ts: "2026-03-26T10:00:00Z", value: 490000000 },
  { ts: "2026-03-26T10:15:00Z", value: 540000000 },
  { ts: "2026-03-26T10:30:00Z", value: 590000000 },
  { ts: "2026-03-26T10:45:00Z", value: 520000000 },
];

export default function StorageDetailPage() {
  const params = useParams();
  const storageId = params.id as string;

  const cluster = useMemo(() => storageClusters.find(c => c.id === storageId), [storageId]);
  const storageHosts = useMemo(() => hosts.filter(h => h.storageClusterId === storageId), [storageId]);

  if (!cluster) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Database className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Storage Cluster Not Found</h3>
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

  const capacityData = {
    type: "capacity-breakdown" as const,
    title: "Cluster Capacity",
    segments: [
      { label: "Used", value: cluster.capacity.usedBytes },
      { label: "Free", value: cluster.capacity.freeBytes, status: "healthy" as const },
    ],
    unit: "bytes" as const,
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const throughputChartData = {
    type: "timeseries" as const,
    title: "Storage Throughput",
    unit: "bytesPerSec" as const,
    series: [
      { id: "read", name: "Read", points: STATIC_READ_THROUGHPUT },
      { id: "write", name: "Write", points: STATIC_WRITE_THROUGHPUT },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const hotNodesData = {
    type: "ranking" as const,
    title: "Hottest Storage Nodes",
    unit: "percent" as const,
    rows: cluster.hottestNodes.map(n => ({
      id: n.hostId,
      label: n.hostname,
      value: n.diskUsagePct,
      status: n.diskUsagePct > 90 ? "critical" as const : n.diskUsagePct > 75 ? "warning" as const : "healthy" as const,
      href: `/hosts/${n.hostId}`,
    })),
    updatedAt: "2026-03-26T10:45:00Z",
  };

  return (
    <AppShell>
      <CommandBar title={cluster.name} subtitle={`${cluster.nodeCount} storage nodes`}>
        <Link href="/storage">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </CommandBar>

      <div className="p-6 space-y-6">
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
            <Badge variant="outline" className="text-status-warning border-status-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {cluster.degradedComponentsCount} degraded components
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total Capacity</div>
            <div className="text-2xl font-semibold">{formatBytes(cluster.capacity.totalBytes)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Used</div>
            <div className="text-2xl font-semibold">{formatBytes(cluster.capacity.usedBytes)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Used %</div>
            <div className={`text-2xl font-semibold ${cluster.capacity.usedPct > 85 ? "text-status-warning" : ""}`}>
              {cluster.capacity.usedPct.toFixed(1)}%
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Nodes</div>
            <div className="text-2xl font-semibold">{cluster.nodeCount}</div>
          </Card>
        </div>

        {/* Capacity and throughput */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CapacityBreakdown data={capacityData} />
          <TimeSeriesChart data={throughputChartData} height={200} />
        </div>

        {/* Hot nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">Storage Nodes</h3>
              <div className="space-y-3">
                {storageHosts.map(host => (
                  <Link key={host.id} href={`/hosts/${host.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                      <HardDrive className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{host.hostname}</div>
                        <div className="text-xs text-muted-foreground">{host.ipAddress}</div>
                      </div>
                      <div className="w-32">
                        <CapacityBar
                          used={host.current?.diskUsagePct ?? 0}
                          total={100}
                          showValues={false}
                        />
                      </div>
                      <span className="text-sm tabular-nums w-12 text-right">
                        {host.current?.diskUsagePct?.toFixed(0) ?? 0}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
          <RankingPanel data={hotNodesData} />
        </div>
      </div>
    </AppShell>
  );
}
