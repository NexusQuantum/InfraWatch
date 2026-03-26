// ============================================================================
// PANEL DATA CONTRACTS
// Generic panel data shapes for dashboard panels
// ============================================================================

import type { EntityStatus } from "./entities"

export type PanelStatus = EntityStatus | "loading" | "error" | "stale" | "partial" | "empty"
export type ChangeDirection = "up" | "down" | "flat"
export type PanelUnit = "percent" | "bytes" | "bytes-per-sec" | "ops-per-sec" | "ms" | "count" | "rate-per-sec" | "none"

// ============================================================================
// STAT PANEL
// ============================================================================

export interface StatPanelMeta {
  scope: "global" | "connector" | "cluster" | "host" | "storage" | "kubernetes" | "app"
  partialData: boolean
  stale?: boolean
  error?: string
}

export interface StatPanelData {
  type: "stat"
  title: string
  status: PanelStatus
  unit: PanelUnit
  value: number | null
  change?: number
  changeDirection?: ChangeDirection
  updatedAt: string
  meta: StatPanelMeta
}

// ============================================================================
// TIME SERIES PANEL
// ============================================================================

export interface TimeSeriesPoint {
  ts: string
  value: number | null
}

export interface TimeSeriesItem {
  id: string
  name: string
  status?: EntityStatus
  points: TimeSeriesPoint[]
}

export interface TimeSeriesMeta {
  partialData: boolean
  stacked: boolean
  stale?: boolean
  error?: string
  missingSeriesIds?: string[]
}

export interface TimeSeriesPanelData {
  type: "timeseries"
  title: string
  unit: PanelUnit
  series: TimeSeriesItem[]
  updatedAt: string
  meta: TimeSeriesMeta
}

// ============================================================================
// RANKING / TOP-N PANEL
// ============================================================================

export interface RankingRowContext {
  cluster?: string
  site?: string
  datacenter?: string
  role?: string
  [key: string]: string | undefined
}

export interface RankingRow {
  id: string
  label: string
  value: number
  status: EntityStatus
  context: RankingRowContext
}

export interface RankingPanelMeta {
  partialData?: boolean
  stale?: boolean
  error?: string
}

export interface RankingPanelData {
  type: "ranking"
  title: string
  unit: PanelUnit
  rows: RankingRow[]
  updatedAt: string
  meta?: RankingPanelMeta
}

// ============================================================================
// TABLE PANEL
// ============================================================================

export interface TableColumn {
  key: string
  label: string
  unit?: PanelUnit
  sortable?: boolean
}

export interface TableRow {
  id: string
  [key: string]: string | number | boolean | EntityStatus | null | undefined
}

export interface TablePanelMeta {
  partialData?: boolean
  stale?: boolean
  error?: string
  totalRows?: number
}

export interface TablePanelData {
  type: "table"
  title: string
  columns: TableColumn[]
  rows: TableRow[]
  updatedAt: string
  meta?: TablePanelMeta
}

// ============================================================================
// HEALTH MATRIX PANEL
// ============================================================================

export interface HealthMatrixCell {
  x: string
  y: string
  status: EntityStatus
  value?: number
}

export interface HealthMatrixMeta {
  partialData?: boolean
  stale?: boolean
  error?: string
}

export interface HealthMatrixPanelData {
  type: "health-matrix"
  title: string
  xAxis: string[]
  yAxis: string[]
  cells: HealthMatrixCell[]
  updatedAt: string
  meta?: HealthMatrixMeta
}

// ============================================================================
// CAPACITY BREAKDOWN PANEL
// ============================================================================

export interface CapacitySegment {
  label: string
  value: number
  status: EntityStatus
}

export interface CapacityBreakdownMeta {
  partialData?: boolean
  stale?: boolean
  error?: string
}

export interface CapacityBreakdownPanelData {
  type: "capacity-breakdown"
  title: string
  segments: CapacitySegment[]
  unit: PanelUnit
  updatedAt: string
  meta?: CapacityBreakdownMeta
}

// ============================================================================
// UNION TYPE FOR ALL PANELS
// ============================================================================

export type PanelData =
  | StatPanelData
  | TimeSeriesPanelData
  | RankingPanelData
  | TablePanelData
  | HealthMatrixPanelData
  | CapacityBreakdownPanelData

// ============================================================================
// PANEL STATE VARIATIONS
// ============================================================================

export interface PanelLoadingState {
  type: "loading"
  title: string
}

export interface PanelErrorState {
  type: "error"
  title: string
  error: string
  retryable: boolean
}

export interface PanelEmptyState {
  type: "empty"
  title: string
  reason: "no-data" | "no-capability" | "filtered-out" | "not-configured"
  message: string
}

export type PanelState = PanelData | PanelLoadingState | PanelErrorState | PanelEmptyState

// ============================================================================
// DASHBOARD PANEL CONTAINER
// ============================================================================

export interface DashboardPanel {
  id: string
  panelType: PanelData["type"] | "loading" | "error" | "empty"
  gridPosition: {
    x: number
    y: number
    w: number
    h: number
  }
  state: PanelState
  visible: boolean
  expandable: boolean
}
