+++
title = "Connectors"
description = "Endpoint CRUD dan test konektivitas untuk sumber metric NQRust Hypervisor."
weight = 82
date = 2026-04-23

[extra]
toc = true
+++

Connector adalah tautan berkredensial yang digunakan InfraWatch untuk menjangkau endpoint Prometheus bawaan sebuah node NQRust Hypervisor. Semua host, cluster, VM, dan aplikasi yang tampil di fleet view bersumber melalui record ini.

{{% alert icon="🔐" context="warning" %}}
Semua endpoint connector membutuhkan session yang ter-autentikasi. Mutasi juga membutuhkan header `X-CSRF-Token`. Kredensial (`bearerToken`, `password`) dienkripsi saat disimpan dengan `CONNECTOR_ENCRYPTION_KEY` dan tidak pernah dikembalikan oleh GET.
{{% /alert %}}

---

## Field connector

| Field | Tipe | Wajib saat create | Catatan |
|---|---|---|---|
| `name` | string | ya | Display name yang dipilih operator. |
| `connectorType` | `nqrust_hypervisor` | ya | Harus berisi `nqrust_hypervisor`. |
| `baseUrl` | string | ya | Base URL Prometheus bawaan NQRust Hypervisor (root `/api/v1`). |
| `environment` | string | ya | Label scoping (`prod`, `stg`, …). |
| `site` | string | ya | Label scoping geografis. |
| `datacenter` | string | ya | Label scoping yang lebih granular. |
| `authMode` | `none` \| `basic` \| `bearer` | ya | Memilih field kredensial mana yang diperlukan. |
| `username` | string | hanya jika `authMode=basic` | Username basic auth. |
| `password` | string | hanya jika `authMode=basic` | Password basic auth. |
| `bearerToken` | string | hanya jika `authMode=bearer` | Bearer token. |
| `insecureTls` | boolean | tidak | Lewati verifikasi TLS untuk sertifikat self-signed. Default false. |
| `notes` | string | tidak | Catatan operator bebas-format. |
| `enabled` | boolean | tidak | Default true; jika false, layer domain melewati connector ini. |

---

## `GET /api/connectors`

Mendaftar semua connector.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Session diperlukan |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

Secret tidak pernah dikembalikan. Setiap baris menyertakan metadata kesehatan turunan (`status`, `lastCheckedAt`, `latencyMs`, `healthNotes`) yang diisi oleh probe terbaru.

```json
{
  "data": [
    {
      "id": "7c1a…",
      "name": "nqrust-prod-us-east",
      "connectorType": "nqrust_hypervisor",
      "typeMeta": {
        "key": "nqrust_hypervisor",
        "label": "NQRust Hypervisor",
        "iconKey": "activity",
        "expectedCapabilities": [],
        "quickFixTips": ["…"]
      },
      "baseUrl": "https://hv.us-east.example.com",
      "environment": "prod",
      "site": "us-east",
      "datacenter": "dc1",
      "enabled": true,
      "authMode": "bearer",
      "insecureTls": false,
      "notes": "Hypervisor utama untuk us-east dc1",
      "status": "healthy",
      "lastCheckedAt": "2026-04-23T12:34:56.789Z",
      "latencyMs": 42,
      "healthNotes": []
    }
  ]
}
```

### Error

| Status | Arti |
|---|---|
| 401 | Tidak ada cookie session atau session expired. |
| 500 | Gagal mendaftar connector (lihat `error` di body). |

### Contoh

```bash
curl -b cookies.txt https://infrawatch.example.com/api/connectors
```

---

## `POST /api/connectors`

Membuat connector baru.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth | Session diperlukan |
| CSRF | **Diperlukan** (`X-CSRF-Token`) |

### Request body

```json
{
  "name": "nqrust-prod-us-east",
  "connectorType": "nqrust_hypervisor",
  "baseUrl": "https://hv.us-east.example.com",
  "environment": "prod",
  "site": "us-east",
  "datacenter": "dc1",
  "authMode": "bearer",
  "bearerToken": "eyJhbGciOi…",
  "insecureTls": false,
  "notes": "Hypervisor utama untuk us-east dc1"
}
```

Untuk basic auth, kirim `username` / `password` alih-alih `bearerToken`. Untuk tanpa auth, hilangkan ketiganya.

### Respons — 201 Created

```json
{
  "data": {
    "id": "7c1a…",
    "name": "nqrust-prod-us-east",
    "connectorType": "nqrust_hypervisor",
    "baseUrl": "https://hv.us-east.example.com",
    "environment": "prod",
    "site": "us-east",
    "datacenter": "dc1",
    "authMode": "bearer",
    "insecureTls": false,
    "enabled": true
  }
}
```

