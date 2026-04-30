+++
title = "Storage"
description = "Storage clusters, capacity gauges, filesystem inventory, and read/write IOPS"
weight = 46
date = 2026-04-23

[extra]
toc = true
+++

The Storage view at `/storage` lists every storage cluster or pool exposed by connected NQRust Hypervisor connectors. It surfaces capacity (used / free / total), volume health, degraded component count, and read/write IOPS. Drill into `/storage/[id]` for pool-by-pool detail and filesystem inventory.

> 📸 **Screenshot needed:** `/images/fleet/storage/list.png`
> **Page to capture:** `/storage`
> **What to show:** The Total Storage Capacity breakdown bar at the top, followed by the grid of storage-cluster tiles with capacity bars, pool-health chips, and degraded-component badges.

---

## List View — `/storage`

### Capacity Overview

A **Total Storage Capacity** breakdown card sits at the top of the page. It sums `capacity.totalBytes` across every cluster and renders a two-segment bar:

- **Used** — turns warning-yellow when aggregate usage exceeds 85%
- **Free** — always healthy green

### Summary KPIs

- **Total clusters**
- **Healthy / Warning** cluster counts
- **Degraded components** — sum of `degradedComponentsCount` across every cluster

### Cluster Grid

Each cluster tile shows:

| Element | Source |
|---|---|
| Name + status dot | `status` |
| Capacity bar | `capacity.usedBytes` / `capacity.totalBytes` |
| Free capacity | `capacity.freeBytes` |
| Volume summary | `volumeSummary.healthy` / `degraded` / `faulted` |
| Degraded components | `degradedComponentsCount` |
| Read / Write IOPS | When exposed by NQRust Hypervisor's embedded Prometheus |

An empty state with a "No Storage Clusters" card appears when no connector provides storage metrics.

---

## Detail View — `/storage/[id]`

> 📸 **Screenshot needed:** `/images/fleet/storage/detail.png`
> **Page to capture:** `/storage/[id]`
> **What to show:** The storage cluster header with capacity bar, per-pool capacity breakdown below, and the volume-health chip row (healthy / degraded / faulted counts).

The detail page zooms into a single cluster:

- **Header** — name, status, total/used/free capacity with a large bar
- **Pool inventory** — one row per pool with individual capacity, health, and IOPS
- **Volume health** — chips for healthy, degraded, faulted
- **Read / Write IOPS** — side-by-side metric cards or a time series when the connector exposes rate queries

### Filesystem Inventory

> 📸 **Screenshot needed:** `/images/fleet/storage/filesystems.png`
> **Page to capture:** `/storage/[id]`
> **What to show:** The filesystem table with mountpoint, host, device, size, used %, and health status for each filesystem in the cluster.

Below the pool inventory, a filesystem table lists every mountpoint reporting to this cluster with size, used percentage, device, and the host it lives on. Click a host link to jump to `/hosts/[id]`.

### IOPS Trend

When NQRust Hypervisor's embedded Prometheus exposes disk I/O metrics for the storage subsystem, the detail page renders a dual-line time-series chart with Read and Write IOPS. Range defaults to 1 hour.

---

## Data Source

Both list and detail pages call `/api/live/storage-clusters`, which delegates to `fetchLiveStorageClusters()` in the domain layer. That aggregator queries storage telemetry from every active `nqrust_hypervisor` connector and normalizes the output.

{{% alert icon="⚡" context="info" %}}
Storage clusters are discovered by label. If a storage pool doesn't appear, verify that NQRust Hypervisor's embedded Prometheus is exposing storage metrics for that pool and that the connector's health check is passing.
{{% /alert %}}

---

## Drill-Down Paths

- **Overview** → Top Storage Pressure panel → `/storage/[id]`
- **Storage list** → click a tile → `/storage/[id]`
- **Host detail** → filesystem table → `/storage/[id]` for the backing cluster

---

## Related

- [Clusters](../clusters/) — compute clusters use the same status model
- [Hosts](../hosts/) — the filesystem tab on each host cross-references storage clusters
- [Connectors](../../connectors/) — add or troubleshoot the NQRust Hypervisor connector that feeds storage data
- [Alerts](../../alerts/) — capacity, IOPS, and pool-health thresholds
