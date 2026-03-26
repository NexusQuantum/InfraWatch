"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Container, ArrowLeft, AlertTriangle, CheckCircle, Box, Layers, Server } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { kubernetesClusters } from "@/lib/mocks/clusters";
import { hosts } from "@/lib/mocks/hosts";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    healthy: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    critical: "bg-status-critical/10 text-status-critical border-status-critical/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${variants[status] || "bg-muted"}`}>
      {status === "healthy" && <CheckCircle className="h-3.5 w-3.5" />}
      {(status === "warning" || status === "critical") && <AlertTriangle className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

// Static chart data to avoid hydration mismatch
const STATIC_RUNNING_PODS = [
  { ts: "2026-03-26T08:00:00Z", value: 142 },
  { ts: "2026-03-26T08:15:00Z", value: 145 },
  { ts: "2026-03-26T08:30:00Z", value: 148 },
  { ts: "2026-03-26T08:45:00Z", value: 152 },
  { ts: "2026-03-26T09:00:00Z", value: 155 },
  { ts: "2026-03-26T09:15:00Z", value: 151 },
  { ts: "2026-03-26T09:30:00Z", value: 148 },
  { ts: "2026-03-26T09:45:00Z", value: 145 },
  { ts: "2026-03-26T10:00:00Z", value: 149 },
  { ts: "2026-03-26T10:15:00Z", value: 153 },
  { ts: "2026-03-26T10:30:00Z", value: 158 },
  { ts: "2026-03-26T10:45:00Z", value: 154 },
];

const STATIC_UNHEALTHY_PODS = [
  { ts: "2026-03-26T08:00:00Z", value: 3 },
  { ts: "2026-03-26T08:15:00Z", value: 4 },
  { ts: "2026-03-26T08:30:00Z", value: 3 },
  { ts: "2026-03-26T08:45:00Z", value: 5 },
  { ts: "2026-03-26T09:00:00Z", value: 4 },
  { ts: "2026-03-26T09:15:00Z", value: 3 },
  { ts: "2026-03-26T09:30:00Z", value: 2 },
  { ts: "2026-03-26T09:45:00Z", value: 3 },
  { ts: "2026-03-26T10:00:00Z", value: 4 },
  { ts: "2026-03-26T10:15:00Z", value: 5 },
  { ts: "2026-03-26T10:30:00Z", value: 4 },
  { ts: "2026-03-26T10:45:00Z", value: 3 },
];

export default function KubernetesDetailPage() {
  const params = useParams();
  const clusterId = params.id as string;

  const cluster = useMemo(() => kubernetesClusters.find(c => c.id === clusterId), [clusterId]);
  const clusterHosts = useMemo(() => hosts.filter(h => h.kubernetesClusterId === clusterId), [clusterId]);

  if (!cluster) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Container className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Kubernetes Cluster Not Found</h3>
            <Link href="/kubernetes">
              <Button variant="outline" size="sm" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const podChartData = {
    type: "timeseries" as const,
    title: "Pod Count Over Time",
    unit: "count" as const,
    series: [
      { id: "running", name: "Running", points: STATIC_RUNNING_PODS },
      { id: "unhealthy", name: "Unhealthy", status: "warning" as const, points: STATIC_UNHEALTHY_PODS },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
    meta: { stacked: true },
  };

  return (
    <AppShell>
      <CommandBar title={cluster.name} subtitle="Kubernetes Cluster">
        <Link href="/kubernetes">
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
            <Container className="h-6 w-6" />
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
            <div className="text-xs text-muted-foreground">Nodes</div>
            <div className="text-2xl font-semibold">
              {cluster.readyNodeCount}<span className="text-muted-foreground font-normal text-lg">/{cluster.nodeCount}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Pods</div>
            <div className="text-2xl font-semibold">
              {cluster.podCount - cluster.unhealthyPodCount}<span className="text-muted-foreground font-normal text-lg">/{cluster.podCount}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Unhealthy Pods</div>
            <div className={`text-2xl font-semibold ${cluster.unhealthyPodCount > 0 ? "text-status-warning" : ""}`}>
              {cluster.unhealthyPodCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Deployments</div>
            <div className="text-2xl font-semibold">
              {cluster.deploymentCount - cluster.unavailableDeploymentCount}<span className="text-muted-foreground font-normal text-lg">/{cluster.deploymentCount}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Unavailable</div>
            <div className={`text-2xl font-semibold ${cluster.unavailableDeploymentCount > 0 ? "text-status-warning" : ""}`}>
              {cluster.unavailableDeploymentCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Namespaces</div>
            <div className="text-2xl font-semibold">{cluster.namespaceCount}</div>
          </Card>
        </div>

        {/* Charts */}
        <TimeSeriesChart data={podChartData} height={200} variant="area" />

        {/* Nodes */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Cluster Nodes ({clusterHosts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusterHosts.map(host => (
              <Link key={host.id} href={`/hosts/${host.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{host.hostname}</div>
                    <div className="text-xs text-muted-foreground capitalize">{host.role}</div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${
                    host.status === "healthy" ? "bg-status-healthy" :
                    host.status === "warning" ? "bg-status-warning" :
                    "bg-status-critical"
                  }`} />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Related cluster */}
        {cluster.relatedComputeClusterId && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Related Infrastructure</h3>
            <Link href={`/clusters/${cluster.relatedComputeClusterId}`}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors inline-flex">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Compute Cluster: {cluster.relatedComputeClusterId}</span>
              </div>
            </Link>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
