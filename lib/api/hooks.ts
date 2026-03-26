/**
 * React Hooks for Data Fetching
 * 
 * Uses SWR for caching and revalidation.
 * These hooks abstract the mock API and can be easily updated
 * for real backend integration.
 */

"use client"

import useSWR from "swr"
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
  HostFilters,
  StatPanelData,
  TimeSeriesPanelData,
  RankingPanelData,
} from "@/lib/types"

import {
  fetchConnectors,
  fetchConnector,
  fetchEnabledConnectors,
  fetchHosts,
  fetchHost,
  fetchHostsByCluster,
  fetchHotHosts,
  fetchUnhealthyHosts,
  fetchComputeClusters,
  fetchComputeCluster,
  fetchStorageClusters,
  fetchStorageCluster,
  fetchKubernetesClusters,
  fetchKubernetesCluster,
  fetchApplications,
  fetchApplication,
  fetchDashboards,
  fetchDashboard,
  fetchSavedViews,
  fetchFleetOverview,
  fetchCapabilities,
  fetchStatPanel,
  fetchTimeSeriesPanel,
  fetchRankingPanel,
  fetchFilterOptions,
} from "./mock-api"

// ============================================================================
// SWR CONFIGURATION
// ============================================================================

const DEFAULT_SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
}

const REALTIME_SWR_CONFIG = {
  ...DEFAULT_SWR_CONFIG,
  refreshInterval: 30000, // 30 seconds for real-time data
}

// ============================================================================
// CONNECTOR HOOKS
// ============================================================================

