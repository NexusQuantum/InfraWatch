/**
 * Mock API Layer
 * 
 * Simulates API responses with realistic delays and error handling.
 * Designed to be easily replaced with real Prometheus backend integration.
 */

import type {
  Connector,
  Host,
  ComputeCluster,
  StorageCluster,
  KubernetesCluster,
  Application,
  Dashboard,
  SavedView,
  FleetOverview,
  AggregatedCapabilities,
  ApiResponse,
  PaginatedResponse,
  StateScenario,
  HostFilters,
  PanelData,
  StatPanelData,
  TimeSeriesPanelData,
  RankingPanelData,
} from "@/lib/types"

import {
  connectors,
  getConnectorById,
  getEnabledConnectors,
  hosts,
  getHostById,
  getHostsByCluster,
  getHostsByStorageCluster,
  getHostsByConnector,
  getHotHosts,
  getUnhealthyHosts,
  computeClusters,
  storageClusters,
  kubernetesClusters,
  applications,
  getComputeClusterById,
  getStorageClusterById,
  getKubernetesClusterById,
  getApplicationById,
  dashboards,
  savedViews,
  getDashboardBySlug,
  getSavedViewsForDashboard,
  getFleetOverviewByScenario,
  getAggregatedCapabilities,
  statPanels,
  timeSeriesPanels,
  rankingPanels,
} from "@/lib/mocks"

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_CONFIG = {
  simulatedDelay: { min: 100, max: 300 },
  errorRate: 0.02, // 2% chance of random error
  currentScenario: "mixed" as StateScenario,
}

// ============================================================================
// UTILITIES
// ============================================================================

async function simulateDelay(): Promise<void> {
  const delay = Math.random() * (API_CONFIG.simulatedDelay.max - API_CONFIG.simulatedDelay.min) + API_CONFIG.simulatedDelay.min
  await new Promise(resolve => setTimeout(resolve, delay))
}

function shouldSimulateError(): boolean {
  return Math.random() < API_CONFIG.errorRate
}

function createApiResponse<T>(data: T, partial = false, stale = false): ApiResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      partial,
      stale,
    },
  }
}

function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  partial = false
): PaginatedResponse<T> {
  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (page - 1) * pageSize
  const paginatedData = data.slice(startIndex, startIndex + pageSize)

  return {
    data: paginatedData,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
    meta: {
      timestamp: new Date().toISOString(),
      partial,
    },
  }
}

// ============================================================================
// SCENARIO MANAGEMENT
// ============================================================================

export function setScenario(scenario: StateScenario): void {
  API_CONFIG.currentScenario = scenario
}

export function getCurrentScenario(): StateScenario {
  return API_CONFIG.currentScenario
}

// ============================================================================
// CONNECTOR API
// ============================================================================

export async function fetchConnectors(): Promise<ApiResponse<Connector[]>> {
  await simulateDelay()
  
  if (shouldSimulateError()) {
    throw new Error("Failed to fetch connectors")
  }

  return createApiResponse(connectors)
}

export async function fetchConnector(id: string): Promise<ApiResponse<Connector | null>> {
  await simulateDelay()
  
  const connector = getConnectorById(id)
  return createApiResponse(connector || null)
}

export async function fetchEnabledConnectors(): Promise<ApiResponse<Connector[]>> {
  await simulateDelay()
  return createApiResponse(getEnabledConnectors())
}

export async function testConnector(id: string): Promise<ApiResponse<{ success: boolean; latencyMs: number; error?: string }>> {
  await simulateDelay()
  
  const connector = getConnectorById(id)
  if (!connector) {
    return createApiResponse({ success: false, latencyMs: 0, error: "Connector not found" })
  }

  // Simulate test result based on connector status
  if (connector.status === "down") {
    return createApiResponse({ success: false, latencyMs: 0, error: "Connection refused" })
  }
  if (connector.status === "misconfigured") {
    return createApiResponse({ success: false, latencyMs: 0, error: "Invalid API response" })
  }

  return createApiResponse({ 
    success: true, 
    latencyMs: connector.latencyMs + Math.floor(Math.random() * 50) 
  })
}

// ============================================================================
// HOST API
// ============================================================================

export async function fetchHosts(filters?: Partial<HostFilters>): Promise<PaginatedResponse<Host>> {
  await simulateDelay()
  
  let filteredHosts = [...hosts]

  if (filters) {
    if (filters.connectorIds?.length) {
      filteredHosts = filteredHosts.filter(h => filters.connectorIds!.includes(h.connectorId))
    }
    if (filters.sites?.length) {
      filteredHosts = filteredHosts.filter(h => filters.sites!.includes(h.site))
    }
    if (filters.environments?.length) {
      filteredHosts = filteredHosts.filter(h => filters.environments!.includes(h.environment))
    }
    if (filters.clusterIds?.length) {
      filteredHosts = filteredHosts.filter(h => h.serverClusterId && filters.clusterIds!.includes(h.serverClusterId))
    }
    if (filters.roles?.length) {
      filteredHosts = filteredHosts.filter(h => filters.roles!.includes(h.role))
    }
    if (filters.statuses?.length) {
      filteredHosts = filteredHosts.filter(h => filters.statuses!.includes(h.status))
    }
  }

  return createPaginatedResponse(filteredHosts, 1, 50)
}

export async function fetchHost(id: string): Promise<ApiResponse<Host | null>> {
  await simulateDelay()
  return createApiResponse(getHostById(id) || null)
}

export async function fetchHostsByCluster(clusterId: string): Promise<ApiResponse<Host[]>> {
  await simulateDelay()
  return createApiResponse(getHostsByCluster(clusterId))
}

