"use client";

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
  Plug,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Container,
  Box,
  Layers,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { connectors } from "@/lib/mocks/connectors";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; icon: React.ReactNode }> = {
    healthy: { bg: "bg-status-healthy/10 text-status-healthy border-status-healthy/20", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    degraded: { bg: "bg-status-warning/10 text-status-warning border-status-warning/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    down: { bg: "bg-status-critical/10 text-status-critical border-status-critical/20", icon: <XCircle className="h-3.5 w-3.5" /> },
    misconfigured: { bg: "bg-status-stale/10 text-status-stale border-status-stale/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const variant = variants[status] || variants.misconfigured;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${variant.bg}`}>
      {variant.icon}
      {status}
    </span>
  );
}

function CapabilityBadge({ capability, enabled }: { capability: string; enabled: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    hostMetrics: <Server className="h-3 w-3" />,
    clusterMetrics: <Layers className="h-3 w-3" />,
    storageMetrics: <Database className="h-3 w-3" />,
    kubernetesMetrics: <Container className="h-3 w-3" />,
    appMetrics: <Box className="h-3 w-3" />,
  };

  const labels: Record<string, string> = {
    hostMetrics: "Hosts",
    clusterMetrics: "Clusters",
    storageMetrics: "Storage",
    kubernetesMetrics: "K8s",
    appMetrics: "Apps",
  };

  if (!enabled) return null;

  return (
    <Badge variant="outline" className="text-xs gap-1">
      {icons[capability]}
      {labels[capability]}
    </Badge>
  );
}

export default function ConnectorsPage() {
  const stats = {
    total: connectors.length,
    healthy: connectors.filter(c => c.status === "healthy").length,
    degraded: connectors.filter(c => c.status === "degraded").length,
    down: connectors.filter(c => c.status === "down" || c.status === "misconfigured").length,
  };

  return (
    <AppShell>
      <CommandBar
        title="Connectors"
        subtitle={`${stats.total} Prometheus connectors`}
      >
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Connector
        </Button>
      </CommandBar>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Connectors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-healthy">{stats.healthy}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.degraded}</div>
            <div className="text-xs text-muted-foreground">Degraded</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-critical">{stats.down}</div>
            <div className="text-xs text-muted-foreground">Down</div>
          </Card>
        </div>

        {/* Connectors table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Site / Datacenter</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connectors.map(connector => (
                <TableRow key={connector.id} className="group">
                  <TableCell>
                    <div>
                      <div className="font-medium">{connector.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{connector.baseUrl}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={connector.status} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{connector.site}</div>
                    <div className="text-xs text-muted-foreground">{connector.datacenter}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(connector.capabilities).map(([key, enabled]) => (
                        <CapabilityBadge key={key} capability={key} enabled={enabled} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm tabular-nums">
                      {connector.coverage.hosts} hosts
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {connector.coverage.clusters} clusters
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm tabular-nums ${connector.latencyMs > 500 ? "text-status-warning" : ""}`}>
                      {connector.latencyMs}ms
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/connectors/${connector.id}`}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}
