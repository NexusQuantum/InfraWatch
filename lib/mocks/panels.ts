import type {
  StatPanelData,
  TimeSeriesPanelData,
  RankingPanelData,
  TablePanelData,
  HealthMatrixPanelData,
  CapacityBreakdownPanelData,
  PanelLoadingState,
  PanelErrorState,
  PanelEmptyState,
} from "@/lib/types"

const NOW = "2026-03-26T10:15:00Z"

// ============================================================================
// STAT PANEL MOCK DATA
// ============================================================================

export const statPanels: Record<string, StatPanelData> = {
  // Healthy stat
  fleetCpuHealthy: {
    type: "stat",
    title: "Fleet CPU Usage",
    status: "healthy",
    unit: "percent",
    value: 48.5,
    change: -2.1,
    changeDirection: "down",
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
    },
  },
  // Warning stat
  fleetMemoryWarning: {
    type: "stat",
    title: "Fleet Memory Usage",
    status: "warning",
    unit: "percent",
    value: 78.2,
    change: 5.3,
    changeDirection: "up",
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
    },
  },
  // Critical stat
  storageUsageCritical: {
    type: "stat",
    title: "Storage Usage",
    status: "critical",
    unit: "percent",
    value: 92.5,
    change: 8.2,
    changeDirection: "up",
    updatedAt: NOW,
    meta: {
      scope: "storage",
      partialData: false,
    },
  },
  // Partial data stat
  networkThroughputPartial: {
    type: "stat",
    title: "Network Throughput",
    status: "partial",
    unit: "bytes-per-sec",
    value: 4_500_000_000,
    change: 12.5,
    changeDirection: "up",
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: true,
      error: "2 of 5 connectors failed to respond",
    },
  },
  // Stale stat
  kubePodsStale: {
    type: "stat",
    title: "Running Pods",
    status: "stale",
    unit: "count",
    value: 544,
    updatedAt: "2026-03-26T09:00:00Z",
    meta: {
      scope: "kubernetes",
      partialData: false,
      stale: true,
    },
  },
  // Healthy count stats
  totalHosts: {
    type: "stat",
    title: "Total Hosts",
    status: "healthy",
    unit: "count",
    value: 331,
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
    },
  },
  healthyHosts: {
    type: "stat",
    title: "Healthy Hosts",
    status: "healthy",
    unit: "count",
    value: 298,
    change: 3,
    changeDirection: "up",
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
    },
  },
  criticalHosts: {
    type: "stat",
    title: "Critical Hosts",
    status: "critical",
    unit: "count",
    value: 5,
    change: 2,
    changeDirection: "up",
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
    },
  },
  totalClusters: {
    type: "stat",
    title: "Compute Clusters",
    status: "healthy",
    unit: "count",
    value: 6,
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
    },
  },
  activeConnectors: {
    type: "stat",
    title: "Active Connectors",
    status: "warning",
    unit: "count",
    value: 5,
    updatedAt: NOW,
    meta: {
      scope: "global",
      partialData: false,
      error: "1 connector down",
    },
  },
}

// ============================================================================
// TIME SERIES PANEL MOCK DATA
// ============================================================================

// Static seeded pseudo-random for deterministic values (no hydration mismatch)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateTimeSeriesPoints(
  hoursBack: number,
  baseValue: number,
  variance: number,
  trend: "up" | "down" | "stable" = "stable"
): Array<{ ts: string; value: number }> {
  const points: Array<{ ts: string; value: number }> = []
  const now = new Date("2026-03-26T10:15:00Z")
  
  for (let i = hoursBack * 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000)
    let trendFactor = 0
    if (trend === "up") trendFactor = (hoursBack * 12 - i) * 0.1
    if (trend === "down") trendFactor = -(hoursBack * 12 - i) * 0.1
    
    // Use seeded random for deterministic values
    const randomFactor = seededRandom(i + baseValue) - 0.5;
    const value = baseValue + trendFactor + randomFactor * variance
    points.push({
      ts: time.toISOString(),
      value: Math.max(0, Math.min(100, value)),
    })
  }
  return points
}

