"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, ArrowLeft, AlertTriangle, CheckCircle, Activity, Clock, Cpu, HardDrive } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { applications } from "@/lib/mocks/clusters";

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
const STATIC_REQUESTS = [
  { ts: "2026-03-26T08:00:00Z", value: 85 },
  { ts: "2026-03-26T08:15:00Z", value: 92 },
  { ts: "2026-03-26T08:30:00Z", value: 110 },
  { ts: "2026-03-26T08:45:00Z", value: 125 },
  { ts: "2026-03-26T09:00:00Z", value: 140 },
  { ts: "2026-03-26T09:15:00Z", value: 135 },
  { ts: "2026-03-26T09:30:00Z", value: 118 },
  { ts: "2026-03-26T09:45:00Z", value: 105 },
  { ts: "2026-03-26T10:00:00Z", value: 115 },
  { ts: "2026-03-26T10:15:00Z", value: 128 },
  { ts: "2026-03-26T10:30:00Z", value: 145 },
  { ts: "2026-03-26T10:45:00Z", value: 132 },
];

const STATIC_LATENCY_P50 = [
  { ts: "2026-03-26T08:00:00Z", value: 15 },
  { ts: "2026-03-26T08:15:00Z", value: 18 },
  { ts: "2026-03-26T08:30:00Z", value: 22 },
  { ts: "2026-03-26T08:45:00Z", value: 25 },
  { ts: "2026-03-26T09:00:00Z", value: 28 },
  { ts: "2026-03-26T09:15:00Z", value: 24 },
  { ts: "2026-03-26T09:30:00Z", value: 20 },
  { ts: "2026-03-26T09:45:00Z", value: 17 },
  { ts: "2026-03-26T10:00:00Z", value: 21 },
  { ts: "2026-03-26T10:15:00Z", value: 26 },
  { ts: "2026-03-26T10:30:00Z", value: 30 },
  { ts: "2026-03-26T10:45:00Z", value: 25 },
];

const STATIC_LATENCY_P95 = [
  { ts: "2026-03-26T08:00:00Z", value: 45 },
  { ts: "2026-03-26T08:15:00Z", value: 52 },
  { ts: "2026-03-26T08:30:00Z", value: 58 },
  { ts: "2026-03-26T08:45:00Z", value: 65 },
  { ts: "2026-03-26T09:00:00Z", value: 72 },
  { ts: "2026-03-26T09:15:00Z", value: 68 },
  { ts: "2026-03-26T09:30:00Z", value: 55 },
  { ts: "2026-03-26T09:45:00Z", value: 48 },
  { ts: "2026-03-26T10:00:00Z", value: 58 },
  { ts: "2026-03-26T10:15:00Z", value: 68 },
  { ts: "2026-03-26T10:30:00Z", value: 78 },
  { ts: "2026-03-26T10:45:00Z", value: 65 },
];

const STATIC_ERRORS = [
  { ts: "2026-03-26T08:00:00Z", value: 0.2 },
  { ts: "2026-03-26T08:15:00Z", value: 0.3 },
  { ts: "2026-03-26T08:30:00Z", value: 0.4 },
  { ts: "2026-03-26T08:45:00Z", value: 0.5 },
  { ts: "2026-03-26T09:00:00Z", value: 0.6 },
  { ts: "2026-03-26T09:15:00Z", value: 0.5 },
  { ts: "2026-03-26T09:30:00Z", value: 0.4 },
  { ts: "2026-03-26T09:45:00Z", value: 0.3 },
  { ts: "2026-03-26T10:00:00Z", value: 0.4 },
  { ts: "2026-03-26T10:15:00Z", value: 0.5 },
  { ts: "2026-03-26T10:30:00Z", value: 0.6 },
  { ts: "2026-03-26T10:45:00Z", value: 0.5 },
];

export default function AppDetailPage() {
  const params = useParams();
  const appId = params.id as string;

  const app = useMemo(() => applications.find(a => a.id === appId), [appId]);

  if (!app) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Box className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Application Not Found</h3>
            <Link href="/apps">
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

  const requestChartData = {
    type: "timeseries" as const,
    title: "Request Rate",
    unit: "rate" as const,
    series: [
      { id: "requests", name: "Requests/s", points: STATIC_REQUESTS },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const latencyChartData = {
    type: "timeseries" as const,
    title: "Response Latency",
    unit: "ms" as const,
    series: [
      { id: "p50", name: "P50", points: STATIC_LATENCY_P50 },
      { id: "p95", name: "P95", status: "warning" as const, points: STATIC_LATENCY_P95 },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  const errorChartData = {
    type: "timeseries" as const,
    title: "Error Rate",
    unit: "percent" as const,
    series: [
      { id: "errors", name: "Error %", status: (app.current.errorRatePct || 0) > 1 ? "critical" as const : "healthy" as const, points: STATIC_ERRORS },
    ],
    updatedAt: "2026-03-26T10:45:00Z",
  };

  return (
    <AppShell>
      <CommandBar title={app.name} subtitle="Application">
        <Link href="/apps">
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
            <Box className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold">{app.name}</h1>
              <StatusBadge status={app.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {app.namespace && <Badge variant="outline">{app.namespace}</Badge>}
              <span>{app.site}</span>
              <span>·</span>
              <Badge variant="outline">{app.environment}</Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Instances</div>
            <div className="text-2xl font-semibold">{app.instanceCount}</div>
          </Card>
          {app.current.requestRatePerSec !== undefined && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Request Rate</div>
              <div className="text-2xl font-semibold tabular-nums">{app.current.requestRatePerSec.toFixed(0)}/s</div>
            </Card>
          )}
          {app.current.errorRatePct !== undefined && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Error Rate</div>
              <div className={`text-2xl font-semibold tabular-nums ${app.current.errorRatePct > 1 ? "text-status-warning" : ""}`}>
                {app.current.errorRatePct.toFixed(2)}%
              </div>
            </Card>
          )}
          {app.current.p95LatencyMs !== undefined && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">P95 Latency</div>
              <div className={`text-2xl font-semibold tabular-nums ${app.current.p95LatencyMs > 500 ? "text-status-warning" : ""}`}>
                {app.current.p95LatencyMs}ms
              </div>
            </Card>
          )}
          {app.current.cpuUsagePct !== undefined && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">CPU Usage</div>
              <div className="text-2xl font-semibold tabular-nums">{app.current.cpuUsagePct.toFixed(1)}%</div>
            </Card>
          )}
          {app.current.memoryUsagePct !== undefined && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Memory Usage</div>
              <div className="text-2xl font-semibold tabular-nums">{app.current.memoryUsagePct.toFixed(1)}%</div>
            </Card>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeSeriesChart data={requestChartData} height={180} variant="area" />
          <TimeSeriesChart data={latencyChartData} height={180} />
        </div>

        <TimeSeriesChart data={errorChartData} height={150} variant="area" />

        {/* Related clusters */}
        {app.clusterIds.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Related Clusters</h3>
            <div className="flex flex-wrap gap-2">
              {app.clusterIds.map(clusterId => (
                <Link key={clusterId} href={`/kubernetes/${clusterId}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
                    {clusterId}
                  </Badge>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
