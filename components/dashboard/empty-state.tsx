"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Server, 
  Database, 
  Container, 
  AppWindow, 
  AlertCircle,
  Settings,
  Plus,
  RefreshCw,
  SearchX,
  Unplug
} from "lucide-react"
import type { ReactNode } from "react"

type EmptyStateReason = 
  | "no-data" 
  | "no-capability" 
  | "filtered-out" 
  | "not-configured"
  | "no-connectors"
  | "all-down"
  | "error"

interface EmptyStateProps {
  reason: EmptyStateReason
  title?: string
  message?: string
  domain?: "storage" | "kubernetes" | "apps" | "hosts" | "clusters" | "connectors"
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const reasonConfig: Record<EmptyStateReason, { 
  icon: typeof Server
  defaultTitle: string 
  defaultMessage: string
}> = {
  "no-data": {
    icon: SearchX,
    defaultTitle: "No data available",
    defaultMessage: "There is no data available for the selected time range or filters.",
  },
  "no-capability": {
    icon: Unplug,
    defaultTitle: "Capability not available",
    defaultMessage: "No connectors with this capability are currently configured.",
  },
  "filtered-out": {
    icon: SearchX,
    defaultTitle: "No results",
    defaultMessage: "No items match the current filters. Try adjusting your filter criteria.",
  },
  "not-configured": {
    icon: Settings,
    defaultTitle: "Not configured",
    defaultMessage: "This feature requires additional configuration to display data.",
  },
  "no-connectors": {
    icon: Unplug,
    defaultTitle: "No connectors",
    defaultMessage: "Add a Prometheus connector to start monitoring your infrastructure.",
  },
  "all-down": {
    icon: AlertCircle,
    defaultTitle: "All connectors unavailable",
    defaultMessage: "Unable to fetch data. All connectors are currently down or unreachable.",
  },
  "error": {
    icon: AlertCircle,
    defaultTitle: "Something went wrong",
    defaultMessage: "An error occurred while loading data. Please try again.",
  },
}

const domainIcons = {
  storage: Database,
  kubernetes: Container,
  apps: AppWindow,
  hosts: Server,
  clusters: Server,
  connectors: Unplug,
}

export function EmptyState({ 
  reason, 
  title, 
  message, 
  domain,
  action,
  className 
}: EmptyStateProps) {
  const config = reasonConfig[reason]
  const Icon = domain ? domainIcons[domain] : config.icon

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">
        {title || config.defaultTitle}
      </h3>
      <p className="text-xs text-muted-foreground max-w-[280px] mb-4">
        {message || config.defaultMessage}
      </p>
      {action && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={action.onClick}
          className="gap-2"
        >
          {reason === "error" ? <RefreshCw className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Capability-specific empty states
export function NoStorageCapability({ onConfigure }: { onConfigure?: () => void }) {
  return (
    <EmptyState
      reason="no-capability"
      domain="storage"
      title="Storage metrics not available"
      message="No connectors with storage metrics capability are configured. Add a connector that supports storage metrics to view this data."
      action={onConfigure ? { label: "Configure Connectors", onClick: onConfigure } : undefined}
    />
  )
}

export function NoKubernetesCapability({ onConfigure }: { onConfigure?: () => void }) {
  return (
    <EmptyState
      reason="no-capability"
      domain="kubernetes"
      title="Kubernetes metrics not available"
      message="No connectors with Kubernetes metrics capability are configured. Add a connector that supports Kubernetes metrics to view this data."
      action={onConfigure ? { label: "Configure Connectors", onClick: onConfigure } : undefined}
    />
  )
}

export function NoAppsCapability({ onConfigure }: { onConfigure?: () => void }) {
  return (
    <EmptyState
      reason="no-capability"
      domain="apps"
      title="Application metrics not available"
      message="No connectors with application metrics capability are configured. Add a connector that supports app metrics to view this data."
      action={onConfigure ? { label: "Configure Connectors", onClick: onConfigure } : undefined}
    />
  )
}

// Inline empty state for smaller areas
export function EmptyStateInline({ 
  message, 
  className 
}: { 
  message: string
  className?: string 
}) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-6 text-muted-foreground",
      className
    )}>
      <SearchX className="h-4 w-4" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

// Error state with retry
export function ErrorState({ 
  message, 
  onRetry,
  className 
}: { 
  message?: string
  onRetry?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      reason="error"
      message={message}
      action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
      className={className}
    />
  )
}
