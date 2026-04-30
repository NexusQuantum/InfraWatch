+++
title = "Storage"
description = "Cluster storage, gauge kapasitas, inventaris filesystem, dan IOPS read/write"
weight = 46
date = 2026-04-23

[extra]
toc = true
+++

Tampilan Storage di `/storage` mendaftar setiap cluster atau pool storage yang diekspos oleh connector NQRust Hypervisor yang terhubung. Tampilan ini memunculkan kapasitas (used / free / total), kesehatan volume, jumlah komponen yang degraded, dan IOPS read/write. Drill ke `/storage/[id]` untuk detail pool-demi-pool dan inventaris filesystem.

> 📸 **Screenshot needed:** `/images/fleet/storage/list.png`
> **Page to capture:** `/storage`
> **What to show:** Bar rincian Total Storage Capacity di bagian atas, diikuti oleh grid tile cluster storage dengan bar kapasitas, chip pool-health, dan badge degraded-component.

---

## Tampilan Daftar — `/storage`

### Ringkasan Kapasitas

Kartu rincian **Total Storage Capacity** berada di bagian atas halaman. Kartu ini menjumlahkan `capacity.totalBytes` di setiap cluster dan menampilkan bar dua-segmen:

- **Used** — berubah menjadi warning-yellow ketika penggunaan agregat melebihi 85%
- **Free** — selalu healthy green

### KPI Ringkasan

- **Total cluster**
- Jumlah cluster **Healthy / Warning**
- **Degraded components** — jumlah `degradedComponentsCount` di setiap cluster

### Grid Cluster

Setiap tile cluster menampilkan:

| Elemen | Sumber |
|---|---|
| Nama + titik status | `status` |
| Bar kapasitas | `capacity.usedBytes` / `capacity.totalBytes` |
| Kapasitas bebas | `capacity.freeBytes` |
| Ringkasan volume | `volumeSummary.healthy` / `degraded` / `faulted` |
| Degraded components | `degradedComponentsCount` |
| Read / Write IOPS | Ketika diekspos oleh Prometheus tertanam NQRust Hypervisor |

Empty-state dengan kartu "No Storage Clusters" muncul ketika tidak ada connector yang menyediakan metrik storage.

---

## Tampilan Detail — `/storage/[id]`

> 📸 **Screenshot needed:** `/images/fleet/storage/detail.png`
> **Page to capture:** `/storage/[id]`
> **What to show:** Header cluster storage dengan bar kapasitas, rincian kapasitas per-pool di bawahnya, dan baris chip volume-health (jumlah healthy / degraded / faulted).

Halaman detail mem-zoom ke dalam satu cluster:

- **Header** — nama, status, total/used/free capacity dengan bar besar
- **Inventaris pool** — satu baris per pool dengan kapasitas, health, dan IOPS individual
- **Volume health** — chip untuk healthy, degraded, faulted
- **Read / Write IOPS** — kartu metrik berdampingan atau time series ketika connector memaparkan query rate

### Inventaris Filesystem

> 📸 **Screenshot needed:** `/images/fleet/storage/filesystems.png`
> **Page to capture:** `/storage/[id]`
> **What to show:** Tabel filesystem dengan mountpoint, host, device, size, used %, dan status kesehatan untuk setiap filesystem di cluster.

Di bawah inventaris pool, tabel filesystem mendaftar setiap mountpoint yang melapor ke cluster ini dengan size, persentase used, device, dan host tempatnya berada. Klik tautan host untuk melompat ke `/hosts/[id]`.

### Tren IOPS

Ketika Prometheus tertanam NQRust Hypervisor mengekspos metrik disk I/O untuk subsistem storage, halaman detail menampilkan chart time-series dua-garis dengan Read dan Write IOPS. Rentang default adalah 1 jam.

---

## Sumber Data

Baik halaman daftar maupun detail memanggil `/api/live/storage-clusters`, yang mendelegasikan ke `fetchLiveStorageClusters()` di domain layer. Aggregator tersebut mengambil telemetri storage dari setiap connector `nqrust_hypervisor` aktif dan menormalisasi output-nya.

{{% alert icon="⚡" context="info" %}}
Cluster storage ditemukan melalui label. Jika pool storage tidak muncul, pastikan Prometheus tertanam NQRust Hypervisor mengekspos metrik storage untuk pool tersebut dan health check connector berjalan dengan baik.
{{% /alert %}}

---

## Jalur Drill-Down

- **Ringkasan** → panel Top Storage Pressure → `/storage/[id]`
- **Daftar Storage** → klik tile → `/storage/[id]`
- **Detail Host** → tabel filesystem → `/storage/[id]` untuk cluster pendukung

---

## Terkait

- [Cluster](../clusters/) — cluster compute menggunakan model status yang sama
- [Host](../hosts/) — tab filesystem pada setiap host merujuk silang cluster storage
- [Connectors](../../connectors/) — tambahkan atau pecahkan masalah connector NQRust Hypervisor yang menyuplai data storage
- [Alerts](../../alerts/) — threshold kapasitas, IOPS, dan kesehatan pool
