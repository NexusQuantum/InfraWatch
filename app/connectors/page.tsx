"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Activity,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { useLiveConnectors } from "@/lib/api/live-hooks";
import type { ConnectorType } from "@/lib/types";

type WizardStep = 1 | 2;

type ConnectorFormState = {
  connectorType: ConnectorType;
  name: string;
  baseUrl: string;
  environment: string;
  site: string;
  datacenter: string;
  authMode: "bearer" | "basic" | "none";
  bearerToken: string;
  username: string;
  password: string;
  insecureTls: boolean;
  notes: string;
};

const CONNECTOR_TYPE_OPTIONS: Array<{ value: ConnectorType; label: string; description: string }> = [
  {
    value: "nqrust_hypervisor",
    label: "NQRust-Hypervisor",
    description: "Use Rancher/Harvester monitoring Prometheus proxy endpoint.",
  },
];

function presetForType(type: ConnectorType): ConnectorFormState {
  if (type === "nqrust_hypervisor") {
    return {
      connectorType: type,
      name: "NQRust Hypervisor",
      baseUrl:
        "https://rancher.example.com/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy",
      environment: "production",
      site: "default",
      datacenter: "default",
      authMode: "bearer",
      bearerToken: "",
      username: "",
      password: "",
      insecureTls: true,
      notes: "Rancher/Harvester monitoring connector.",
    };
  }
  if (type === "kubernetes_cluster") {
    return {
      connectorType: type,
      name: "Kubernetes Cluster",
      baseUrl: "https://prometheus-k8s.example.com",
      environment: "production",
      site: "default",
      datacenter: "default",
      authMode: "bearer",
      bearerToken: "",
      username: "",
      password: "",
      insecureTls: true,
      notes: "Tip: ensure kube-state-metrics and node exporter are present.",
    };
  }
  return {
    connectorType: type,
    name: "Prometheus Connector",
    baseUrl: "https://prometheus.example.com",
    environment: "production",
    site: "default",
    datacenter: "default",
    authMode: "none",
    bearerToken: "",
    username: "",
    password: "",
    insecureTls: false,
    notes: "",
  };
}

function TypeIcon({ type, iconKey }: { type: ConnectorType; iconKey?: "server" | "activity" | "container" }) {
  const key = iconKey || (type === "nqrust_hypervisor" ? "server" : type === "kubernetes_cluster" ? "container" : "activity");
  if (key === "server") return <Server className="h-3 w-3" />;
  if (key === "container") return <Container className="h-3 w-3" />;
  return <Activity className="h-3 w-3" />;
}

