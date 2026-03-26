"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Container, ArrowUpRight, AlertTriangle, Box, Layers } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { kubernetesClusters } from "@/lib/mocks/clusters";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    down: "bg-status-down",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-muted"}`} />;
}

function MetricBox({ label, value, total, status }: { label: string; value: number; total: number; status?: "healthy" | "warning" | "critical" }) {
  const statusColors = {
    healthy: "text-status-healthy",
    warning: "text-status-warning",
    critical: "text-status-critical",
  };

  return (
    <div className="text-center">
      <div className={`text-lg font-semibold tabular-nums ${status ? statusColors[status] : ""}`}>
        {value}<span className="text-muted-foreground font-normal">/{total}</span>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function KubernetesPage() {
  const stats = {
    total: kubernetesClusters.length,
    healthy: kubernetesClusters.filter(c => c.status === "healthy").length,
    totalNodes: kubernetesClusters.reduce((acc, c) => acc + c.nodeCount, 0),
    readyNodes: kubernetesClusters.reduce((acc, c) => acc + c.readyNodeCount, 0),
    totalPods: kubernetesClusters.reduce((acc, c) => acc + c.podCount, 0),
    unhealthyPods: kubernetesClusters.reduce((acc, c) => acc + c.unhealthyPodCount, 0),
  };

  if (kubernetesClusters.length === 0) {
    return (
      <AppShell>
        <CommandBar title="Kubernetes" />
        <div className="p-6">
          <Card className="p-12 text-center">
            <Container className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Kubernetes Clusters</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Kubernetes metrics are not available from any connected Prometheus connector.
              Add a connector with Kubernetes metrics support to see clusters here.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CommandBar
        title="Kubernetes Clusters"
        subtitle={`${stats.total} clusters, ${stats.totalPods} pods`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">K8s Clusters</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">
              {stats.readyNodes}<span className="text-muted-foreground font-normal text-lg">/{stats.totalNodes}</span>
            </div>
            <div className="text-xs text-muted-foreground">Ready Nodes</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">
              {stats.totalPods - stats.unhealthyPods}<span className="text-muted-foreground font-normal text-lg">/{stats.totalPods}</span>
            </div>
            <div className="text-xs text-muted-foreground">Healthy Pods</div>
          </Card>
          <Card className="p-4">
            <div className={`text-2xl font-semibold ${stats.unhealthyPods > 0 ? "text-status-warning" : ""}`}>
              {stats.unhealthyPods}
            </div>
            <div className="text-xs text-muted-foreground">Unhealthy Pods</div>
          </Card>
        </div>

        {/* Cluster cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kubernetesClusters.map(cluster => {
            const podHealth = cluster.unhealthyPodCount > 0 ? "warning" : "healthy";
            const nodeHealth = cluster.readyNodeCount < cluster.nodeCount ? "warning" : "healthy";
            const deployHealth = cluster.unavailableDeploymentCount > 0 ? "warning" : "healthy";

            return (
              <Link key={cluster.id} href={`/kubernetes/${cluster.id}`}>
                <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <StatusDot status={cluster.status} />
                      <span className="font-medium">{cluster.name}</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <MetricBox
                      label="Nodes"
                      value={cluster.readyNodeCount}
                      total={cluster.nodeCount}
                      status={nodeHealth}
                    />
                    <MetricBox
                      label="Pods"
                      value={cluster.podCount - cluster.unhealthyPodCount}
                      total={cluster.podCount}
                      status={podHealth}
                    />
                    <MetricBox
                      label="Deploys"
                      value={cluster.deploymentCount - cluster.unavailableDeploymentCount}
                      total={cluster.deploymentCount}
                      status={deployHealth}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    {cluster.namespaceCount} namespaces
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cluster.site}</span>
                    <Badge variant="outline" className="text-xs">{cluster.environment}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