Handler juga menginvalidasi prefix cache `live:*` dan menulis entri audit-log `connector.create`.

### Error

| Status | Arti |
|---|---|
| 400 | Validasi gagal — kredensial hilang untuk `authMode` yang dipilih, tipe tidak valid, atau URL buruk. |
| 401 | Tidak ada session. |
| 403 | Token CSRF hilang atau tidak cocok. |

### Contoh

```bash
curl -b cookies.txt -X POST https://infrawatch.example.com/api/connectors \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "name":"nqrust-prod-us-east",
    "connectorType":"nqrust_hypervisor",
    "baseUrl":"https://hv.us-east.example.com",
    "environment":"prod","site":"us-east","datacenter":"dc1",
    "authMode":"bearer","bearerToken":"eyJhbGciOi…"
  }'
```

---

## `GET /api/connectors/[id]`

Mengambil satu connector berdasarkan id.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Session diperlukan |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

Bentuk sama dengan satu baris pada daftar.

### Error

| Status | Arti |
|---|---|
| 401 | Tidak ada session. |
| 404 | `{ "error": "Connector not found" }`. |

---

## `PATCH /api/connectors/[id]`

Memperbarui field pada connector yang sudah ada. Subset apa pun dari body create diterima; field yang tidak disebutkan dibiarkan tidak berubah. Menghilangkan field kredensial **tidak** menghapus secret yang tersimpan — untuk menghapusnya, setel `authMode: "none"`.

| Atribut | Nilai |
|---|---|
| Method | `PATCH` |
| Auth | Session diperlukan |
| CSRF | **Diperlukan** |

### Request body (contoh — toggle `enabled`)

```json
{ "enabled": false }
```

### Respons — 200 OK

```json
{ "data": { "id": "7c1a…", "enabled": false, "…": "…" } }
```

Juga menginvalidasi cache `live:*` dan menulis entri audit `connector.update`.

### Error

| Status | Arti |
|---|---|
| 400 | Payload tidak valid. |
| 401 | Tidak ada session. |
| 403 | Token CSRF hilang. |
| 404 | Connector tidak ditemukan. |

{{% alert icon="⚡" context="info" %}}
`PUT` **tidak** diimplementasikan untuk connector. Gunakan `PATCH` untuk semua update.
{{% /alert %}}

---

## `DELETE /api/connectors/[id]`

Menghapus sebuah connector. Baris `connector_health` yang terkait dihapus melalui cascade; alert yang mereferensikan connector tetap mempertahankan label-nya tetapi akan auto-resolve pada evaluasi berikutnya jika entity yang mendasarinya hilang.

| Atribut | Nilai |
|---|---|
| Method | `DELETE` |
| Auth | Session diperlukan |
| CSRF | **Diperlukan** |

### Respons — 200 OK

```json
{ "success": true }
```

Juga menginvalidasi cache `live:*` dan menulis entri audit `connector.delete`.

### Error

| Status | Arti |
|---|---|
| 401 | Tidak ada session. |
| 403 | Token CSRF hilang. |
| 404 | Connector tidak ditemukan. |

### Contoh

```bash
curl -b cookies.txt -X DELETE https://infrawatch.example.com/api/connectors/7c1a… \
  -H "X-CSRF-Token: $CSRF"
```

---

## `POST /api/connectors/[id]/test`

Menjalankan probe konektivitas + soft-check langsung terhadap connector dan mengembalikan hasilnya tanpa mempersistensikan baris kesehatan.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth | Tidak ditegakkan pada route ini (helper internal yang digunakan UI) |
| CSRF | Tidak diperlukan |

### Request body

Tidak ada.

### Respons — 200 OK (sukses)

```json
{
  "data": {
    "success": true,
    "latencyMs": 38,
    "notes": [],
    "capabilities": { "hostMetrics": true, "clusterMetrics": true }
  }
}
```

### Respons — 502 Bad Gateway (probe gagal)

Handler tetap mengembalikan hasil terstruktur, tetapi dengan `success: false`:

```json
{
  "data": {
    "success": false,
    "latencyMs": 1503,
    "error": "connect ETIMEDOUT",
    "notes": ["TLS handshake failed", "…"]
  }
}
```

### Contoh

```bash
curl -b cookies.txt -X POST https://infrawatch.example.com/api/connectors/7c1a…/test
```

---

## Langkah selanjutnya

- [Live data](../live/) — endpoint yang membaca dari connector yang baru saja diprovisioning.
- [Alerts](../alerts/) — rule yang memicu terhadap data connector live.
- [Security model → Connector credential encryption](../../architecture/security-model/#connector-credential-encryption).
