"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Layers, Server, ArrowLeft, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { computeClusters } from "@/lib/mocks/clusters";
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

// Static chart data to avoid hydration mismatch
const STATIC_CPU_AVG = [
  { ts: "2026-03-26T08:00:00Z", value: 45 },
  { ts: "2026-03-26T08:15:00Z", value: 48 },
  { ts: "2026-03-26T08:30:00Z", value: 52 },
  { ts: "2026-03-26T08:45:00Z", value: 55 },
  { ts: "2026-03-26T09:00:00Z", value: 58 },
  { ts: "2026-03-26T09:15:00Z", value: 54 },
  { ts: "2026-03-26T09:30:00Z", value: 50 },
  { ts: "2026-03-26T09:45:00Z", value: 47 },
  { ts: "2026-03-26T10:00:00Z", value: 51 },
  { ts: "2026-03-26T10:15:00Z", value: 56 },
  { ts: "2026-03-26T10:30:00Z", value: 60 },
  { ts: "2026-03-26T10:45:00Z", value: 55 },
];

const STATIC_CPU_P95 = [
  { ts: "2026-03-26T08:00:00Z", value: 62 },
  { ts: "2026-03-26T08:15:00Z", value: 65 },
  { ts: "2026-03-26T08:30:00Z", value: 70 },
  { ts: "2026-03-26T08:45:00Z", value: 72 },
  { ts: "2026-03-26T09:00:00Z", value: 75 },
  { ts: "2026-03-26T09:15:00Z", value: 71 },
  { ts: "2026-03-26T09:30:00Z", value: 68 },
  { ts: "2026-03-26T09:45:00Z", value: 64 },
  { ts: "2026-03-26T10:00:00Z", value: 68 },
  { ts: "2026-03-26T10:15:00Z", value: 73 },
  { ts: "2026-03-26T10:30:00Z", value: 78 },
  { ts: "2026-03-26T10:45:00Z", value: 72 },
];

export default function ClusterDetailPage() {
  const params = useParams();
  const clusterId = params.id as string;

  const cluster = useMemo(() => computeClusters.find(c => c.id === clusterId), [clusterId]);
  const clusterHosts = useMemo(() => hosts.filter(h => h.serverClusterId === clusterId), [clusterId]);

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

  const cpuChartData = {
    type: "timeseries" as const,
    title: "Cluster CPU Usage",
    unit: "percent" as const,
    series: [
      { id: "avg", name: "Average", points: STATIC_CPU_AVG },
      { id: "p95", name: "P95", status: "warning" as const, points: STATIC_CPU_P95 },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const hotNodesData = {
    type: "ranking" as const,
    title: "Hottest Nodes",
    unit: "percent" as const,
    rows: cluster.hottestNodes.map(n => ({
      id: n.hostId,
      label: n.hostname,
      value: n.cpuUsagePct,
      status: n.cpuUsagePct > 90 ? "critical" as const : n.cpuUsagePct > 75 ? "warning" as const : "healthy" as const,
      href: `/hosts/${n.hostId}`,
    })),
    updatedAt: "2026-03-26T10:45:00Z",
  };

  return (
    <AppShell>
      <CommandBar title={cluster.name} subtitle={`${cluster.nodeCount} nodes`}>
        <Link href="/clusters">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </CommandBar>

      <div className="p-6 space-y-6">
        {/* Header */}
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total Nodes</div>
            <div className="text-2xl font-semibold">{cluster.nodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Healthy</div>
            <div className="text-2xl font-semibold text-status-healthy">{cluster.healthyNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Warning</div>
            <div className="text-2xl font-semibold text-status-warning">{cluster.warningNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Critical</div>
            <div className="text-2xl font-semibold text-status-critical">{cluster.criticalNodeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Avg CPU</div>
            <div className="text-2xl font-semibold tabular-nums">{cluster.avgCpuUsagePct.toFixed(1)}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Avg Memory</div>
            <div className="text-2xl font-semibold tabular-nums">{cluster.avgMemoryUsagePct.toFixed(1)}%</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TimeSeriesChart data={cpuChartData} height={220} variant="area" />
          </div>
          <RankingPanel data={hotNodesData} />
        </div>

        {/* Node list */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Cluster Nodes ({clusterHosts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusterHosts.slice(0, 9).map(host => (
              <Link key={host.id} href={`/hosts/${host.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <span className={`h-2 w-2 rounded-full ${
                    host.status === "healthy" ? "bg-status-healthy" :
                    host.status === "warning" ? "bg-status-warning" :
                    "bg-status-critical"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{host.hostname}</div>
                    <div className="text-xs text-muted-foreground">
                      CPU: {host.current?.cpuUsagePct?.toFixed(0) ?? 0}% · Mem: {host.current?.memoryUsagePct?.toFixed(0) ?? 0}%
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {clusterHosts.length > 9 && (
            <div className="mt-4 text-center">
              <Link href={`/hosts?cluster=${clusterId}`} className="text-sm text-primary hover:underline">
                View all {clusterHosts.length} nodes
              </Link>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
