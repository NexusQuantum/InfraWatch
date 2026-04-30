+++
title = "Cluster"
description = "Cluster compute mengelompokkan host terkait; cluster storage memaparkan kapasitas dan kesehatan pool"
weight = 43
date = 2026-04-23

[extra]
toc = true
+++

**Cluster** di InfraWatch hadir dalam dua jenis. Cluster compute di `/clusters` mengelompokkan host yang berbagi label cluster yang sama (biasanya `cluster`, `environment`, atau id khusus-connector). Cluster storage di `/storage` memunculkan kapasitas, kesehatan pool, dan status volume dari sistem storage khusus. Keduanya mendukung drill-down ke sumber daya anggotanya.

> 📸 **Screenshot needed:** `/images/fleet/clusters/compute-list.png`
> **Page to capture:** `/clusters`
> **What to show:** Grid compute-clusters dengan tile cluster, masing-masing menampilkan jumlah node, badge at-risk, bar CPU/memory rata-rata, dan jumlah VM yang berjalan.

---

## Cluster Compute

### Tampilan Daftar — `/clusters`

Daftar berupa grid kartu. Setiap tile cluster menampilkan:

- Nama cluster + titik status (healthy / warning / critical / down)
- Jumlah node dan jumlah at-risk (`warningNodeCount + criticalNodeCount`)
- Bar utilisasi CPU dan Memory rata-rata
- Jumlah VM yang berjalan dan estimasi slot M-size yang bebas
- Rata-rata Rx / Tx jaringan
- Jumlah node dengan error jaringan (jika ada)

KPI ringkasan di atas grid melacak total cluster, cluster at-risk, node at-risk, cluster bertekanan (CPU ≥80% atau Memory ≥85%), total VM yang berjalan, dan estimasi kapasitas bebas.

Selektor rentang waktu (1h / 6h / 24h) mengontrol sparkline tren yang ditampilkan di dalam setiap tile cluster.

### Tampilan Detail — `/clusters/[id]`

> 📸 **Screenshot needed:** `/images/fleet/clusters/compute-detail.png`
> **Page to capture:** `/clusters/[id]`
> **What to show:** Halaman detail compute-cluster yang menampilkan kartu ringkasan cluster di bagian atas, matriks kesehatan host anggota, dan tabel host anggota di bawahnya.

Drill ke dalam sebuah cluster untuk melihat:

- **Metrik agregat** — CPU, memory, disk rata-rata di setiap host anggota
- **Health matrix** — satu tile per node, diberi warna berdasarkan status
- **Tabel host anggota** — kolom yang sama dengan daftar Host global, dibatasi pada cluster
- **Panel Top-N** — CPU, memory, disk I/O, throughput jaringan di dalam cluster

{{% alert icon="⚡" context="info" %}}
Cluster compute adalah **pengelompokan logis**, bukan entitas connector. Sebuah cluster didefinisikan oleh host yang berbagi nilai label `cluster` yang sama (atau kombinasi label fallback). Jika connector sudah ditambahkan tetapi cluster tidak muncul, periksa bahwa Prometheus tertanam NQRust Hypervisor memancarkan label cluster yang diharapkan — atau biarkan InfraWatch mengelompokkan otomatis per connector.
{{% /alert %}}

---

## Cluster Storage

### Tampilan Daftar — `/storage`

> 📸 **Screenshot needed:** `/images/fleet/clusters/storage-list.png`
> **Page to capture:** `/storage`
> **What to show:** Halaman storage-clusters dengan bar rincian Total Storage Capacity di bagian atas dan grid cluster di bawahnya, masing-masing tile menampilkan bar kapasitas, degraded components, dan kesehatan pool.

Setiap tile cluster storage menampilkan:

- Nama, titik status, jumlah degraded-component
- **Bar kapasitas** — used / free dalam TB atau PB
- Ringkasan volume — total / healthy / degraded / faulted
- IOPS read / write rata-rata (jika tersedia)

Kartu rincian **Total Storage Capacity** berada di bagian atas halaman, mengagregasi segmen Used dan Free di setiap cluster storage.

### Tampilan Detail — `/storage/[id]`

Lihat halaman [Storage](../storage/) khusus untuk tampilan detail cluster storage — halaman itu mencakup inventaris pool, tabel filesystem, dan drill-down IOPS secara mendalam.

---

## Jalur Drill-Down

> 📸 **Screenshot needed:** `/images/fleet/clusters/drilldown.png`
> **Page to capture:** `/clusters/[id]` tabel anggota
> **What to show:** Tabel host anggota dengan satu baris yang disorot, dan kursor menunjuk hostname yang menampilkan target tautan `/hosts/[id]`.

Dari cluster compute dapat melompat ke:

- Host anggota mana pun → `/hosts/[id]`
- VM mana pun yang berjalan di host anggota → `/vm/[id]`
- Connector yang menyuplai host cluster → `/connectors/[id]`

Dari cluster storage dapat melompat ke:

- Host storage yang mendasari → `/hosts/[id]`
- Pool atau filesystem anggota → `/storage/[id]`

---

## Terkait

- [Host](../hosts/) — tampilan tingkat-node yang memberi data agregat cluster
- [Storage](../storage/) — deep dive cluster storage
- [Connectors](../../connectors/) — cluster hanya muncul ketika connector sumbernya healthy
