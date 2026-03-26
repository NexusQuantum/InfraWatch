"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatusDot } from "./status-badge"
import { TrendingUp, TrendingDown, Minus, AlertCircle, Clock } from "lucide-react"
import type { StatPanelData, PanelUnit, PanelStatus } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatValue(value: number | null, unit: PanelUnit): string {
  if (value === null) return "—"
  
  switch (unit) {
    case "percent":
      return `${value.toFixed(1)}%`
    case "bytes":
      return formatBytes(value)
    case "bytes-per-sec":
      return `${formatBytes(value)}/s`
    case "ops-per-sec":
      return `${formatNumber(value)} ops/s`
    case "ms":
      return `${value.toFixed(0)}ms`
    case "count":
      return formatNumber(value)
    case "rate-per-sec":
      return `${formatNumber(value)}/s`
    default:
      return value.toFixed(1)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toFixed(0)
}

function formatChange(change: number | undefined, unit: PanelUnit): string {
  if (change === undefined) return ""
  const sign = change > 0 ? "+" : ""
  if (unit === "percent") return `${sign}${change.toFixed(1)}%`
  return `${sign}${formatNumber(change)}`
}

// ============================================================================
// STAT CARD GRID
// ============================================================================

export function StatCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {children}
    </div>
  )
}

// ============================================================================
// STAT CARD SKELETON
// ============================================================================

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </Card>
  )
}

// ============================================================================
// STAT CARD - Simple version with icon
// ============================================================================

interface StatCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
  trend?: "up" | "down" | "stable"
  change?: string
  variant?: "default" | "warning" | "critical"
  footer?: React.ReactNode
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  change, 
  variant = "default", 
  footer, 
  className 
}: StatCardProps) {
  return (
    <Card className={cn(
      "p-4 relative overflow-hidden",
      variant === "critical" && "border-status-critical/30",
      variant === "warning" && "border-status-warning/30",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
          <div className="text-2xl font-semibold tabular-nums">
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn(
            "p-2 rounded-md",
            variant === "critical" ? "bg-status-critical/10 text-status-critical" :
            variant === "warning" ? "bg-status-warning/10 text-status-warning" :
            "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
        )}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  )
}

// ============================================================================
// DATA STAT CARD - For panel data with status
// ============================================================================

interface DataStatCardProps {
  data?: StatPanelData | null
  isLoading?: boolean
  isError?: boolean
  error?: string
  className?: string
}

export function DataStatCard({ data, isLoading, isError, error, className }: DataStatCardProps) {
  if (isLoading) {
    return <StatCardSkeleton className={className} />
  }

  if (isError || !data) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground">
          <AlertCircle className="h-5 w-5 mb-2" />
          <span className="text-xs text-center">{error || "Failed to load"}</span>
        </div>
      </Card>
    )
  }

  const { title, status, value, unit, change, changeDirection, meta } = data
  const isStale = meta.stale || status === "stale"
  const isPartial = meta.partialData || status === "partial"

  return (
    <Card className={cn("p-4 relative overflow-hidden", className)}>
      {/* Status indicator stripe */}
      <div 
        className={cn(
          "absolute top-0 left-0 w-1 h-full",
          status === "healthy" && "bg-status-healthy",
          status === "warning" && "bg-status-warning",
          status === "critical" && "bg-status-critical",
          status === "down" && "bg-status-down",
          (status === "unknown" || status === "loading") && "bg-muted-foreground",
          (status === "stale" || status === "partial") && "bg-status-stale"
        )}
      />
      
      <div className="pl-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium truncate">{title}</span>
          <div className="flex items-center gap-1.5">
            {isStale && (
              <span className="text-status-stale" title="Data may be stale">
                <Clock className="h-3 w-3" />
              </span>
            )}
            {isPartial && (
              <span className="text-status-warning" title="Partial data - some connectors failed">
                <AlertCircle className="h-3 w-3" />
              </span>
            )}
            <StatusDot status={status} size="sm" />
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-2">
          <span 
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              status === "critical" && "text-status-critical",
              status === "warning" && "text-status-warning",
              status === "down" && "text-status-down"
            )}
          >
            {formatValue(value, unit)}
          </span>
        </div>

        {/* Change indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {changeDirection === "up" && (
              <TrendingUp className={cn(
                "h-3 w-3",
                status === "critical" || status === "warning" 
                  ? "text-status-critical" 
                  : "text-muted-foreground"
              )} />
            )}
            {changeDirection === "down" && (
              <TrendingDown className={cn(
                "h-3 w-3",
                status === "healthy" 
                  ? "text-status-healthy" 
                  : "text-muted-foreground"
              )} />
            )}
            {changeDirection === "flat" && (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={cn(
              "text-xs tabular-nums",
              changeDirection === "up" && (status === "critical" || status === "warning") && "text-status-critical",
              changeDirection === "down" && status === "healthy" && "text-status-healthy",
              changeDirection !== "up" && changeDirection !== "down" && "text-muted-foreground"
            )}>
              {formatChange(change, unit)}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ============================================================================
// STAT COMPACT - For dense layouts
// ============================================================================

export function StatCompact({ 
  label, 
  value, 
  unit = "count",
  status = "healthy",
  className 
}: { 
  label: string
  value: number | string
  unit?: PanelUnit
  status?: PanelStatus
  className?: string
}) {
  const formattedValue = typeof value === "number" ? formatValue(value, unit) : value

  return (
    <div className={cn("flex items-center justify-between py-1.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span 
          className={cn(
            "text-sm font-medium tabular-nums",
            status === "critical" && "text-status-critical",
            status === "warning" && "text-status-warning",
            status === "down" && "text-status-down"
          )}
        >
          {formattedValue}
        </span>
        <StatusDot status={status} size="sm" />
      </div>
    </div>
  )
}
