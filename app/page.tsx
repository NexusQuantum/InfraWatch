"use client";

// Infrastructure Dashboard - Cache bust: 2026-03-26T10:30:00Z
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Cpu,
  HardDrive,
  Network,
  Container,
  Box,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

// Layout components
import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";

// Chart components
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HealthMatrix } from "@/components/charts/health-matrix";
import { CapacityBreakdown, CapacityBar } from "@/components/charts/capacity-breakdown";
import { RankingPanel } from "@/components/charts/ranking-panel";

// Mock data - direct imports
import { hosts } from "@/lib/mocks/hosts";
import { connectors } from "@/lib/mocks/connectors";
import { computeClusters, storageClusters, kubernetesClusters } from "@/lib/mocks/clusters";
import { scenarioConfigs } from "@/lib/mocks/scenarios";

// ============================================================================
// INLINE TYPES AND DATA FOR CACHE STABILITY
// ============================================================================

type ScenarioId = "healthy" | "degraded" | "down" | "stale" | "partial-data" | "empty-capability";

interface ScenarioOption {
  id: ScenarioId;
  name: string;
  description: string;
}

const SCENARIOS: ScenarioOption[] = [
  { id: "healthy", name: "All Healthy", description: "All systems operational" },
  { id: "degraded", name: "Degraded", description: "Some connectors have issues" },
  { id: "down", name: "Critical", description: "Primary connector is down" },
  { id: "stale", name: "Stale Data", description: "Data is stale" },
  { id: "partial-data", name: "Partial Data", description: "Incomplete data" },
  { id: "empty-capability", name: "Empty Capability", description: "No optional capabilities" },
];

