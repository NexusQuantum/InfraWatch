"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { useApplicationTimeseries, useLiveApplications } from "@/lib/api/live-hooks";

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

export default function AppDetailPage() {
  const params = useParams();
  const appId = params.id as string;
  const {
    applications,
    meta: applicationsMeta,
    isLoading,
    isError: isApplicationsError,
    error: applicationsError,
  } = useLiveApplications();
  const {
    data: timeseries,
    meta: timeseriesMeta,
    isError: isTimeseriesError,
    error: timeseriesError,
  } = useApplicationTimeseries(appId, "1h", "5m");

  const app = useMemo(() => applications.find((a) => a.id === appId), [applications, appId]);
  const diagnostics =
    isApplicationsError ||
    isTimeseriesError ||
    applicationsMeta?.partial ||
    timeseriesMeta?.partial ||
    (applicationsMeta?.errors?.length ?? 0) > 0 ||
    (timeseriesMeta?.errors?.length ?? 0) > 0;

  if (isLoading && !app) {
    return (
      <AppShell>
        <div className="p-6">
          <Card className="p-4 text-sm text-muted-foreground">Loading application details...</Card>
        </div>
      </AppShell>
    );
  }

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

  const now = new Date().toISOString();
  const runningPoints = timeseries?.running.length ? timeseries.running : [{ ts: now, value: app.instanceCount }];
  const unhealthyPoints = timeseries?.unhealthy.length ? timeseries.unhealthy : [{ ts: now, value: 0 }];
  const updatedAt = timeseries?.updatedAt || now;

  const podHealthChartData = {
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
      <CommandBar title={app.name} subtitle="Application Namespace">
        <Link href="/apps">
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
                {applicationsError && <div className="text-muted-foreground">{applicationsError.message}</div>}
                {timeseriesError && <div className="text-muted-foreground">{timeseriesError.message}</div>}
                {applicationsMeta?.errors?.map((msg) => (
                  <div key={`apps-${msg}`} className="text-muted-foreground">{msg}</div>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Instances</div>
            <div className="text-2xl font-semibold">{app.instanceCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Connector</div>
            <div className="text-sm font-medium truncate">{app.connectorIds[0] || "n/a"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Cluster</div>
            <div className="text-sm font-medium truncate">{app.clusterIds[0] || "n/a"}</div>
          </Card>
        </div>

        <TimeSeriesChart data={podHealthChartData} height={220} variant="area" />

        {app.clusterIds.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Related Clusters</h3>
            <div className="flex flex-wrap gap-2">
              {app.clusterIds.map((clusterId) => (
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
