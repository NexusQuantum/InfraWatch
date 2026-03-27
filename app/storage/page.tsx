"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, ArrowUpRight, AlertTriangle, HardDrive } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { CapacityBreakdown, CapacityBar } from "@/components/charts/capacity-breakdown";
import { useLiveStorageClusters } from "@/lib/api/live-hooks";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    down: "bg-status-down",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-muted"}`} />;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e15) return `${(bytes / 1e15).toFixed(1)} PB`;
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

export default function StoragePage() {
  const { clusters: storageClusters, meta, isLoading, isError, error } = useLiveStorageClusters();
  const diagnostics = isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;
  const totalCapacity = storageClusters.reduce((acc, c) => acc + c.capacity.totalBytes, 0);
  const totalUsed = storageClusters.reduce((acc, c) => acc + c.capacity.usedBytes, 0);
  const totalFree = storageClusters.reduce((acc, c) => acc + c.capacity.freeBytes, 0);

  const capacityData = {
    type: "capacity-breakdown" as const,
    title: "Total Storage Capacity",
    segments: [
      { label: "Used", value: totalUsed, status: (totalUsed / totalCapacity) > 0.85 ? "warning" as const : undefined },
      { label: "Free", value: totalFree, status: "healthy" as const },
    ],
    unit: "bytes" as const,
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const stats = {
    total: storageClusters.length,
    healthy: storageClusters.filter(c => c.status === "healthy").length,
    warning: storageClusters.filter(c => c.status === "warning").length,
    degradedComponents: storageClusters.reduce((acc, c) => acc + c.degradedComponentsCount, 0),
  };

  if (storageClusters.length === 0) {
    return (
      <AppShell>
        <CommandBar title="Storage" />
        <div className="p-6">
          {diagnostics && (
            <Card className="p-4 mb-4 border-status-warning/40">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Data Source Diagnostics</div>
                  {error && <div className="text-muted-foreground">{error.message}</div>}
                  {meta?.errors?.map((msg) => (
                    <div key={msg} className="text-muted-foreground">{msg}</div>
                  ))}
                  {meta?.failedConnectors?.length ? (
                    <div className="text-muted-foreground">
                      Failed connectors: {meta.failedConnectors.join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          )}
          <Card className="p-12 text-center">
            <Database className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Storage Clusters</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Storage metrics are not available from any connected Prometheus connector.
              Add a connector with storage metrics support to see storage clusters here.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CommandBar
        title="Storage Clusters"
        subtitle={`${stats.total} clusters, ${formatBytes(totalCapacity)} total`}
      />

      <div className="p-6 space-y-6">
        {isLoading && (
          <Card className="p-4 text-sm text-muted-foreground">Loading storage clusters...</Card>
        )}
        {diagnostics && (
          <Card className="p-4 border-status-warning/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {error && <div className="text-muted-foreground">{error.message}</div>}
                {meta?.errors?.map((msg) => (
                  <div key={msg} className="text-muted-foreground">{msg}</div>
                ))}
                {meta?.failedConnectors?.length ? (
                  <div className="text-muted-foreground">
                    Failed connectors: {meta.failedConnectors.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        )}
        {/* Stats */}
        {(() => {
          const totalVolumes = storageClusters.reduce((acc, c) => acc + (c.volumeSummary?.total ?? 0), 0);
          const healthyVolumes = storageClusters.reduce((acc, c) => acc + (c.volumeSummary?.healthy ?? 0), 0);
          const degradedVolumes = storageClusters.reduce((acc, c) => acc + (c.volumeSummary?.degraded ?? 0), 0);
          const faultedVolumes = storageClusters.reduce((acc, c) => acc + (c.volumeSummary?.faulted ?? 0), 0);
          const totalScheduled = storageClusters.reduce((acc, c) => acc + (c.scheduledBytes ?? 0), 0);
          const avgOvercommit = totalCapacity > 0 ? (totalScheduled / totalCapacity) * 100 : 0;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-semibold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Storage Clusters</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-semibold">{formatBytes(totalUsed)}</div>
                <div className="text-xs text-muted-foreground">Used Storage</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-semibold">{formatBytes(totalFree)}</div>
                <div className="text-xs text-muted-foreground">Free Storage</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-semibold">{totalVolumes}</div>
                <div className="text-xs text-muted-foreground">
                  Volumes ({healthyVolumes} healthy{degradedVolumes > 0 ? `, ${degradedVolumes} degraded` : ""}{faultedVolumes > 0 ? `, ${faultedVolumes} faulted` : ""})
                </div>
              </Card>
              <Card className="p-4">
                <div className={`text-2xl font-semibold ${avgOvercommit > 100 ? "text-status-warning" : ""}`}>
                  {avgOvercommit.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Scheduled / Capacity</div>
              </Card>
              <Card className="p-4">
                <div className={`text-2xl font-semibold ${stats.degradedComponents > 0 ? "text-status-warning" : ""}`}>
                  {stats.degradedComponents}
                </div>
                <div className="text-xs text-muted-foreground">Degraded Components</div>
              </Card>
            </div>
          );
        })()}

        {/* Capacity overview */}
        <CapacityBreakdown data={capacityData} />

        {/* Storage clusters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storageClusters.map(cluster => (
            <Link key={cluster.id} href={`/storage/${cluster.id}`}>
              <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StatusDot status={cluster.status} />
                    <span className="font-medium">{cluster.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cluster.degradedComponentsCount > 0 && (
                      <Badge variant="outline" className="text-status-warning border-status-warning/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {cluster.degradedComponentsCount} degraded
                      </Badge>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="mb-4">
                  <CapacityBar
                    used={cluster.capacity.usedBytes}
                    total={cluster.capacity.totalBytes}
                    label="Capacity"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Read Throughput</div>
                    <div className="font-medium tabular-nums">{formatBytes(cluster.throughput.readBytesPerSec)}/s</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Write Throughput</div>
                    <div className="font-medium tabular-nums">{formatBytes(cluster.throughput.writeBytesPerSec)}/s</div>
                  </div>
                </div>

                {cluster.volumeSummary && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Volumes:</span>
                      <span className="text-status-healthy">{cluster.volumeSummary.healthy} healthy</span>
                      {cluster.volumeSummary.degraded > 0 && (
                        <span className="text-status-warning">{cluster.volumeSummary.degraded} degraded</span>
                      )}
                      {cluster.volumeSummary.faulted > 0 && (
                        <span className="text-status-critical">{cluster.volumeSummary.faulted} faulted</span>
                      )}
                    </div>
                    {cluster.overcommitPct != null && (
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span className="text-muted-foreground">Overcommit:</span>
                        <span className={cluster.overcommitPct > 100 ? "text-status-warning font-medium" : ""}>
                          {cluster.overcommitPct.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cluster.nodeCount} nodes</span>
                  <span>{cluster.site}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
