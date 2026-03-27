"use client";

import useSWR from "swr";
import type { Alert, AlertCount, AlertRule } from "@/lib/server/alerts-store";

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
    throw new Error(
      (body && body.error) || `Failed request: ${response.status}`
    );
  }
  return body as T;
}

async function mutateJson<T>(
  url: string,
  method: string,
  data?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const csrf = getCsrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (body && body.error) || `Failed request: ${response.status}`
    );
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export function useAlerts(status = "active") {
  const { data, error, mutate } = useSWR<{ data: Alert[] }>(
    `/api/alerts?status=${status}`,
    fetchJson,
    {
      revalidateOnFocus: false,
      refreshInterval: 15000,
    }
  );
  return {
    alerts: data?.data ?? [],
    isLoading: !data && !error,
    isError: !!error,
    error,
    refresh: () => mutate(),
  };
}

export function useAlertCount() {
  const { data, error, mutate } = useSWR<{ data: AlertCount }>(
    "/api/alerts/count",
    fetchJson,
    {
      revalidateOnFocus: false,
      refreshInterval: 15000,
    }
  );
  return {
    count: data?.data ?? { total: 0, critical: 0, warning: 0 },
    isLoading: !data && !error,
    isError: !!error,
    refresh: () => mutate(),
  };
}

export async function acknowledgeAlert(id: string) {
  return mutateJson(`/api/alerts/${id}`, "PATCH", { action: "acknowledge" });
}

export async function resolveAlertAction(id: string) {
  return mutateJson(`/api/alerts/${id}`, "PATCH", { action: "resolve" });
}

// ---------------------------------------------------------------------------
// Alert Rules
// ---------------------------------------------------------------------------

export function useAlertRules() {
  const { data, error, mutate } = useSWR<{ data: AlertRule[] }>(
    "/api/alert-rules",
    fetchJson,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    }
  );
  return {
    rules: data?.data ?? [],
    isLoading: !data && !error,
    isError: !!error,
    error,
    refresh: () => mutate(),
  };
}

export async function createAlertRuleAction(input: {
  name: string;
  description?: string;
  entityType: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  durationSeconds?: number;
  enabled?: boolean;
}) {
  return mutateJson("/api/alert-rules", "POST", input);
}

export async function updateAlertRuleAction(
  id: string,
  patch: Record<string, unknown>
) {
  return mutateJson(`/api/alert-rules/${id}`, "PUT", patch);
}

export async function deleteAlertRuleAction(id: string) {
  return mutateJson(`/api/alert-rules/${id}`, "DELETE");
}

// Re-export types for convenience
export type { Alert, AlertCount, AlertRule } from "@/lib/server/alerts-store";
