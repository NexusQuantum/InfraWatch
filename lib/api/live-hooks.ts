"use client";

import useSWR from "swr";
import type {
  Application,
  ComputeCluster,
  Connector,
  Dashboard,
  FleetOverview,
  Host,
  HostVmSummary,
  KubernetesCluster,
  StorageCluster,
  VmDetail,
  VmListItem,
} from "@/lib/types/entities";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;

  const response = await fetch(url, { headers });
  if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && body.error) || `Failed request: ${response.status}`);
  }
  return body as T;
}

const DEFAULT = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  refreshInterval: 30000,
};

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    partial?: boolean;
    stale?: boolean;
    errors?: string[];
    failedConnectors?: string[];
  };
}

interface TimeSeriesPoint {
  ts: string;
  value: number;
}

interface HostTimeseries {
  cpu: TimeSeriesPoint[];
  memory: TimeSeriesPoint[];
  disk: TimeSeriesPoint[];
  networkRx: TimeSeriesPoint[];
  networkTx: TimeSeriesPoint[];
  range: string;
  step: string;
  updatedAt: string;
  source: "prometheus";
}

interface HostNetworkInterface {
  interface: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  errorRate: number;
  throughputBytesPerSec: number;
}

interface ComputeClusterTimeseries {
  avgCpu: TimeSeriesPoint[];
  avgMemory: TimeSeriesPoint[];
  networkRx: TimeSeriesPoint[];
  networkTx: TimeSeriesPoint[];
  range: string;
  step: string;
  updatedAt: string;
  source: "prometheus";
}

interface StorageClusterTimeseries {
  read: TimeSeriesPoint[];
  write: TimeSeriesPoint[];
  range: string;
  step: string;
  updatedAt: string;
  source: "prometheus";
}

interface KubernetesClusterTimeseries {
  running: TimeSeriesPoint[];
  unhealthy: TimeSeriesPoint[];
  range: string;
  step: string;
  updatedAt: string;
  source: "prometheus";
}

interface ApplicationTimeseries {
  running: TimeSeriesPoint[];
  unhealthy: TimeSeriesPoint[];
  range: string;
  step: string;
  updatedAt: string;
  source: "prometheus";
}

export function useLiveConnectors() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<Connector[]>>("/api/live/connectors", fetchJson, DEFAULT);
  return { connectors: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveHosts() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<Host[]>>("/api/live/hosts", fetchJson, DEFAULT);
  return { hosts: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveComputeClusters() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<ComputeCluster[]>>("/api/live/compute-clusters", fetchJson, DEFAULT);
  return { clusters: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveStorageClusters() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<StorageCluster[]>>("/api/live/storage-clusters", fetchJson, DEFAULT);
  return { clusters: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveKubernetesClusters() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<KubernetesCluster[]>>("/api/live/kubernetes-clusters", fetchJson, DEFAULT);
  return { clusters: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useHostTimeseries(hostId?: string, range = "1h", step = "5m") {
  const key = hostId ? `/api/live/hosts/${encodeURIComponent(hostId)}/timeseries?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<HostTimeseries>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useHostNetworkInterfaces(hostId?: string, raw = false) {
  const key = hostId
    ? `/api/live/hosts/${encodeURIComponent(hostId)}/network-interfaces?raw=${raw ? "true" : "false"}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<HostNetworkInterface[]>>(key, fetchJson, DEFAULT);
  return { data: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useHostVm(hostId?: string) {
  const key = hostId ? `/api/live/hosts/${encodeURIComponent(hostId)}/vm` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<HostVmSummary>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveVms() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<VmListItem[]>>("/api/live/vm", fetchJson, DEFAULT);
  return { vms: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveVm(vmId?: string) {
  const key = vmId ? `/api/live/vm/${encodeURIComponent(vmId)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<VmDetail>>(key, fetchJson, DEFAULT);
  return { vm: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

interface VmTimeseries {
  cpu: TimeSeriesPoint[];
  memoryUsed: TimeSeriesPoint[];
  networkRx: TimeSeriesPoint[];
  networkTx: TimeSeriesPoint[];
  diskReadIops: TimeSeriesPoint[];
  diskWriteIops: TimeSeriesPoint[];
  range: string;
  step: string;
  updatedAt: string;
  source: "prometheus";
}

export function useVmTimeseries(vmId?: string, range = "1h", step = "5m") {
  const key = vmId ? `/api/live/vm/${encodeURIComponent(vmId)}/timeseries?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<VmTimeseries>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useComputeClusterTimeseries(clusterId?: string, range = "1h", step = "5m") {
  const key = clusterId ? `/api/live/compute-clusters/${encodeURIComponent(clusterId)}/timeseries?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<ComputeClusterTimeseries>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useStorageClusterTimeseries(clusterId?: string, range = "1h", step = "5m") {
  const key = clusterId ? `/api/live/storage-clusters/${encodeURIComponent(clusterId)}/timeseries?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<StorageClusterTimeseries>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useKubernetesClusterTimeseries(clusterId?: string, range = "1h", step = "5m") {
  const key = clusterId ? `/api/live/kubernetes-clusters/${encodeURIComponent(clusterId)}/timeseries?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<KubernetesClusterTimeseries>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveApplications() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<Application[]>>("/api/live/apps", fetchJson, DEFAULT);
  return { applications: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useApplicationTimeseries(appId?: string, range = "1h", step = "5m") {
  const key = appId ? `/api/live/apps/${encodeURIComponent(appId)}/timeseries?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}` : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<ApplicationTimeseries>>(key, fetchJson, DEFAULT);
  return { data: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveDashboards() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<Dashboard[]>>("/api/live/dashboards", fetchJson, DEFAULT);
  return { dashboards: data?.data ?? [], meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}

export function useLiveOverview() {
  const { data, error, isLoading, mutate } = useSWR<ApiEnvelope<FleetOverview>>("/api/live/overview", fetchJson, DEFAULT);
  return { overview: data?.data, meta: data?.meta, isLoading, isError: !!error, error, refresh: mutate };
}
