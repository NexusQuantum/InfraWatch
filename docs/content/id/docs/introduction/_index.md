+++
title = "Pendahuluan"
description = "InfraWatch — observability infrastruktur untuk fleet NQRust Hypervisor"
icon = "rocket_launch"
weight = 10
layout = "single"
toc = true
+++

<div style="text-align: center; margin: 2rem 0;">
  <img src="/images/infrawatch-logo-full.png" alt="InfraWatch" style="max-width: 480px; width: 100%;" />
</div>

**InfraWatch** adalah dashboard observability infrastruktur self-hosted yang fokus pada operasi **NQRust Hypervisor**.

> 📸 **Screenshot needed:** `/images/introduction/overview-hero.png`
> **Page to capture:** `/`
> **What to show:** Tampilan awal dashboard dengan kartu KPI atas, ringkasan health, dan chart live.

---

## Cakupan utama

- Ringkasan fleet untuk host, cluster, VM, storage, dan aplikasi
- Drill-down host dan VM dengan chart historis
- Alert berbasis threshold dengan auto-resolve
- Health connector, latensi, dan pengelolaan kredensial aman
- Rust TUI installer untuk deployment online dan air-gapped

---

## Stack inti

- Next.js 16 + React 19 + Tailwind CSS v4
- PostgreSQL 14+
- SWR polling setiap 30 detik
- LRU cache (500 entri)
- Prometheus client NQRust Hypervisor dengan concurrency terbatas (maks. 20)

---

## Cakupan connector

Dokumentasi InfraWatch saat ini mendukung satu tipe connector produksi:

| Tipe | Sumber | Cakupan |
|---|---|---|
| `nqrust_hypervisor` | Prometheus tertanam NQRust Hypervisor | Host, cluster, VM, storage, metrik alert |

> 📸 **Screenshot needed:** `/images/introduction/connector-scope.png`
> **Page to capture:** `/connectors`
> **What to show:** Daftar connector yang menonjolkan baris NQRust Hypervisor dengan status dan latensi.

---

## Langkah berikutnya

- [Instalasi](../getting-started/installation/)
- [Mulai Cepat](../getting-started/quick-start/)
- [Connectors](../connectors/)
- [Referensi API](../api-reference/)
