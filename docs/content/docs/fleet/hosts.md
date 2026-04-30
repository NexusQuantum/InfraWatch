+++
title = "Hosts"
description = "Per-host inventory, filters, time-series charts, and drill-down detail for every node in the fleet"
weight = 42
date = 2026-04-23

[extra]
toc = true
+++

The Hosts view is the per-node inventory for every server that reports through a connected NQRust Hypervisor connector. Reach it at `/hosts` or the alias `/nodes` — both render the same list. Click any row to open `/hosts/[id]` (alias `/nodes/[id]`) with historical charts, filesystem tables, and a VM inventory when the host runs NQRust MicroVMs.

> 📸 **Screenshot needed:** `/images/fleet/hosts/list.png`
> **Page to capture:** `/hosts`
> **What to show:** The hosts table with 8 summary KPI cards at the top (Total / Healthy / Warning / Critical / Total vCPU / Avg Rx / Avg Tx / Nodes With Net Errors) and a populated node list below.

---

## The List View

### Summary Cards

Eight KPI tiles span the top of the page, each reflecting the current filter scope:

- Total Nodes
- Healthy / Warning / Critical counts
- Total vCPU (sum of `cpuLogicalCount` across all hosts)
- Average Node Rx / Tx (bytes per second)
- Nodes With Net Errors (any host with `networkErrorRate > 0`)

Below the cards, a **Top Nodes by Network Throughput** ranking panel highlights the eight busiest hosts in the currently filtered set.

### Filters

> 📸 **Screenshot needed:** `/images/fleet/hosts/filters.png`
> **Page to capture:** `/hosts`
> **What to show:** The filter bar with the search input focused, Status dropdown open showing Healthy/Warning/Critical/Down, and the Role dropdown visible.

The filter bar supports:

- **Search** — matches hostname, IP address, or site substring
- **Status** — all / healthy / warning / critical / down
- **Role** — all / compute / storage / control-plane / mixed

Sorting is available on every column header and persists until you reload.

### Table Columns

| Column | Source field | Notes |
|---|---|---|
| **Node** | `hostname`, `ipAddress` | Click the row to drill in |
| **Status** | `status` | Pill: healthy / warning / critical / down / unknown |
| **Role** | `role` | Inferred from labels |
| **Cluster** | `serverClusterId` | Blank if the host isn't in a compute cluster |
| **Site** | `site` | Datacenter / region label |
| **vCPU** | `current.cpuLogicalCount` | Logical core count |
| **CPU** | `current.cpuUsagePct` | Resource bar, red above 90% |
| **Memory** | `current.memoryUsagePct` | Resource bar, red above 90% |
| **Network** | `networkRxBytesPerSec` + `networkTxBytesPerSec` | Rx and Tx on two lines |
| **Net Errors** | `networkErrorRate` | Errors per second |
| **Disk** | `current.diskUsagePct` | Resource bar, red above 90% |
| **Disk IO** | `current.diskIoUtilPct` | Colored warning above 50%, critical above 80% |
| **Load** | `current.load1` | 1-minute load average |

---

## The Detail View

> 📸 **Screenshot needed:** `/images/fleet/hosts/detail-top.png`
> **Page to capture:** `/hosts/[id]` for a healthy host
> **What to show:** The top of the detail page — hostname, status pill, IP/OS/role row, and the grid of metric cards (vCPU Count, CPU %, Memory %, Disk %, Node Rx, Node Tx, Network Error Rate, Active Interfaces, Load, Uptime, Disk IO Util, Disk IOPS, Running VMs, Free VM Slots, VM CPU / Memory).

### Metric Cards

The detail page opens with ~18 metric tiles spanning vCPU count, CPU / memory / disk percentages, live Rx/Tx, network error rate, active interfaces, load (1m/5m/15m), uptime in days, disk I/O utilization, disk IOPS (read/write), running VM count, free VM slots (S/M/L), and VM CPU / memory requested.

{{% alert icon="⚡" context="info" %}}
The **VM Capacity Snapshot** card uses a fixed slot model: S = 1 vCPU / 2 GiB, M = 2 vCPU / 4 GiB, L = 4 vCPU / 8 GiB. "Free slots" is an estimate of how many more VMs of each size would fit on top of current allocations.
{{% /alert %}}

### Charts Tab

> 📸 **Screenshot needed:** `/images/fleet/hosts/detail-charts.png`
> **Page to capture:** `/hosts/[id]`
> **What to show:** The side-by-side CPU and Memory time-series charts over a 1-hour range, followed by the Network Throughput chart (Rx/Tx) directly below.

The time-series section renders four charts fed by the host's per-range PromQL queries against NQRust Hypervisor's embedded Prometheus:

- **CPU Usage** — area chart, 0-100%
- **Memory Usage** — area chart, 0-100%
- **Network Throughput** — dual-series line chart (Rx + Tx) in bytes per second
- **Top Interfaces by Throughput** / **Network Errors by Interface** — ranking panels

Default range is 1 hour with a 5-minute step. If the underlying time-series hook returns empty arrays, the chart falls back to a single-point line at the host's current snapshot.

### Disk & Filesystem Tab

> 📸 **Screenshot needed:** `/images/fleet/hosts/detail-disk.png`
> **Page to capture:** `/hosts/[id]` with multiple filesystems mounted
> **What to show:** The filesystem table with mountpoint, device, size, used%, and the Disk IO metric cards above it (Disk IO Util, Disk IOPS R/W).

Disk-side content includes:

- **Disk IO Util** metric tile (warning >50%, critical >80%)
- **Disk IOPS (R/W)** tile showing read and write IOPS
- **Filesystem inventory** table listing mountpoint, device, total size, used %
- **Network Interfaces** table with per-interface Rx, Tx, and error rate

### VM Inventory

When the host runs NQRust MicroVMs, a **VM Inventory** card lists up to 20 VMs by name, namespace, and phase. Each row links to `/vm/[id]`.

---

## Drill-Down Paths

You reach a host's detail page from any of these entry points:

- Overview → **Top Nodes by CPU / Load / Disk IO / Network** ranking panels
- Hosts list → click any row
- Cluster detail at `/clusters/[id]` → member-host list
- Connector detail at `/connectors/[id]` → hosts reporting from that connector
- Storage cluster at `/storage/[id]` → underlying storage hosts

---

## Related

- [Clusters](../clusters/) — group member hosts by labels
- [Virtual Machines](../virtual-machines/) — drill from a host's VM inventory
- [Connectors](../../connectors/) — a missing host almost always means a sick connector
- [Alerts](../../alerts/) — thresholds evaluated against the same `current.*` fields