export const timeSeriesPanels: Record<string, TimeSeriesPanelData> = {
  // Healthy multi-series
  clusterCpuTrend: {
    type: "timeseries",
    title: "CPU Usage by Cluster",
    unit: "percent",
    series: [
      {
        id: "cluster-jkt-compute-a",
        name: "Jakarta Compute A",
        status: "healthy",
        points: generateTimeSeriesPoints(6, 48, 10, "stable"),
      },
      {
        id: "cluster-jkt-compute-b",
        name: "Jakarta Compute B",
        status: "warning",
        points: generateTimeSeriesPoints(6, 72, 8, "up"),
      },
      {
        id: "cluster-sgp-compute-a",
        name: "Singapore Compute A",
        status: "healthy",
        points: generateTimeSeriesPoints(6, 42, 12, "stable"),
      },
    ],
    updatedAt: NOW,
    meta: {
      partialData: false,
      stacked: false,
    },
  },
  // Stacked area chart
  memoryByRole: {
    type: "timeseries",
    title: "Memory Usage by Role",
    unit: "percent",
    series: [
      {
        id: "role-compute",
        name: "Compute",
        points: generateTimeSeriesPoints(6, 35, 5),
      },
      {
        id: "role-storage",
        name: "Storage",
        points: generateTimeSeriesPoints(6, 25, 3),
      },
      {
        id: "role-app",
        name: "App",
        points: generateTimeSeriesPoints(6, 20, 8),
      },
    ],
    updatedAt: NOW,
    meta: {
      partialData: false,
      stacked: true,
    },
  },
  // Partial data series
  networkThroughputTrend: {
    type: "timeseries",
    title: "Network Throughput",
    unit: "bytes-per-sec",
    series: [
      {
        id: "site-jakarta",
        name: "Jakarta",
        status: "healthy",
        points: generateTimeSeriesPoints(6, 2500, 500).map(p => ({ ...p, value: p.value * 1_000_000_00 })),
      },
      {
        id: "site-singapore",
        name: "Singapore",
        status: "healthy",
        points: generateTimeSeriesPoints(6, 1800, 400).map(p => ({ ...p, value: p.value * 1_000_000_00 })),
      },
    ],
    updatedAt: NOW,
    meta: {
      partialData: true,
      stacked: false,
      missingSeriesIds: ["site-hongkong", "site-sydney"],
    },
  },
  // Storage throughput
  storageThroughput: {
    type: "timeseries",
    title: "Storage I/O Throughput",
    unit: "bytes-per-sec",
    series: [
      {
        id: "read",
        name: "Read",
        points: generateTimeSeriesPoints(6, 3200, 800).map(p => ({ ...p, value: p.value * 1_000_000_0 })),
      },
      {
        id: "write",
        name: "Write",
        points: generateTimeSeriesPoints(6, 2100, 600).map(p => ({ ...p, value: p.value * 1_000_000_0 })),
      },
    ],
    updatedAt: NOW,
    meta: {
      partialData: false,
      stacked: false,
    },
  },
}

// ============================================================================
// RANKING PANEL MOCK DATA
// ============================================================================

