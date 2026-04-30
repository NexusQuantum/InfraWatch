+++
title = "Aplikasi"
description = "Aplikasi yang dikelompokkan pengguna — instance yang berjalan, rollup kesehatan, dan drill-down per aplikasi"
weight = 47
date = 2026-04-23

[extra]
toc = true
+++

Tampilan Aplikasi di `/apps` mengelompokkan instance yang membawa label `app=<name>` ke dalam satu baris per aplikasi. Setiap entri menampilkan rollup kesehatan dari instance yang berjalan, connector pendukung, dan tautan ke `/apps/[id]` dengan detail per-instance. Ini adalah tampilan "apa yang berjalan di fleet" — satu baris per layanan logis, bukan per pod atau host.

> 📸 **Screenshot needed:** `/images/fleet/apps/list.png`
> **Page to capture:** `/apps`
> **What to show:** Daftar aplikasi dengan KPI ringkasan (Total / Healthy / Warning / Critical) dan grid aplikasi yang terisi menampilkan nama aplikasi, titik status, jumlah instance, dan badge connector.

---

## Tampilan Daftar — `/apps`

### KPI Ringkasan

- **Total** aplikasi yang dipantau
- Jumlah **Healthy / Warning / Critical** — didorong oleh rollup instance setiap aplikasi

### Baris Aplikasi

Setiap tile aplikasi menampilkan:

| Elemen | Sumber |
|---|---|
| Nama + titik status | Diturunkan dari status instance |
| Jumlah instance yang berjalan | Jumlah pod atau proses yang membawa label `app` |
| Badge connector | Connector mana yang melaporkan aplikasi ini |
| Timestamp terakhir terlihat | Indikator kesegaran |
| Tautan cepat | Ikon panah ke `/apps/[id]` |

Jika tidak ada connector yang melaporkan aplikasi, kartu empty-state muncul dengan penunjuk ke halaman [Connectors](../../connectors/).

---

## Tampilan Detail — `/apps/[id]`

> 📸 **Screenshot needed:** `/images/fleet/apps/detail.png`
> **Page to capture:** `/apps/[id]`
> **What to show:** Halaman detail aplikasi dengan header (nama aplikasi + status yang digulung), tabel Instances yang mendaftar setiap pod/host dengan status-nya, dan kartu metrik live (requests/s, error rate, latency bila tersedia).

Halaman detail menampilkan:

- **Header** — nama aplikasi, pill status yang digulung, jumlah instance
- **Tabel Instances** — host per-instance, phase, CPU / memory, uptime
- **Rollup kesehatan** — jumlah instance healthy / warning / critical
- **Metrik live** — ketika Prometheus tertanam NQRust Hypervisor mengekspos metrik aplikasi seperti request counter atau histogram latency, detail memunculkan request rate, error rate, dan latency p95

### Rollup Kesehatan Instance

Status keseluruhan sebuah aplikasi adalah status **terburuk** di antara instance-nya:

- Semua instance healthy → **healthy**
- Ada instance warning → **warning**
- Ada instance critical atau down → **critical**
- Tidak ada instance yang merespons → **down**

---

## Bagaimana Aplikasi Dikelompokkan

{{% alert icon="⚡" context="info" %}}
Sebuah aplikasi adalah sekumpulan metrik yang berbagi label `app=<value>` yang sama. Instance dari aplikasi yang sama dapat berasal dari connector hypervisor yang berbeda — InfraWatch menggulungnya menjadi satu baris aplikasi terlepas dari itu.
{{% /alert %}}

Aturan pengelompokan (diterapkan di sisi server oleh `fetchLiveApplications()`):

1. Kumpulkan setiap time series di seluruh connector yang memiliki label `app` tidak kosong
2. Bucket berdasarkan nilai `app`
3. Turunkan jumlah instance per aplikasi, rollup kesehatan, dan timestamp "last seen"
4. Kembalikan bucket yang diurutkan berdasarkan status (critical terlebih dahulu)

---

## Sumber Data

Halaman memanggil `/api/live/apps`, yang mendelegasikan ke `fetchLiveApplications()` di domain layer. Error dari connector individual dimunculkan sebagai banner diagnostik di bagian atas halaman (pola yang sama dengan tampilan Host dan VM) — daftar tetap di-render dengan data mana pun yang berhasil.

---

## Jalur Drill-Down

- **Daftar Apps** → klik baris → `/apps/[id]`
- **Detail Apps** → baris instance → detail host atau VM (`/hosts/[id]` atau `/vm/[id]`)

---

## Terkait

- [Host](../hosts/) — instance aplikasi bare-metal muncul sebagai proses tingkat-host
- [Connectors](../../connectors/) — pastikan job scrape NQRust Hypervisor memancarkan label `app=`
- [Alerts](../../alerts/) — aturan app-health dipicu terhadap rollup yang sama ini
