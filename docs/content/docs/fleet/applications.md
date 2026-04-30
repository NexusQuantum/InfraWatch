+++
title = "Applications"
description = "User-grouped applications — running instances, health rollup, and per-app drill-down"
weight = 47
date = 2026-04-23

[extra]
toc = true
+++

The Applications view at `/apps` groups instances carrying an `app=<name>` label into one row per application. Each entry shows the rolled-up health of its running instances, the backing connector(s), and a link to `/apps/[id]` with per-instance detail. This is the "what's running in my fleet" view — one row per logical service, not per pod or host.

> 📸 **Screenshot needed:** `/images/fleet/apps/list.png`
> **Page to capture:** `/apps`
> **What to show:** The applications list with summary KPIs (Total / Healthy / Warning / Critical) and a populated app grid showing app name, status dot, instance count, and connector badge.

---

## List View — `/apps`

### Summary KPIs

- **Total** applications monitored
- **Healthy / Warning / Critical** counts — driven by the rollup of each app's instances

### Application Rows

Each application tile shows:

| Element | Source |
|---|---|
| Name + status dot | Derived from instance statuses |
| Running instance count | Number of pods or processes carrying the `app` label |
| Connector badge(s) | Which connectors report this application |
| Last seen timestamp | Freshness indicator |
| Quick link | Arrow icon to `/apps/[id]` |

If no connector reports applications, an empty-state card appears with a pointer to the [Connectors](../../connectors/) page.

---

## Detail View — `/apps/[id]`

> 📸 **Screenshot needed:** `/images/fleet/apps/detail.png`
> **Page to capture:** `/apps/[id]`
> **What to show:** The application detail page with the header (app name + rolled-up status), an Instances table listing each pod/host with its status, and live metric cards (requests/s, error rate, latency when available).

The detail page shows:

- **Header** — application name, rolled-up status pill, instance count
- **Instances table** — per-instance host, phase, CPU / memory, uptime
- **Health rollup** — healthy / warning / critical instance counts
- **Live metrics** — when NQRust Hypervisor's embedded Prometheus exposes application metrics such as request counters or latency histograms, the detail surfaces request rate, error rate, and p95 latency

### Instance Health Rollup

An application's overall status is the **worst** status among its instances:

- All instances healthy → **healthy**
- Any instance warning → **warning**
- Any instance critical or down → **critical**
- No instances responding → **down**

---

## How Applications Are Grouped

{{% alert icon="⚡" context="info" %}}
An application is any set of metrics sharing the same `app=<value>` label. Instances of the same app can come from different hypervisor connectors — InfraWatch rolls them into one application row regardless.
{{% /alert %}}

Grouping rules (applied server-side by `fetchLiveApplications()`):

1. Collect every time series across all connectors that has a non-empty `app` label
2. Bucket by `app` value
3. Derive per-app instance count, health rollup, and "last seen" timestamp
4. Return the bucket sorted by status (criticals first)

---

## Data Source

The page calls `/api/live/apps`, which delegates to `fetchLiveApplications()` in the domain layer. Errors from individual connectors are surfaced as a diagnostics banner at the top of the page (same pattern as the Hosts and VMs views) — the list keeps rendering with whatever data succeeded.

---

## Drill-Down Paths

- **Apps list** → click a row → `/apps/[id]`
- **Apps detail** → instance row → host or VM detail (`/hosts/[id]` or `/vm/[id]`)

---

## Related

- [Hosts](../hosts/) — bare-metal app instances show up as host-level processes
- [Connectors](../../connectors/) — make sure your NQRust Hypervisor scrape jobs emit `app=` labels
- [Alerts](../../alerts/) — app-health rules fire against this same rollup
