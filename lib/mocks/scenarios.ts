import type {
  FleetOverview,
  AggregatedCapabilities,
  StateScenario,
  ScenarioConfig,
  Scenario,
} from "@/lib/types";
import { connectors } from "./connectors"
import { hosts } from "./hosts"
import { computeClusters, storageClusters, kubernetesClusters, applications } from "./clusters"

// Re-export for convenience
export { connectors } from "./connectors"
export { hosts } from "./hosts"

export function getConnectorsByScenario(scenario: StateScenario | string) {
  const config = scenarioConfigs[scenario as StateScenario] || scenarioConfigs.healthy
  return connectors.map(c => ({
    ...c,
    status: config.connectorStatuses[c.id] || c.status,
  }))
}

export function getHostsByScenario(scenario: StateScenario | string) {
  if (scenario === "down") {
    return hosts.map(h => ({ ...h, status: "unknown" as const }))
  }
  if (scenario === "stale") {
    return hosts.map(h => ({ ...h, freshness: { ...h.freshness, stale: true } }))
  }
  if (scenario === "degraded" || scenario === "partial-data") {
    return hosts.map((h, i) => ({
      ...h,
      status: i % 3 === 0 ? "warning" as const : h.status,
    }))
  }
  return hosts
}

// ============================================================================
// SCENARIO CONFIGURATIONS
// ============================================================================

export const scenarioConfigs: Record<StateScenario, ScenarioConfig> = {
  healthy: {
    scenario: "healthy",
    description: "All systems operational, no issues detected",
    connectorStatuses: {
      "conn-prod-jkt-1": "healthy",
      "conn-prod-sgp-1": "healthy",
      "conn-staging-jkt-1": "healthy",
    },
    capabilities: {
      storage: true,
      kubernetes: true,
      apps: true,
    },
    dataFreshness: "fresh",
  },
  degraded: {
    scenario: "degraded",
    description: "Some connectors experiencing issues, partial data available",
    connectorStatuses: {
      "conn-prod-jkt-1": "healthy",
      "conn-prod-sgp-1": "healthy",
      "conn-prod-hkg-1": "degraded",
      "conn-prod-syd-1": "down",
    },
    capabilities: {
      storage: true,
      kubernetes: true,
      apps: true,
    },
    dataFreshness: "mixed",
  },
  down: {
    scenario: "down",
    description: "Primary connector is down, limited visibility",
    connectorStatuses: {
      "conn-prod-jkt-1": "down",
      "conn-prod-sgp-1": "healthy",
      "conn-prod-hkg-1": "down",
    },
    capabilities: {
      storage: true,
      kubernetes: false,
      apps: false,
    },
    dataFreshness: "stale",
  },
  stale: {
    scenario: "stale",
    description: "Data is stale across all connectors",
    connectorStatuses: {
      "conn-prod-jkt-1": "healthy",
      "conn-prod-sgp-1": "healthy",
      "conn-prod-hkg-1": "healthy",
    },
    capabilities: {
      storage: true,
      kubernetes: true,
      apps: true,
    },
    dataFreshness: "stale",
  },
  "partial-data": {
    scenario: "partial-data",
    description: "Some connectors returning incomplete data",
    connectorStatuses: {
      "conn-prod-jkt-1": "healthy",
      "conn-prod-sgp-1": "degraded",
      "conn-prod-hkg-1": "degraded",
    },
    capabilities: {
      storage: true,
      kubernetes: true,
      apps: true,
    },
    dataFreshness: "mixed",
  },
  "empty-capability": {
    scenario: "empty-capability",
    description: "No connectors support optional capabilities",
    connectorStatuses: {
      "conn-prod-jkt-1": "healthy",
      "conn-prod-sgp-1": "healthy",
    },
    capabilities: {
      storage: false,
      kubernetes: false,
      apps: false,
    },
    dataFreshness: "fresh",
  },
  mixed: {
    scenario: "mixed",
    description: "Realistic mixed state with various issues",
    connectorStatuses: {
      "conn-prod-jkt-1": "healthy",
      "conn-prod-sgp-1": "healthy",
      "conn-prod-hkg-1": "degraded",
      "conn-prod-syd-1": "down",
    },
    capabilities: {
      storage: true,
      kubernetes: true,
      apps: true,
    },
    dataFreshness: "mixed",
  },
}

// ============================================================================
// FLEET OVERVIEW BY SCENARIO
// ============================================================================

