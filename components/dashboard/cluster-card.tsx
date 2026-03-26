"use client";

import { cn } from "@/lib/utils";
import type { Cluster, HealthStatus } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { CapabilityBadge } from "./capability-badge";
import { FreshnessIndicator } from "./freshness-indicator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Layers,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  ExternalLink,
} from "lucide-react";

interface ClusterCardProps {
  cluster: Cluster;
  onClick?: () => void;
  className?: string;
}

function getUtilizationColor(value: number): string {
  if (value >= 90) return "bg-status-critical";
  if (value >= 75) return "bg-status-warning";
  return "bg-status-healthy";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function ClusterCard({ cluster, onClick, className }: ClusterCardProps) {
  const hasKubernetes = cluster.capabilities?.includes("kubernetes");
  const hasStorage = cluster.capabilities?.includes("storage");
  const hasApp = cluster.capabilities?.includes("app");

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:border-ring/50 hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{cluster.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {cluster.datacenter} / {cluster.region}
              </p>
            </div>
          </div>
          <StatusBadge status={cluster.status} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capabilities */}
        {cluster.capabilities && cluster.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cluster.capabilities.map((cap) => (
              <CapabilityBadge key={cap} capability={cap} size="sm" />
            ))}
          </div>
        )}

        {/* Node Summary */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{cluster.nodeCount}</span>
              <span className="text-muted-foreground"> nodes</span>
            </span>
          </div>
          {cluster.healthyNodes !== undefined && (
            <span className="text-sm text-muted-foreground">
              {cluster.healthyNodes} healthy
            </span>
          )}
        </div>

        {/* Resource Utilization */}
        {cluster.resources && (
          <div className="space-y-2">
            {/* CPU */}
            <div className="flex items-center gap-3">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <Progress
                  value={cluster.resources.cpuPercent}
                  className={cn("h-1.5", getUtilizationColor(cluster.resources.cpuPercent))}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                {cluster.resources.cpuPercent.toFixed(0)}%
              </span>
            </div>

            {/* Memory */}
            <div className="flex items-center gap-3">
              <MemoryStick className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <Progress
                  value={cluster.resources.memPercent}
                  className={cn("h-1.5", getUtilizationColor(cluster.resources.memPercent))}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                {cluster.resources.memPercent.toFixed(0)}%
              </span>
            </div>

            {/* Storage */}
            {hasStorage && cluster.resources.storagePercent !== undefined && (
              <div className="flex items-center gap-3">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <Progress
                    value={cluster.resources.storagePercent}
                    className={cn("h-1.5", getUtilizationColor(cluster.resources.storagePercent))}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                  {cluster.resources.storagePercent.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Kubernetes Stats */}
        {hasKubernetes && cluster.kubernetes && (
          <div className="pt-2 border-t border-border/50">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold">{cluster.kubernetes.namespaces}</div>
                <div className="text-xs text-muted-foreground">Namespaces</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{cluster.kubernetes.pods}</div>
                <div className="text-xs text-muted-foreground">Pods</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{cluster.kubernetes.services}</div>
                <div className="text-xs text-muted-foreground">Services</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <FreshnessIndicator
            timestamp={cluster.lastSeen}
            staleThresholdMs={5 * 60 * 1000}
            size="sm"
          />
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}

// Compact variant for lists
export function ClusterRow({ cluster, onClick, className }: ClusterCardProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-colors cursor-pointer",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="flex-shrink-0 p-2 rounded-md bg-muted">
        <Layers className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{cluster.name}</span>
          <StatusBadge status={cluster.status} size="sm" />
        </div>
        <span className="text-xs text-muted-foreground">
          {cluster.datacenter} / {cluster.region}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {cluster.capabilities?.slice(0, 2).map((cap) => (
          <CapabilityBadge key={cap} capability={cap} size="sm" />
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Server className="h-3.5 w-3.5" />
        <span>{cluster.nodeCount}</span>
      </div>

      <FreshnessIndicator
        timestamp={cluster.lastSeen}
        staleThresholdMs={5 * 60 * 1000}
        size="sm"
      />
    </div>
  );
}

// Skeleton for loading state
export function ClusterCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <div className="h-5 w-5" />
            </div>
            <div>
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded mt-1" />
            </div>
          </div>
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-muted rounded" />
          <div className="h-2 w-full bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
