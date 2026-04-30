+++
title = "Clusters"
description = "Compute clusters group related hosts; storage clusters expose capacity and pool health"
weight = 43
date = 2026-04-23

[extra]
toc = true
+++

**Clusters** in InfraWatch come in two flavors. Compute clusters at `/clusters` group hosts that share the same cluster label (typically `cluster`, `environment`, or a connector-specific id). Storage clusters at `/storage` surface capacity, pool health, and volume status from dedicated storage systems. Both support drill-down to their member resources.

> 📸 **Screenshot needed:** `/images/fleet/clusters/compute-list.png`
> **Page to capture:** `/clusters`
> **What to show:** The compute-clusters grid with cluster tiles, each showing node count, at-risk badges, average CPU/memory bars, and VM running counts.

---

## Compute Clusters

### List View — `/clusters`

The list is a card grid. Each cluster tile renders:

- Cluster name + status dot (healthy / warning / critical / down)
- Node count and at-risk count (`warningNodeCount + criticalNodeCount`)
- Average CPU and Memory utilization bars
- Running VM count and estimated free M-sized slots
- Average network Rx / Tx
- Count of nodes with network errors (if any)

Summary KPIs above the grid track total clusters, clusters at risk, nodes at risk, pressure clusters (CPU ≥80% or Memory ≥85%), total running VMs, and estimated free capacity.

A time-range selector (1h / 6h / 24h) controls trend sparklines rendered inside each cluster tile.

### Detail View — `/clusters/[id]`

> 📸 **Screenshot needed:** `/images/fleet/clusters/compute-detail.png`
> **Page to capture:** `/clusters/[id]`
> **What to show:** A compute-cluster detail page showing the cluster summary card at the top, a health matrix of member hosts, and the member-host table below.

Drill into a cluster to see:

- **Aggregate metrics** — average CPU, memory, disk across every member host
- **Health matrix** — one tile per node, colored by status
- **Member hosts table** — the same columns as the global Hosts list, scoped to the cluster
- **Top-N panels** — CPU, memory, disk I/O, network throughput within the cluster

{{% alert icon="⚡" context="info" %}}
Compute clusters are **logical groupings**, not connector entities. A cluster is defined by hosts sharing the same `cluster` label value (or a fallback combination of labels). If you add a connector and don't see a cluster, check that the NQRust Hypervisor's embedded Prometheus is emitting the expected cluster label — or let InfraWatch auto-group by connector.
{{% /alert %}}

---

## Storage Clusters

### List View — `/storage`

> 📸 **Screenshot needed:** `/images/fleet/clusters/storage-list.png`
> **Page to capture:** `/storage`
> **What to show:** The storage-clusters page with the Total Storage Capacity breakdown bar at the top and the cluster grid below, each tile showing capacity bar, degraded components, and pool health.

Each storage-cluster tile shows:

- Name, status dot, degraded-component count
- **Capacity bar** — used / free in TB or PB
- Volume summary — total / healthy / degraded / faulted
- Average read / write IOPS (when available)

A **Total Storage Capacity** breakdown card tops the page, aggregating Used and Free segments across every storage cluster.

### Detail View — `/storage/[id]`

See the dedicated [Storage](../storage/) page for the storage cluster detail view — it covers pool inventory, filesystem table, and IOPS drill-down in depth.

---

## Drill-Down Paths

> 📸 **Screenshot needed:** `/images/fleet/clusters/drilldown.png`
> **Page to capture:** `/clusters/[id]` member table
> **What to show:** The member-host table with one row highlighted, and the cursor hovering a hostname showing the `/hosts/[id]` link target.

From a compute cluster you can jump to:

- Any member host → `/hosts/[id]`
- Any VM running on a member host → `/vm/[id]`
- The connector that supplies the cluster's hosts → `/connectors/[id]`

From a storage cluster you can jump to:

- Underlying storage hosts → `/hosts/[id]`
- Member pools or filesystems → `/storage/[id]`

---

## Related

- [Hosts](../hosts/) — the node-level view that feeds cluster aggregates
- [Storage](../storage/) — storage cluster deep dive
- [Connectors](../../connectors/) — clusters only appear when their source connector is healthy
