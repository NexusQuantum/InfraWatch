+++
title = "Alerts"
description = "Endpoint stream alert dan CRUD alert-rule."
weight = 83
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch mengekspos dua keluarga endpoint yang saling terkait:

- `/api/alerts` — stream dari alert yang terpicu (read, acknowledge, resolve, count).
- `/api/alert-rules` — threshold yang mendorong evaluator.

Evaluator itu sendiri tidak diekspos melalui HTTP. Ia berjalan inline dengan `/api/live/overview` dan men-throttle dirinya sendiri ke satu kali per 60 detik (lihat [Architecture → Alert evaluator](../../architecture/#alert-evaluator)).

{{% alert icon="🔐" context="warning" %}}
Endpoint `/api/alert-rules` membutuhkan session yang ter-autentikasi. Endpoint `/api/alerts` dan `/api/alerts/count` yang read-only **tidak** menegakkan session pada implementasi saat ini — perlakukan keduanya seperti endpoint data live.
{{% /alert %}}

---

## `GET /api/alerts`

Mendaftar alert dengan filter dan pagination opsional.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Tidak ditegakkan |
| CSRF | Tidak diperlukan |

### Parameter query

| Param | Tipe | Deskripsi |
|---|---|---|
| `status` | string | `firing`, `acknowledged`, atau `resolved`. Hilangkan untuk semua. |
| `severity` | string | `info`, `warning`, atau `critical`. |
| `entityType` | string | `host`, `compute_cluster`, `storage_cluster`, … |
| `limit` | integer | Jumlah baris maksimum yang dikembalikan. |
| `offset` | integer | Offset pagination. |

### Respons — 200 OK

```json
{
  "data": [
    {
      "id": "f2…",
      "ruleId": "3a…",
      "entityType": "host",
      "entityId": "host-42",
      "entityName": "web-02.us-east",
      "severity": "critical",
      "status": "firing",
      "value": 94.2,
      "threshold": 90,
      "firedAt": "2026-04-23T12:00:00.000Z",
      "acknowledgedAt": null,
      "resolvedAt": null,
      "labels": { "environment": "prod", "site": "us-east" }
    }
  ]
}
```

### Error

| Status | Arti |
|---|---|
| 500 | Gagal mendaftar — lihat `error` di body. |

### Contoh

```bash
curl "https://infrawatch.example.com/api/alerts?status=firing&severity=critical&limit=50"
```

---

## `PATCH /api/alerts/[id]`

Meng-acknowledge atau me-resolve satu alert.

| Atribut | Nilai |
|---|---|
| Method | `PATCH` |
| Auth | Tidak ditegakkan pada route ini |
| CSRF | Tidak diperlukan handler, tetapi browser caller menyertakannya |

### Request body

```json
{ "action": "acknowledge" }
```

Nilai `action` yang valid:

- `"acknowledge"` — mencap `acknowledgedAt`, membiarkan status pada `firing` (secara internal `acknowledged`).
- `"resolve"` — mencap `resolvedAt` dan men-set status ke `resolved`.

### Respons — 200 OK

```json
{
  "data": {
    "id": "f2…",
    "status": "acknowledged",
    "acknowledgedAt": "2026-04-23T12:05:00.000Z"
  }
}
```

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "Invalid action. Use 'acknowledge' or 'resolve'" }` | `action` tidak dikenal. |
| 404 | `{ "error": "Alert not found or already resolved" }` | |
| 500 | `{ "error": "Failed to update alert" }` | |

### Contoh

```bash
curl -X PATCH https://infrawatch.example.com/api/alerts/f2… \
  -H 'Content-Type: application/json' \
  -d '{"action":"resolve"}'
```

---

## `GET /api/alerts/count`

Mengembalikan count alert yang sedang aktif (firing + acknowledged) untuk badge di shell aplikasi.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Tidak ditegakkan |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

```json
{ "data": 7 }
```

### Error

| Status | Arti |
|---|---|
| 500 | `{ "error": "Failed to count alerts" }`. |

---

## `GET /api/alert-rules`

Mendaftar semua alert rule.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | **Session diperlukan** |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

```json
{
  "data": [
    {
      "id": "3a…",
      "name": "Host CPU > 90%",
      "entityType": "host",
      "metric": "cpu_pct",
      "operator": ">",
      "threshold": 90,
      "severity": "critical",
      "enabled": true,
      "scope": { "environment": "prod" },
      "createdAt": "2026-04-20T10:00:00.000Z",
      "updatedAt": "2026-04-20T10:00:00.000Z"
    }
  ]
}
```

### Error

| Status | Arti |
|---|---|
| 401 | Tidak ada session. |
| 500 | Gagal mendaftar. |

---

## `POST /api/alert-rules`

Membuat alert rule baru.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth | **Session diperlukan** |
| CSRF | **Diperlukan** |

### Request body

```json
{
  "name": "Host CPU > 90%",
  "entityType": "host",
  "metric": "cpu_pct",
  "operator": ">",
  "threshold": 90,
  "severity": "critical",
  "enabled": true,
  "scope": { "environment": "prod" }
}
```

### Respons — 201 Created

```json
{ "data": { "id": "3a…", "name": "Host CPU > 90%", "…": "…" } }
```

### Error

| Status | Arti |
|---|---|
| 400 | Validasi gagal. |
| 401 | Tidak ada session. |
| 403 | Token CSRF hilang. |

---

## `GET /api/alert-rules/[id]`

Mengambil satu rule.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | **Session diperlukan** |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

Bentuk sama dengan satu baris pada daftar.

### Error

| Status | Body |
|---|---|
| 401 | `{ "error": "Authentication required" }` |
| 404 | `{ "error": "Alert rule not found" }` |

---

## `PUT /api/alert-rules/[id]`

Mengganti field pada rule yang sudah ada. Handler menggunakan `PUT` (bukan `PATCH`) — body tetap boleh parsial; field yang tidak disebutkan dipertahankan.

| Atribut | Nilai |
|---|---|
| Method | `PUT` |
| Auth | **Session diperlukan** |
| CSRF | **Diperlukan** |

### Request body

Subset apa pun dari body create.

### Respons — 200 OK

```json
{ "data": { "id": "3a…", "threshold": 85, "…": "…" } }
```

### Error

| Status | Arti |
|---|---|
| 400 | Payload tidak valid. |
| 401 | Tidak ada session. |
| 403 | Token CSRF hilang. |
| 404 | Rule tidak ditemukan. |

{{% alert icon="⚡" context="info" %}}
`PATCH` **tidak** diimplementasikan pada `/api/alert-rules/[id]`. UI menggunakan `PUT`.
{{% /alert %}}

---

## `DELETE /api/alert-rules/[id]`

Menghapus sebuah rule. Alert historis yang dibuat oleh rule tersebut **tidak** dihapus — foreign key `rule_id` tetap ada dan UI menampilkannya sebagai yatim (orphaned).

| Atribut | Nilai |
|---|---|
| Method | `DELETE` |
| Auth | **Session diperlukan** |
| CSRF | **Diperlukan** |

### Respons — 200 OK

```json
{ "success": true }
```

### Error

| Status | Arti |
|---|---|
| 401 | Tidak ada session. |
| 403 | Token CSRF hilang. |
| 404 | Rule tidak ditemukan. |

---

## Langkah selanjutnya

- [Architecture → Alert evaluator](../../architecture/#alert-evaluator) — bagaimana rule memicu.
- [Data model → `alerts` / `alert_rules`](../../architecture/data-model/#alerts) — bentuk yang dipersistensikan.
- [Alerts UI](../../alerts/) — tampilan operator.
