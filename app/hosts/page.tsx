"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Server,
  Search,
  Filter,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { hosts } from "@/lib/mocks/hosts";

type SortField = "hostname" | "status" | "cpu" | "memory" | "disk";
type SortDirection = "asc" | "desc";

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
  }), []);

  return (
    <AppShell>
      <CommandBar
        title="Hosts"
        subtitle={`${stats.total} hosts in fleet`}
        showSearch={false}
      />

      <div className="p-6 space-y-6">
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Hosts</div>
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

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hosts..."
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

        {/* Hosts table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("hostname")} className="gap-1 -ml-3">
                    Host
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
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("disk")} className="gap-1 -ml-3">
                    Disk
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHosts.map(host => (
                <TableRow key={host.id} className="group">
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
                  <TableCell>
                    <ResourceBar value={host.current?.cpuUsagePct ?? 0} />
                  </TableCell>
                  <TableCell>
                    <ResourceBar value={host.current?.memoryUsagePct ?? 0} />
                  </TableCell>
                  <TableCell>
                    <ResourceBar value={host.current?.diskUsagePct ?? 0} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/hosts/${host.id}`}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <ChevronRight className="h-4 w-4" />
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