export async function fetchHostsByStorageCluster(storageClusterId: string): Promise<ApiResponse<Host[]>> {
  await simulateDelay()
  return createApiResponse(getHostsByStorageCluster(storageClusterId))
}

export async function fetchHotHosts(limit = 10): Promise<ApiResponse<Host[]>> {
  await simulateDelay()
  return createApiResponse(getHotHosts(limit))
}

export async function fetchUnhealthyHosts(): Promise<ApiResponse<Host[]>> {
  await simulateDelay()
  return createApiResponse(getUnhealthyHosts())
}

// ============================================================================
// CLUSTER API
// ============================================================================

export async function fetchComputeClusters(): Promise<ApiResponse<ComputeCluster[]>> {
  await simulateDelay()
  return createApiResponse(computeClusters)
}

export async function fetchComputeCluster(id: string): Promise<ApiResponse<ComputeCluster | null>> {
  await simulateDelay()
  return createApiResponse(getComputeClusterById(id) || null)
}

export async function fetchStorageClusters(): Promise<ApiResponse<StorageCluster[]>> {
  await simulateDelay()
  
  const capabilities = getAggregatedCapabilities(API_CONFIG.currentScenario)
  if (!capabilities.hasStorageMetrics) {
    return createApiResponse([])
  }
  
  return createApiResponse(storageClusters)
}

export async function fetchStorageCluster(id: string): Promise<ApiResponse<StorageCluster | null>> {
  await simulateDelay()
  return createApiResponse(getStorageClusterById(id) || null)
}

export async function fetchKubernetesClusters(): Promise<ApiResponse<KubernetesCluster[]>> {
  await simulateDelay()
  
  const capabilities = getAggregatedCapabilities(API_CONFIG.currentScenario)
  if (!capabilities.hasKubernetesMetrics) {
    return createApiResponse([])
  }
  
  return createApiResponse(kubernetesClusters)
}

export async function fetchKubernetesCluster(id: string): Promise<ApiResponse<KubernetesCluster | null>> {
  await simulateDelay()
  return createApiResponse(getKubernetesClusterById(id) || null)
}

// ============================================================================
// APPLICATION API
// ============================================================================

export async function fetchApplications(): Promise<ApiResponse<Application[]>> {
  await simulateDelay()
  
  const capabilities = getAggregatedCapabilities(API_CONFIG.currentScenario)
  if (!capabilities.hasAppMetrics) {
    return createApiResponse([])
  }
  
  return createApiResponse(applications)
}

export async function fetchApplication(id: string): Promise<ApiResponse<Application | null>> {
  await simulateDelay()
  return createApiResponse(getApplicationById(id) || null)
}

// ============================================================================
// DASHBOARD API
// ============================================================================

export async function fetchDashboards(): Promise<ApiResponse<Dashboard[]>> {
  await simulateDelay()
  return createApiResponse(dashboards)
}

export async function fetchDashboard(slug: string): Promise<ApiResponse<Dashboard | null>> {
  await simulateDelay()
  return createApiResponse(getDashboardBySlug(slug) || null)
}

export async function fetchSavedViews(dashboardId?: string): Promise<ApiResponse<SavedView[]>> {
  await simulateDelay()
  
  if (dashboardId) {
    return createApiResponse(getSavedViewsForDashboard(dashboardId))
  }
  
  return createApiResponse(savedViews)
}

// ============================================================================
// OVERVIEW API
// ============================================================================

export async function fetchFleetOverview(): Promise<ApiResponse<FleetOverview>> {
  await simulateDelay()
  
  const overview = getFleetOverviewByScenario(API_CONFIG.currentScenario)
  return createApiResponse(overview, overview.partialData, overview.lastUpdatedAt !== new Date().toISOString())
}

export async function fetchCapabilities(): Promise<ApiResponse<AggregatedCapabilities>> {
  await simulateDelay()
  return createApiResponse(getAggregatedCapabilities(API_CONFIG.currentScenario))
}

// ============================================================================
// PANEL DATA API
// ============================================================================

export async function fetchStatPanel(panelId: string): Promise<ApiResponse<StatPanelData | null>> {
  await simulateDelay()
  
  const panel = statPanels[panelId]
  return createApiResponse(panel || null)
}

export async function fetchTimeSeriesPanel(panelId: string): Promise<ApiResponse<TimeSeriesPanelData | null>> {
  await simulateDelay()
  
  const panel = timeSeriesPanels[panelId]
  return createApiResponse(panel || null)
}

export async function fetchRankingPanel(panelId: string): Promise<ApiResponse<RankingPanelData | null>> {
  await simulateDelay()
  
  const panel = rankingPanels[panelId]
  return createApiResponse(panel || null)
}

// ============================================================================
// FILTER OPTIONS API
// ============================================================================

export async function fetchFilterOptions(): Promise<ApiResponse<{
  sites: string[]
  datacenters: string[]
  environments: string[]
  roles: string[]
  connectors: Array<{ id: string; name: string }>
}>> {
  await simulateDelay()
  
  const sites = [...new Set(hosts.map(h => h.site))]
  const datacenters = [...new Set(hosts.map(h => h.datacenter))]
  const environments = [...new Set(hosts.map(h => h.environment))]
  const roles = [...new Set(hosts.map(h => h.role))]
  const connectorOptions = connectors.map(c => ({ id: c.id, name: c.name }))

  return createApiResponse({
    sites,
    datacenters,
    environments,
    roles,
    connectors: connectorOptions,
  })
}
