+++
title = "Dashboard Ringkasan"
description = "Kesehatan fleet agregat, kartu KPI, utilisasi sumber daya, dan peringkat top-N dalam satu tampilan"
weight = 41
date = 2026-04-23

[extra]
toc = true
+++

Dashboard Ringkasan di `/` adalah landing page setelah login. Dashboard ini menyatukan data dari setiap connector ke dalam empat kartu KPI hero (cluster, node, VM, storage), time series utilisasi sumber daya, panel peringkat untuk kontributor terburuk, dan banner diagnostik ketika ada connector yang partial atau mati.

> 📸 **Screenshot needed:** `/images/fleet/overview/hero-kpis.png`
> **Page to capture:** `/`
> **What to show:** Empat kartu KPI di bagian atas — Total Clusters, Total Nodes, Total VMs, Total Storage — dengan subtitle yang menampilkan rincian (compute/storage, jumlah at-risk, slot free, % used).

---

## Yang Ditampilkan

### Kartu KPI Hero

Empat tile disematkan di bagian atas halaman, masing-masing menampilkan data live dari `/api/live/overview`:

| Kartu | Nilai utama | Subtitle |
|---|---|---|
| **Total Clusters** | Jumlah cluster compute + storage | `<n> compute · <n> storage` |
| **Total Nodes** | Jumlah host di seluruh connector | `all healthy` atau `<n> at risk` |
| **Total VMs** | Jumlah NQRust MicroVM yang berjalan | `<n> hosts · <n> free slots (M)` |
| **Total Storage** | Kapasitas agregat dalam TB/PB | `<n>% used` ditambah badge degraded-volume |

### Kesehatan Fleet

Kartu **System Metrics** di dekat bagian bawah halaman menampilkan empat progress bar untuk Average CPU, Average Memory, Average Disk, dan Disk IO Utilization — masing-masing bersumber dari snapshot saat ini dari setiap host yang melapor.

> 📸 **Screenshot needed:** `/images/fleet/overview/fleet-health.png`
> **Page to capture:** `/`
> **What to show:** Kartu "System Metrics" dengan empat progress bar yang terisi, ditambah panel peringkat Top Nodes by CPU di sebelahnya.

### Alert & Diagnostik

Ketika ada connector yang melaporkan data partial, error overview, atau query resource-utilization gagal, kartu **Data Source Diagnostics** berwarna kuning muncul di atas metrik. Kartu tersebut mendaftar connector yang gagal beserta id-nya, serta error agregasi VM yang dikembalikan dari domain layer.

> 📸 **Screenshot needed:** `/images/fleet/overview/alerts-card.png`
> **Page to capture:** `/` dengan connector yang degraded
> **What to show:** Kartu peringatan kuning yang mendaftar "Overview query failed", "Resource utilization query failed", atau "Partial data detected. Failed connectors: …".

### Chart Utilisasi Sumber Daya

Chart time-series selebar penuh memplot CPU% dan Memory% pada rentang yang dipilih (1h / 6h / 24h — diatur dari command bar). Di sebelahnya, panel peringkat **Top Nodes by CPU** mendaftar lima host tersibuk, masing-masing menautkan ke `/nodes/[id]`.

> 📸 **Screenshot needed:** `/images/fleet/overview/resource-utilization.png`
> **Page to capture:** `/` dengan rentang 24h terpilih
> **What to show:** Chart garis Resource Utilization yang menampilkan CPU dan Memory selama 24 jam, ditambah panel Top Nodes by CPU di sebelahnya.

---

## Cara Dashboard Dibangun

Dashboard berada di `app/page.tsx`. Halaman ini memanggil lima hook SWR secara paralel:

- `useLiveOverview()` → `/api/live/overview`
- `useLiveConnectors()` → `/api/live/connectors`
- `useLiveHosts()` → `/api/live/hosts`
- `useLiveComputeClusters()` → `/api/live/compute-clusters`
- `useLiveStorageClusters()` → `/api/live/storage-clusters`

Endpoint **overview** bersifat khusus: mengambilnya juga memanaskan cache untuk host, compute cluster, dan storage cluster, serta secara oportunistik menjalankan evaluator alert (dibatasi sendiri menjadi sekali per 60 detik). Itulah mengapa membuka dashboard membuat setiap halaman downstream tetap cepat selama interval polling pertama.

Panel tambahan di bawah kartu hero mencakup:

- **Connector Latency** — 5 connector paling lambat
- **Top Nodes by Load Average** — host dengan `load1` tertinggi
- **Top Nodes by Disk IO Utilization** — diberi warna merah di atas 80%
- **Top Storage Pressure** — cluster storage berdasarkan `capacity.usedPct`
- **Network Throughput Trend** — time series Rx/Tx, byte per detik
- **Top Nodes by VM Count** dan **Top Nodes by VM Capacity (M)** — disuplai dari `overview.vm`

---

## Terkait

- [Host](../hosts/) — drill ke node mana pun dari panel peringkat
- [Cluster](../clusters/) — klik untuk masuk ke detail compute-cluster
- [Storage](../storage/) — ikuti tautan panel top-pressure
- [Connectors](../../connectors/) — memecahkan masalah sumber di balik diagnostik partial-data
- [Alerts](../../alerts/) — memahami threshold mana yang dipicu terhadap data yang sama
