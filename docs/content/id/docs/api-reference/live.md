+++
title = "Live Data"
description = "Endpoint yang di-poll oleh SWR yang menyuplai dashboard — overview, host, cluster, VM, aplikasi, connector, dashboard."
weight = 84
date = 2026-04-23

[extra]
toc = true
+++

Setiap endpoint `/api/live/*` adalah wrapper tipis di atas sebuah fungsi di `lib/server/live-data.ts` (atau modul domain yang sesuai). Browser melakukan polling ke endpoint ini pada **cadence SWR 30 detik** — polling yang lebih sering adalah pemborosan karena cache LRU yang mendasarinya mengembalikan hasil yang sama dalam jendela TTL-nya.

{{% alert icon="⚡" context="info" %}}
Endpoint live bersifat read-only dan tidak dijaga oleh session pada implementasi saat ini (dapat di-browse dari dalam reverse proxy). Mengembalikan `502` ketika NQRust Hypervisor tidak dapat dijangkau dan `500` pada error internal tak terduga.
{{% /alert %}}

---

## Bentuk umum

Setiap endpoint live merespons dengan:

```json
{
  "data": [...],
  "meta": {
    "generatedAt": "2026-04-23T12:00:00.000Z",
    "sourceConnectors": [ { "id": "…", "name": "…", "status": "healthy" } ]
  }
}
```

Bentuk `data` yang tepat bervariasi per endpoint; `meta` bersifat konsisten.

---

## `GET /api/live/overview`

Agregasi roll-up cluster/host/storage/vm untuk halaman landing. Juga memicu satu kali evaluasi alert fire-and-forget terhadap cache yang baru saja diisi.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | Polling SWR 30 detik |
| Di-cache? | Ya (memanaskan `live:hosts`, `live:compute-clusters`, `live:storage-clusters`, `live:vm` sebagai efek samping) |

### Respons — 200 OK (cuplikan)

```json
{
  "data": {
    "summary": {
      "connectors": { "total": 6, "healthy": 5, "degraded": 1 },
      "hosts":      { "total": 412, "up": 409, "down": 3 },
      "clusters":   { "compute": 4, "storage": 2, "vm": 3 }
    },
    "topIssues": [ { "entityType": "host", "entityName": "web-02", "severity": "critical" } ]
  },
  "meta": { "generatedAt": "…", "sourceConnectors": [ ... ] }
}
```

### Error

| Status | Arti |
|---|---|
| 500 | Agregasi gagal. |

---

## `GET /api/live/hosts`

Daftar datar dari setiap host yang terlihat di semua connector aktif, dengan CPU %, memory %, load average, uptime, dan status up/down saat ini.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Respons — 200 OK

```json
{
  "data": [
    {
      "id": "host-42",
      "name": "web-02.us-east",
      "connectorId": "7c1a…",
      "environment": "prod",
      "site": "us-east",
      "datacenter": "dc1",
      "status": "up",
      "cpuPct": 68.3,
      "memoryPct": 74.1,
      "load1": 2.4,
      "uptimeSeconds": 1827340
    }
  ],
  "meta": { "generatedAt": "…", "sourceConnectors": [ ... ] }
}
```

### Error

| Status | Arti |
|---|---|
| 500 | Agregasi gagal. |

---

## `GET /api/live/compute-clusters`

Compute cluster (pool NQRust Hypervisor) dengan host anggotanya di-roll-up.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Bentuk respons

```json
{
  "data": [
    {
      "id": "compute-prod-us-east",
      "name": "prod-us-east-hv",
      "hostCount": 24,
      "cpuPct": 61.4,
      "memoryPct": 72.8,
      "status": "healthy"
    }
  ],
  "meta": { "…": "…" }
}
```

### Error

| Status | Arti |
|---|---|
| 500 | Agregasi gagal. |

---

## `GET /api/live/storage-clusters`

Storage cluster dengan kapasitas dan penggunaan.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Bentuk respons

```json
{
  "data": [
    {
      "id": "storage-prod-a",
      "name": "longhorn-prod-a",
      "backend": "longhorn",
      "capacityBytes": 10995116277760,
      "usedBytes":     6597069766656,
      "volumeCount": 187,
      "status": "healthy"
    }
  ],
  "meta": { "…": "…" }
}
```