export function useConnectors() {
  const { data, error, isLoading, mutate } = useSWR(
    "connectors",
    async () => {
      const response = await fetchConnectors()
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    connectors: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

export function useConnector(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `connector-${id}` : null,
    async () => {
      if (!id) return null
      const response = await fetchConnector(id)
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    connector: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

export function useEnabledConnectors() {
  const { data, error, isLoading } = useSWR(
    "connectors-enabled",
    async () => {
      const response = await fetchEnabledConnectors()
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    connectors: data ?? [],
    isLoading,
    isError: !!error,
  }
}

// ============================================================================
// HOST HOOKS
// ============================================================================

export function useHosts(filters?: Partial<HostFilters>) {
  const filterKey = filters ? JSON.stringify(filters) : "all"
  
  const { data, error, isLoading, mutate } = useSWR(
    `hosts-${filterKey}`,
    async () => {
      const response = await fetchHosts(filters)
      return response
    },
    REALTIME_SWR_CONFIG
  )

  return {
    hosts: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

export function useHost(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `host-${id}` : null,
    async () => {
      if (!id) return null
      const response = await fetchHost(id)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    host: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

export function useHostsByCluster(clusterId: string | null) {
  const { data, error, isLoading } = useSWR(
    clusterId ? `hosts-cluster-${clusterId}` : null,
    async () => {
      if (!clusterId) return []
      const response = await fetchHostsByCluster(clusterId)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    hosts: data ?? [],
    isLoading,
    isError: !!error,
  }
}

export function useHotHosts(limit = 10) {
  const { data, error, isLoading, mutate } = useSWR(
    `hot-hosts-${limit}`,
    async () => {
      const response = await fetchHotHosts(limit)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    hosts: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useUnhealthyHosts() {
  const { data, error, isLoading, mutate } = useSWR(
    "unhealthy-hosts",
    async () => {
      const response = await fetchUnhealthyHosts()
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    hosts: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

// ============================================================================
// CLUSTER HOOKS
// ============================================================================

export function useComputeClusters() {
  const { data, error, isLoading, mutate } = useSWR(
    "compute-clusters",
    async () => {
      const response = await fetchComputeClusters()
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    clusters: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useComputeCluster(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `compute-cluster-${id}` : null,
    async () => {
      if (!id) return null
      const response = await fetchComputeCluster(id)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    cluster: data,
    isLoading,
    isError: !!error,
  }
}

export function useStorageClusters() {
  const { data, error, isLoading, mutate } = useSWR(
    "storage-clusters",
    async () => {
      const response = await fetchStorageClusters()
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    clusters: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useStorageCluster(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `storage-cluster-${id}` : null,
    async () => {
      if (!id) return null
      const response = await fetchStorageCluster(id)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    cluster: data,
    isLoading,
    isError: !!error,
  }
}

export function useKubernetesClusters() {
  const { data, error, isLoading, mutate } = useSWR(
    "kubernetes-clusters",
    async () => {
      const response = await fetchKubernetesClusters()
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    clusters: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useKubernetesCluster(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `kubernetes-cluster-${id}` : null,
    async () => {
      if (!id) return null
      const response = await fetchKubernetesCluster(id)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    cluster: data,
    isLoading,
    isError: !!error,
  }
}

// ============================================================================
// APPLICATION HOOKS
// ============================================================================

export function useApplications() {
  const { data, error, isLoading, mutate } = useSWR(
    "applications",
    async () => {
      const response = await fetchApplications()
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    applications: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useApplication(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `application-${id}` : null,
    async () => {
      if (!id) return null
      const response = await fetchApplication(id)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    application: data,
    isLoading,
    isError: !!error,
  }
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

export function useDashboards() {
  const { data, error, isLoading } = useSWR(
    "dashboards",
    async () => {
      const response = await fetchDashboards()
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    dashboards: data ?? [],
    isLoading,
    isError: !!error,
  }
}

export function useDashboard(slug: string | null) {
  const { data, error, isLoading } = useSWR(
    slug ? `dashboard-${slug}` : null,
    async () => {
      if (!slug) return null
      const response = await fetchDashboard(slug)
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    dashboard: data,
    isLoading,
    isError: !!error,
  }
}

export function useSavedViews(dashboardId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    dashboardId ? `saved-views-${dashboardId}` : "saved-views",
    async () => {
      const response = await fetchSavedViews(dashboardId)
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    savedViews: data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

// ============================================================================
// OVERVIEW HOOKS
// ============================================================================

export function useFleetOverview() {
  const { data, error, isLoading, mutate } = useSWR(
    "fleet-overview",
    async () => {
      const response = await fetchFleetOverview()
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    overview: data,
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useCapabilities() {
  const { data, error, isLoading } = useSWR(
    "capabilities",
    async () => {
      const response = await fetchCapabilities()
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    capabilities: data,
    isLoading,
    isError: !!error,
    hasStorage: data?.hasStorageMetrics ?? false,
    hasKubernetes: data?.hasKubernetesMetrics ?? false,
    hasApps: data?.hasAppMetrics ?? false,
  }
}

// ============================================================================
// PANEL HOOKS
// ============================================================================

export function useStatPanel(panelId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    panelId ? `stat-panel-${panelId}` : null,
    async () => {
      if (!panelId) return null
      const response = await fetchStatPanel(panelId)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    panel: data,
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useTimeSeriesPanel(panelId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    panelId ? `timeseries-panel-${panelId}` : null,
    async () => {
      if (!panelId) return null
      const response = await fetchTimeSeriesPanel(panelId)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    panel: data,
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function useRankingPanel(panelId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    panelId ? `ranking-panel-${panelId}` : null,
    async () => {
      if (!panelId) return null
      const response = await fetchRankingPanel(panelId)
      return response.data
    },
    REALTIME_SWR_CONFIG
  )

  return {
    panel: data,
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

// ============================================================================
// FILTER OPTIONS HOOK
// ============================================================================

export function useFilterOptions() {
  const { data, error, isLoading } = useSWR(
    "filter-options",
    async () => {
      const response = await fetchFilterOptions()
      return response.data
    },
    DEFAULT_SWR_CONFIG
  )

  return {
    sites: data?.sites ?? [],
    datacenters: data?.datacenters ?? [],
    environments: data?.environments ?? [],
    roles: data?.roles ?? [],
    connectors: data?.connectors ?? [],
    isLoading,
    isError: !!error,
  }
}