export const rankingPanels: Record<string, RankingPanelData> = {
  // Hot nodes by CPU
  hotNodesCpu: {
    type: "ranking",
    title: "Hottest Nodes by CPU",
    unit: "percent",
    rows: [
      {
        id: "host-jkt-app-02",
        label: "jkt-app-02.internal",
        value: 95.2,
        status: "critical",
        context: { cluster: "cluster-jkt-app", site: "jakarta", role: "app" },
      },
      {
        id: "host-jkt-mixed-01",
        label: "jkt-mixed-01.internal",
        value: 82.1,
        status: "warning",
        context: { cluster: "cluster-jkt-compute-b", site: "jakarta", role: "mixed" },
      },
      {
        id: "host-jkt-compute-a03",
        label: "jkt-compute-a03.internal",
        value: 78.5,
        status: "warning",
        context: { cluster: "cluster-jkt-compute-a", site: "jakarta", role: "compute" },
      },
      {
        id: "host-jkt-compute-a02",
        label: "jkt-compute-a02.internal",
        value: 52.8,
        status: "healthy",
        context: { cluster: "cluster-jkt-compute-a", site: "jakarta", role: "compute" },
      },
      {
        id: "host-hkg-compute-01",
        label: "hkg-compute-01.internal",
        value: 55.2,
        status: "unknown",
        context: { cluster: "cluster-hkg-compute-a", site: "hongkong", role: "compute" },
      },
    ],
    updatedAt: NOW,
    meta: { partialData: false },
  },
  // Hot storage nodes
  hotStorageNodes: {
    type: "ranking",
    title: "Hottest Storage Nodes",
    unit: "percent",
    rows: [
      {
        id: "host-hkg-storage-01",
        label: "hkg-storage-01.internal",
        value: 97.2,
        status: "critical",
        context: { cluster: "storage-hkg-primary", site: "hongkong" },
      },
      {
        id: "host-jkt-storage-02",
        label: "jkt-storage-02.internal",
        value: 94.5,
        status: "critical",
        context: { cluster: "storage-jkt-primary", site: "jakarta" },
      },
      {
        id: "host-sgp-storage-03",
        label: "sgp-storage-03.internal",
        value: 88.9,
        status: "warning",
        context: { cluster: "storage-sgp-primary", site: "singapore" },
      },
    ],
    updatedAt: NOW,
    meta: { partialData: false },
  },
  // Slowest apps by latency
  slowestApps: {
    type: "ranking",
    title: "Slowest Services (P95 Latency)",
    unit: "ms",
    rows: [
      {
        id: "app-payment-service",
        label: "Payment Service",
        value: 1250,
        status: "critical",
        context: { namespace: "payments" },
      },
      {
        id: "app-user-service",
        label: "User Service",
        value: 320,
        status: "warning",
        context: { namespace: "core" },
      },
      {
        id: "app-search-service",
        label: "Search Service",
        value: 85,
        status: "healthy",
        context: { namespace: "search" },
      },
    ],
    updatedAt: NOW,
    meta: { partialData: false },
  },
}

// ============================================================================
// TABLE PANEL MOCK DATA
// ============================================================================

export const tablePanels: Record<string, TablePanelData> = {
  // Filesystem usage table
  filesystemUsage: {
    type: "table",
    title: "Filesystem Usage",
    columns: [
      { key: "hostname", label: "Host", sortable: true },
      { key: "mount", label: "Mount" },
      { key: "usedPct", label: "Used %", unit: "percent", sortable: true },
      { key: "freeBytes", label: "Free", unit: "bytes", sortable: true },
      { key: "status", label: "Status" },
    ],
    rows: [
      { id: "fs-1", hostname: "jkt-storage-02.internal", mount: "/data", usedPct: 94.5, freeBytes: 550_000_000_000, status: "critical" },
      { id: "fs-2", hostname: "hkg-storage-01.internal", mount: "/data", usedPct: 97.2, freeBytes: 280_000_000_000, status: "critical" },
      { id: "fs-3", hostname: "sgp-storage-03.internal", mount: "/data", usedPct: 88.9, freeBytes: 1_110_000_000_000, status: "warning" },
      { id: "fs-4", hostname: "jkt-storage-01.internal", mount: "/data", usedPct: 72.8, freeBytes: 2_720_000_000_000, status: "warning" },
      { id: "fs-5", hostname: "jkt-compute-a03.internal", mount: "/", usedPct: 65.3, freeBytes: 347_000_000_000, status: "healthy" },
    ],
    updatedAt: NOW,
    meta: { totalRows: 45 },
  },
  // Network interfaces
  networkInterfaces: {
    type: "table",
    title: "Network Interface Errors",
    columns: [
      { key: "hostname", label: "Host", sortable: true },
      { key: "interface", label: "Interface" },
      { key: "rxErrors", label: "RX Errors", unit: "count", sortable: true },
      { key: "txErrors", label: "TX Errors", unit: "count", sortable: true },
      { key: "status", label: "Status" },
    ],
    rows: [
      { id: "nic-1", hostname: "jkt-app-02.internal", interface: "eth0", rxErrors: 1523, txErrors: 892, status: "critical" },
      { id: "nic-2", hostname: "hkg-compute-01.internal", interface: "eth0", rxErrors: 245, txErrors: 128, status: "warning" },
      { id: "nic-3", hostname: "jkt-compute-a03.internal", interface: "bond0", rxErrors: 12, txErrors: 5, status: "healthy" },
    ],
    updatedAt: NOW,
    meta: { totalRows: 3 },
  },
  // Kubernetes deployments
  kubeDeployments: {
    type: "table",
    title: "Deployment Status",
    columns: [
      { key: "name", label: "Deployment", sortable: true },
      { key: "namespace", label: "Namespace" },
      { key: "ready", label: "Ready" },
      { key: "available", label: "Available" },
      { key: "status", label: "Status" },
    ],
    rows: [
      { id: "dep-1", name: "api-gateway", namespace: "platform", ready: "8/8", available: 8, status: "healthy" },
      { id: "dep-2", name: "payment-service", namespace: "payments", ready: "4/6", available: 4, status: "warning" },
      { id: "dep-3", name: "analytics-service", namespace: "analytics", ready: "0/4", available: 0, status: "critical" },
      { id: "dep-4", name: "user-service", namespace: "core", ready: "4/4", available: 4, status: "healthy" },
    ],
    updatedAt: NOW,
    meta: { totalRows: 42 },
  },
}

