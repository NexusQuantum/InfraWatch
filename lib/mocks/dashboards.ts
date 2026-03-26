import type { Dashboard, SavedView } from "@/lib/types"

// ============================================================================
// DASHBOARD MOCK DATA
// ============================================================================

export const dashboards: Dashboard[] = [
  // Overview dashboards
  {
    id: "dash-fleet-overview",
    slug: "fleet-overview",
    title: "Fleet Overview",
    description: "High-level health and status across all infrastructure",
    category: "overview",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T08:00:00Z",
    owner: "system",
    tags: ["overview", "fleet", "health"],
  },
  {
    id: "dash-executive-summary",
    slug: "executive-summary",
    title: "Executive Summary",
    description: "Key metrics and alerts for leadership review",
    category: "overview",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-25T14:30:00Z",
    owner: "system",
    tags: ["overview", "summary", "kpi"],
  },

  // Host dashboards
  {
    id: "dash-host-detail",
    slug: "host-detail",
    title: "Host Detail",
    description: "Detailed metrics for a single host",
    category: "hosts",
    scope: "host",
    capabilityRequirements: {
      hostMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T09:15:00Z",
    owner: "system",
    tags: ["host", "detail", "server"],
  },
  {
    id: "dash-host-comparison",
    slug: "host-comparison",
    title: "Host Comparison",
    description: "Compare metrics across multiple hosts",
    category: "hosts",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-24T11:00:00Z",
    owner: "system",
    tags: ["host", "comparison", "analysis"],
  },

  // Cluster dashboards
  {
    id: "dash-cluster-overview",
    slug: "cluster-overview",
    title: "Cluster Overview",
    description: "Compute cluster health and resource utilization",
    category: "clusters",
    scope: "cluster",
    capabilityRequirements: {
      hostMetrics: true,
      clusterMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T07:45:00Z",
    owner: "system",
    tags: ["cluster", "compute", "overview"],
  },
  {
    id: "dash-cluster-capacity",
    slug: "cluster-capacity",
    title: "Cluster Capacity Planning",
    description: "Resource capacity trends and forecasting",
    category: "clusters",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
      clusterMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-23T16:20:00Z",
    owner: "system",
    tags: ["cluster", "capacity", "planning"],
  },

  // Storage dashboards
  {
    id: "dash-storage-overview",
    slug: "storage-overview",
    title: "Storage Overview",
    description: "Storage cluster health, capacity, and throughput",
    category: "storage",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
      storageMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T06:30:00Z",
    owner: "system",
    tags: ["storage", "overview", "capacity"],
  },
  {
    id: "dash-storage-detail",
    slug: "storage-detail",
    title: "Storage Cluster Detail",
    description: "Detailed metrics for a single storage cluster",
    category: "storage",
    scope: "storage-cluster",
    capabilityRequirements: {
      hostMetrics: true,
      storageMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-25T19:45:00Z",
    owner: "system",
    tags: ["storage", "detail", "cluster"],
  },

  // Kubernetes dashboards
  {
    id: "dash-kubernetes-overview",
    slug: "kubernetes-overview",
    title: "Kubernetes Overview",
    description: "Kubernetes cluster health, nodes, and workloads",
    category: "kubernetes",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
      kubernetesMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T05:00:00Z",
    owner: "system",
    tags: ["kubernetes", "k8s", "overview"],
  },
  {
    id: "dash-kubernetes-workloads",
    slug: "kubernetes-workloads",
    title: "Kubernetes Workloads",
    description: "Deployment and pod health across namespaces",
    category: "kubernetes",
    scope: "kubernetes-cluster",
    capabilityRequirements: {
      kubernetesMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-25T22:15:00Z",
    owner: "system",
    tags: ["kubernetes", "workloads", "deployments"],
  },

  // App dashboards
  {
    id: "dash-app-overview",
    slug: "app-overview",
    title: "Application Overview",
    description: "Application and service health, throughput, and latency",
    category: "apps",
    scope: "global",
    capabilityRequirements: {
      appMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T04:30:00Z",
    owner: "system",
    tags: ["application", "service", "overview"],
  },
  {
    id: "dash-app-detail",
    slug: "app-detail",
    title: "Application Detail",
    description: "Detailed metrics for a single application",
    category: "apps",
    scope: "app",
    capabilityRequirements: {
      appMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-25T20:00:00Z",
    owner: "system",
    tags: ["application", "detail", "service"],
  },

  // Custom dashboards
  {
    id: "dash-custom-ops-view",
    slug: "ops-daily-review",
    title: "Ops Daily Review",
    description: "Custom view for daily operations review",
    category: "custom",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
      clusterMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T09:00:00Z",
    owner: "admin",
    tags: ["custom", "operations", "daily"],
  },
  {
    id: "dash-custom-incident",
    slug: "incident-triage",
    title: "Incident Triage",
    description: "Custom view for incident investigation",
    category: "custom",
    scope: "global",
    capabilityRequirements: {
      hostMetrics: true,
      clusterMetrics: true,
      storageMetrics: true,
    },
    customizable: true,
    lastUpdatedAt: "2026-03-26T10:00:00Z",
    owner: "admin",
    tags: ["custom", "incident", "triage"],
  },
]

// ============================================================================
// SAVED VIEWS / PRESETS MOCK DATA
// ============================================================================

export const savedViews: SavedView[] = [
  // Production Jakarta view
  {
    id: "view-prod-jakarta",
    name: "Production Jakarta",
    dashboardId: "dash-fleet-overview",
    filters: {
      connectorIds: ["conn-prod-jkt-1"],
      site: ["jakarta"],
      environment: ["production"],
      timeRange: {
        kind: "relative",
        value: "6h",
      },
    },
    refreshSeconds: 60,
  },
  // All production sites
  {
    id: "view-all-production",
    name: "All Production Sites",
    dashboardId: "dash-fleet-overview",
    filters: {
      environment: ["production"],
      timeRange: {
        kind: "relative",
        value: "24h",
      },
    },
    refreshSeconds: 120,
  },
  // Storage focus view
  {
    id: "view-storage-critical",
    name: "Critical Storage",
    dashboardId: "dash-storage-overview",
    filters: {
      environment: ["production"],
      timeRange: {
        kind: "relative",
        value: "1h",
      },
    },
    refreshSeconds: 30,
    panelVisibility: {
      "panel-capacity-trend": true,
      "panel-throughput": true,
      "panel-hot-nodes": true,
    },
  },
  // Kubernetes staging
  {
    id: "view-k8s-staging",
    name: "Kubernetes Staging",
    dashboardId: "dash-kubernetes-overview",
    filters: {
      connectorIds: ["conn-staging-jkt-1"],
      environment: ["staging"],
      kubernetesClusterIds: ["k8s-staging"],
      timeRange: {
        kind: "relative",
        value: "3h",
      },
    },
    refreshSeconds: 60,
  },
  // App performance view
  {
    id: "view-app-latency",
    name: "High Latency Apps",
    dashboardId: "dash-app-overview",
    filters: {
      environment: ["production"],
      timeRange: {
        kind: "relative",
        value: "1h",
      },
    },
    refreshSeconds: 30,
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDashboardById(id: string): Dashboard | undefined {
  return dashboards.find(d => d.id === id)
}

export function getDashboardBySlug(slug: string): Dashboard | undefined {
  return dashboards.find(d => d.slug === slug)
}

export function getDashboardsByCategory(category: Dashboard["category"]): Dashboard[] {
  return dashboards.filter(d => d.category === category)
}

export function getCustomizableDashboards(): Dashboard[] {
  return dashboards.filter(d => d.customizable)
}

export function getSavedViewsForDashboard(dashboardId: string): SavedView[] {
  return savedViews.filter(v => v.dashboardId === dashboardId)
}

export function getSavedViewById(id: string): SavedView | undefined {
  return savedViews.find(v => v.id === id)
}

// Check if a dashboard's requirements are met by given capabilities
export function isDashboardAvailable(
  dashboard: Dashboard,
  capabilities: {
    hasHostMetrics: boolean
    hasClusterMetrics: boolean
    hasStorageMetrics: boolean
    hasKubernetesMetrics: boolean
    hasAppMetrics: boolean
  }
): boolean {
  const reqs = dashboard.capabilityRequirements
  
  if (reqs.hostMetrics && !capabilities.hasHostMetrics) return false
  if (reqs.clusterMetrics && !capabilities.hasClusterMetrics) return false
  if (reqs.storageMetrics && !capabilities.hasStorageMetrics) return false
  if (reqs.kubernetesMetrics && !capabilities.hasKubernetesMetrics) return false
  if (reqs.appMetrics && !capabilities.hasAppMetrics) return false
  
  return true
}
