import type { Connector } from "@/lib/types"

// ============================================================================
// CONNECTOR MOCK DATA
// Represents different connector states and capabilities
// ============================================================================

const NOW = "2026-03-26T10:15:00Z"

export const connectors: Connector[] = [
  // HEALTHY - Full capabilities
  {
    id: "conn-prod-jkt-1",
    name: "Jakarta DC Primary",
    baseUrl: "https://prometheus-jkt-1.internal:9090",
    environment: "production",
    site: "jakarta",
    datacenter: "dc-jkt-1",
    enabled: true,
    status: "healthy",
    lastCheckedAt: NOW,
    latencyMs: 45,
    capabilities: {
      hostMetrics: true,
      clusterMetrics: true,
      storageMetrics: true,
      kubernetesMetrics: true,
      appMetrics: true,
    },
    coverage: {
      hosts: 127,
      clusters: 4,
      storageClusters: 2,
      kubernetesClusters: 2,
      apps: 18,
    },
    authMode: "bearer",
    notes: "Primary production monitoring for Jakarta datacenter",
  },
  // HEALTHY - Host + Storage only
  {
    id: "conn-prod-sgp-1",
    name: "Singapore DC Storage",
    baseUrl: "https://prometheus-sgp-1.internal:9090",
    environment: "production",
    site: "singapore",
    datacenter: "dc-sgp-1",
    enabled: true,
    status: "healthy",
    lastCheckedAt: NOW,
    latencyMs: 62,
    capabilities: {
      hostMetrics: true,
      clusterMetrics: true,
      storageMetrics: true,
      kubernetesMetrics: false,
      appMetrics: false,
    },
    coverage: {
      hosts: 84,
      clusters: 3,
      storageClusters: 3,
      kubernetesClusters: 0,
      apps: 0,
    },
    authMode: "bearer",
    notes: "Storage-focused monitoring for Singapore",
  },
  // DEGRADED - Some scrapes failing
  {
    id: "conn-prod-hkg-1",
    name: "Hong Kong DC Primary",
    baseUrl: "https://prometheus-hkg-1.internal:9090",
    environment: "production",
    site: "hongkong",
    datacenter: "dc-hkg-1",
    enabled: true,
    status: "degraded",
    lastCheckedAt: NOW,
    latencyMs: 890,
    capabilities: {
      hostMetrics: true,
      clusterMetrics: true,
      storageMetrics: true,
      kubernetesMetrics: true,
      appMetrics: true,
    },
    coverage: {
      hosts: 96,
      clusters: 3,
      storageClusters: 1,
      kubernetesClusters: 1,
      apps: 12,
    },
    authMode: "basic",
    notes: "High latency - investigating network issues",
  },
  // DOWN - Connection failed
  {
    id: "conn-prod-syd-1",
    name: "Sydney DC Primary",
    baseUrl: "https://prometheus-syd-1.internal:9090",
    environment: "production",
    site: "sydney",
    datacenter: "dc-syd-1",
    enabled: true,
    status: "down",
    lastCheckedAt: "2026-03-26T09:45:00Z",
    latencyMs: 0,
    capabilities: {
      hostMetrics: true,
      clusterMetrics: true,
      storageMetrics: true,
      kubernetesMetrics: false,
      appMetrics: true,
    },
    coverage: {
      hosts: 0,
      clusters: 0,
      storageClusters: 0,
      kubernetesClusters: 0,
      apps: 0,
    },
    authMode: "bearer",
    notes: "Connection timeout - maintenance window scheduled",
  },
  // HEALTHY - Host metrics only
  {
    id: "conn-staging-jkt-1",
    name: "Jakarta Staging",
    baseUrl: "https://prometheus-staging-jkt.internal:9090",
    environment: "staging",
    site: "jakarta",
    datacenter: "dc-jkt-1",
    enabled: true,
    status: "healthy",
    lastCheckedAt: NOW,
    latencyMs: 38,
    capabilities: {
      hostMetrics: true,
      clusterMetrics: true,
      storageMetrics: false,
      kubernetesMetrics: true,
      appMetrics: true,
    },
    coverage: {
      hosts: 24,
      clusters: 1,
      storageClusters: 0,
      kubernetesClusters: 1,
      apps: 8,
    },
    authMode: "none",
  },
  // MISCONFIGURED
  {
    id: "conn-dev-local",
    name: "Development Local",
    baseUrl: "http://localhost:9090",
    environment: "development",
    site: "local",
    datacenter: "dev",
    enabled: true,
    status: "misconfigured",
    lastCheckedAt: NOW,
    latencyMs: 0,
    capabilities: {
      hostMetrics: false,
      clusterMetrics: false,
      storageMetrics: false,
      kubernetesMetrics: false,
      appMetrics: false,
    },
    coverage: {
      hosts: 0,
      clusters: 0,
      storageClusters: 0,
      kubernetesClusters: 0,
      apps: 0,
    },
    authMode: "none",
    notes: "Invalid API endpoint - needs reconfiguration",
  },
  // DISABLED
  {
    id: "conn-legacy-tky-1",
    name: "Tokyo DC Legacy",
    baseUrl: "https://prometheus-tky-legacy.internal:9090",
    environment: "production",
    site: "tokyo",
    datacenter: "dc-tky-1",
    enabled: false,
    status: "healthy",
    lastCheckedAt: "2026-03-20T15:00:00Z",
    latencyMs: 78,
    capabilities: {
      hostMetrics: true,
      clusterMetrics: false,
      storageMetrics: false,
      kubernetesMetrics: false,
      appMetrics: false,
    },
    coverage: {
      hosts: 45,
      clusters: 0,
      storageClusters: 0,
      kubernetesClusters: 0,
      apps: 0,
    },
    authMode: "basic",
    notes: "Disabled during migration to new monitoring stack",
  },
]

// ============================================================================
// CONNECTOR SCENARIO VARIATIONS
// ============================================================================

export function getConnectorsByScenario(scenario: string): Connector[] {
  switch (scenario) {
    case "healthy":
      return connectors.filter(c => c.status === "healthy" && c.enabled)
    case "degraded":
      return connectors.filter(c => c.enabled)
    case "down":
      return connectors.map(c => ({
        ...c,
        status: c.id === "conn-prod-jkt-1" ? "down" as const : c.status,
      }))
    case "empty-capability":
      return connectors.map(c => ({
        ...c,
        capabilities: {
          ...c.capabilities,
          storageMetrics: false,
          kubernetesMetrics: false,
          appMetrics: false,
        },
        coverage: {
          ...c.coverage,
          storageClusters: 0,
          kubernetesClusters: 0,
          apps: 0,
        },
      }))
    default:
      return connectors
  }
}

export function getConnectorById(id: string): Connector | undefined {
  return connectors.find(c => c.id === id)
}

export function getEnabledConnectors(): Connector[] {
  return connectors.filter(c => c.enabled)
}

export function getHealthyConnectors(): Connector[] {
  return connectors.filter(c => c.status === "healthy" && c.enabled)
}