function TypeBadge({ type, label, iconKey }: { type: ConnectorType; label?: string; iconKey?: "server" | "activity" | "container" }) {
  const fallback =
    type === "nqrust_hypervisor"
      ? "NQRust-Hypervisor"
      : type === "kubernetes_cluster"
        ? "Kubernetes Cluster"
        : "Generic Prometheus";
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <TypeIcon type={type} iconKey={iconKey} />
      {label || fallback}
    </Badge>
  );
}

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
  const { connectors, isLoading, refresh } = useLiveConnectors();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [typeFilter, setTypeFilter] = useState<"all" | ConnectorType>("all");
  const [form, setForm] = useState<ConnectorFormState>(presetForType("nqrust_hypervisor"));
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredConnectors = useMemo(() => {
    if (typeFilter === "all") return connectors;
    return connectors.filter((connector) => connector.connectorType === typeFilter);
  }, [connectors, typeFilter]);

  const stats = {
    total: connectors.length,
    healthy: connectors.filter((c) => c.status === "healthy").length,
    degraded: connectors.filter((c) => c.status === "degraded").length,
    down: connectors.filter((c) => c.status === "down" || c.status === "misconfigured").length,
  };

  const startWizard = () => {
    setForm({ ...presetForType("nqrust_hypervisor"), name: "" });
    setWizardStep(2);
    setActionMessage(null);
    setIsWizardOpen(true);
  };

  const submitConnector = async () => {
    setIsSaving(true);
    setActionMessage(null);
    try {
      const payload: Record<string, string | boolean> = {
        connectorType: form.connectorType,
        name: form.name,
        baseUrl: form.baseUrl,
        environment: form.environment,
        site: form.site,
        datacenter: form.datacenter,
        authMode: form.authMode,
        insecureTls: form.insecureTls,
        notes: form.notes,
      };
      if (form.authMode === "bearer") payload.bearerToken = form.bearerToken;
      if (form.authMode === "basic") {
        payload.username = form.username;
        payload.password = form.password;
      }

      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";

      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage(body?.error || "Failed to create connector");
        return;
      }

      setActionMessage("Connector created");
      setIsWizardOpen(false);
      setWizardStep(1);
      refresh();
    } catch {
      setActionMessage("Failed to create connector");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteConnector = async (connectorId: string, connectorName: string) => {
    const confirmed = window.confirm(`Delete connector "${connectorName}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(connectorId);
    setActionMessage(null);
    try {
      const csrfMatch2 = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      const csrfToken2 = csrfMatch2 ? decodeURIComponent(csrfMatch2[1]) : "";
      const response = await fetch(`/api/connectors/${connectorId}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrfToken2 },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage(body?.error || "Failed to delete connector");
        return;
      }
      setActionMessage(`Connector "${connectorName}" deleted`);
      refresh();
    } catch {
      setActionMessage("Failed to delete connector");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <CommandBar title="Connectors" subtitle={`${stats.total} Prometheus connectors`}>
        <Button size="sm" className="gap-1.5" onClick={startWizard}>
          <Plus className="h-4 w-4" />
          Add Connector
        </Button>
      </CommandBar>

      <div className="p-6 space-y-6">
        {actionMessage && <Card className="p-3 text-sm">{actionMessage}</Card>}
        {isLoading && <Card className="p-4 text-sm text-muted-foreground">Loading connectors...</Card>}

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

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Filter connectors by type</div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | ConnectorType)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONNECTOR_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Site / Datacenter</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="w-[110px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnectors.map((connector) => (
                <TableRow key={connector.id} className="group">
                  <TableCell>
                    <div>
                      <div className="font-medium">{connector.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{connector.baseUrl}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={connector.connectorType} label={connector.typeMeta?.label} iconKey={connector.typeMeta?.iconKey} />
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
                    <div className="text-sm tabular-nums">{connector.coverage.hosts} hosts</div>
                    <div className="text-xs text-muted-foreground">{connector.coverage.clusters} clusters</div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm tabular-nums ${connector.latencyMs > 500 ? "text-status-warning" : ""}`}>
                      {connector.latencyMs}ms
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => deleteConnector(connector.id, connector.name)}
                        disabled={deletingId === connector.id}
                        title="Delete connector"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Link href={`/connectors/${connector.id}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Sheet open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add NQRust-Hypervisor</SheetTitle>
            <SheetDescription>
              Connect a Rancher/Harvester monitoring Prometheus endpoint. The name you choose will be used as the cluster name across InfraWatch.
            </SheetDescription>
          </SheetHeader>

          {wizardStep === 2 && (
            <div className="p-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="connector-name">Cluster Name</Label>
                <Input
                  id="connector-name"
                  placeholder="e.g. NQRust Production, HCI Lab 01"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">This name identifies the cluster in all dashboards, charts, and alerts.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="connector-url">Prometheus URL</Label>
                <Input
                  id="connector-url"
                  placeholder="https://rancher.example.com/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy"
                  value={form.baseUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Rancher monitoring Prometheus proxy endpoint.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Environment</Label>
                  <Input value={form.environment} onChange={(e) => setForm((prev) => ({ ...prev, environment: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Site</Label>
                  <Input value={form.site} onChange={(e) => setForm((prev) => ({ ...prev, site: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Datacenter</Label>
                  <Input value={form.datacenter} onChange={(e) => setForm((prev) => ({ ...prev, datacenter: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Auth Mode</Label>
                <Select
                  value={form.authMode}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, authMode: value as "bearer" | "basic" | "none" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bearer">Bearer</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.authMode === "bearer" && (
                <div className="grid gap-2">
                  <Label>Bearer Token</Label>
                  <Input
                    type="password"
                    value={form.bearerToken}
                    onChange={(e) => setForm((prev) => ({ ...prev, bearerToken: e.target.value }))}
                  />
                </div>
              )}

              {form.authMode === "basic" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Insecure TLS</div>
                  <div className="text-xs text-muted-foreground">Allow self-signed certificates for this connector.</div>
                </div>
                <Switch
                  checked={form.insecureTls}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, insecureTls: !!checked }))}
                />
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsWizardOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={submitConnector} disabled={isSaving || !form.name || !form.baseUrl}>
              {isSaving ? "Creating..." : "Add Connector"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
