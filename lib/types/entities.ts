// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export type EntityStatus = "healthy" | "warning" | "critical" | "down" | "unknown"
export type ConnectorStatus = "healthy" | "degraded" | "down" | "misconfigured"
export type AuthMode = "none" | "basic" | "bearer"
export type HostRole = "compute" | "storage" | "control-plane" | "app" | "mixed"

// ============================================================================
// CONNECTOR
// ============================================================================

export interface ConnectorCapabilities {
  hostMetrics: boolean
  clusterMetrics: boolean
  storageMetrics: boolean
  kubernetesMetrics: boolean
  appMetrics: boolean
}

export interface ConnectorCoverage {
  hosts: number
  clusters: number
  storageClusters: number
  kubernetesClusters: number
  apps: number
}

export interface Connector {
  id: string
  name: string
  baseUrl: string
  environment: string
  site: string
  datacenter: string
  enabled: boolean
  status: ConnectorStatus
  lastCheckedAt: string
  latencyMs: number
  capabilities: ConnectorCapabilities
  coverage: ConnectorCoverage
  authMode: AuthMode
  notes?: string
}

// ============================================================================
// HOST / NODE
// ============================================================================

export interface HostFreshness {
  lastScrapeAt: string
  stale: boolean
}

export interface HostCurrentMetrics {
  cpuUsagePct: number
  memoryUsagePct: number
  diskUsagePct: number
  networkRxBytesPerSec: number
  networkTxBytesPerSec: number
  networkErrorRate: number
  load1?: number
  uptimeSeconds?: number
}

export interface Host {
  id: string
  hostname: string
  instance: string
  connectorId: string
  site: string
  datacenter: string
  environment: string
  role: HostRole
  status: EntityStatus
  serverClusterId?: string
  storageClusterId?: string
  kubernetesClusterId?: string
  ipAddress?: string
  os?: string
  labels: Record<string, string>
  freshness: HostFreshness
  current: HostCurrentMetrics
}

// ============================================================================
// COMPUTE CLUSTER
// ============================================================================

export interface HotNode {
  hostId: string
  hostname: string
  cpuUsagePct: number
  memoryUsagePct: number
}

export interface ComputeCluster {
  id: string
  name: string
  connectorIds: string[]
  site: string
  datacenter: string
  environment: string
  status: EntityStatus
  nodeCount: number
  healthyNodeCount: number
  warningNodeCount: number
  criticalNodeCount: number
  avgCpuUsagePct: number
  avgMemoryUsagePct: number
  avgDiskUsagePct: number
  hottestNodes: HotNode[]
  relatedKubernetesClusterId?: string
}

// ============================================================================
// STORAGE CLUSTER
// ============================================================================

export interface StorageCapacity {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usedPct: number
}

export interface StorageThroughput {
  readBytesPerSec: number
  writeBytesPerSec: number
  readOpsPerSec?: number
  writeOpsPerSec?: number
}

export interface HotStorageNode {
  hostId: string
  hostname: string
  diskUsagePct: number
  networkTxBytesPerSec: number
}

export interface StorageCluster {
  id: string
  name: string
  connectorIds: string[]
  site: string
  datacenter: string
  environment: string
  status: EntityStatus
  nodeCount: number
  healthyNodeCount: number
  capacity: StorageCapacity
  throughput: StorageThroughput
  degradedComponentsCount: number
  hottestNodes: HotStorageNode[]
}

// ============================================================================
// KUBERNETES CLUSTER
// ============================================================================

export interface KubernetesCluster {
  id: string
  name: string
  connectorIds: string[]
  site: string
  datacenter: string
  environment: string
  status: EntityStatus
  nodeCount: number
  readyNodeCount: number
  podCount: number
  unhealthyPodCount: number
  deploymentCount: number
  unavailableDeploymentCount: number
  namespaceCount: number
  relatedComputeClusterId?: string
}

// ============================================================================
// APPLICATION / SERVICE
// ============================================================================

export interface AppCurrentMetrics {
  requestRatePerSec?: number
  errorRatePct?: number
  p95LatencyMs?: number
  cpuUsagePct?: number
  memoryUsagePct?: number
}

export interface Application {
  id: string
  name: string
  connectorIds: string[]
  environment: string
  site: string
  status: EntityStatus
  namespace?: string
  clusterIds: string[]
  instanceCount: number
  current: AppCurrentMetrics
}

// ============================================================================
// DASHBOARD
// ============================================================================

export type DashboardCategory = "overview" | "hosts" | "clusters" | "storage" | "kubernetes" | "apps" | "custom"
export type DashboardScope = "global" | "connector" | "cluster" | "host" | "storage-cluster" | "kubernetes-cluster" | "app"
export type DashboardOwner = "system" | "admin"

export interface DashboardCapabilityRequirements {
  hostMetrics?: boolean
  clusterMetrics?: boolean
  storageMetrics?: boolean
  kubernetesMetrics?: boolean
  appMetrics?: boolean
}

export interface Dashboard {
  id: string
  slug: string
  title: string
  description: string
  category: DashboardCategory
  scope: DashboardScope
  capabilityRequirements: DashboardCapabilityRequirements
  customizable: boolean
  lastUpdatedAt: string
  owner: DashboardOwner
  tags: string[]
}

// ============================================================================
// SAVED VIEW / PRESET
// ============================================================================

export interface TimeRangeFilter {
  kind: "relative" | "absolute"
  value: string
}

export interface SavedViewFilters {
  connectorIds?: string[]
  site?: string[]
  datacenter?: string[]
  environment?: string[]
  serverClusterIds?: string[]
  storageClusterIds?: string[]
  kubernetesClusterIds?: string[]
  hostIds?: string[]
  appIds?: string[]
  roles?: string[]
  namespaces?: string[]
  timeRange?: TimeRangeFilter
}

export interface SavedView {
  id: string
  name: string
  dashboardId: string
  filters: SavedViewFilters
  refreshSeconds?: number
  panelVisibility?: Record<string, boolean>
}

// ============================================================================
// AGGREGATED CAPABILITIES (for conditional rendering)
// ============================================================================

export interface AggregatedCapabilities {
  hasHostMetrics: boolean
  hasClusterMetrics: boolean
  hasStorageMetrics: boolean
  hasKubernetesMetrics: boolean
  hasAppMetrics: boolean
  totalConnectors: number
  healthyConnectors: number
  degradedConnectors: number
  downConnectors: number
}

// ============================================================================
// FLEET OVERVIEW SUMMARY
// ============================================================================

export interface FleetHealthSummary {
  totalHosts: number
  healthyHosts: number
  warningHosts: number
  criticalHosts: number
  downHosts: number
  unknownHosts: number
  staleHosts: number
}

export interface FleetOverview {
  health: FleetHealthSummary
  capabilities: AggregatedCapabilities
  computeClusters: {
    total: number
    healthy: number
    degraded: number
  }
  storageClusters: {
    total: number
    healthy: number
    degraded: number
  }
  kubernetesClusters: {
    total: number
    healthy: number
    degraded: number
  }
  applications: {
    total: number
    healthy: number
    degraded: number
  }
  lastUpdatedAt: string
  partialData: boolean
  failedConnectors: string[]
}
