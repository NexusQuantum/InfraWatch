"use client";

import useSWR from "swr";

interface LicenseState {
  isLicensed: boolean;
  status: string;
  isGracePeriod: boolean;
  graceDaysRemaining: number | null;
  customerName: string | null;
  product: string | null;
  features: string[];
  expiresAt: string | null;
  activations: number | null;
  maxActivations: number | null;
  verifiedAt: string | null;
  licenseKey: string | null;
  errorMessage: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body && body.error) || `Request failed: ${res.status}`);
  return body as T;
}

export function useLicenseStatus() {
  const { data, error, mutate } = useSWR<LicenseState>(
    "/api/license/status",
    fetchJson,
    { revalidateOnFocus: false, refreshInterval: 5 * 60 * 1000 }
  );
  return {
    state: data ?? null,
    isLicensed: data?.isLicensed ?? false,
    isGracePeriod: data?.isGracePeriod ?? false,
    graceDaysRemaining: data?.graceDaysRemaining ?? null,
    isLoading: !data && !error,
    refresh: () => mutate(),
  };
}
