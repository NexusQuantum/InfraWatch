// Re-export all types
export * from "./entities"
export * from "./panels"
export * from "./sso"

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T
  meta: {
    timestamp: string
    partial: boolean
    stale: boolean
    errors?: string[]
    failedConnectors?: string[]
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  meta: {
    timestamp: string
    partial: boolean
  }
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface GlobalFilters {
  connectorIds: string[]
  sites: string[]
  datacenters: string[]
  environments: string[]
  timeRange: {
    kind: "relative" | "absolute"
    value: string
    from?: string
    to?: string
  }
}

export interface HostFilters extends GlobalFilters {
  clusterIds: string[]
  storageClusterIds: string[]
  kubernetesClusterIds: string[]
  roles: string[]
  statuses: string[]
}

// ============================================================================
// STATE SCENARIO TYPES (for mock data variations)
// ============================================================================

export type StateScenario = 
  | "healthy"
  | "degraded" 
  | "down"
  | "stale"
  | "partial-data"
  | "empty-capability"
  | "mixed"

export type ScenarioState = "healthy" | "degraded" | "down" | "stale" | "partial" | "empty"

export interface Scenario {
  id: string
  name: string
  state: ScenarioState
  description: string
}

export interface ScenarioConfig {
  scenario: StateScenario
  description: string
  connectorStatuses: Record<string, "healthy" | "degraded" | "down">
  capabilities: {
    storage: boolean
    kubernetes: boolean
    apps: boolean
  }
  dataFreshness: "fresh" | "stale" | "mixed"
}

export interface ScenarioData {
  clusters: UICluster[]
  hosts: UIHost[]
  connectors: Connector[]
  dashboard: Dashboard
}

// Cluster union type for flexibility (raw API types)
export type ClusterRaw = ComputeCluster | StorageCluster | KubernetesCluster

// ============================================================================
// UI-FRIENDLY TYPES (for components)
// ============================================================================

export type HealthStatus = "healthy" | "warning" | "degraded" | "critical" | "down" | "unknown"
export type Capability = "storage" | "kubernetes" | "app" | "compute" | "network"

export interface UICluster {
  id: string
  name: string
  type: "compute" | "storage" | "kubernetes"
  status: HealthStatus
  datacenter: string
  region: string
  site: string
  environment: string
  nodeCount: number
  healthyNodes?: number
  capabilities?: Capability[]
  resources?: {
    cpuPercent: number
    memPercent: number
    storagePercent?: number
  }
  kubernetes?: {
    namespaces: number
    pods: number
    services: number
    deployments: number
    unhealthyPods?: number
  }
  storage?: {
    totalBytes: number
    usedBytes: number
    usedPercent: number
    throughputRead?: number
    throughputWrite?: number
  }
  lastSeen: string
  connectorIds: string[]
}

export interface UIHost {
  id: string
  hostname: string
  status: HealthStatus
  ipAddress: string
  os?: string
  osVersion?: string
  clusterId?: string
  clusterName?: string
  datacenter: string
  site: string
  environment: string
  capabilities?: Capability[]
  metrics?: {
    cpuPercent: number
    memPercent: number
    diskPercent: number
    networkIn?: number
    networkOut?: number
  }
  lastSeen: string
  connectorId: string
}

// Alias for backward compatibility  
export type Cluster = UICluster
export type Host = UIHost
