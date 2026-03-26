"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./status-badge"
import { CapabilityList, CapabilityIcons } from "./capability-badge"
import { FreshnessCompact } from "./freshness-indicator"
import { 
  MoreHorizontal, 
  ExternalLink, 
  Settings, 
  Play, 
  Pause,
  TestTube,
  ChevronRight
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Connector } from "@/lib/types"
import Link from "next/link"

interface ConnectorCardProps {
  connector: Connector
  variant?: "default" | "compact"
  onTest?: (id: string) => void
  onToggle?: (id: string, enabled: boolean) => void
  className?: string
}

export function ConnectorCard({ 
  connector, 
  variant = "default",
  onTest,
  onToggle,
  className 
}: ConnectorCardProps) {
  const { 
    id, 
    name, 
    baseUrl, 
    environment, 
    site, 
    datacenter,
    enabled, 
    status, 
    lastCheckedAt, 
    latencyMs,
    capabilities,
    coverage,
  } = connector

  if (variant === "compact") {
    return (
      <Card className={cn(
        "p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        !enabled && "opacity-60",
        className
      )}>
        <Link href={`/connectors/${id}`} className="block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <StatusBadge status={status} showLabel={false} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{site} / {datacenter}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CapabilityIcons capabilities={capabilities} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "p-4",
      !enabled && "opacity-60",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href={`/connectors/${id}`}
              className="text-sm font-medium hover:underline truncate"
            >
              {name}
            </Link>
            {!enabled && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Disabled
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {site} / {datacenter} / {environment}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} size="sm" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/connectors/${id}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Link>
              </DropdownMenuItem>
              {onTest && (
                <DropdownMenuItem onClick={() => onTest(id)}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onToggle && (
                <DropdownMenuItem onClick={() => onToggle(id, !enabled)}>
                  {enabled ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Enable
                    </>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* URL */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <span className="truncate font-mono">{baseUrl}</span>
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </div>

      {/* Capabilities */}
      <div className="mb-3">
        <CapabilityList capabilities={capabilities} size="sm" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-border pt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Hosts</span>
          <span className="font-medium tabular-nums">{coverage.hosts}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Clusters</span>
          <span className="font-medium tabular-nums">{coverage.clusters}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Storage</span>
          <span className="font-medium tabular-nums">{coverage.storageClusters}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">K8s</span>
          <span className="font-medium tabular-nums">{coverage.kubernetesClusters}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <FreshnessCompact lastUpdatedAt={lastCheckedAt} />
        {latencyMs > 0 && (
          <span className={cn(
            "text-xs tabular-nums",
            latencyMs > 500 ? "text-status-warning" : "text-muted-foreground"
          )}>
            {latencyMs}ms
          </span>
        )}
      </div>
    </Card>
  )
}

// Connector status summary for overview pages
export function ConnectorStatusSummary({ 
  connectors,
  className 
}: { 
  connectors: Connector[]
  className?: string 
}) {
  const healthy = connectors.filter(c => c.status === "healthy" && c.enabled).length
  const degraded = connectors.filter(c => c.status === "degraded" && c.enabled).length
  const down = connectors.filter(c => c.status === "down" && c.enabled).length
  const total = connectors.filter(c => c.enabled).length

  return (
    <div className={cn("flex items-center gap-4 text-xs", className)}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-status-healthy" />
        <span className="text-muted-foreground">{healthy} healthy</span>
      </div>
      {degraded > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-warning" />
          <span className="text-status-warning">{degraded} degraded</span>
        </div>
      )}
      {down > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-critical" />
          <span className="text-status-critical">{down} down</span>
        </div>
      )}
      <span className="text-muted-foreground/60">
        {healthy}/{total} active
      </span>
    </div>
  )
}
