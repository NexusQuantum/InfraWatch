"use client";

import { cn } from "@/lib/utils";
import type { Host, HealthStatus } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { CapabilityBadge } from "./capability-badge";
import { FreshnessIndicator } from "./freshness-indicator";
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface HostRowProps {
  host: Host;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

function getUtilizationColor(value: number): string {
  if (value >= 90) return "bg-status-critical";
  if (value >= 75) return "bg-status-warning";
  return "bg-status-healthy";
}

function getUtilizationStatus(value: number): HealthStatus {
  if (value >= 90) return "critical";
  if (value >= 75) return "warning";
  return "healthy";
}

export function HostRow({ host, onClick, compact = false, className }: HostRowProps) {
  const cpuPercent = host.metrics?.cpuPercent ?? 0;
  const memPercent = host.metrics?.memPercent ?? 0;
  const diskPercent = host.metrics?.diskPercent ?? 0;

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
      {/* Host Icon & Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 p-2 rounded-md bg-muted">
          <Server className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium truncate">
              {host.hostname}
            </span>
            <StatusBadge status={host.status} size="sm" />
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground truncate">
                {host.ipAddress}
              </span>
              <span className="text-xs text-muted-foreground">
                {host.os} {host.osVersion}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Capabilities */}
      {!compact && host.capabilities && host.capabilities.length > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {host.capabilities.slice(0, 3).map((cap) => (
            <CapabilityBadge key={cap} capability={cap} size="sm" />
          ))}
          {host.capabilities.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{host.capabilities.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Resource Metrics */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* CPU */}
        <div className="flex items-center gap-2 w-24">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <Progress
              value={cpuPercent}
              className={cn(
                "h-1.5",
                getUtilizationColor(cpuPercent)
              )}
            />
          </div>
          <span className={cn(
            "text-xs font-mono w-10 text-right",
            cpuPercent >= 90 ? "text-status-critical" : 
            cpuPercent >= 75 ? "text-status-warning" : "text-muted-foreground"
          )}>
            {cpuPercent.toFixed(0)}%
          </span>
        </div>

        {/* Memory */}
        <div className="flex items-center gap-2 w-24">
          <MemoryStick className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <Progress
              value={memPercent}
              className={cn(
                "h-1.5",
                getUtilizationColor(memPercent)
              )}
            />
          </div>
          <span className={cn(
            "text-xs font-mono w-10 text-right",
            memPercent >= 90 ? "text-status-critical" : 
            memPercent >= 75 ? "text-status-warning" : "text-muted-foreground"
          )}>
            {memPercent.toFixed(0)}%
          </span>
        </div>

        {/* Disk */}
        {!compact && (
          <div className="flex items-center gap-2 w-24">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <Progress
                value={diskPercent}
                className={cn(
                  "h-1.5",
                  getUtilizationColor(diskPercent)
                )}
              />
            </div>
            <span className={cn(
              "text-xs font-mono w-10 text-right",
              diskPercent >= 90 ? "text-status-critical" : 
              diskPercent >= 75 ? "text-status-warning" : "text-muted-foreground"
            )}>
              {diskPercent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Freshness */}
      <div className="flex-shrink-0">
        <FreshnessIndicator
          timestamp={host.lastSeen}
          staleThresholdMs={5 * 60 * 1000}
          size="sm"
        />
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

// Compact variant for dense lists
export function HostRowCompact({ host, onClick, className }: Omit<HostRowProps, "compact">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded cursor-pointer transition-colors",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <StatusBadge status={host.status} size="sm" showLabel={false} />
      <span className="font-mono text-sm truncate flex-1">{host.hostname}</span>
      <span className="text-xs text-muted-foreground">{host.ipAddress}</span>
    </div>
  );
}

// Skeleton for loading state
export function HostRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card/50 animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="p-2 rounded-md bg-muted">
          <div className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="h-4 w-32 bg-muted rounded" />
          {!compact && <div className="h-3 w-48 bg-muted rounded mt-1" />}
        </div>
      </div>
      <div className="flex gap-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        {!compact && <div className="h-4 w-24 bg-muted rounded" />}
      </div>
    </div>
  );
}
