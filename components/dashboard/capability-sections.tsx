"use client";

import { cn } from "@/lib/utils";
import type { Cluster, Host, Capability } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./status-badge";
import { CapabilityBadge } from "./capability-badge";
import { EmptyState } from "./empty-state";
import { Panel, PanelSection } from "./panel";
import {
  Container,
  Database,
  HardDrive,
  Layers,
  Server,
  Box,
  GitBranch,
  Activity,
  AlertTriangle,
  Settings,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";

// Helper to check if capability is enabled
function hasCapability(capabilities: Capability[] | undefined, cap: Capability): boolean {
  return capabilities?.includes(cap) ?? false;
}

// Kubernetes Section Component
interface KubernetesSectionProps {
  cluster: Cluster;
  enabled?: boolean;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  className?: string;
}

export function KubernetesSection({
  cluster,
  enabled = true,
  loading = false,
  error,
  onRefresh,
  className,
}: KubernetesSectionProps) {
  const hasK8s = hasCapability(cluster.capabilities, "kubernetes");

  if (!enabled || !hasK8s) {
    return (
      <Panel
        title="Kubernetes"
        description="Container orchestration"
        className={className}
      >
        <EmptyState
          title="Kubernetes not enabled"
          description="This cluster does not have Kubernetes capabilities configured."
          icon={<Container className="h-8 w-8" />}
          size="sm"
        />
      </Panel>
    );
  }

  const k8s = cluster.kubernetes;

  return (
    <Panel
      title="Kubernetes"
      description={`Version ${k8s?.version || "unknown"}`}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      className={className}
    >
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock
            label="Namespaces"
            value={k8s?.namespaces ?? 0}
            icon={<Layers className="h-4 w-4" />}
          />
          <StatBlock
            label="Pods"
            value={k8s?.pods ?? 0}
            icon={<Box className="h-4 w-4" />}
          />
          <StatBlock
            label="Services"
            value={k8s?.services ?? 0}
            icon={<GitBranch className="h-4 w-4" />}
          />
          <StatBlock
            label="Deployments"
            value={k8s?.deployments ?? 0}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        {/* Pod Status Breakdown */}
        {k8s?.podStatus && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Pod Status</h4>
            <div className="flex gap-2">
              <StatusPill label="Running" count={k8s.podStatus.running} status="healthy" />
              <StatusPill label="Pending" count={k8s.podStatus.pending} status="warning" />
              <StatusPill label="Failed" count={k8s.podStatus.failed} status="critical" />
            </div>
          </div>
        )}

        {/* Resource Requests/Limits */}
        {k8s?.resourceUsage && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Resource Utilization</h4>
            <ResourceBar
              label="CPU Requests"
              used={k8s.resourceUsage.cpuRequests}
              total={k8s.resourceUsage.cpuCapacity}
              unit="cores"
            />
            <ResourceBar
              label="Memory Requests"
              used={k8s.resourceUsage.memRequests}
              total={k8s.resourceUsage.memCapacity}
              unit="GB"
            />
          </div>
        )}
      </div>
    </Panel>
  );
}

// Storage Section Component
interface StorageSectionProps {
  cluster: Cluster;
  enabled?: boolean;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  className?: string;
}

