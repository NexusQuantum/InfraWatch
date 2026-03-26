// Status and indicators
export { StatusBadge, type StatusBadgeProps } from "./status-badge";
export { CapabilityBadge, CapabilityBadgeGroup } from "./capability-badge";
export { FreshnessIndicator } from "./freshness-indicator";
export { EmptyState, type EmptyStateProps } from "./empty-state";

// Cards and rows
export { ConnectorCard, ConnectorCardSkeleton } from "./connector-card";
export { HostRow, HostRowCompact, HostRowSkeleton } from "./host-row";
export { ClusterCard, ClusterRow, ClusterCardSkeleton } from "./cluster-card";
export { StatCard, StatCardSkeleton, StatCardGrid } from "./stat-card";

// Data visualization
export { Sparkline, MiniSparkline } from "./sparkline";
export { MetricsPanel, MetricsGrid, MetricValue } from "./metrics-panel";

// Layout components
export { Panel, PanelSection, PanelGrid } from "./panel";

// Capability-aware sections
export {
  KubernetesSection,
  StorageSection,
  AppSection,
  CapabilitySection,
} from "./capability-sections";

// Note: Dashboard layout components are now self-contained in app/page.tsx
