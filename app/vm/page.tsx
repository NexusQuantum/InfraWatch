"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, ArrowUpDown, Search } from "lucide-react";
import { useLiveVms } from "@/lib/api/live-hooks";
import type { VmStatus } from "@/lib/types/entities";

type SortField = "name" | "namespace" | "node" | "phase" | "cpu" | "memory";
type SortDirection = "asc" | "desc";

function formatBytes(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB`;
  return `${value.toFixed(0)} B`;
}

function StatusBadge({ status }: { status: VmStatus }) {
  const map: Record<VmStatus, string> = {
    running: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    pending: "bg-status-warning/10 text-status-warning border-status-warning/20",
    stopped: "bg-muted text-muted-foreground border-border",
    failed: "bg-status-critical/10 text-status-critical border-status-critical/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>;
}

export default function VmPage() {
  const router = useRouter();
  const { vms, meta, isLoading, isError, error } = useLiveVms();
  const diagnostics = isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;

  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filtered = useMemo(() => {
    let rows = [...vms];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((vm) =>
        vm.name.toLowerCase().includes(q) ||
        vm.namespace.toLowerCase().includes(q) ||
        vm.node?.toLowerCase().includes(q) ||
        vm.connectorId.toLowerCase().includes(q)
      );
    }
    if (phaseFilter !== "all") {
      rows = rows.filter((vm) => (vm.phase || "unknown").toLowerCase() === phaseFilter);
    }

    rows.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case "name":
          diff = a.name.localeCompare(b.name);
          break;
        case "namespace":
          diff = a.namespace.localeCompare(b.namespace);
          break;
        case "node":
          diff = (a.node || "").localeCompare(b.node || "");
          break;
        case "phase":
          diff = (a.phase || "").localeCompare(b.phase || "");
          break;
        case "cpu":
          diff = (a.cpuRequestedCores ?? -1) - (b.cpuRequestedCores ?? -1);
          break;
        case "memory":
          diff = (a.memoryRequestedBytes ?? -1) - (b.memoryRequestedBytes ?? -1);
          break;
      }
      return sortDirection === "asc" ? diff : -diff;
    });

    return rows;
  }, [vms, query, phaseFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const running = vms.filter((vm) => vm.status === "running").length;
    const nonRunning = vms.length - running;
    return {
      total: vms.length,
      running,
      nonRunning,
      nodes: new Set(vms.map((vm) => vm.node).filter(Boolean)).size,
      namespaces: new Set(vms.map((vm) => vm.namespace)).size,
    };
  }, [vms]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <AppShell>
      <CommandBar title="VM" subtitle={`${stats.total} virtual machines`} />

      <div className="space-y-6 p-6">
        {isLoading && <Card className="p-4 text-sm text-muted-foreground">Loading VM inventory...</Card>}

        {diagnostics && (
          <Card className="border-status-warning/40 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {error && <div className="text-muted-foreground">{error.message}</div>}
                {meta?.errors?.map((msg) => (
                  <div key={msg} className="text-muted-foreground">{msg}</div>
                ))}
                {meta?.failedConnectors?.length ? (
                  <div className="text-muted-foreground">Failed connectors: {meta.failedConnectors.join(", ")}</div>
                ) : null}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total VMs</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-healthy">{stats.running}</div>
            <div className="text-xs text-muted-foreground">Running</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold text-status-warning">{stats.nonRunning}</div>
            <div className="text-xs text-muted-foreground">Non-Running</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.nodes}</div>
            <div className="text-xs text-muted-foreground">Distinct Nodes</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-semibold">{stats.namespaces}</div>
            <div className="text-xs text-muted-foreground">Distinct Namespaces</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search VM, namespace, node, connector..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">{filtered.length} results</div>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("name")}>
                    Name <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("namespace")}>
                    Namespace <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("node")}>
                    Node <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("phase")}>
                    Phase/Status <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("cpu")}>
                    CPU Req <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("memory")}>
                    RAM Req <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Connector</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((vm) => (
                <TableRow
                  key={vm.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/vm/${encodeURIComponent(vm.id)}`)}
                >
                  <TableCell className="font-medium">{vm.name}</TableCell>
                  <TableCell>{vm.namespace}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{vm.node || "--"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={vm.status} />
                      <span className="text-xs text-muted-foreground">{vm.phase}</span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{vm.cpuRequestedCores != null ? vm.cpuRequestedCores.toFixed(2) : "--"}</TableCell>
                  <TableCell>{formatBytes(vm.memoryRequestedBytes)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{vm.connectorId}</Badge>
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
