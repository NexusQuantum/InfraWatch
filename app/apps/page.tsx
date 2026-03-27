"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, ArrowUpRight, Activity, AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { useLiveApplications } from "@/lib/api/live-hooks";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    down: "bg-status-down",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-muted"}`} />;
}

export default function AppsPage() {
  const { applications, meta, isLoading, isError, error } = useLiveApplications();
  const diagnostics = isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;

  const stats = {
    total: applications.length,
    healthy: applications.filter(a => a.status === "healthy").length,
    warning: applications.filter(a => a.status === "warning").length,
    critical: applications.filter(a => a.status === "critical" || a.status === "down").length,
  };

  if (applications.length === 0) {
    return (
      <AppShell>
        <CommandBar title="Applications" />
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
            <Box className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Applications</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Application metrics are not available from any connected Prometheus connector.
              Add a connector with application metrics support to see apps here.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CommandBar
        title="Applications"
        subtitle={`${stats.total} applications monitored`}
      />

      <div className="p-6 space-y-6">
        {isLoading && (
          <Card className="p-4 text-sm text-muted-foreground">Loading applications...</Card>
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
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Apps</div>
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
            <div className="text-2xl font-semibold text-status-critical">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </Card>
        </div>

        {/* App cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map(app => (
            <Link key={app.id} href={`/apps/${app.id}`}>
              <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={app.status} />
                    <span className="font-medium">{app.name}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>

                {app.namespace && (
                  <Badge variant="outline" className="text-xs mb-3">
                    {app.namespace}
                  </Badge>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  {app.current.requestRatePerSec !== undefined && (
                    <div>
                      <div className="text-muted-foreground">Requests</div>
                      <div className="font-medium tabular-nums">{app.current.requestRatePerSec.toFixed(0)}/s</div>
                    </div>
                  )}
                  {app.current.errorRatePct !== undefined && (
                    <div>
                      <div className="text-muted-foreground">Error Rate</div>
                      <div className={`font-medium tabular-nums ${app.current.errorRatePct > 1 ? "text-status-warning" : ""}`}>
                        {app.current.errorRatePct.toFixed(2)}%
                      </div>
                    </div>
                  )}
                  {app.current.p95LatencyMs !== undefined && (
                    <div>
                      <div className="text-muted-foreground">P95 Latency</div>
                      <div className={`font-medium tabular-nums ${app.current.p95LatencyMs > 500 ? "text-status-warning" : ""}`}>
                        {app.current.p95LatencyMs}ms
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  {app.instanceCount} instances
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{app.site}</span>
                  <Badge variant="outline" className="text-xs">{app.environment}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