// Status indicator component
function StatusDot({ status, size = "sm" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const colorClasses: Record<string, string> = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    down: "bg-status-down",
    unknown: "bg-status-unknown",
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${colorClasses[status] || colorClasses.unknown}`}
    />
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function Page() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("healthy");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get scenario config
  const config = scenarioConfigs[selectedScenario] || scenarioConfigs.healthy;

  // Calculate scenario-adjusted data
  const scenarioData = useMemo(() => {
    // Adjust hosts based on scenario
    const adjustedHosts = hosts.map((host, i) => {
      if (selectedScenario === "down") {
        return { ...host, status: "unknown" as const };
      }
      if (selectedScenario === "stale") {
        return { ...host, freshness: { ...host.freshness, stale: true } };
      }
      if (selectedScenario === "degraded" || selectedScenario === "partial-data") {
        return i % 3 === 0 ? { ...host, status: "warning" as const } : host;
      }
      return host;
    });

    // Adjust connectors based on scenario
    const adjustedConnectors = connectors.map((connector) => ({
      ...connector,
      status: config.connectorStatuses?.[connector.id] || connector.status,
    }));

    return {
      hosts: adjustedHosts,
      connectors: adjustedConnectors,
      computeClusters,
      storageClusters: config.capabilities?.storage ? storageClusters : [],
      kubernetesClusters: config.capabilities?.kubernetes ? kubernetesClusters : [],
    };
  }, [selectedScenario, config]);

  // Calculate stats
  const stats = useMemo(() => {
    const hostsHealthy = scenarioData.hosts.filter((h) => h.status === "healthy").length;
    const hostsWarning = scenarioData.hosts.filter((h) => h.status === "warning").length;
    const hostsCritical = scenarioData.hosts.filter((h) => h.status === "critical" || h.status === "down" || h.status === "unknown").length;

    const connectorsHealthy = scenarioData.connectors.filter((c) => c.status === "healthy").length;
    const connectorsDown = scenarioData.connectors.filter((c) => c.status === "down").length;

    const avgCpu = scenarioData.hosts.reduce((acc, h) => acc + (h.current?.cpuUsagePct ?? 0), 0) / scenarioData.hosts.length;
    const avgMem = scenarioData.hosts.reduce((acc, h) => acc + (h.current?.memoryUsagePct ?? 0), 0) / scenarioData.hosts.length;
    const avgDisk = scenarioData.hosts.reduce((acc, h) => acc + (h.current?.diskUsagePct ?? 0), 0) / scenarioData.hosts.length;

    return {
      totalHosts: scenarioData.hosts.length,
      hostsHealthy,
      hostsWarning,
      hostsCritical,
      totalConnectors: scenarioData.connectors.length,
      connectorsHealthy,
      connectorsDown,
      totalClusters: scenarioData.computeClusters.length + scenarioData.storageClusters.length + scenarioData.kubernetesClusters.length,
      avgCpu,
      avgMem,
      avgDisk,
      alerts: hostsCritical + connectorsDown,
    };
  }, [scenarioData]);

  // Top hosts by CPU
  const topHostsByCpu = useMemo(() => {
    return [...scenarioData.hosts]
      .sort((a, b) => (b.current?.cpuUsagePct ?? 0) - (a.current?.cpuUsagePct ?? 0))
      .slice(0, 5)
      .map((h) => ({
        id: h.id,
        name: h.hostname,
        value: h.current?.cpuUsagePct ?? 0,
        status: h.status,
      }));
  }, [scenarioData.hosts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Infrastructure Overview</h1>
              <p className="text-sm text-muted-foreground">Datacenter observability dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedScenario} onValueChange={(v) => setSelectedScenario(v as ScenarioId)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.totalHosts}</span>
              <span className="text-muted-foreground">Hosts</span>
              {stats.hostsCritical > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.hostsCritical} critical</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.totalConnectors}</span>
              <span className="text-muted-foreground">Connectors</span>
              {stats.connectorsDown > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.connectorsDown} down</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.totalClusters}</span>
              <span className="text-muted-foreground">Clusters</span>
            </div>
            {stats.alerts > 0 && (
              <div className="flex items-center gap-2 text-status-critical">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{stats.alerts} Alerts</span>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="p-6 space-y-6">
          {/* Scenario banner */}
          {selectedScenario !== "healthy" && (
            <div className="rounded-lg bg-status-warning/10 border border-status-warning/30 px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-status-warning" />
              <div>
                <span className="font-medium">Demo Mode: </span>
                <span className="text-muted-foreground">
                  {SCENARIOS.find((s) => s.id === selectedScenario)?.description}
                </span>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Hosts</p>
                  <p className="text-2xl font-semibold mt-1">{stats.totalHosts}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Server className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-status-healthy">{stats.hostsHealthy} healthy</span>
                {stats.hostsWarning > 0 && <span className="text-status-warning">{stats.hostsWarning} warning</span>}
                {stats.hostsCritical > 0 && <span className="text-status-critical">{stats.hostsCritical} critical</span>}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Connectors</p>
                  <p className="text-2xl font-semibold mt-1">{stats.totalConnectors}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Network className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-status-healthy">{stats.connectorsHealthy} healthy</span>
                {stats.connectorsDown > 0 && <span className="text-status-critical">{stats.connectorsDown} down</span>}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Clusters</p>
                  <p className="text-2xl font-semibold mt-1">{stats.totalClusters}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                {scenarioData.computeClusters.length} compute, {scenarioData.storageClusters.length} storage, {scenarioData.kubernetesClusters.length} k8s
              </div>
            </Card>

            <Card className={`p-4 ${stats.alerts > 0 ? "border-status-critical/30" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active Alerts</p>
                  <p className={`text-2xl font-semibold mt-1 ${stats.alerts > 0 ? "text-status-critical" : ""}`}>
                    {stats.alerts}
                  </p>
                </div>
                <div className={`p-2 rounded-md ${stats.alerts > 0 ? "bg-status-critical/10" : "bg-muted"}`}>
                  <AlertTriangle className={`h-4 w-4 ${stats.alerts > 0 ? "text-status-critical" : "text-muted-foreground"}`} />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {stats.alerts === 0 ? "No active alerts" : "Requires attention"}
              </div>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resource utilization */}
            <Card className="col-span-2 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Resource Utilization</h3>
                <Badge variant="outline">Last 24h</Badge>
              </div>
              <TimeSeriesChart
                title=""
                data={[
                  // Static CPU data points (avoids hydration mismatch)
                  { timestamp: "2026-03-26T00:00:00Z", value: 42, series: "CPU" },
                  { timestamp: "2026-03-26T01:00:00Z", value: 38, series: "CPU" },
                  { timestamp: "2026-03-26T02:00:00Z", value: 35, series: "CPU" },
                  { timestamp: "2026-03-26T03:00:00Z", value: 32, series: "CPU" },
                  { timestamp: "2026-03-26T04:00:00Z", value: 30, series: "CPU" },
                  { timestamp: "2026-03-26T05:00:00Z", value: 33, series: "CPU" },
                  { timestamp: "2026-03-26T06:00:00Z", value: 45, series: "CPU" },
                  { timestamp: "2026-03-26T07:00:00Z", value: 58, series: "CPU" },
                  { timestamp: "2026-03-26T08:00:00Z", value: 65, series: "CPU" },
                  { timestamp: "2026-03-26T09:00:00Z", value: 52, series: "CPU" },
                  { timestamp: "2026-03-26T10:00:00Z", value: 48, series: "CPU" },
                  { timestamp: "2026-03-26T11:00:00Z", value: 55, series: "CPU" },
                  // Static Memory data points
                  { timestamp: "2026-03-26T00:00:00Z", value: 68, series: "Memory" },
                  { timestamp: "2026-03-26T01:00:00Z", value: 65, series: "Memory" },
                  { timestamp: "2026-03-26T02:00:00Z", value: 62, series: "Memory" },
                  { timestamp: "2026-03-26T03:00:00Z", value: 60, series: "Memory" },
                  { timestamp: "2026-03-26T04:00:00Z", value: 58, series: "Memory" },
                  { timestamp: "2026-03-26T05:00:00Z", value: 60, series: "Memory" },
                  { timestamp: "2026-03-26T06:00:00Z", value: 65, series: "Memory" },
                  { timestamp: "2026-03-26T07:00:00Z", value: 72, series: "Memory" },
                  { timestamp: "2026-03-26T08:00:00Z", value: 78, series: "Memory" },
                  { timestamp: "2026-03-26T09:00:00Z", value: 70, series: "Memory" },
                  { timestamp: "2026-03-26T10:00:00Z", value: 68, series: "Memory" },
                  { timestamp: "2026-03-26T11:00:00Z", value: 71, series: "Memory" },
                ]}
                series={["CPU", "Memory"]}
                height={200}
              />
            </Card>

            {/* Top hosts by CPU */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Top Hosts by CPU</h3>
                <Link href="/hosts" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <RankingPanel
                items={topHostsByCpu}
                maxValue={100}
                unit="%"
                colorByStatus
              />
            </Card>
          </div>

          {/* Hosts table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Hosts</h3>
              <Link href="/hosts" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {scenarioData.hosts.slice(0, 6).map((host) => (
                <div key={host.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted/50">
                  <StatusDot status={host.status} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/hosts/${host.id}`} className="font-medium truncate hover:underline">
                        {host.hostname}
                      </Link>
                      {host.freshness?.stale && (
                        <Badge variant="outline" className="text-status-stale border-status-stale/50">
                          <Clock className="h-3 w-3 mr-1" />
                          Stale
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{host.ipAddress} &middot; {host.datacenter}</div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">CPU</span>
                        <span className="tabular-nums">{(host.current?.cpuUsagePct ?? 0).toFixed(0)}%</span>
                      </div>
                      <Progress value={host.current?.cpuUsagePct ?? 0} className="h-1" />
                    </div>
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Mem</span>
                        <span className="tabular-nums">{(host.current?.memoryUsagePct ?? 0).toFixed(0)}%</span>
                      </div>
                      <Progress value={host.current?.memoryUsagePct ?? 0} className="h-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Capability sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storage section - conditional */}
            {scenarioData.storageClusters.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Storage Clusters</h3>
                  </div>
                  <Link href="/storage" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {scenarioData.storageClusters.map((cluster) => (
                    <div key={cluster.id} className="flex items-center gap-3">
                      <StatusDot status={cluster.status} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/storage/${cluster.id}`} className="text-sm font-medium hover:underline">
                          {cluster.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {((cluster.usedBytes / cluster.totalBytes) * 100).toFixed(1)}% used of {(cluster.totalBytes / 1e12).toFixed(1)} TB
                        </div>
                      </div>
                      <Progress value={(cluster.usedBytes / cluster.totalBytes) * 100} className="w-24 h-2" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Kubernetes section - conditional */}
            {scenarioData.kubernetesClusters.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Container className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Kubernetes Clusters</h3>
                  </div>
                  <Link href="/kubernetes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {scenarioData.kubernetesClusters.map((cluster) => (
                    <div key={cluster.id} className="flex items-center gap-3">
                      <StatusDot status={cluster.status} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/kubernetes/${cluster.id}`} className="text-sm font-medium hover:underline">
                          {cluster.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {cluster.podCount} pods, {cluster.nodeCount} nodes
                        </div>
                      </div>
                      <Badge variant="outline">{cluster.namespaceCount} namespaces</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Empty capability state */}
          {scenarioData.storageClusters.length === 0 && scenarioData.kubernetesClusters.length === 0 && (
            <Card className="p-8 text-center">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Optional Capabilities</h3>
              <p className="text-sm text-muted-foreground">
                Storage and Kubernetes capabilities are not enabled in this scenario.
              </p>
            </Card>
          )}

          {/* Connectors panel */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Connectors</h3>
              <Link href="/connectors" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                Manage <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {scenarioData.connectors.map((connector) => (
                <Link
                  key={connector.id}
                  href={`/connectors/${connector.id}`}
                  className="p-3 rounded-lg border border-border hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <StatusDot status={connector.status} size="md" />
                    <span className="font-medium text-sm truncate">{connector.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {connector.site} &middot; {connector.hostCount} hosts
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* System metrics */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">System Metrics</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average CPU</span>
                  <span className="text-sm font-medium tabular-nums">{stats.avgCpu.toFixed(1)}%</span>
                </div>
                <Progress value={stats.avgCpu} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Memory</span>
                  <span className="text-sm font-medium tabular-nums">{stats.avgMem.toFixed(1)}%</span>
                </div>
                <Progress value={stats.avgMem} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Disk</span>
                  <span className="text-sm font-medium tabular-nums">{stats.avgDisk.toFixed(1)}%</span>
                </div>
                <Progress value={stats.avgDisk} className="h-2" />
              </div>
            </div>
          </Card>
        </main>
      </div>
      
      {/* Command bar */}
      <CommandBar />
    </AppShell>
  );
}
