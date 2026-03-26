import { cn } from "@/lib/utils"
import type { EntityStatus, ConnectorStatus, PanelStatus } from "@/lib/types"

type StatusType = EntityStatus | ConnectorStatus | PanelStatus

interface StatusBadgeProps {
  status: StatusType
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const statusConfig: Record<StatusType, { label: string; dotClass: string; bgClass: string }> = {
  healthy: {
    label: "Healthy",
    dotClass: "bg-status-healthy",
    bgClass: "bg-status-healthy/10 text-status-healthy border-status-healthy/20",
  },
  warning: {
    label: "Warning",
    dotClass: "bg-status-warning",
    bgClass: "bg-status-warning/10 text-status-warning border-status-warning/20",
  },
  critical: {
    label: "Critical",
    dotClass: "bg-status-critical",
    bgClass: "bg-status-critical/10 text-status-critical border-status-critical/20",
  },
  down: {
    label: "Down",
    dotClass: "bg-status-down",
    bgClass: "bg-status-down/10 text-status-down border-status-down/20",
  },
  unknown: {
    label: "Unknown",
    dotClass: "bg-status-unknown",
    bgClass: "bg-status-unknown/10 text-status-unknown border-status-unknown/20",
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-status-warning",
    bgClass: "bg-status-warning/10 text-status-warning border-status-warning/20",
  },
  misconfigured: {
    label: "Misconfigured",
    dotClass: "bg-status-critical",
    bgClass: "bg-status-critical/10 text-status-critical border-status-critical/20",
  },
  loading: {
    label: "Loading",
    dotClass: "bg-muted-foreground animate-pulse",
    bgClass: "bg-muted/50 text-muted-foreground border-muted",
  },
  error: {
    label: "Error",
    dotClass: "bg-status-critical",
    bgClass: "bg-status-critical/10 text-status-critical border-status-critical/20",
  },
  stale: {
    label: "Stale",
    dotClass: "bg-status-stale",
    bgClass: "bg-status-stale/10 text-status-stale border-status-stale/20",
  },
  partial: {
    label: "Partial",
    dotClass: "bg-status-warning",
    bgClass: "bg-status-warning/10 text-status-warning border-status-warning/20",
  },
  empty: {
    label: "Empty",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted/50 text-muted-foreground border-muted",
  },
}

const sizeConfig = {
  sm: { dot: "h-1.5 w-1.5", text: "text-xs", padding: "px-1.5 py-0.5" },
  md: { dot: "h-2 w-2", text: "text-xs", padding: "px-2 py-1" },
  lg: { dot: "h-2.5 w-2.5", text: "text-sm", padding: "px-2.5 py-1" },
}

export function StatusBadge({ status, size = "md", showLabel = true, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown
  const sizes = sizeConfig[size]

  if (!showLabel) {
    return (
      <span
        className={cn("inline-block rounded-full", config.dotClass, sizes.dot, className)}
        title={config.label}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        config.bgClass,
        sizes.text,
        sizes.padding,
        className
      )}
    >
      <span className={cn("rounded-full", config.dotClass, sizes.dot)} />
      {config.label}
    </span>
  )
}

// Simple status dot component
export function StatusDot({ status, size = "md", className }: Omit<StatusBadgeProps, "showLabel">) {
  const config = statusConfig[status] || statusConfig.unknown
  const sizes = sizeConfig[size]

  return (
    <span
      className={cn("inline-block rounded-full", config.dotClass, sizes.dot, className)}
      title={config.label}
    />
  )
}

// Status indicator with optional pulse animation for active issues
export function StatusIndicator({ 
  status, 
  pulse = false,
  className 
}: { 
  status: StatusType
  pulse?: boolean
  className?: string 
}) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span className={cn("relative inline-flex h-3 w-3", className)}>
      {pulse && (status === "critical" || status === "down") && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            config.dotClass
          )}
        />
      )}
      <span className={cn("relative inline-flex h-3 w-3 rounded-full", config.dotClass)} />
    </span>
  )
}
