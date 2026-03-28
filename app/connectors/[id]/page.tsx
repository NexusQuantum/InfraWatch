"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Plug,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Container,
  Box,
  Layers,
  Activity,
  RefreshCw,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { useLiveConnectors, useLiveHosts } from "@/lib/api/live-hooks";
import type { ConnectorType } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; icon: React.ReactNode }> = {
    healthy: { bg: "bg-status-healthy/10 text-status-healthy border-status-healthy/20", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    degraded: { bg: "bg-status-warning/10 text-status-warning border-status-warning/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    down: { bg: "bg-status-critical/10 text-status-critical border-status-critical/20", icon: <XCircle className="h-3.5 w-3.5" /> },
    misconfigured: { bg: "bg-status-stale/10 text-status-stale border-status-stale/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const variant = variants[status] || variants.misconfigured;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${variant.bg}`}>
      {variant.icon}
      {status}
    </span>
  );
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

export default function ConnectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const connectorId = params.id as string;
  const { connectors } = useLiveConnectors();
  const { hosts } = useLiveHosts();
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    baseUrl: "",
    environment: "",
    site: "",
    datacenter: "",
    authMode: "bearer" as "bearer" | "basic" | "none",
    bearerToken: "",
    username: "",
    password: "",
    insecureTls: false,
    notes: "",
  });

  const connector = useMemo(() => connectors.find(c => c.id === connectorId), [connectorId, connectors]);
  const connectorHosts = useMemo(() => hosts.filter(h => h.connectorId === connectorId), [connectorId, hosts]);

  if (!connector) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center">
            <Plug className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">Connector Not Found</h3>
            <Link href="/connectors">
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

  const runTest = async () => {
    setIsTesting(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/connectors/${connector.id}/test`, {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data?.success) {
        setActionMessage(payload?.data?.error || payload?.error || "Connection test failed");
        return;
      }
      setActionMessage(`Connection successful (${payload.data.latencyMs}ms)`);
    } catch {
      setActionMessage("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const toggleEnabled = async () => {
    setIsToggling(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/connectors/${connector.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() },
        body: JSON.stringify({ enabled: !connector.enabled }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setActionMessage(payload?.error || "Failed to update connector");
        return;
      }
      setActionMessage(payload?.data?.enabled ? "Connector enabled" : "Connector disabled");
      window.location.reload();
    } catch {
      setActionMessage("Failed to update connector");
    } finally {
      setIsToggling(false);
    }
  };

  const deleteConnector = async () => {
    const confirmed = window.confirm(`Delete connector "${connector.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/connectors/${connector.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage(payload?.error || "Failed to delete connector");
        return;
      }
      router.push("/connectors");
      router.refresh();
    } catch {
      setActionMessage("Failed to delete connector");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = () => {
    if (!connector) return;
    setEditForm({
      name: connector.name,
      baseUrl: connector.baseUrl,
      environment: connector.environment,
      site: connector.site,
      datacenter: connector.datacenter,
      authMode: connector.authMode as "bearer" | "basic" | "none",
      bearerToken: "",
      username: "",
      password: "",
      insecureTls: false,
      notes: connector.notes || "",
    });
    setIsEditOpen(true);
  };

  const getCsrf = () => {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const saveEdit = async () => {
    setIsSaving(true);
    setActionMessage(null);
    try {
      const payload: Record<string, string | boolean> = {
        name: editForm.name,
        baseUrl: editForm.baseUrl,
        environment: editForm.environment,
        site: editForm.site,
        datacenter: editForm.datacenter,
        authMode: editForm.authMode,
        insecureTls: editForm.insecureTls,
        notes: editForm.notes,
      };
      if (editForm.authMode === "bearer" && editForm.bearerToken) {
        payload.bearerToken = editForm.bearerToken;
      }
      if (editForm.authMode === "basic" && editForm.username) {
        payload.username = editForm.username;
        payload.password = editForm.password;
      }
      const response = await fetch(`/api/connectors/${connector.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrf(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setActionMessage(result?.error || "Failed to save");
        return;
      }
      setActionMessage("Connector updated");
      setIsEditOpen(false);
      window.location.reload();
    } catch {
      setActionMessage("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const latencyChartData = {
    type: "timeseries" as const,
    title: "Response Latency",
    unit: "ms" as const,
    series: [],
    updatedAt: connector.lastCheckedAt,
  };

  const capabilities = [
    { key: "hostMetrics", label: "Host Metrics", icon: Server, enabled: connector.capabilities.hostMetrics },
    { key: "clusterMetrics", label: "Cluster Metrics", icon: Layers, enabled: connector.capabilities.clusterMetrics },
    { key: "storageMetrics", label: "Storage Metrics", icon: Database, enabled: connector.capabilities.storageMetrics },
    { key: "kubernetesMetrics", label: "Kubernetes Metrics", icon: Container, enabled: connector.capabilities.kubernetesMetrics },
    { key: "appMetrics", label: "Application Metrics", icon: Box, enabled: connector.capabilities.appMetrics },
  ];

  return (
    <AppShell>
      <CommandBar title={connector.name} subtitle="Prometheus Connector">
        <Link href="/connectors">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </CommandBar>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Plug className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold">{connector.name}</h1>
                <TypeBadge type={connector.connectorType} label={connector.typeMeta?.label} iconKey={connector.typeMeta?.iconKey} />
                <StatusBadge status={connector.status} />
              </div>
              <div className="text-sm text-muted-foreground font-mono">{connector.baseUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={runTest} disabled={isTesting}>
              <RefreshCw className="h-4 w-4" />
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={toggleEnabled} disabled={isToggling}>
              <Power className="h-4 w-4" />
              {connector.enabled ? "Disable" : "Enable"}
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={deleteConnector} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
        {actionMessage && (
          <Card className="p-3 text-sm">{actionMessage}</Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Hosts</div>
            <div className="text-2xl font-semibold">{connector.coverage.hosts}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Clusters</div>
            <div className="text-2xl font-semibold">{connector.coverage.clusters}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Storage Clusters</div>
            <div className="text-2xl font-semibold">{connector.coverage.storageClusters}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">K8s Clusters</div>
            <div className="text-2xl font-semibold">{connector.coverage.kubernetesClusters}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Apps</div>
            <div className="text-2xl font-semibold">{connector.coverage.apps}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Latency</div>
            <div className={`text-2xl font-semibold tabular-nums ${connector.latencyMs > 500 ? "text-status-warning" : ""}`}>
              {connector.latencyMs}ms
            </div>
          </Card>
        </div>

        {/* Latency chart */}
        <TimeSeriesChart data={latencyChartData} height={180} />

        {/* Info panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Connection Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-mono">{connector.baseUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auth Mode</span>
                <Badge variant="outline">{connector.authMode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connector Type</span>
                <TypeBadge type={connector.connectorType} label={connector.typeMeta?.label} iconKey={connector.typeMeta?.iconKey} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span>{connector.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site</span>
                <span>{connector.site}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datacenter</span>
                <span>{connector.datacenter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Checked</span>
                <span>{new Date(connector.lastCheckedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enabled</span>
                <span>{connector.enabled ? "Yes" : "No"}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Capabilities</h3>
            <div className="space-y-3">
              {capabilities.map(cap => {
                const Icon = cap.icon;
                return (
                  <div key={cap.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{cap.label}</span>
                    </div>
                    {cap.enabled ? (
                      <CheckCircle className="h-4 w-4 text-status-healthy" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Notes */}
        {connector.notes && (
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground">{connector.notes}</p>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Expected Metrics</h3>
          {connector.typeMeta?.expectedCapabilities?.length ? (
            <div className="flex flex-wrap gap-2">
              {connector.typeMeta.expectedCapabilities.map((capability) => {
                const enabled = connector.capabilities[capability];
                return (
                  <Badge
                    key={capability}
                    variant="outline"
                    className={enabled ? "border-status-healthy/40 text-status-healthy" : "border-status-warning/40 text-status-warning"}
                  >
                    {capability}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No strict capability requirements for this connector type.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Quick Fix Tips</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {(connector.typeMeta?.quickFixTips || []).map((tip) => (
              <li key={tip}>• {tip}</li>
            ))}
            {(connector.healthNotes || []).map((note) => (
              <li key={note} className="text-status-warning">• {note}</li>
            ))}
          </ul>
        </Card>

        {/* Sample hosts */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Discovered Hosts ({connectorHosts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {connectorHosts.slice(0, 8).map(host => (
              <Link key={host.id} href={`/hosts/${host.id}`}>
                <div className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-accent/5 transition-colors">
                  <span className={`h-2 w-2 rounded-full ${
                    host.status === "healthy" ? "bg-status-healthy" :
                    host.status === "warning" ? "bg-status-warning" :
                    "bg-status-critical"
                  }`} />
                  <span className="text-sm truncate">{host.hostname}</span>
                </div>
              </Link>
            ))}
          </div>
          {connectorHosts.length > 8 && (
            <div className="mt-4 text-center">
              <Link href={`/hosts?connector=${connectorId}`} className="text-sm text-primary hover:underline">
                View all {connectorHosts.length} hosts
              </Link>
            </div>
          )}
        </Card>
      </div>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Connector</SheetTitle>
            <SheetDescription>
              Update the connector settings. Leave auth fields empty to keep the current credentials.
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Cluster Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">This name identifies the cluster across all dashboards.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-url">Prometheus URL</Label>
              <Input
                id="edit-url"
                value={editForm.baseUrl}
                onChange={(e) => setEditForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Environment</Label>
                <Input value={editForm.environment} onChange={(e) => setEditForm((prev) => ({ ...prev, environment: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Site</Label>
                <Input value={editForm.site} onChange={(e) => setEditForm((prev) => ({ ...prev, site: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Datacenter</Label>
                <Input value={editForm.datacenter} onChange={(e) => setEditForm((prev) => ({ ...prev, datacenter: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Auth Mode</Label>
              <Select
                value={editForm.authMode}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, authMode: value as "bearer" | "basic" | "none" }))}
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

            {editForm.authMode === "bearer" && (
              <div className="grid gap-2">
                <Label>Bearer Token</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current token"
                  value={editForm.bearerToken}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bearerToken: e.target.value }))}
                />
              </div>
            )}

            {editForm.authMode === "basic" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="Leave empty to keep current"
                    value={editForm.username}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Leave empty to keep current"
                    value={editForm.password}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">Insecure TLS</div>
                <div className="text-xs text-muted-foreground">Allow self-signed certificates.</div>
              </div>
              <Switch
                checked={editForm.insecureTls}
                onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, insecureTls: !!checked }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isSaving || !editForm.name || !editForm.baseUrl}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
