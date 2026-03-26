import type { ComputeCluster, StorageCluster, KubernetesCluster, Application } from "@/lib/types"

// ============================================================================
// COMPUTE CLUSTER MOCK DATA
// ============================================================================

export const computeClusters: ComputeCluster[] = [
  // Jakarta - Healthy compute cluster
  {
    id: "cluster-jkt-compute-a",
    name: "Jakarta Compute A",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "healthy",
    nodeCount: 12,
    healthyNodeCount: 11,
    warningNodeCount: 1,
    criticalNodeCount: 0,
    avgCpuUsagePct: 48.5,
    avgMemoryUsagePct: 62.3,
    avgDiskUsagePct: 45.2,
    hottestNodes: [
      { hostId: "host-jkt-compute-a03", hostname: "jkt-compute-a03.internal", cpuUsagePct: 78.5, memoryUsagePct: 85.2 },
      { hostId: "host-jkt-compute-a02", hostname: "jkt-compute-a02.internal", cpuUsagePct: 52.8, memoryUsagePct: 71.3 },
    ],
    relatedKubernetesClusterId: "k8s-jkt-prod-1",
  },
  // Jakarta - Warning cluster
  {
    id: "cluster-jkt-compute-b",
    name: "Jakarta Compute B",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "warning",
    nodeCount: 8,
    healthyNodeCount: 5,
    warningNodeCount: 2,
    criticalNodeCount: 1,
    avgCpuUsagePct: 72.1,
    avgMemoryUsagePct: 78.5,
    avgDiskUsagePct: 68.4,
    hottestNodes: [
      { hostId: "host-jkt-mixed-01", hostname: "jkt-mixed-01.internal", cpuUsagePct: 82.1, memoryUsagePct: 78.5 },
    ],
    relatedKubernetesClusterId: "k8s-jkt-prod-2",
  },
  // Jakarta - App cluster
  {
    id: "cluster-jkt-app",
    name: "Jakarta App Servers",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "critical",
    nodeCount: 6,
    healthyNodeCount: 4,
    warningNodeCount: 1,
    criticalNodeCount: 1,
    avgCpuUsagePct: 58.2,
    avgMemoryUsagePct: 65.8,
    avgDiskUsagePct: 38.5,
    hottestNodes: [
      { hostId: "host-jkt-app-02", hostname: "jkt-app-02.internal", cpuUsagePct: 95.2, memoryUsagePct: 92.1 },
    ],
  },
  // Singapore - Healthy cluster
  {
    id: "cluster-sgp-compute-a",
    name: "Singapore Compute A",
    connectorIds: ["conn-prod-sgp-1"],
    site: "singapore",
    datacenter: "dc-sgp-1",
    environment: "production",
    status: "healthy",
    nodeCount: 10,
    healthyNodeCount: 10,
    warningNodeCount: 0,
    criticalNodeCount: 0,
    avgCpuUsagePct: 42.8,
    avgMemoryUsagePct: 55.2,
    avgDiskUsagePct: 48.1,
    hottestNodes: [],
  },
  // Hong Kong - Unknown due to stale data
  {
    id: "cluster-hkg-compute-a",
    name: "Hong Kong Compute A",
    connectorIds: ["conn-prod-hkg-1"],
    site: "hongkong",
    datacenter: "dc-hkg-1",
    environment: "production",
    status: "unknown",
    nodeCount: 8,
    healthyNodeCount: 0,
    warningNodeCount: 0,
    criticalNodeCount: 0,
    avgCpuUsagePct: 52.1,
    avgMemoryUsagePct: 68.5,
    avgDiskUsagePct: 48.7,
    hottestNodes: [],
    relatedKubernetesClusterId: "k8s-hkg-prod-1",
  },
  // Staging cluster
  {
    id: "cluster-staging",
    name: "Staging Cluster",
    connectorIds: ["conn-staging-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "staging",
    status: "healthy",
    nodeCount: 4,
    healthyNodeCount: 4,
    warningNodeCount: 0,
    criticalNodeCount: 0,
    avgCpuUsagePct: 32.1,
    avgMemoryUsagePct: 45.3,
    avgDiskUsagePct: 50.4,
    hottestNodes: [],
    relatedKubernetesClusterId: "k8s-staging",
  },
]

// ============================================================================
// STORAGE CLUSTER MOCK DATA
// ============================================================================

export const storageClusters: StorageCluster[] = [
  // Jakarta Primary - Warning (high disk)
  {
    id: "storage-jkt-primary",
    name: "Jakarta Storage Primary",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "warning",
    nodeCount: 6,
    healthyNodeCount: 5,
    capacity: {
      totalBytes: 500_000_000_000_000, // 500 TB
      usedBytes: 425_000_000_000_000,  // 425 TB
      freeBytes: 75_000_000_000_000,   // 75 TB
      usedPct: 85.0,
    },
    throughput: {
      readBytesPerSec: 2_500_000_000,  // 2.5 GB/s
      writeBytesPerSec: 1_800_000_000, // 1.8 GB/s
      readOpsPerSec: 45000,
      writeOpsPerSec: 28000,
    },
    degradedComponentsCount: 1,
    hottestNodes: [
      { hostId: "host-jkt-storage-02", hostname: "jkt-storage-02.internal", diskUsagePct: 94.5, networkTxBytesPerSec: 850_000_000 },
      { hostId: "host-jkt-storage-01", hostname: "jkt-storage-01.internal", diskUsagePct: 72.8, networkTxBytesPerSec: 620_000_000 },
    ],
  },
  // Jakarta Secondary - Healthy
  {
    id: "storage-jkt-secondary",
    name: "Jakarta Storage Secondary",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "healthy",
    nodeCount: 4,
    healthyNodeCount: 4,
    capacity: {
      totalBytes: 200_000_000_000_000, // 200 TB
      usedBytes: 120_000_000_000_000,  // 120 TB
      freeBytes: 80_000_000_000_000,   // 80 TB
      usedPct: 60.0,
    },
    throughput: {
      readBytesPerSec: 1_200_000_000,
      writeBytesPerSec: 800_000_000,
      readOpsPerSec: 22000,
      writeOpsPerSec: 15000,
    },
    degradedComponentsCount: 0,
    hottestNodes: [],
  },
  // Singapore - Healthy
  {
    id: "storage-sgp-primary",
    name: "Singapore Storage Primary",
    connectorIds: ["conn-prod-sgp-1"],
    site: "singapore",
    datacenter: "dc-sgp-1",
    environment: "production",
    status: "healthy",
    nodeCount: 8,
    healthyNodeCount: 7,
    capacity: {
      totalBytes: 800_000_000_000_000, // 800 TB
      usedBytes: 560_000_000_000_000,  // 560 TB
      freeBytes: 240_000_000_000_000,  // 240 TB
      usedPct: 70.0,
    },
    throughput: {
      readBytesPerSec: 3_800_000_000,
      writeBytesPerSec: 2_400_000_000,
      readOpsPerSec: 68000,
      writeOpsPerSec: 42000,
    },
    degradedComponentsCount: 0,
    hottestNodes: [
      { hostId: "host-sgp-storage-03", hostname: "sgp-storage-03.internal", diskUsagePct: 88.9, networkTxBytesPerSec: 920_000_000 },
    ],
  },
  // Hong Kong - Critical
  {
    id: "storage-hkg-primary",
    name: "Hong Kong Storage Primary",
    connectorIds: ["conn-prod-hkg-1"],
    site: "hongkong",
    datacenter: "dc-hkg-1",
    environment: "production",
    status: "critical",
    nodeCount: 4,
    healthyNodeCount: 2,
    capacity: {
      totalBytes: 300_000_000_000_000,
      usedBytes: 285_000_000_000_000,
      freeBytes: 15_000_000_000_000,
      usedPct: 95.0,
    },
    throughput: {
      readBytesPerSec: 1_500_000_000,
      writeBytesPerSec: 400_000_000,
      readOpsPerSec: 28000,
      writeOpsPerSec: 8000,
    },
    degradedComponentsCount: 3,
    hottestNodes: [
      { hostId: "host-hkg-storage-01", hostname: "hkg-storage-01.internal", diskUsagePct: 97.2, networkTxBytesPerSec: 450_000_000 },
    ],
  },
]

// ============================================================================
// KUBERNETES CLUSTER MOCK DATA
// ============================================================================

export const kubernetesClusters: KubernetesCluster[] = [
  // Jakarta Prod 1 - Healthy
  {
    id: "k8s-jkt-prod-1",
    name: "Jakarta Production 1",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "healthy",
    nodeCount: 12,
    readyNodeCount: 12,
    podCount: 245,
    unhealthyPodCount: 3,
    deploymentCount: 42,
    unavailableDeploymentCount: 0,
    namespaceCount: 15,
    relatedComputeClusterId: "cluster-jkt-compute-a",
  },
  // Jakarta Prod 2 - Warning
  {
    id: "k8s-jkt-prod-2",
    name: "Jakarta Production 2",
    connectorIds: ["conn-prod-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "production",
    status: "warning",
    nodeCount: 8,
    readyNodeCount: 7,
    podCount: 156,
    unhealthyPodCount: 12,
    deploymentCount: 28,
    unavailableDeploymentCount: 2,
    namespaceCount: 10,
    relatedComputeClusterId: "cluster-jkt-compute-b",
  },
  // Hong Kong - Unknown (stale data)
  {
    id: "k8s-hkg-prod-1",
    name: "Hong Kong Production",
    connectorIds: ["conn-prod-hkg-1"],
    site: "hongkong",
    datacenter: "dc-hkg-1",
    environment: "production",
    status: "unknown",
    nodeCount: 6,
    readyNodeCount: 0,
    podCount: 98,
    unhealthyPodCount: 0,
    deploymentCount: 18,
    unavailableDeploymentCount: 0,
    namespaceCount: 8,
    relatedComputeClusterId: "cluster-hkg-compute-a",
  },
  // Staging - Healthy
  {
    id: "k8s-staging",
    name: "Staging Cluster",
    connectorIds: ["conn-staging-jkt-1"],
    site: "jakarta",
    datacenter: "dc-jkt-1",
    environment: "staging",
    status: "healthy",
    nodeCount: 4,
    readyNodeCount: 4,
    podCount: 45,
    unhealthyPodCount: 0,
    deploymentCount: 12,
    unavailableDeploymentCount: 0,
    namespaceCount: 5,
    relatedComputeClusterId: "cluster-staging",
  },
]

// ============================================================================
// APPLICATION MOCK DATA
// ============================================================================

export const applications: Application[] = [
  // API Gateway - Healthy
  {
    id: "app-api-gateway",
    name: "API Gateway",
    connectorIds: ["conn-prod-jkt-1", "conn-prod-hkg-1"],
    environment: "production",
    site: "jakarta",
    status: "healthy",
    namespace: "platform",
    clusterIds: ["k8s-jkt-prod-1", "k8s-hkg-prod-1"],
    instanceCount: 8,
    current: {
      requestRatePerSec: 12500,
      errorRatePct: 0.02,
      p95LatencyMs: 45,
      cpuUsagePct: 42.5,
      memoryUsagePct: 58.2,
    },
  },
  // User Service - Warning (elevated latency)
  {
    id: "app-user-service",
    name: "User Service",
    connectorIds: ["conn-prod-jkt-1"],
    environment: "production",
    site: "jakarta",
    status: "warning",
    namespace: "core",
    clusterIds: ["k8s-jkt-prod-1"],
    instanceCount: 4,
    current: {
      requestRatePerSec: 3200,
      errorRatePct: 0.5,
      p95LatencyMs: 320,
      cpuUsagePct: 68.2,
      memoryUsagePct: 72.5,
    },
  },
  // Payment Service - Critical
  {
    id: "app-payment-service",
    name: "Payment Service",
    connectorIds: ["conn-prod-jkt-1"],
    environment: "production",
    site: "jakarta",
    status: "critical",
    namespace: "payments",
    clusterIds: ["k8s-jkt-prod-1"],
    instanceCount: 6,
    current: {
      requestRatePerSec: 850,
      errorRatePct: 5.2,
      p95LatencyMs: 1250,
      cpuUsagePct: 88.5,
      memoryUsagePct: 91.2,
    },
  },
  // Notification Service - Healthy
  {
    id: "app-notification-service",
    name: "Notification Service",
    connectorIds: ["conn-prod-jkt-1"],
    environment: "production",
    site: "jakarta",
    status: "healthy",
    namespace: "messaging",
    clusterIds: ["k8s-jkt-prod-1"],
    instanceCount: 3,
    current: {
      requestRatePerSec: 2100,
      errorRatePct: 0.01,
      p95LatencyMs: 28,
      cpuUsagePct: 32.1,
      memoryUsagePct: 45.8,
    },
  },
  // Search Service - Healthy
  {
    id: "app-search-service",
    name: "Search Service",
    connectorIds: ["conn-prod-jkt-1", "conn-prod-sgp-1"],
    environment: "production",
    site: "jakarta",
    status: "healthy",
    namespace: "search",
    clusterIds: ["k8s-jkt-prod-1"],
    instanceCount: 5,
    current: {
      requestRatePerSec: 4500,
      errorRatePct: 0.08,
      p95LatencyMs: 85,
      cpuUsagePct: 52.8,
      memoryUsagePct: 68.4,
    },
  },
  // Analytics Service - Down
  {
    id: "app-analytics-service",
    name: "Analytics Service",
    connectorIds: ["conn-prod-jkt-1"],
    environment: "production",
    site: "jakarta",
    status: "down",
    namespace: "analytics",
    clusterIds: ["k8s-jkt-prod-2"],
    instanceCount: 0,
    current: {
      requestRatePerSec: 0,
      errorRatePct: 100,
      p95LatencyMs: 0,
      cpuUsagePct: 0,
      memoryUsagePct: 0,
    },
  },
  // Cache Service - Healthy
  {
    id: "app-cache-service",
    name: "Cache Service",
    connectorIds: ["conn-prod-jkt-1"],
    environment: "production",
    site: "jakarta",
    status: "healthy",
    namespace: "infrastructure",
    clusterIds: ["k8s-jkt-prod-1"],
    instanceCount: 4,
    current: {
      requestRatePerSec: 28000,
      errorRatePct: 0.001,
      p95LatencyMs: 2,
      cpuUsagePct: 18.5,
      memoryUsagePct: 82.1,
    },
  },
  // Staging API
  {
    id: "app-staging-api",
    name: "Staging API",
    connectorIds: ["conn-staging-jkt-1"],
    environment: "staging",
    site: "jakarta",
    status: "healthy",
    namespace: "default",
    clusterIds: ["k8s-staging"],
    instanceCount: 2,
    current: {
      requestRatePerSec: 150,
      errorRatePct: 0.5,
      p95LatencyMs: 65,
      cpuUsagePct: 22.5,
      memoryUsagePct: 38.2,
    },
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getComputeClusterById(id: string): ComputeCluster | undefined {
  return computeClusters.find(c => c.id === id)
}

export function getStorageClusterById(id: string): StorageCluster | undefined {
  return storageClusters.find(c => c.id === id)
}

export function getKubernetesClusterById(id: string): KubernetesCluster | undefined {
  return kubernetesClusters.find(c => c.id === id)
}

export function getApplicationById(id: string): Application | undefined {
  return applications.find(a => a.id === id)
}

// Scenario-based data retrieval
export function getClustersByScenario(scenario: string) {
  switch (scenario) {
    case "healthy":
      return {
        compute: computeClusters.filter(c => c.status === "healthy"),
        storage: storageClusters.filter(c => c.status === "healthy"),
        kubernetes: kubernetesClusters.filter(c => c.status === "healthy"),
        apps: applications.filter(a => a.status === "healthy"),
      }
    case "degraded":
      return {
        compute: computeClusters,
        storage: storageClusters,
        kubernetes: kubernetesClusters,
        apps: applications,
      }
    case "empty-capability":
      return {
        compute: computeClusters,
        storage: [],
        kubernetes: [],
        apps: [],
      }
    default:
      return {
        compute: computeClusters,
        storage: storageClusters,
        kubernetes: kubernetesClusters,
        apps: applications,
      }
  }
}