// ============================================================================
// HEALTH MATRIX PANEL MOCK DATA
// ============================================================================

export const healthMatrixPanels: Record<string, HealthMatrixPanelData> = {
  clusterHealthMatrix: {
    type: "health-matrix",
    title: "Cluster Health Matrix",
    xAxis: ["CPU", "Memory", "Disk", "Network"],
    yAxis: ["Jakarta Compute A", "Jakarta Compute B", "Jakarta App", "Singapore Compute A", "Hong Kong Compute A"],
    cells: [
      // Jakarta Compute A
      { x: "CPU", y: "Jakarta Compute A", status: "healthy", value: 48.5 },
      { x: "Memory", y: "Jakarta Compute A", status: "warning", value: 78.2 },
      { x: "Disk", y: "Jakarta Compute A", status: "healthy", value: 45.2 },
      { x: "Network", y: "Jakarta Compute A", status: "healthy", value: 32.1 },
      // Jakarta Compute B
      { x: "CPU", y: "Jakarta Compute B", status: "warning", value: 72.1 },
      { x: "Memory", y: "Jakarta Compute B", status: "warning", value: 78.5 },
      { x: "Disk", y: "Jakarta Compute B", status: "warning", value: 68.4 },
      { x: "Network", y: "Jakarta Compute B", status: "healthy", value: 41.2 },
      // Jakarta App
      { x: "CPU", y: "Jakarta App", status: "critical", value: 88.2 },
      { x: "Memory", y: "Jakarta App", status: "critical", value: 91.5 },
      { x: "Disk", y: "Jakarta App", status: "healthy", value: 38.5 },
      { x: "Network", y: "Jakarta App", status: "critical", value: 85.2 },
      // Singapore Compute A
      { x: "CPU", y: "Singapore Compute A", status: "healthy", value: 42.8 },
      { x: "Memory", y: "Singapore Compute A", status: "healthy", value: 55.2 },
      { x: "Disk", y: "Singapore Compute A", status: "healthy", value: 48.1 },
      { x: "Network", y: "Singapore Compute A", status: "healthy", value: 28.5 },
      // Hong Kong Compute A
      { x: "CPU", y: "Hong Kong Compute A", status: "unknown", value: 52.1 },
      { x: "Memory", y: "Hong Kong Compute A", status: "unknown", value: 68.5 },
      { x: "Disk", y: "Hong Kong Compute A", status: "unknown", value: 48.7 },
      { x: "Network", y: "Hong Kong Compute A", status: "unknown", value: 35.2 },
    ],
    updatedAt: NOW,
    meta: { partialData: false },
  },
  storageHealthMatrix: {
    type: "health-matrix",
    title: "Storage Cluster Health",
    xAxis: ["Capacity", "Throughput", "Components", "Nodes"],
    yAxis: ["Jakarta Primary", "Jakarta Secondary", "Singapore Primary", "Hong Kong Primary"],
    cells: [
      // Jakarta Primary
      { x: "Capacity", y: "Jakarta Primary", status: "warning", value: 85.0 },
      { x: "Throughput", y: "Jakarta Primary", status: "healthy", value: 68.5 },
      { x: "Components", y: "Jakarta Primary", status: "warning" },
      { x: "Nodes", y: "Jakarta Primary", status: "warning" },
      // Jakarta Secondary
      { x: "Capacity", y: "Jakarta Secondary", status: "healthy", value: 60.0 },
      { x: "Throughput", y: "Jakarta Secondary", status: "healthy", value: 45.2 },
      { x: "Components", y: "Jakarta Secondary", status: "healthy" },
      { x: "Nodes", y: "Jakarta Secondary", status: "healthy" },
      // Singapore Primary
      { x: "Capacity", y: "Singapore Primary", status: "healthy", value: 70.0 },
      { x: "Throughput", y: "Singapore Primary", status: "healthy", value: 72.1 },
      { x: "Components", y: "Singapore Primary", status: "healthy" },
      { x: "Nodes", y: "Singapore Primary", status: "warning" },
      // Hong Kong Primary
      { x: "Capacity", y: "Hong Kong Primary", status: "critical", value: 95.0 },
      { x: "Throughput", y: "Hong Kong Primary", status: "warning", value: 82.5 },
      { x: "Components", y: "Hong Kong Primary", status: "critical" },
      { x: "Nodes", y: "Hong Kong Primary", status: "critical" },
    ],
    updatedAt: NOW,
    meta: { partialData: false },
  },
}

