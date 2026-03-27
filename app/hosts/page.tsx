"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { RankingPanel } from "@/components/charts/ranking-panel";
import { useLiveHosts } from "@/lib/api/live-hooks";

type SortField = "hostname" | "status" | "cpu" | "memory" | "disk" | "vcpu" | "network" | "netErrors" | "diskIo" | "load";
type SortDirection = "asc" | "desc";

function formatBytesPerSec(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B/s";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB/s`;
  return `${value.toFixed(0)} B/s`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    healthy: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    critical: "bg-status-critical/10 text-status-critical border-status-critical/20",
    down: "bg-status-down/10 text-status-down border-status-down/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] || variants.unknown}`}>
      {status}
    </span>
  );
}

function ResourceBar({ value, threshold = { warning: 70, critical: 90 } }: { value: number; threshold?: { warning: number; critical: number } }) {
  const status = value >= threshold.critical ? "critical" : value >= threshold.warning ? "warning" : "healthy";
  const colors = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
  };

  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums w-10 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

export default function HostsPage() {
  const router = useRouter();
  const { hosts, meta, isLoading, isError, error } = useLiveHosts();
  const diagnostics = isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("hostname");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredHosts = useMemo(() => {
    let result = [...hosts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        h => h.hostname.toLowerCase().includes(query) ||
             h.ipAddress?.toLowerCase().includes(query) ||
             h.site.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(h => h.status === statusFilter);
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter(h => h.role === roleFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "hostname":
          comparison = a.hostname.localeCompare(b.hostname);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "cpu":
          comparison = (a.current?.cpuUsagePct ?? 0) - (b.current?.cpuUsagePct ?? 0);
          break;
        case "memory":
          comparison = (a.current?.memoryUsagePct ?? 0) - (b.current?.memoryUsagePct ?? 0);
          break;
        case "disk":
          comparison = (a.current?.diskUsagePct ?? 0) - (b.current?.diskUsagePct ?? 0);
          break;
        case "vcpu":
          comparison = (a.current?.cpuLogicalCount ?? 0) - (b.current?.cpuLogicalCount ?? 0);
          break;
        case "network":
          comparison =
            ((a.current?.networkRxBytesPerSec ?? 0) + (a.current?.networkTxBytesPerSec ?? 0)) -
            ((b.current?.networkRxBytesPerSec ?? 0) + (b.current?.networkTxBytesPerSec ?? 0));
          break;
        case "netErrors":
          comparison = (a.current?.networkErrorRate ?? 0) - (b.current?.networkErrorRate ?? 0);
          break;
        case "diskIo":
          comparison = (a.current?.diskIoUtilPct ?? 0) - (b.current?.diskIoUtilPct ?? 0);
          break;
        case "load":
          comparison = (a.current?.load1 ?? 0) - (b.current?.load1 ?? 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [hosts, searchQuery, statusFilter, roleFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const stats = useMemo(() => ({
    total: hosts.length,
    healthy: hosts.filter(h => h.status === "healthy").length,
    warning: hosts.filter(h => h.status === "warning").length,
    critical: hosts.filter(h => h.status === "critical" || h.status === "down").length,
    totalVcpu: hosts.reduce((acc, h) => acc + (h.current.cpuLogicalCount ?? 0), 0),
    avgRx: hosts.length ? hosts.reduce((acc, h) => acc + (h.current.networkRxBytesPerSec ?? 0), 0) / hosts.length : 0,
    avgTx: hosts.length ? hosts.reduce((acc, h) => acc + (h.current.networkTxBytesPerSec ?? 0), 0) / hosts.length : 0,
    nodesWithNetworkErrors: hosts.filter(h => (h.current.networkErrorRate ?? 0) > 0).length,
  }), [hosts]);

  const topNetworkNodes = useMemo(
    () =>
      [...filteredHosts]
        .sort(
          (a, b) =>
            (b.current.networkRxBytesPerSec + b.current.networkTxBytesPerSec) -
            (a.current.networkRxBytesPerSec + a.current.networkTxBytesPerSec)
        )
        .slice(0, 8)
        .map((host) => ({
          id: host.id,
          name: host.hostname,
          value: host.current.networkRxBytesPerSec + host.current.networkTxBytesPerSec,
          status: host.status,
          href: `/nodes/${encodeURIComponent(host.id)}`,
        })),
    [filteredHosts]
  );

  return (
    <AppShell>
      <CommandBar
        title="Nodes"
        subtitle={`${stats.total} nodes in fleet`}

      />

      <div className="p-6 space-y-6">
        {isLoading && (
          <Card className="p-4 text-sm text-muted-foreground">Loading nodes...</Card>
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
        {/* Stats summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Nodes</div>
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
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.totalVcpu}</div>
            <div className="text-xs text-muted-foreground">Total vCPU</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{formatBytesPerSec(stats.avgRx)}</div>
            <div className="text-xs text-muted-foreground">Avg Node Rx</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{formatBytesPerSec(stats.avgTx)}</div>
            <div className="text-xs text-muted-foreground">Avg Node Tx</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.nodesWithNetworkErrors}</div>
            <div className="text-xs text-muted-foreground">Nodes With Net Errors</div>
          </Card>
        </div>

        <RankingPanel
          title="Top Nodes by Network Throughput"
          items={topNetworkNodes}
          unit="bytesPerSec"
          colorByStatus
        />

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="down">Down</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="compute">Compute</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="control-plane">Control Plane</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredHosts.length} results
            </div>
          </div>
        </Card>

        {/* Nodes table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("hostname")} className="gap-1 -ml-3">
                    Node
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("status")} className="gap-1 -ml-3">
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("vcpu")} className="gap-1 -ml-3">
                    vCPU
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("cpu")} className="gap-1 -ml-3">
                    CPU
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("memory")} className="gap-1 -ml-3">
                    Memory
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("network")} className="gap-1 -ml-3">
                    Network
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("netErrors")} className="gap-1 -ml-3">
                    Net Errors
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("disk")} className="gap-1 -ml-3">
                    Disk
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("diskIo")} className="gap-1 -ml-3">
                    Disk IO
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("load")} className="gap-1 -ml-3">
                    Load
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHosts.map(host => (
                <TableRow
                  key={host.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/nodes/${encodeURIComponent(host.id)}`)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{host.hostname}</div>
                      <div className="text-xs text-muted-foreground">{host.ipAddress}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={host.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {host.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {host.serverClusterId || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {host.site}
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {host.current.cpuLogicalCount ?? "-"}
                  </TableCell>
                  <TableCell>
                    <ResourceBar value={host.current?.cpuUsagePct ?? 0} />
                  </TableCell>
                  <TableCell>
                    <ResourceBar value={host.current?.memoryUsagePct ?? 0} />
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <div>Rx {formatBytesPerSec(host.current.networkRxBytesPerSec ?? 0)}</div>
                    <div className="text-muted-foreground">Tx {formatBytesPerSec(host.current.networkTxBytesPerSec ?? 0)}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    <span className={(host.current.networkErrorRate ?? 0) > 0 ? "text-status-warning" : "text-muted-foreground"}>
                      {(host.current.networkErrorRate ?? 0).toFixed(3)}/s
                    </span>
                  </TableCell>
                  <TableCell>
                    <ResourceBar value={host.current?.diskUsagePct ?? 0} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {host.current?.diskIoUtilPct != null ? (
                      <span className={host.current.diskIoUtilPct > 80 ? "text-status-critical font-medium" : host.current.diskIoUtilPct > 50 ? "text-status-warning" : ""}>
                        {host.current.diskIoUtilPct.toFixed(0)}%
                      </span>
                    ) : "--"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {host.current?.load1 != null ? host.current.load1.toFixed(2) : "--"}
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