export function StorageSection({
  cluster,
  enabled = true,
  loading = false,
  error,
  onRefresh,
  className,
}: StorageSectionProps) {
  const hasStorage = hasCapability(cluster.capabilities, "storage");

  if (!enabled || !hasStorage) {
    return (
      <Panel
        title="Storage"
        description="Block and object storage"
        className={className}
      >
        <EmptyState
          title="Storage not enabled"
          description="This cluster does not have storage capabilities configured."
          icon={<HardDrive className="h-8 w-8" />}
          size="sm"
        />
      </Panel>
    );
  }

  const storage = cluster.storage;

  return (
    <Panel
      title="Storage"
      description="Block and object storage"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      className={className}
    >
      <div className="space-y-4">
        {/* Storage Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBlock
            label="Volumes"
            value={storage?.volumes ?? 0}
            icon={<HardDrive className="h-4 w-4" />}
          />
          <StatBlock
            label="Storage Classes"
            value={storage?.storageClasses ?? 0}
            icon={<Database className="h-4 w-4" />}
          />
          <StatBlock
            label="PVCs"
            value={storage?.pvcs ?? 0}
            icon={<Box className="h-4 w-4" />}
          />
        </div>

        {/* Capacity */}
        {storage?.capacity && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Capacity</h4>
            <ResourceBar
              label="Block Storage"
              used={storage.capacity.usedBytes}
              total={storage.capacity.totalBytes}
              unit="bytes"
            />
          </div>
        )}

        {/* Volume Health */}
        {storage?.volumeHealth && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Volume Health</h4>
            <div className="flex gap-2">
              <StatusPill label="Healthy" count={storage.volumeHealth.healthy} status="healthy" />
              <StatusPill label="Degraded" count={storage.volumeHealth.degraded} status="warning" />
              <StatusPill label="Failed" count={storage.volumeHealth.failed} status="critical" />
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// App/Workload Section Component
interface AppSectionProps {
  cluster: Cluster;
  enabled?: boolean;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  className?: string;
}

export function AppSection({
  cluster,
  enabled = true,
  loading = false,
  error,
  onRefresh,
  className,
}: AppSectionProps) {
  const hasApp = hasCapability(cluster.capabilities, "app");

  if (!enabled || !hasApp) {
    return (
      <Panel
        title="Applications"
        description="Deployed workloads"
        className={className}
      >
        <EmptyState
          title="Applications not configured"
          description="This cluster does not have application deployment configured."
          icon={<Server className="h-8 w-8" />}
          size="sm"
        />
      </Panel>
    );
  }

  const apps = cluster.apps;

  return (
    <Panel
      title="Applications"
      description={`${apps?.total ?? 0} deployed workloads`}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      className={className}
    >
      <div className="space-y-4">
        {/* App Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock
            label="Total Apps"
            value={apps?.total ?? 0}
            icon={<Server className="h-4 w-4" />}
          />
          <StatBlock
            label="Running"
            value={apps?.running ?? 0}
            icon={<Activity className="h-4 w-4" />}
            variant="healthy"
          />
          <StatBlock
            label="Degraded"
            value={apps?.degraded ?? 0}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={apps?.degraded ? "warning" : "default"}
          />
          <StatBlock
            label="Stopped"
            value={apps?.stopped ?? 0}
            icon={<Settings className="h-4 w-4" />}
          />
        </div>

        {/* Recent Deployments */}
        {apps?.recentDeployments && apps.recentDeployments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Deployments</h4>
            <div className="space-y-2">
              {apps.recentDeployments.slice(0, 3).map((deployment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={deployment.status} size="sm" showLabel={false} />
                    <span className="text-sm font-mono">{deployment.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(deployment.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// Capability-aware wrapper component
interface CapabilitySectionProps {
  capability: Capability;
  capabilities: Capability[] | undefined;
  title: string;
  description?: string;
  children: ReactNode;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function CapabilitySection({
  capability,
  capabilities,
  title,
  description,
  children,
  emptyIcon,
  emptyMessage,
  className,
}: CapabilitySectionProps) {
  const isEnabled = hasCapability(capabilities, capability);

  if (!isEnabled) {
    return (
      <Panel title={title} description={description} className={className}>
        <EmptyState
          title={emptyMessage || `${title} not enabled`}
          description={`This resource does not have ${capability} capabilities configured.`}
          icon={emptyIcon}
          size="sm"
        />
      </Panel>
    );
  }

  return (
    <Panel title={title} description={description} className={className}>
      {children}
    </Panel>
  );
}

// Helper components
function StatBlock({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  variant?: "default" | "healthy" | "warning" | "critical";
}) {
  const variantClasses = {
    default: "text-foreground",
    healthy: "text-status-healthy",
    warning: "text-status-warning",
    critical: "text-status-critical",
  };

  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn("text-2xl font-semibold tabular-nums", variantClasses[variant])}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function StatusPill({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: "healthy" | "warning" | "critical";
}) {
  const statusClasses = {
    healthy: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    critical: "bg-status-critical/10 text-status-critical border-status-critical/20",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
        statusClasses[status]
      )}
    >
      <span className="font-medium tabular-nums">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function ResourceBar({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: number;
  total: number;
  unit: "cores" | "GB" | "bytes";
}) {
  const percent = total > 0 ? (used / total) * 100 : 0;

  const formatValue = (value: number) => {
    if (unit === "bytes") {
      if (value === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return parseFloat((value / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {formatValue(used)} / {formatValue(total)}
        </span>
      </div>
      <Progress
        value={percent}
        className={cn(
          "h-2",
          percent >= 90
            ? "bg-status-critical"
            : percent >= 75
            ? "bg-status-warning"
            : "bg-status-healthy"
        )}
      />
    </div>
  );
}
