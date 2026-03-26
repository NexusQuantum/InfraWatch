"use client"

import { cn } from "@/lib/utils"
import { 
  Server, 
  Database, 
  Container, 
  AppWindow, 
  HardDrive,
  Check,
  X
} from "lucide-react"
import type { ConnectorCapabilities, AggregatedCapabilities } from "@/lib/types"

interface CapabilityBadgeProps {
  capability: keyof ConnectorCapabilities
  enabled: boolean
  size?: "sm" | "md"
  showLabel?: boolean
  className?: string
}

const capabilityConfig = {
  hostMetrics: {
    label: "Hosts",
    icon: Server,
    description: "Host and node metrics",
  },
  clusterMetrics: {
    label: "Clusters",
    icon: HardDrive,
    description: "Compute cluster metrics",
  },
  storageMetrics: {
    label: "Storage",
    icon: Database,
    description: "Storage cluster metrics",
  },
  kubernetesMetrics: {
    label: "Kubernetes",
    icon: Container,
    description: "Kubernetes cluster metrics",
  },
  appMetrics: {
    label: "Apps",
    icon: AppWindow,
    description: "Application and service metrics",
  },
}

const sizeConfig = {
  sm: { icon: "h-3 w-3", text: "text-xs", padding: "px-1.5 py-0.5", gap: "gap-1" },
  md: { icon: "h-3.5 w-3.5", text: "text-xs", padding: "px-2 py-1", gap: "gap-1.5" },
}

export function CapabilityBadge({ 
  capability, 
  enabled, 
  size = "md", 
  showLabel = true,
  className 
}: CapabilityBadgeProps) {
  const config = capabilityConfig[capability]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        sizes.text,
        sizes.padding,
        sizes.gap,
        enabled
          ? "border-border bg-secondary text-foreground"
          : "border-border/50 bg-muted/30 text-muted-foreground line-through opacity-60",
        className
      )}
      title={`${config.description} ${enabled ? "enabled" : "not available"}`}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Display all capabilities in a row
export function CapabilityList({ 
  capabilities, 
  size = "md",
  showDisabled = true,
  className 
}: { 
  capabilities: ConnectorCapabilities | AggregatedCapabilities
  size?: "sm" | "md"
  showDisabled?: boolean
  className?: string
}) {
  // Normalize to ConnectorCapabilities format
  const normalized: ConnectorCapabilities = "hostMetrics" in capabilities
    ? capabilities as ConnectorCapabilities
    : {
        hostMetrics: (capabilities as AggregatedCapabilities).hasHostMetrics,
        clusterMetrics: (capabilities as AggregatedCapabilities).hasClusterMetrics,
        storageMetrics: (capabilities as AggregatedCapabilities).hasStorageMetrics,
        kubernetesMetrics: (capabilities as AggregatedCapabilities).hasKubernetesMetrics,
        appMetrics: (capabilities as AggregatedCapabilities).hasAppMetrics,
      }

  const entries = Object.entries(normalized) as [keyof ConnectorCapabilities, boolean][]
  const filteredEntries = showDisabled ? entries : entries.filter(([, enabled]) => enabled)

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {filteredEntries.map(([key, enabled]) => (
        <CapabilityBadge 
          key={key} 
          capability={key} 
          enabled={enabled} 
          size={size}
        />
      ))}
    </div>
  )
}

// Compact capability indicator (just icons)
export function CapabilityIcons({ 
  capabilities,
  className 
}: { 
  capabilities: ConnectorCapabilities | AggregatedCapabilities
  className?: string 
}) {
  // Normalize to ConnectorCapabilities format
  const normalized: ConnectorCapabilities = "hostMetrics" in capabilities
    ? capabilities as ConnectorCapabilities
    : {
        hostMetrics: (capabilities as AggregatedCapabilities).hasHostMetrics,
        clusterMetrics: (capabilities as AggregatedCapabilities).hasClusterMetrics,
        storageMetrics: (capabilities as AggregatedCapabilities).hasStorageMetrics,
        kubernetesMetrics: (capabilities as AggregatedCapabilities).hasKubernetesMetrics,
        appMetrics: (capabilities as AggregatedCapabilities).hasAppMetrics,
      }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {(Object.entries(normalized) as [keyof ConnectorCapabilities, boolean][]).map(([key, enabled]) => {
        const config = capabilityConfig[key]
        const Icon = config.icon
        return (
          <span
            key={key}
            className={cn(
              "flex items-center justify-center rounded p-1",
              enabled 
                ? "text-foreground bg-secondary" 
                : "text-muted-foreground/40 bg-muted/20"
            )}
            title={`${config.label}: ${enabled ? "Available" : "Not available"}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )
      })}
    </div>
  )
}

// Capability check indicator for dashboards
export function CapabilityCheck({ 
  label,
  available,
  className 
}: { 
  label: string
  available: boolean
  className?: string 
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        available ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      {available ? (
        <Check className="h-3 w-3 text-status-healthy" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      {label}
    </span>
  )
}
