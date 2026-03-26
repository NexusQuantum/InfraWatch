"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Server, ArrowUpRight, AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { HealthMatrix } from "@/components/charts/health-matrix";
import { computeClusters } from "@/lib/mocks/clusters";

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

export default function ClustersPage() {
  const healthMatrixData = {
    type: "health-matrix" as const,
    title: "Cluster Resource Matrix",
    xAxis: ["CPU", "Memory", "Disk"],
    yAxis: computeClusters.map(c => c.name),
    cells: computeClusters.flatMap(cluster => [
      { x: "CPU", y: cluster.name, status: cluster.avgCpuUsagePct > 80 ? "critical" as const : cluster.avgCpuUsagePct > 60 ? "warning" as const : "healthy" as const, value: cluster.avgCpuUsagePct },
      { x: "Memory", y: cluster.name, status: cluster.avgMemoryUsagePct > 85 ? "critical" as const : cluster.avgMemoryUsagePct > 70 ? "warning" as const : "healthy" as const, value: cluster.avgMemoryUsagePct },
      { x: "Disk", y: cluster.name, status: cluster.avgDiskUsagePct > 90 ? "critical" as const : cluster.avgDiskUsagePct > 75 ? "warning" as const : "healthy" as const, value: cluster.avgDiskUsagePct },
    ]),
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const stats = {
    total: computeClusters.length,
    healthy: computeClusters.filter(c => c.status === "healthy").length,
    warning: computeClusters.filter(c => c.status === "warning").length,
    critical: computeClusters.filter(c => c.status === "critical" || c.status === "down").length,
    totalNodes: computeClusters.reduce((acc, c) => acc + c.nodeCount, 0),
  };

  return (
    <AppShell>
      <CommandBar
        title="Compute Clusters"
        subtitle={`${stats.total} clusters, ${stats.totalNodes} nodes`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Clusters</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-healthy">{stats.healthy}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.warning}</div>
            <div className="text-xs text-muted-foreground">Warning</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.totalNodes}</div>
            <div className="text-xs text-muted-foreground">Total Nodes</div>
          </Card>
        </div>

        {/* Health matrix */}
        <HealthMatrix data={healthMatrixData} />

        {/* Cluster cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {computeClusters.map(cluster => (
            <Link key={cluster.id} href={`/clusters/${cluster.id}`}>
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

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cluster.site}</span>
                  <span>{cluster.environment}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
