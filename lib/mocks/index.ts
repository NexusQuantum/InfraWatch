// ============================================================================
// MOCK DATA INDEX
// Re-export all mock data and utilities
// ============================================================================

// Connectors
export {
  connectors,
  getConnectorsByScenario,
  getConnectorById,
  getEnabledConnectors,
  getHealthyConnectors,
} from "./connectors"

// Hosts
export {
  hosts,
  getHostsByScenario,
  getHostById,
  getHostsByCluster,
  getHostsByStorageCluster,
  getHostsByKubernetesCluster,
  getHostsByConnector,
  getHotHosts,
  getUnhealthyHosts,
} from "./hosts"

// Clusters
export {
  computeClusters,
  storageClusters,
  kubernetesClusters,
  applications,
  getComputeClusterById,
  getStorageClusterById,
  getKubernetesClusterById,
  getApplicationById,
  getClustersByScenario,
} from "./clusters"

// Panels
export {
  statPanels,
  timeSeriesPanels,
  rankingPanels,
  tablePanels,
  healthMatrixPanels,
  capacityBreakdownPanels,
  loadingStates,
  errorStates,
  emptyStates,
} from "./panels"

// Dashboards
export {
  dashboards,
  savedViews,
  getDashboardById,
  getDashboardBySlug,
  getDashboardsByCategory,
  getCustomizableDashboards,
  getSavedViewsForDashboard,
  getSavedViewById,
  isDashboardAvailable,
} from "./dashboards"

// Scenarios
export {
  scenarioConfigs,
  getFleetOverviewByScenario,
  getAggregatedCapabilities,
  hasStorageCapability,
  hasKubernetesCapability,
  hasAppCapability,
  defaultFleetOverview,
  defaultCapabilities,
} from "./scenarios"
