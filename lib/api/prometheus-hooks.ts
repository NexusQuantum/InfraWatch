"use client";

import useSWR from "swr";

interface ResourceUtilizationPoint {
  timestamp: string;
  value: number;
  series: "CPU" | "Memory";
}

interface NetworkUtilizationPoint {
  timestamp: string;
  value: number;
  series: "Network Rx" | "Network Tx";
}

interface ResourceUtilizationResponse {
  source: "prometheus";
  cpuCurrent: number | null;
  memoryCurrent: number | null;
  networkRxCurrent: number | null;
  networkTxCurrent: number | null;
  nodesWithNetworkErrors: number;
  series: ResourceUtilizationPoint[];
  networkSeries: NetworkUtilizationPoint[];
  range: string;
  step: string;
  updatedAt: string;
}

const DEFAULT_SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMsg =
      (body && typeof body.error === "string" && body.error) ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return response.json() as Promise<T>;
}

export function useResourceUtilization(range = "24h", step = "5m") {
  const key = `/api/metrics/resource-utilization?range=${encodeURIComponent(range)}&step=${encodeURIComponent(step)}`;

  const { data, error, isLoading, mutate } = useSWR<ResourceUtilizationResponse>(
    key,
    fetchJson,
    {
      ...DEFAULT_SWR_CONFIG,
      refreshInterval: 30000,
    }
  );

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
