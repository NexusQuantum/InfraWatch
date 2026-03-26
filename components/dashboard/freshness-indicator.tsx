"use client"

import { cn } from "@/lib/utils"
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { formatDistanceToNow, parseISO, differenceInMinutes } from "date-fns"
import { Button } from "@/components/ui/button"

interface FreshnessIndicatorProps {
  lastUpdatedAt: string
  staleThresholdMinutes?: number
  showIcon?: boolean
  showRefresh?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

type FreshnessStatus = "fresh" | "aging" | "stale" | "unknown"

function getFreshnessStatus(
  lastUpdatedAt: string, 
  staleThresholdMinutes: number
): FreshnessStatus {
  try {
    const date = parseISO(lastUpdatedAt)
    const minutesAgo = differenceInMinutes(new Date(), date)
    
    if (minutesAgo < staleThresholdMinutes / 2) return "fresh"
    if (minutesAgo < staleThresholdMinutes) return "aging"
    return "stale"
  } catch {
    return "unknown"
  }
}

function formatLastUpdated(lastUpdatedAt: string): string {
  try {
    const date = parseISO(lastUpdatedAt)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return "unknown"
  }
}

const statusConfig: Record<FreshnessStatus, { 
  icon: typeof Clock
  textClass: string 
  dotClass: string
}> = {
  fresh: {
    icon: CheckCircle,
    textClass: "text-status-healthy",
    dotClass: "bg-status-healthy",
  },
  aging: {
    icon: Clock,
    textClass: "text-status-warning",
    dotClass: "bg-status-warning",
  },
  stale: {
    icon: AlertTriangle,
    textClass: "text-status-stale",
    dotClass: "bg-status-stale",
  },
  unknown: {
    icon: Clock,
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
}

export function FreshnessIndicator({
  lastUpdatedAt,
  staleThresholdMinutes = 5,
  showIcon = true,
  showRefresh = false,
  onRefresh,
  isRefreshing = false,
  className,
}: FreshnessIndicatorProps) {
  const status = getFreshnessStatus(lastUpdatedAt, staleThresholdMinutes)
  const config = statusConfig[status]
  const Icon = config.icon
  const timeAgo = formatLastUpdated(lastUpdatedAt)

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {showIcon && (
        <span className={cn("flex items-center", config.textClass)}>
          <Icon className="h-3 w-3" />
        </span>
      )}
      <span className={cn("tabular-nums", config.textClass)}>
        {status === "stale" && "Stale: "}
        {timeAgo}
      </span>
      {showRefresh && onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw 
            className={cn(
              "h-3 w-3",
              isRefreshing && "animate-spin"
            )} 
          />
        </Button>
      )}
    </div>
  )
}

// Compact version showing just the dot and time
export function FreshnessCompact({
  lastUpdatedAt,
  staleThresholdMinutes = 5,
  className,
}: {
  lastUpdatedAt: string
  staleThresholdMinutes?: number
  className?: string
}) {
  const status = getFreshnessStatus(lastUpdatedAt, staleThresholdMinutes)
  const config = statusConfig[status]
  const timeAgo = formatLastUpdated(lastUpdatedAt)

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      <span className="text-muted-foreground tabular-nums">{timeAgo}</span>
    </div>
  )
}

// Last scraped indicator for hosts
export function ScrapeIndicator({
  lastScrapeAt,
  stale,
  className,
}: {
  lastScrapeAt: string
  stale: boolean
  className?: string
}) {
  const timeAgo = formatLastUpdated(lastScrapeAt)

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs",
      stale ? "text-status-stale" : "text-muted-foreground",
      className
    )}>
      {stale ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span className="tabular-nums">
        {stale && "Stale: "}
        Last scrape {timeAgo}
      </span>
    </div>
  )
}

// Refresh control with auto-refresh indicator
export function RefreshControl({
  lastUpdatedAt,
  autoRefreshSeconds,
  onRefresh,
  isRefreshing = false,
  className,
}: {
  lastUpdatedAt: string
  autoRefreshSeconds?: number
  onRefresh: () => void
  isRefreshing?: boolean
  className?: string
}) {
  const timeAgo = formatLastUpdated(lastUpdatedAt)

  return (
    <div className={cn("flex items-center gap-3 text-xs", className)}>
      <span className="text-muted-foreground tabular-nums">
        Updated {timeAgo}
      </span>
      {autoRefreshSeconds && (
        <span className="text-muted-foreground/60">
          Auto-refresh: {autoRefreshSeconds}s
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1.5"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw 
          className={cn(
            "h-3 w-3",
            isRefreshing && "animate-spin"
          )} 
        />
        Refresh
      </Button>
    </div>
  )
}
