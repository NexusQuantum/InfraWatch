+++
title = "Overview Dashboard"
description = "Aggregate fleet health, KPI cards, resource utilization, and top-N rankings at a glance"
weight = 41
date = 2026-04-23

[extra]
toc = true
+++

The Overview dashboard at `/` is the landing page after login. It fuses data from every connector into four hero KPI cards (clusters, nodes, VMs, storage), a resource-utilization time series, ranking panels for the worst offenders, and a diagnostics banner when any connector is partial or down.

> 📸 **Screenshot needed:** `/images/fleet/overview/hero-kpis.png`
> **Page to capture:** `/`
> **What to show:** The four KPI cards at the top — Total Clusters, Total Nodes, Total VMs, Total Storage — with their subtitles showing splits (compute/storage, at-risk count, free slots, % used).

---

## What You See

### Hero KPI Cards

Four tiles pinned to the top of the page, each rendering live data from `/api/live/overview`:

| Card | Primary value | Subtitle |
|---|---|---|
| **Total Clusters** | Sum of compute + storage clusters | `<n> compute · <n> storage` |
| **Total Nodes** | Host count across all connectors | `all healthy` or `<n> at risk` |
| **Total VMs** | Running NQRust MicroVM count | `<n> hosts · <n> free slots (M)` |
| **Total Storage** | Aggregate capacity in TB/PB | `<n>% used` plus degraded-volume badge |

### Fleet Health

The **System Metrics** card near the bottom of the page renders four progress bars for Average CPU, Average Memory, Average Disk, and Disk IO Utilization — each sourced from the current snapshot of every reporting host.

> 📸 **Screenshot needed:** `/images/fleet/overview/fleet-health.png`
> **Page to capture:** `/`
> **What to show:** The "System Metrics" card with the four progress bars populated, plus the Top Nodes by CPU ranking panel beside it.

### Alerts & Diagnostics

When any connector reports partial data, an overview error, or the resource-utilization query fails, a yellow **Data Source Diagnostics** card appears above the metrics. It lists failed connectors by id, along with any VM-aggregation errors returned from the domain layer.

> 📸 **Screenshot needed:** `/images/fleet/overview/alerts-card.png`
> **Page to capture:** `/` with a degraded connector
> **What to show:** The yellow warning card listing "Overview query failed", "Resource utilization query failed", or "Partial data detected. Failed connectors: …".

### Resource Utilization Chart

A full-width time-series chart plots CPU% and Memory% over the selected range (1h / 6h / 24h — toggled from the command bar). Alongside it, a **Top Nodes by CPU** ranking panel lists the five busiest hosts, each linking to `/nodes/[id]`.

> 📸 **Screenshot needed:** `/images/fleet/overview/resource-utilization.png`
> **Page to capture:** `/` with the 24h range selected
> **What to show:** The Resource Utilization line chart showing CPU and Memory over 24 hours, plus the neighboring Top Nodes by CPU panel.

---

## How It's Built

The dashboard lives in `app/page.tsx`. It calls five SWR hooks in parallel:

- `useLiveOverview()` → `/api/live/overview`
- `useLiveConnectors()` → `/api/live/connectors`
- `useLiveHosts()` → `/api/live/hosts`
- `useLiveComputeClusters()` → `/api/live/compute-clusters`
- `useLiveStorageClusters()` → `/api/live/storage-clusters`

The **overview** endpoint is special: fetching it also warms caches for hosts, compute clusters, and storage clusters, and opportunistically runs the alert evaluator (self-throttled to once per 60s). That's why opening the dashboard keeps every downstream page snappy for the first polling interval.

Extra panels below the hero cards include:

- **Connector Latency** — top 5 slowest connectors
- **Top Nodes by Load Average** — hosts with highest `load1`
- **Top Nodes by Disk IO Utilization** — color-coded red above 80%
- **Top Storage Pressure** — storage clusters by `capacity.usedPct`
- **Network Throughput Trend** — Rx/Tx time series, bytes-per-second
- **Top Nodes by VM Count** and **Top Nodes by VM Capacity (M)** — fed from `overview.vm`

---

## Related

- [Hosts](../hosts/) — drill into any node from a ranking panel
- [Clusters](../clusters/) — click through to the compute-cluster detail
- [Storage](../storage/) — follow the top-pressure panel link
- [Connectors](../../connectors/) — troubleshoot the sources behind a partial-data diagnostic
- [Alerts](../../alerts/) — understand which thresholds fire against this same data
