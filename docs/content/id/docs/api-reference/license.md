+++
title = "License"
description = "Inspeksi status lisensi, aktivasi, deaktivasi, dan upload file offline."
weight = 86
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch dibekali dengan sistem lisensi bawaan. Endpoint di bawah ini menjalankan alur aktivasi `/setup` dan panel lisensi di bawah Settings. Semuanya mengembalikan objek `LicenseState` saat ini (atau `{ ok: true }` sederhana pada deactivate).

{{% alert icon="⚡" context="info" %}}
Endpoint lisensi tidak dijaga oleh session pada implementasi saat ini — keduanya dimaksudkan agar dapat dipanggil dari alur landing `/setup` sebelum session admin apa pun ada. Tempatkan di belakang batas TLS reverse-proxy yang sama dengan sisa aplikasi.
{{% /alert %}}

---

## Objek `LicenseState`

Setiap endpoint kecuali `deactivate` mengembalikan bentuk ini:

| Field | Tipe | Deskripsi |
|---|---|---|
| `isLicensed` | boolean | True jika `status` adalah `active` atau `grace_period`. |
| `status` | enum | `active`, `expired`, `invalid`, `grace_period`, `unlicensed`, `unknown`. |
| `isGracePeriod` | boolean | True ketika verifikasi online terakhir gagal tetapi jendela grace masih terbuka. |
| `graceDaysRemaining` | integer \| null | Hari tersisa di jendela grace, atau null jika tidak berlaku. |
| `customerName` | string \| null | Pelanggan yang terikat ke kunci (dari payload bertandatangan). |
| `product` | string \| null | Slug produk (mis. `infrawatch`). |
| `features` | string[] | Feature flag yang diklaim oleh payload lisensi. |
| `expiresAt` | string \| null | Expiry RFC 3339 dari payload lisensi. |
| `activations` | integer \| null | Count aktivasi saat ini yang dilaporkan oleh license server. |
| `maxActivations` | integer \| null | Aktivasi maksimum yang diizinkan oleh tier. |
| `verifiedAt` | string \| null | Timestamp verifikasi sukses terakhir. |
| `licenseKey` | string \| null | Kunci saat ini, di-mask untuk tampilan. |
| `errorMessage` | string \| null | Alasan yang mudah dibaca manusia pada status non-active mana pun. |

---

## `GET /api/license/status`

Mengembalikan state lisensi saat ini tanpa melakukan pemeriksaan online baru.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | Tidak ditegakkan |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

```json
{
  "isLicensed": true,
  "status": "active",
  "isGracePeriod": false,
  "graceDaysRemaining": null,
  "customerName": "Acme Co",
  "product": "infrawatch",
  "features": ["unlimited_connectors", "sso"],
  "expiresAt": "2027-04-23T00:00:00.000Z",
  "activations": 1,
  "maxActivations": 3,
  "verifiedAt": "2026-04-23T10:00:00.000Z",
  "licenseKey": "NQX-••••-••••-A1B2",
  "errorMessage": null
}
```

Endpoint ini tidak pernah mengembalikan error — jika tidak ada yang diaktifkan, ia mengembalikan state `UNLICENSED` dengan `status: "unlicensed"`.

### Contoh

```bash
curl https://infrawatch.example.com/api/license/status
```

---

## `POST /api/license/activate`

Mengaktifkan kunci lisensi online terhadap license server.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth | Tidak ditegakkan |
| CSRF | Tidak diperlukan |

### Request body

```json
{ "licenseKey": "NQX-AAAA-BBBB-A1B2" }
```

### Respons — 200 OK

Mengembalikan `LicenseState` hasil (lihat bentuk di atas). Pada aktivasi yang berhasil, `status` menjadi `active` dan `verifiedAt` dicap.

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "licenseKey is required" }` | Kunci hilang atau bukan string. |
| 500 | `{ "error": "Activation failed" }` atau pesan dari hulu | License server tidak dapat dijangkau, kunci tidak valid, batas aktivasi tercapai. |

### Contoh

```bash
curl -X POST https://infrawatch.example.com/api/license/activate \
  -H 'Content-Type: application/json' \
  -d '{"licenseKey":"NQX-AAAA-BBBB-A1B2"}'
```

---

## `POST /api/license/deactivate`

Menonaktifkan lisensi saat ini secara lokal (dan memberitahu license server jika dapat dijangkau).

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth | Tidak ditegakkan |
| CSRF | Tidak diperlukan |

### Request body

Tidak ada.

### Respons — 200 OK

```json
{ "ok": true }
```

Setelah deaktivasi, `GET /api/license/status` mengembalikan state `UNLICENSED`.

### Error

| Status | Body | Arti |
|---|---|---|
| 500 | `{ "error": "Deactivation failed" }` | Kegagalan internal tak terduga. |

### Contoh

```bash
curl -X POST https://infrawatch.example.com/api/license/deactivate
```

---

## `POST /api/license/upload`

Mengunggah file lisensi bertandatangan **offline**. Tanda tangan diverifikasi terhadap `LICENSE_PUBLIC_KEY` (RSA+SHA-256 secara default; kunci Ed25519 dan Ed448 juga didukung). Digunakan oleh deployment airgap dan yang sepenuhnya offline.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth | Tidak ditegakkan |
| CSRF | Tidak diperlukan |

### Request body

Kirim konten file mentah — umumnya berupa blob JSON yang dibungkus base64 — sebagai field string:

```json
{ "fileContent": "-----BEGIN INFRAWATCH LICENSE-----\nMII…\n-----END INFRAWATCH LICENSE-----\n" }
```

### Respons — 200 OK

Mengembalikan `LicenseState` hasil. Pada sukses, `status` menjadi `active` dengan feature dan expiry dari payload bertandatangan.

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "fileContent is required" }` | Field hilang atau bukan string. |
| 500 | `{ "error": "Upload failed" }` atau pesan spesifik seperti "Invalid signature" | Verifikasi tanda tangan gagal, payload malformed, `LICENSE_PUBLIC_KEY` tidak dikonfigurasi. |

### Contoh

```bash
curl -X POST https://infrawatch.example.com/api/license/upload \
  -H 'Content-Type: application/json' \
  -d "$(jq -Rn --arg f "$(cat license.lic)" '{fileContent:$f}')"
```

---

## Perilaku grace-period

Aktivasi online diverifikasi ulang secara periodik. Jika license server tidak dapat dijangkau:

1. Aplikasi terus melayani lalu lintas hingga `LICENSE_GRACE_PERIOD_DAYS` (default 7) dari verifikasi sukses terakhir.
2. `status` beralih ke `grace_period` dan `graceDaysRemaining` menghitung mundur.
3. Ketika jendela grace berakhir, `status` menjadi `expired` dan UI memblokir aksi non-read-only.

Lisensi offline (yang diunggah) tidak memerlukan verifikasi online; hanya `expiresAt` yang menjadi jam acuan.

---

## Langkah selanjutnya

- [Settings & Admin → Licensing](../../settings/licensing/) — UI yang menghadap operator.
- [Architecture → Data model → `license`](../../architecture/data-model/#license) — state persisten.
