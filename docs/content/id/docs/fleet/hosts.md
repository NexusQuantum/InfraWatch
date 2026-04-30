+++
title = "Host"
description = "Inventaris per-host, filter, chart time-series, dan detail drill-down untuk setiap node di fleet"
weight = 42
date = 2026-04-23

[extra]
toc = true
+++

Tampilan Host adalah inventaris per-node untuk setiap server yang melapor melalui connector NQRust Hypervisor yang terhubung. Jangkau di `/hosts` atau alias `/nodes` — keduanya menampilkan daftar yang sama. Klik baris mana pun untuk membuka `/hosts/[id]` (alias `/nodes/[id]`) dengan chart historis, tabel filesystem, dan inventaris VM bila host menjalankan NQRust MicroVM.

> 📸 **Screenshot needed:** `/images/fleet/hosts/list.png`
> **Page to capture:** `/hosts`
> **What to show:** Tabel host dengan 8 kartu KPI ringkasan di bagian atas (Total / Healthy / Warning / Critical / Total vCPU / Avg Rx / Avg Tx / Nodes With Net Errors) dan daftar node yang terisi di bawahnya.

---

## Tampilan Daftar

### Kartu Ringkasan

Delapan tile KPI membentang di bagian atas halaman, masing-masing mencerminkan scope filter saat ini:

- Total Nodes
- Jumlah Healthy / Warning / Critical
- Total vCPU (jumlah `cpuLogicalCount` di seluruh host)
- Rata-rata Node Rx / Tx (byte per detik)
- Nodes With Net Errors (host mana pun dengan `networkErrorRate > 0`)

Di bawah kartu, panel peringkat **Top Nodes by Network Throughput** menyoroti delapan host tersibuk pada set yang sedang difilter.

### Filter

> 📸 **Screenshot needed:** `/images/fleet/hosts/filters.png`
> **Page to capture:** `/hosts`
> **What to show:** Filter bar dengan input pencarian yang fokus, dropdown Status terbuka menampilkan Healthy/Warning/Critical/Down, dan dropdown Role yang terlihat.

Filter bar mendukung:

- **Search** — mencocokkan hostname, alamat IP, atau substring site
- **Status** — all / healthy / warning / critical / down
- **Role** — all / compute / storage / control-plane / mixed

Pengurutan tersedia pada setiap header kolom dan bertahan sampai halaman dimuat ulang.

### Kolom Tabel

| Kolom | Field sumber | Catatan |
|---|---|---|
| **Node** | `hostname`, `ipAddress` | Klik baris untuk drill masuk |
| **Status** | `status` | Pill: healthy / warning / critical / down / unknown |
| **Role** | `role` | Disimpulkan dari label |
| **Cluster** | `serverClusterId` | Kosong jika host tidak berada di cluster compute |
| **Site** | `site` | Label datacenter / region |
| **vCPU** | `current.cpuLogicalCount` | Jumlah logical core |
| **CPU** | `current.cpuUsagePct` | Resource bar, merah di atas 90% |
| **Memory** | `current.memoryUsagePct` | Resource bar, merah di atas 90% |
| **Network** | `networkRxBytesPerSec` + `networkTxBytesPerSec` | Rx dan Tx pada dua baris |
| **Net Errors** | `networkErrorRate` | Error per detik |
| **Disk** | `current.diskUsagePct` | Resource bar, merah di atas 90% |
| **Disk IO** | `current.diskIoUtilPct` | Warning berwarna di atas 50%, critical di atas 80% |
| **Load** | `current.load1` | Load average 1 menit |

---

## Tampilan Detail

> 📸 **Screenshot needed:** `/images/fleet/hosts/detail-top.png`
> **Page to capture:** `/hosts/[id]` untuk host yang healthy
> **What to show:** Bagian atas halaman detail — hostname, pill status, baris IP/OS/role, dan grid kartu metrik (vCPU Count, CPU %, Memory %, Disk %, Node Rx, Node Tx, Network Error Rate, Active Interfaces, Load, Uptime, Disk IO Util, Disk IOPS, Running VMs, Free VM Slots, VM CPU / Memory).

