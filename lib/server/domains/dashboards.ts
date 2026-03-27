import "server-only";

import type { Dashboard } from "@/lib/types/entities";
import type { ApiResponseMeta } from "./shared";
import { fetchLiveOverview } from "./overview";
import { getOrFetch } from "@/lib/server/cache";

async function _fetchLiveDashboards(): Promise<ApiResponseMeta<Dashboard[]>> {
  const overview = await fetchLiveOverview();
  const hasHosts = overview.data.capabilities.hasHostMetrics;
  const hasCompute = overview.data.capabilities.hasClusterMetrics;
  const hasStorage = overview.data.capabilities.hasStorageMetrics;
  const hasK8s = overview.data.capabilities.hasKubernetesMetrics;
  const hasApps = overview.data.capabilities.hasAppMetrics;
  const now = new Date().toISOString();

  const catalog: Dashboard[] = [
    {
      id: "overview",
      slug: "",
      title: "Fleet Overview",
      description:
        "Global health and utilization across all enabled connectors.",
      category: "overview",
      scope: "global",
      capabilityRequirements: {},
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["fleet", "health", "summary"],
    },
    {
      id: "hosts",
      slug: "hosts",
      title: "Hosts",
      description: "Node-level status, CPU, memory, disk, and network usage.",
      category: "hosts",
      scope: "global",
      capabilityRequirements: { hostMetrics: true },
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["nodes", "compute"],
    },
    {
      id: "clusters",
      slug: "clusters",
      title: "Compute Clusters",
      description: "Connector-scoped cluster health and hottest nodes.",
      category: "clusters",
      scope: "global",
      capabilityRequirements: { clusterMetrics: true },
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["cluster", "capacity"],
    },
    {
      id: "storage",
      slug: "storage",
      title: "Storage Clusters",
      description:
        "Longhorn/storage capacity and throughput per connector.",
      category: "storage",
      scope: "global",
      capabilityRequirements: { storageMetrics: true },
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["longhorn", "capacity"],
    },
    {
      id: "kubernetes",
      slug: "kubernetes",
      title: "Kubernetes Clusters",
      description:
        "Node readiness, pod health, and deployment availability.",
      category: "kubernetes",
      scope: "global",
      capabilityRequirements: { kubernetesMetrics: true },
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["k8s", "pods"],
    },
    {
      id: "apps",
      slug: "apps",
      title: "Applications",
      description:
        "Namespace-level workload health from live pod status.",
      category: "apps",
      scope: "global",
      capabilityRequirements: { appMetrics: true },
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["workloads", "namespaces"],
    },
    {
      id: "connectors",
      slug: "connectors",
      title: "Connectors",
      description:
        "Prometheus connector inventory and health checks.",
      category: "custom",
      scope: "global",
      capabilityRequirements: {},
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["integrations", "sources"],
    },
    {
      id: "settings",
      slug: "settings",
      title: "Settings",
      description:
        "Operator preferences for display, refresh, and notifications.",
      category: "custom",
      scope: "global",
      capabilityRequirements: {},
      customizable: false,
      lastUpdatedAt: now,
      owner: "system",
      tags: ["preferences"],
    },
  ];

  const dashboards = catalog.filter((dashboard) => {
    if (dashboard.category === "hosts") return hasHosts;
    if (dashboard.category === "clusters") return hasCompute;
    if (dashboard.category === "storage") return hasStorage;
    if (dashboard.category === "kubernetes") return hasK8s;
    if (dashboard.category === "apps") return hasApps;
    return true;
  });

  return {
    data: dashboards,
    meta: {
      timestamp: now,
      partial: overview.meta.partial,
      stale: false,
      errors: overview.meta.errors,
      failedConnectors: overview.meta.failedConnectors,
    },
  };
}

export function fetchLiveDashboards(): Promise<ApiResponseMeta<Dashboard[]>> {
  return getOrFetch("live:dashboards", 120_000, _fetchLiveDashboards);
}