// ============================================================================
// CAPACITY BREAKDOWN PANEL MOCK DATA
// ============================================================================

export const capacityBreakdownPanels: Record<string, CapacityBreakdownPanelData> = {
  totalStorageCapacity: {
    type: "capacity-breakdown",
    title: "Total Storage Capacity",
    segments: [
      { label: "Used", value: 1_390_000_000_000_000, status: "warning" },
      { label: "Reserved", value: 100_000_000_000_000, status: "healthy" },
      { label: "Free", value: 310_000_000_000_000, status: "healthy" },
    ],
    unit: "bytes",
    updatedAt: NOW,
    meta: { partialData: false },
  },
  clusterCapacityBreakdown: {
    type: "capacity-breakdown",
    title: "Compute Capacity by Site",
    segments: [
      { label: "Jakarta", value: 65, status: "healthy" },
      { label: "Singapore", value: 20, status: "healthy" },
      { label: "Hong Kong", value: 15, status: "warning" },
    ],
    unit: "percent",
    updatedAt: NOW,
    meta: { partialData: false },
  },
}

// ============================================================================
// PANEL STATE VARIATIONS
// ============================================================================

export const loadingStates: Record<string, PanelLoadingState> = {
  genericLoading: {
    type: "loading",
    title: "Loading...",
  },
  cpuLoading: {
    type: "loading",
    title: "Fleet CPU Usage",
  },
}

export const errorStates: Record<string, PanelErrorState> = {
  connectionError: {
    type: "error",
    title: "Fleet CPU Usage",
    error: "Failed to connect to Prometheus endpoint",
    retryable: true,
  },
  timeoutError: {
    type: "error",
    title: "Network Throughput",
    error: "Query timeout after 30s - try a shorter time range",
    retryable: true,
  },
  permissionError: {
    type: "error",
    title: "Kubernetes Pods",
    error: "Insufficient permissions to access metrics",
    retryable: false,
  },
}

export const emptyStates: Record<string, PanelEmptyState> = {
  noData: {
    type: "empty",
    title: "Application Metrics",
    reason: "no-data",
    message: "No data available for the selected time range",
  },
  noCapability: {
    type: "empty",
    title: "Kubernetes Overview",
    reason: "no-capability",
    message: "No connectors with Kubernetes metrics are configured",
  },
  filteredOut: {
    type: "empty",
    title: "Storage Clusters",
    reason: "filtered-out",
    message: "No storage clusters match the current filters",
  },
  notConfigured: {
    type: "empty",
    title: "Application Performance",
    reason: "not-configured",
    message: "Application metrics are not configured for this environment",
  },
}
