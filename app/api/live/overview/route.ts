import { NextResponse } from "next/server";
import { fetchLiveOverview } from "@/lib/server/live-data";
import { fetchLiveHosts } from "@/lib/server/domains/hosts";
import { fetchLiveComputeClusters } from "@/lib/server/domains/compute-clusters";
import { fetchLiveStorageClusters } from "@/lib/server/domains/storage-clusters";
import { fetchLiveKubernetesClusters } from "@/lib/server/domains/kubernetes-clusters";
import { evaluateAlerts } from "@/lib/server/alert-evaluator";

export async function GET() {
  try {
    // Fetch overview (cached — this also populates caches for hosts, clusters etc.)
    const response = await fetchLiveOverview();

    // Evaluate alert rules against current data (fire-and-forget).
    // These calls hit the cache populated by fetchLiveOverview — no duplicate Prometheus queries.
    // The evaluator is self-throttled to run at most once per 60s.
    Promise.all([
      fetchLiveHosts(),
      fetchLiveComputeClusters(),
      fetchLiveStorageClusters(),
      fetchLiveKubernetesClusters(),
    ])
      .then(([hosts, compute, storage, k8s]) =>
        evaluateAlerts({
          hosts: hosts.data,
          computeClusters: compute.data,
          storageClusters: storage.data,
          kubernetesClusters: k8s.data,
        })
      )
      .catch((err) =>
        console.error("[overview] Alert evaluation failed:", err)
      );

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load overview" },
      { status: 500 }
    );
  }
}
