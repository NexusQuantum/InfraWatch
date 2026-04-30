+++
title = "Prometheus Proxy"
description = "Forwarding query PromQL instant dan range per-connector, dengan batasan konkurensi global."
weight = 85
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch mengekspos forwarder PromQL tipis sehingga UI (dan script) dapat menjalankan query ad-hoc ke Prometheus bawaan NQRust Hypervisor tanpa menyimpan kredensial di klien. Kedua endpoint menerima parameter query `connectorId` opsional — hilangkan untuk menghubungi connector default dari env (jika dikonfigurasi), atau kirim id connector tertentu untuk memilih node NQRust Hypervisor yang dituju.

{{% alert icon="⚡" context="info" %}}
Semua lalu lintas Prometheus dari InfraWatch — data live, evaluasi alert, dan endpoint proxy ini — berbagi **batas konkurensi global 20 query in-flight**. Di atas batas tersebut, permintaan antre secara in-process alih-alih menggempur hulu. Lihat [Architecture → Prometheus client](../../architecture/#prometheus-client).
{{% /alert %}}

---

## `GET /api/prometheus/query`

Meneruskan query PromQL **instant** ke connector yang dipilih.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Tidak ditegakkan pada route ini |
| CSRF | Tidak diperlukan |

### Parameter query

| Param | Diperlukan | Deskripsi |
|---|---|---|
| `query` | ya | Ekspresi PromQL. URL-encode. |
| `time` | tidak | Timestamp RFC 3339 atau epoch Unix. Default "now". |
| `connectorId` | tidak | UUID connector. Jika dihilangkan, connector default dari env digunakan. |

### Respons — 200 OK

Pass-through langsung dari body respons Prometheus bawaan NQRust Hypervisor:

```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": { "__name__": "up", "job": "node", "instance": "10.0.0.1:9100" },
        "value": [ 1714046400, "1" ]
      }
    ]
  }
}
```

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "Missing required query parameter: query" }` | Tidak ada `query` yang dikirim. |
| 404 | `{ "error": "Connector not found or disabled" }` | `connectorId` tidak valid atau connector dinonaktifkan. |
| 502 | `{ "error": "<upstream error message>" }` | NQRust Hypervisor mengembalikan error atau tidak dapat dijangkau. |

### Contoh

```bash
curl -G "https://infrawatch.example.com/api/prometheus/query" \
  --data-urlencode 'query=up' \
  --data-urlencode 'connectorId=7c1a…'
```

---

## `GET /api/prometheus/query_range`

Meneruskan query PromQL **range**.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Tidak ditegakkan pada route ini |
| CSRF | Tidak diperlukan |

### Parameter query

| Param | Diperlukan | Deskripsi |
|---|---|---|
| `query` | ya | Ekspresi PromQL. |
| `start` | ya | Timestamp RFC 3339 atau epoch Unix. |
| `end` | ya | Timestamp RFC 3339 atau epoch Unix. |
| `step` | ya | Lebar step, mis. `15s`, `1m`, `5m`. |
| `connectorId` | tidak | UUID connector; default env jika dihilangkan. |

### Respons — 200 OK

Pass-through dari respons range Prometheus bawaan NQRust Hypervisor:

```json
{
  "status": "success",
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": { "__name__": "node_load1", "instance": "10.0.0.1:9100" },
        "values": [
          [ 1714046400, "0.31" ],
          [ 1714046460, "0.42" ],
          [ 1714046520, "0.38" ]
        ]
      }
    ]
  }
}
```

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "Missing required query parameters: query, start, end, step" }` | Salah satu dari empat parameter yang diperlukan hilang. |
| 404 | `{ "error": "Connector not found or disabled" }` | |
| 502 | `{ "error": "<upstream error>" }` | NQRust Hypervisor tidak dapat dijangkau atau mengembalikan error. |

### Contoh

```bash
curl -G "https://infrawatch.example.com/api/prometheus/query_range" \
  --data-urlencode 'query=rate(node_cpu_seconds_total[5m])' \
  --data-urlencode 'start=2026-04-23T11:00:00Z' \
  --data-urlencode 'end=2026-04-23T12:00:00Z' \
  --data-urlencode 'step=1m' \
  --data-urlencode 'connectorId=7c1a…'
```

---

## Konkurensi & antrean

- Setiap query outbound — dari route proxy ini, dari endpoint live, dan dari alert evaluator — melewati satu limiter bersama di `lib/prometheus/client.ts`.
- Ceiling default adalah **20 query in-flight bersamaan secara global**.
- Query di atas ceiling akan **di-queue**, bukan ditolak. Latency end-to-end meningkat; tidak ada `429` yang dikembalikan.
- Untuk menaikkan batas, ubah di source. Sebelum melakukannya, pastikan node NQRust Hypervisor dapat menangani konkurensi query yang lebih tinggi.

---

## Referensi bentuk error

Kedua endpoint mengembalikan body error yang seragam pada non-2xx:

```json
{ "error": "Human-readable message" }
```

Kegagalan hulu berikut dipetakan ke `502`:

- Error DNS / connect / TLS.
- HTTP 5xx dari Prometheus bawaan NQRust Hypervisor.
- JSON malformed pada respons hulu.
- Timeout (dapat dikonfigurasi di `lib/prometheus/client.ts`).

---

## Langkah selanjutnya

- [Connectors](../connectors/) — provisioning `connectorId` yang akan dikirim di sini.
- [Live data](../live/) — endpoint tingkat-tinggi yang sudah menyusun PromQL menjadi baris dashboard.
- [Architecture → Request path](../../architecture/#request-path).