### Kartu Metrik

Halaman detail dibuka dengan sekitar 18 tile metrik yang mencakup jumlah vCPU, persentase CPU / memory / disk, Rx/Tx live, network error rate, active interface, load (1m/5m/15m), uptime dalam hari, utilisasi disk I/O, disk IOPS (read/write), jumlah VM yang berjalan, slot VM bebas (S/M/L), dan VM CPU / memory yang diminta.

{{% alert icon="⚡" context="info" %}}
Kartu **VM Capacity Snapshot** menggunakan model slot tetap: S = 1 vCPU / 2 GiB, M = 2 vCPU / 4 GiB, L = 4 vCPU / 8 GiB. "Free slots" adalah estimasi berapa banyak VM tambahan dari setiap ukuran yang masih muat di atas alokasi saat ini.
{{% /alert %}}

### Tab Charts

> 📸 **Screenshot needed:** `/images/fleet/hosts/detail-charts.png`
> **Page to capture:** `/hosts/[id]`
> **What to show:** Chart time-series CPU dan Memory berdampingan pada rentang 1 jam, diikuti oleh chart Network Throughput (Rx/Tx) langsung di bawahnya.

Bagian time-series menampilkan empat chart yang disuplai oleh query PromQL per-rentang terhadap Prometheus tertanam NQRust Hypervisor:

- **CPU Usage** — area chart, 0-100%
- **Memory Usage** — area chart, 0-100%
- **Network Throughput** — line chart dua-seri (Rx + Tx) dalam byte per detik
- **Top Interfaces by Throughput** / **Network Errors by Interface** — panel peringkat

Rentang default adalah 1 jam dengan step 5 menit. Jika hook time-series yang mendasari mengembalikan array kosong, chart akan fallback ke garis satu-titik pada snapshot host saat ini.

### Tab Disk & Filesystem

> 📸 **Screenshot needed:** `/images/fleet/hosts/detail-disk.png`
> **Page to capture:** `/hosts/[id]` dengan beberapa filesystem ter-mount
> **What to show:** Tabel filesystem dengan mountpoint, device, size, used%, dan kartu metrik Disk IO di atasnya (Disk IO Util, Disk IOPS R/W).

Konten sisi disk mencakup:

- Tile metrik **Disk IO Util** (warning >50%, critical >80%)
- Tile **Disk IOPS (R/W)** menampilkan IOPS read dan write
- Tabel **Filesystem inventory** yang mendaftar mountpoint, device, total size, used %
- Tabel **Network Interfaces** dengan Rx, Tx, dan error rate per-interface

### Inventaris VM

Ketika host menjalankan NQRust MicroVM, kartu **VM Inventory** mendaftar hingga 20 VM berdasarkan nama, namespace, dan phase. Setiap baris menautkan ke `/vm/[id]`.

---

## Jalur Drill-Down

Halaman detail host dapat dicapai dari salah satu entry point berikut:

- Ringkasan → panel peringkat **Top Nodes by CPU / Load / Disk IO / Network**
- Daftar Host → klik baris mana pun
- Detail cluster di `/clusters/[id]` → daftar host anggota
- Detail connector di `/connectors/[id]` → host yang melapor dari connector tersebut
- Cluster storage di `/storage/[id]` → host storage yang mendasari

---

## Terkait

- [Cluster](../clusters/) — kelompokkan host anggota berdasarkan label
- [Virtual Machine](../virtual-machines/) — drill dari inventaris VM sebuah host
- [Connectors](../../connectors/) — host yang hilang hampir selalu berarti connector yang bermasalah
- [Alerts](../../alerts/) — threshold yang dievaluasi terhadap field `current.*` yang sama
