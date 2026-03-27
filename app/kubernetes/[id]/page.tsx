"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container, ArrowLeft, AlertTriangle, CheckCircle, Layers, Server } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { useKubernetesClusterTimeseries, useLiveKubernetesClusters, useLiveHosts } from "@/lib/api/live-hooks";

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

export default function KubernetesDetailPage() {
  const params = useParams();
  const clusterId = params.id as string;
  const { clusters, meta: clustersMeta, isLoading, isError: isClustersError, error: clustersError } = useLiveKubernetesClusters();
  const { hosts } = useLiveHosts();
  const { data: timeseries, meta: timeseriesMeta, isError: isTimeseriesError, error: timeseriesError } =
    useKubernetesClusterTimeseries(clusterId, "1h", "5m");

  const cluster = useMemo(() => clusters.find((c) => c.id === clusterId), [clusters, clusterId]);
  const diagnostics =
    isClustersError ||
    isTimeseriesError ||
    clustersMeta?.partial ||
    timeseriesMeta?.partial ||
    (clustersMeta?.errors?.length ?? 0) > 0 ||
    (timeseriesMeta?.errors?.length ?? 0) > 0;
  const clusterHosts = useMemo(() => {
    if (!cluster) return [];
    return hosts.filter((h) => cluster.connectorIds.includes(h.connectorId));
  }, [cluster, hosts]);

  if (isLoading && !cluster) {
    return (
      <AppShell>
        <div className="p-6">
          <Card className="p-4 text-sm text-muted-foreground">Loading Kubernetes cluster details...</Card>
        </div>
      </AppShell>
    );
  }

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

  const now = new Date().toISOString();
  const runningPoints = timeseries?.running.length
    ? timeseries.running
    : [{ ts: now, value: Math.max(0, cluster.podCount - cluster.unhealthyPodCount) }];
  const unhealthyPoints = timeseries?.unhealthy.length
    ? timeseries.unhealthy
    : [{ ts: now, value: cluster.unhealthyPodCount }];
  const updatedAt = timeseries?.updatedAt || now;

  const podChartData = {
    type: "timeseries" as const,
    title: "Pod Health",
    unit: "count" as const,
    series: [
      { id: "running", name: "Running", points: runningPoints },
      { id: "unhealthy", name: "Unhealthy", status: "warning" as const, points: unhealthyPoints },
    ],
    updatedAt,
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
        {diagnostics && (
          <Card className="p-4 border-status-warning/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {clustersError && <div className="text-muted-foreground">{clustersError.message}</div>}
                {timeseriesError && <div className="text-muted-foreground">{timeseriesError.message}</div>}
                {clustersMeta?.errors?.map((msg) => (
                  <div key={`clusters-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
                {timeseriesMeta?.errors?.map((msg) => (
                  <div key={`ts-${msg}`} className="text-muted-foreground">{msg}</div>
                ))}
              </div>
            </div>
          </Card>
        )}
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

        <TimeSeriesChart data={podChartData} height={200} variant="area" />

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Cluster Nodes ({clusterHosts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusterHosts.map((host) => (
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