### Error

| Status | Arti |
|---|---|
| 500 | Agregasi gagal. |

---

## `GET /api/live/vm`

Inventaris virtual machine NQRust Hypervisor dengan alokasi resource per-VM dan penempatan host.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Bentuk respons

```json
{
  "data": [
    {
      "id": "vm-7a…",
      "name": "db-primary",
      "hostId": "host-42",
      "hostName": "hv-02.us-east",
      "cpuCores": 8,
      "memoryBytes": 17179869184,
      "cpuPct": 45.1,
      "memoryPct": 61.3,
      "uptimeSeconds": 942304,
      "status": "running"
    }
  ],
  "meta": { "…": "…" }
}
```

### Error

| Status | Arti |
|---|---|
| 502 | NQRust Hypervisor tidak dapat dijangkau. |

---

## `GET /api/live/apps`

Roll-up aplikasi dari workload yang dilaporkan NQRust Hypervisor.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Bentuk respons

```json
{
  "data": [
    {
      "id": "app-payments",
      "name": "payments",
      "namespace": "payments",
      "clusterId": "compute-prod-us-east",
      "replicasDesired": 6,
      "replicasReady": 6,
      "cpuPct": 34.2,
      "memoryPct": 48.7,
      "status": "healthy"
    }
  ],
  "meta": { "…": "…" }
}
```

### Error

| Status | Arti |
|---|---|
| 502 | NQRust Hypervisor tidak dapat dijangkau. |

---

## `GET /api/live/connectors`

Snapshot dari kesehatan saat ini untuk setiap connector — digunakan oleh halaman Connectors. Endpoint ini mengembalikan data **health-centric**; gunakan `/api/connectors` untuk record CRUD lengkap.

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Bentuk respons

```json
{
  "data": [
    {
      "id": "7c1a…",
      "name": "nqrust-prod-us-east",
      "connectorType": "nqrust_hypervisor",
      "status": "healthy",
      "latencyMs": 38,
      "lastCheckedAt": "2026-04-23T12:00:00.000Z",
      "healthNotes": []
    }
  ],
  "meta": { "…": "…" }
}
```

### Error

| Status | Arti |
|---|---|
| 500 | Agregasi gagal. |

---

## `GET /api/live/dashboards`

Mengembalikan katalog dashboard yang menghadap pengguna (tampilan kurasi yang mencampur host/cluster/aplikasi pada satu halaman).

| Parameter query | Tidak ada |
|---|---|
| Cadence tipikal | SWR 30 detik |

### Bentuk respons

```json
{
  "data": [
    {
      "id": "dash-prod-overview",
      "name": "Prod Overview",
      "description": "Top-of-stack view for the production environment",
      "widgets": [ { "kind": "host-count", "filter": { "environment": "prod" } } ]
    }
  ],
  "meta": { "…": "…" }
}
```

### Error

| Status | Arti |
|---|---|
| 502 | Pengambilan dari hulu gagal. |

---

## Praktik terbaik polling

- **SWR 30 detik** adalah pola yang digunakan di seluruh UI. Poller sebaiknya menggunakan `revalidateOnFocus: true` tetapi mempertahankan interval dasar pada 30 detik.
- Panggil `/api/live/overview` pertama kali saat load halaman — ini memanaskan cache downstream sehingga polling spesifik halaman berikutnya menjadi cache hit.
- Untuk dashboard yang hanya membutuhkan count, lebih baik gunakan `/api/alerts/count` (lihat [Alerts](../alerts/)) daripada daftar alert lengkap.
- Script yang berjalan di luar browser tetap mendapat manfaat dari cache LRU: dalam jendela 30 detik, panggilan yang berulang tidak me-hit ulang NQRust Hypervisor.

---

## Langkah selanjutnya

- [Prometheus](../prometheus/) — PromQL pass-through untuk query ad-hoc ke connector NQRust Hypervisor tertentu.
- [Connectors](../connectors/) — mengelola sumber data yang menyuplai setiap endpoint live.
- [Architecture → Request path](../../architecture/#request-path).