export function getFleetOverviewByScenario(scenario: StateScenario): FleetOverview {
  const config = scenarioConfigs[scenario]
  const scenarioConnectors = getConnectorsByScenario(scenario)
  const scenarioHosts = getHostsByScenario(scenario === "empty" ? "all" : scenario)

  // Calculate aggregated capabilities
  const capabilities: AggregatedCapabilities = {
    hasHostMetrics: scenarioConnectors.some(c => c.capabilities.hostMetrics),
    hasClusterMetrics: scenarioConnectors.some(c => c.capabilities.clusterMetrics),
    hasStorageMetrics: config.capabilities.storage && scenarioConnectors.some(c => c.capabilities.storageMetrics),
    hasKubernetesMetrics: config.capabilities.kubernetes && scenarioConnectors.some(c => c.capabilities.kubernetesMetrics),
    hasAppMetrics: config.capabilities.apps && scenarioConnectors.some(c => c.capabilities.appMetrics),
    totalConnectors: scenarioConnectors.length,
    healthyConnectors: scenarioConnectors.filter(c => c.status === "healthy").length,
    degradedConnectors: scenarioConnectors.filter(c => c.status === "degraded").length,
    downConnectors: scenarioConnectors.filter(c => c.status === "down").length,
  }

  // Calculate fleet health based on scenario
  const baseHealth = {
    totalHosts: hosts.length,
    healthyHosts: hosts.filter(h => h.status === "healthy").length,
    warningHosts: hosts.filter(h => h.status === "warning").length,
    criticalHosts: hosts.filter(h => h.status === "critical").length,
    downHosts: hosts.filter(h => h.status === "down").length,
    unknownHosts: hosts.filter(h => h.status === "unknown").length,
    staleHosts: hosts.filter(h => h.freshness.stale).length,
  }

  // Adjust based on scenario
  const health = scenario === "down" 
    ? { ...baseHealth, unknownHosts: baseHealth.totalHosts, healthyHosts: 0, warningHosts: 0, criticalHosts: 0 }
    : scenario === "stale"
    ? { ...baseHealth, staleHosts: baseHealth.totalHosts }
    : baseHealth

  const failedConnectors = Object.entries(config.connectorStatuses)
    .filter(([, status]) => status === "down")
    .map(([id]) => id)

  return {
    health,
    capabilities,
    computeClusters: {
      total: config.capabilities.kubernetes ? computeClusters.length : computeClusters.filter(c => !c.relatedKubernetesClusterId).length,
      healthy: computeClusters.filter(c => c.status === "healthy").length,
      degraded: computeClusters.filter(c => c.status !== "healthy").length,
    },
    storageClusters: {
      total: config.capabilities.storage ? storageClusters.length : 0,
      healthy: config.capabilities.storage ? storageClusters.filter(c => c.status === "healthy").length : 0,
      degraded: config.capabilities.storage ? storageClusters.filter(c => c.status !== "healthy").length : 0,
    },
    kubernetesClusters: {
      total: config.capabilities.kubernetes ? kubernetesClusters.length : 0,
      healthy: config.capabilities.kubernetes ? kubernetesClusters.filter(c => c.status === "healthy").length : 0,
      degraded: config.capabilities.kubernetes ? kubernetesClusters.filter(c => c.status !== "healthy").length : 0,
    },
    applications: {
      total: config.capabilities.apps ? applications.length : 0,
      healthy: config.capabilities.apps ? applications.filter(a => a.status === "healthy").length : 0,
      degraded: config.capabilities.apps ? applications.filter(a => a.status !== "healthy").length : 0,
    },
    lastUpdatedAt: config.dataFreshness === "stale" ? "2026-03-26T09:00:00Z" : "2026-03-26T10:15:00Z",
    partialData: scenario === "partial-data" || scenario === "degraded",
    failedConnectors,
  }
}

// ============================================================================
// CAPABILITY CHECKS
// ============================================================================

export function getAggregatedCapabilities(scenario: StateScenario = "mixed"): AggregatedCapabilities {
  const overview = getFleetOverviewByScenario(scenario)
  return overview.capabilities
}

export function hasStorageCapability(scenario: StateScenario = "mixed"): boolean {
  return getAggregatedCapabilities(scenario).hasStorageMetrics
}

export function hasKubernetesCapability(scenario: StateScenario = "mixed"): boolean {
  return getAggregatedCapabilities(scenario).hasKubernetesMetrics
}

export function hasAppCapability(scenario: StateScenario = "mixed"): boolean {
  return getAggregatedCapabilities(scenario).hasAppMetrics
}

// ============================================================================
// DEFAULT EXPORT - MIXED SCENARIO (REALISTIC)
// ============================================================================

export const defaultFleetOverview = getFleetOverviewByScenario("mixed")
export const defaultCapabilities = getAggregatedCapabilities("mixed")

// ============================================================================
// SCENARIO LIST FOR UI (what the page component expects)
// ============================================================================

import { dashboards } from "./dashboards"
import type { ScenarioData, Dashboard } from "@/lib/types"

export const scenarios: Scenario[] = [
  { id: "healthy", name: "All Healthy", state: "healthy", description: "All systems operational" },
  { id: "degraded", name: "Degraded", state: "degraded", description: "Some connectors experiencing issues" },
  { id: "down", name: "Critical", state: "down", description: "Primary connector is down" },
  { id: "stale", name: "Stale Data", state: "stale", description: "Data is stale across connectors" },
  { id: "partial-data", name: "Partial Data", state: "partial", description: "Incomplete data from some connectors" },
  { id: "empty-capability", name: "Empty Capability", state: "empty", description: "No optional capabilities" },
]

export function getScenarioData(scenarioId: string): ScenarioData {
  const scenario = (scenarioId || "healthy") as "healthy" | "degraded" | "down" | "stale" | "partial-data" | "empty-capability"
  const scenarioHosts = getHostsByScenario(scenario === "empty-capability" ? "healthy" : scenario)
  const scenarioConnectors = getConnectorsByScenario(scenario === "empty-capability" ? "healthy" : scenario)
  
  // Get all cluster types
  const allClusters = [...computeClusters, ...storageClusters, ...kubernetesClusters]
  
  // Filter based on capability
  const config = scenarioConfigs[scenario] || scenarioConfigs.healthy
  const filteredClusters = allClusters.filter(cluster => {
    // Always show compute clusters
    if ('avgCpuUsagePct' in cluster) return true
    // Show storage if capability enabled
    if ('capacity' in cluster) return config.capabilities.storage
    // Show k8s if capability enabled
    if ('podCount' in cluster) return config.capabilities.kubernetes
    return true
  })
  
  const dashboard: Dashboard = dashboards[0]
  
  return {
    clusters: filteredClusters as any,
    hosts: scenarioHosts,
    connectors: scenarioConnectors,
    dashboard,
  }
}
