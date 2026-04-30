+++
title = "Introduction"
description = "InfraWatch — infrastructure observability for NQRust Hypervisor fleets"
icon = "rocket_launch"
weight = 10
layout = "single"
toc = true
+++

<div style="text-align: center; margin: 2rem 0;">
  <img src="/images/infrawatch-logo-full.png" alt="InfraWatch" style="max-width: 480px; width: 100%;" />
</div>

**InfraWatch** is a self-hosted infrastructure observability dashboard focused on **NQRust Hypervisor** operations.

> 📸 **Screenshot needed:** `/images/introduction/overview-hero.png`
> **Page to capture:** `/`
> **What to show:** The dashboard first fold with top KPI cards, health summary, and live charts visible.

---

## What it covers

- Fleet overview for hosts, clusters, VMs, storage, and applications
- Host and VM drill-down views with historical charts
- Threshold-based alerts with auto-resolution
- Connector health, latency, and secure credential handling
- Rust TUI installer for online and air-gapped deployment

---

## Core stack

- Next.js 16 + React 19 + Tailwind CSS v4
- PostgreSQL 14+
- SWR polling every 30 seconds
- LRU cache (500 entries)
- NQRust Hypervisor Prometheus client with bounded concurrency (20 max)

---

## Connector scope

InfraWatch documentation currently supports one production connector type:

| Type | Source | Coverage |
|---|---|---|
| `nqrust_hypervisor` | NQRust Hypervisor embedded Prometheus | Hosts, clusters, VMs, storage, alerting metrics |

> 📸 **Screenshot needed:** `/images/introduction/connector-scope.png`
> **Page to capture:** `/connectors`
> **What to show:** Connector list focused on NQRust Hypervisor rows with status and latency visible.

---

## Next steps

- [Installation](../getting-started/installation/)
- [Quick Start](../getting-started/quick-start/)
- [Connectors](../connectors/)
- [API Reference](../api-reference/)
