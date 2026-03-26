"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plug,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Container,
  Box,
  Layers,
  RefreshCw,
  Settings,
  Trash2,
  Power,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { connectors } from "@/lib/mocks/connectors";
import { hosts } from "@/lib/mocks/hosts";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; icon: React.ReactNode }> = {
    healthy: { bg: "bg-status-healthy/10 text-status-healthy border-status-healthy/20", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    degraded: { bg: "bg-status-warning/10 text-status-warning border-status-warning/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    down: { bg: "bg-status-critical/10 text-status-critical border-status-critical/20", icon: <XCircle className="h-3.5 w-3.5" /> },
    misconfigured: { bg: "bg-status-stale/10 text-status-stale border-status-stale/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const variant = variants[status] || variants.misconfigured;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${variant.bg}`}>
      {variant.icon}
      {status}
    </span>
  );
}

// Static chart data to avoid hydration mismatch
const STATIC_LATENCY = [
  { ts: "2026-03-26T08:00:00Z", value: 125 },
  { ts: "2026-03-26T08:15:00Z", value: 132 },
  { ts: "2026-03-26T08:30:00Z", value: 145 },
  { ts: "2026-03-26T08:45:00Z", value: 158 },
  { ts: "2026-03-26T09:00:00Z", value: 172 },
  { ts: "2026-03-26T09:15:00Z", value: 165 },
  { ts: "2026-03-26T09:30:00Z", value: 148 },
  { ts: "2026-03-26T09:45:00Z", value: 135 },
  { ts: "2026-03-26T10:00:00Z", value: 142 },
  { ts: "2026-03-26T10:15:00Z", value: 155 },
  { ts: "2026-03-26T10:30:00Z", value: 168 },
  { ts: "2026-03-26T10:45:00Z", value: 152 },
];

export default function ConnectorDetailPage() {
  const params = useParams();
  const connectorId = params.id as string;

  const connector = useMemo(() => connectors.find(c => c.id === connectorId), [connectorId]);
  const connectorHosts = useMemo(() => hosts.filter(h => h.connectorId === connectorId), [connectorId]);

  if (!connector) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Plug className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Connector Not Found</h3>
            <Link href="/connectors">
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

  const latencyChartData = {
    type: "timeseries" as const,
    title: "Response Latency",
    unit: "ms" as const,
    series: [
      { id: "latency", name: "Latency", points: STATIC_LATENCY },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const capabilities = [
    { key: "hostMetrics", label: "Host Metrics", icon: Server, enabled: connector.capabilities.hostMetrics },
    { key: "clusterMetrics", label: "Cluster Metrics", icon: Layers, enabled: connector.capabilities.clusterMetrics },
    { key: "storageMetrics", label: "Storage Metrics", icon: Database, enabled: connector.capabilities.storageMetrics },
    { key: "kubernetesMetrics", label: "Kubernetes Metrics", icon: Container, enabled: connector.capabilities.kubernetesMetrics },
    { key: "appMetrics", label: "Application Metrics", icon: Box, enabled: connector.capabilities.appMetrics },
  ];

  return (
    <AppShell>
      <CommandBar title={connector.name} subtitle="Prometheus Connector">
        <Link href="/connectors">
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
              <Plug className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold">{connector.name}</h1>
                <StatusBadge status={connector.status} />
              </div>
              <div className="text-sm text-muted-foreground font-mono">{connector.baseUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Test Connection
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-4 w-4" />
              Configure
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
              <Power className="h-4 w-4" />
              Disable
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Hosts</div>
            <div className="text-2xl font-semibold">{connector.coverage.hosts}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Clusters</div>
            <div className="text-2xl font-semibold">{connector.coverage.clusters}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Storage Clusters</div>
            <div className="text-2xl font-semibold">{connector.coverage.storageClusters}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">K8s Clusters</div>
            <div className="text-2xl font-semibold">{connector.coverage.kubernetesClusters}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Apps</div>
            <div className="text-2xl font-semibold">{connector.coverage.apps}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Latency</div>
            <div className={`text-2xl font-semibold tabular-nums ${connector.latencyMs > 500 ? "text-status-warning" : ""}`}>
              {connector.latencyMs}ms
            </div>
          </Card>
        </div>

        {/* Latency chart */}
        <TimeSeriesChart data={latencyChartData} height={180} />

        {/* Info panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Connection Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-mono">{connector.baseUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auth Mode</span>
                <Badge variant="outline">{connector.authMode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span>{connector.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site</span>
                <span>{connector.site}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datacenter</span>
                <span>{connector.datacenter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Checked</span>
                <span>{new Date(connector.lastCheckedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enabled</span>
                <span>{connector.enabled ? "Yes" : "No"}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Capabilities</h3>
            <div className="space-y-3">
              {capabilities.map(cap => {
                const Icon = cap.icon;
                return (
                  <div key={cap.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{cap.label}</span>
                    </div>
                    {cap.enabled ? (
                      <CheckCircle className="h-4 w-4 text-status-healthy" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Notes */}
        {connector.notes && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground">{connector.notes}</p>
          </Card>
        )}

        {/* Sample hosts */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Discovered Hosts ({connectorHosts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {connectorHosts.slice(0, 8).map(host => (
              <Link key={host.id} href={`/hosts/${host.id}`}>
                <div className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-accent/5 transition-colors">
                  <span className={`h-2 w-2 rounded-full ${
                    host.status === "healthy" ? "bg-status-healthy" :
                    host.status === "warning" ? "bg-status-warning" :
                    "bg-status-critical"
                  }`} />
                  <span className="text-sm truncate">{host.hostname}</span>
                </div>
              </Link>
            ))}
          </div>
          {connectorHosts.length > 8 && (
            <div className="mt-4 text-center">
              <Link href={`/hosts?connector=${connectorId}`} className="text-sm text-primary hover:underline">
                View all {connectorHosts.length} hosts
              </Link>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
