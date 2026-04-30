+++
title = "Aktivasi Lisensi"
description = "Aktifkan InfraWatch dengan license key atau file .lic offline, dan pahami perilaku grace period"
weight = 23
date = 2026-04-23

[extra]
toc = true
+++

Setelah installer selesai dan Anda login untuk pertama kali, InfraWatch memerlukan lisensi sebelum dashboard dapat digunakan. Instance yang belum berlisensi akan dialihkan ke `/setup/license` sampai key yang valid diaktifkan.

Halaman ini membahas tiga jalur aktivasi yang didukung (UI, API, file offline), environment variable yang mengendalikan verifikasi lisensi, serta fallback grace period.

---

## Konfigurasi

Perilaku lisensi dikendalikan oleh empat environment variable di `/opt/infrawatch/.env`:

| Variabel | Wajib | Default | Deskripsi |
|---|---|---|---|
| `LICENSE_API_KEY` | Ya (untuk aktivasi online) | — | Bearer token yang digunakan untuk autentikasi terhadap license server. Diterbitkan oleh Nexus Quantum Tech. |
| `LICENSE_SERVER_URL` | Tidak | `https://billing.nexusquantum.id` | Override endpoint license server (jarang dibutuhkan). |
| `LICENSE_GRACE_PERIOD_DAYS` | Tidak | `7` | Jumlah hari InfraWatch tetap berjalan setelah kegagalan verifikasi, menggunakan hasil cache terakhir. |
| `LICENSE_PUBLIC_KEY` | Wajib untuk file `.lic` offline | — | Public key (PEM, dengan escape `\n` literal) yang digunakan untuk memverifikasi signature lisensi offline. Key RSA (dengan SHA-256), Ed25519, dan Ed448 semua didukung — verifier memilih algoritma berdasarkan tipe key. |

{{% alert icon="⚡" context="info" %}}
Jangan pernah mengekspos `LICENSE_API_KEY` ke browser. Semua panggilan verifikasi dilakukan di sisi server dari route handler Next.js di bawah `/api/license/`.
{{% /alert %}}

---

## Metode Aktivasi

Ada dua cara untuk mengaktifkan lisensi Anda:

| Metode | Kapan digunakan |
|---|---|
| **License Key** | Lingkungan online dengan HTTPS keluar ke `LICENSE_SERVER_URL` |
| **Offline File** | Jaringan airgap atau lingkungan yang terbatas |

---

## Online — License Key (UI)

> 📸 **Screenshot needed:** `/images/license/setup-license.png`
> **Page to capture:** `/setup/license`
> **What to show:** Halaman setup lisensi dengan tab "License Key" terpilih dan input `XXXX-XXXX-XXXX-XXXX` kosong dan ter-fokus.

1. Arahkan ke `http://<your-host>:3001/setup/license` (Anda akan diarahkan ke sini otomatis pada login pertama).
2. Pastikan tab **License Key** terpilih.
3. Masukkan key Anda dalam format `XXXX-XXXX-XXXX-XXXX`. Input akan otomatis mengubah huruf menjadi kapital dan menyisipkan tanda hubung saat Anda mengetik.
4. Klik **Activate License**.

Jika berhasil, Anda akan dialihkan ke dashboard.

> 📸 **Screenshot needed:** `/images/license/activation-success.png`
> **Page to capture:** `/setup/license` (post-activation state)
> **What to show:** Panel sukses yang menampilkan status lisensi ("active"), nama pelanggan, produk, tanggal kedaluwarsa, dan jumlah aktivasi (misalnya "2 / 5").

{{% alert icon="🔑" context="info" %}}
License key diterbitkan oleh Nexus Quantum Tech. Hubungi perwakilan akun Anda atau cek email konfirmasi pembelian Anda jika belum memilikinya.
{{% /alert %}}

---

## Online — License Key (API)

UI hanyalah pembungkus tipis di atas endpoint aktivasi — Anda dapat melakukan aktivasi tanpa UI dari shell atau pipeline CI.

**Endpoint:** `POST /api/license/activate`

**Request body:**

```json
{
  "licenseKey": "ABCD-EFGH-IJKL-MNOP"
}
```

**Contoh:**

```bash
curl -X POST http://<your-host>:3001/api/license/activate \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"licenseKey":"ABCD-EFGH-IJKL-MNOP"}'
```

**Respons sukses** — `LicenseState` lengkap:

```json
{
  "isLicensed": true,
  "status": "active",
  "isGracePeriod": false,
  "graceDaysRemaining": null,
  "customerName": "Acme Corp",
  "product": "InfraWatch",
  "features": ["multi-connector", "alerts"],
  "expiresAt": "2027-01-01",
  "activations": 2,
  "maxActivations": 5,
  "verifiedAt": "2026-04-23T10:15:00.000Z",
  "licenseKey": "ABCD-****-****-MNOP",
  "errorMessage": null
}
```

Jika gagal, `isLicensed` bernilai `false` dan `errorMessage` berisi alasan yang dapat dibaca manusia (`license_expired`, `invalid_license`, `max_activations_reached`, `license_revoked`).

Endpoint aktivasi hanya untuk admin dan dilindungi CSRF — pastikan Anda sudah login dan menggunakan kembali cookie session.

---

## Offline — License File (UI)

Gunakan metode ini jika host InfraWatch tidak memiliki akses internet keluar (instalasi airgap).

> 📸 **Screenshot needed:** `/images/license/setup-offline.png`
> **Page to capture:** `/setup/license` (Offline File tab)
> **What to show:** Tab "Offline File" aktif, dengan area drag-and-drop upload dan tombol "Upload & Activate" yang nonaktif hingga file dipilih.

1. Dapatkan file lisensi `.lic` dari Nexus Quantum Tech. File tersebut merupakan payload yang ditandatangani (RSA dengan SHA-256 secara default; Ed25519 dan Ed448 juga didukung) — memodifikasinya akan membatalkan signature.
2. Pastikan `LICENSE_PUBLIC_KEY` telah diset di `/opt/infrawatch/.env` (installer dapat mengatur hal ini untuk instalasi airgap).
3. Arahkan ke `/setup/license` dan pilih tab **Offline File**.
4. Klik area upload atau drag-and-drop file `.lic` Anda.
5. Klik **Upload & Activate**.

{{% alert icon="⚠️" context="warning" %}}
File lisensi offline terikat pada machine fingerprint yang menerbitkannya. Jangan menyalin file `.lic` antar host — file akan ditolak.
{{% /alert %}}

---

## Offline — License File (API)

**Endpoint:** `POST /api/license/upload`

**Request body** — isi teks mentah file `.lic`, dikirim sebagai JSON:

```json
{
  "fileContent": "-----BEGIN LICENSE-----\n...\n-----END LICENSE-----\n-----BEGIN SIGNATURE-----\n...\n-----END SIGNATURE-----"
}
```

**Contoh:**

```bash
curl -X POST http://<your-host>:3001/api/license/upload \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d "$(jq -Rs '{fileContent: .}' < license.lic)"
```

Server memverifikasi signature terhadap `LICENSE_PUBLIC_KEY` — memilih algoritma berdasarkan tipe key (RSA+SHA-256, Ed25519, atau Ed448) — men-decode payload base64, memeriksa tanggal kedaluwarsa, mempersist file bersama key-nya, dan meng-cache hasilnya ke tabel `license`.

---

## Cek Status Lisensi

**Endpoint:** `GET /api/license/status`

Mengembalikan `LicenseState` saat ini (bentuk sama seperti respons activate). Ini adalah endpoint yang di-poll oleh guard client-side untuk mendeteksi pencabutan atau kedaluwarsa lisensi di tengah session.

```bash
curl http://<your-host>:3001/api/license/status -b cookies.txt
```

Contoh respons untuk lisensi yang valid:

```json
{
  "isLicensed": true,
  "status": "active",
  "isGracePeriod": false,
  "customerName": "Acme Corp",
  "expiresAt": "2027-01-01",
  "licenseKey": "ABCD-****-****-MNOP"
}
```

Contoh respons saat berada dalam grace period setelah kegagalan verifikasi:

```json
{
  "isLicensed": true,
  "status": "grace_period",
  "isGracePeriod": true,
  "graceDaysRemaining": 4,
  "verifiedAt": "2026-04-19T09:00:00.000Z"
}
```

---

## Deaktivasi

Untuk membebaskan slot aktivasi (misalnya, saat memindahkan InfraWatch ke host baru), deaktivasi dulu instalasi yang sekarang.

**Endpoint:** `POST /api/license/deactivate`

```bash
curl -X POST http://<your-host>:3001/api/license/deactivate -b cookies.txt
```

Server akan menghapus key yang dipersist, menghapus baris lisensi yang di-cache, dan mengembalikan `{ "ok": true }` jika berhasil. Setelah deaktivasi, instance kembali ke keadaan belum berlisensi dan mengalihkan semua route non-publik kembali ke `/setup/license`.

---

## Grace Period

InfraWatch menggunakan strategi verifikasi tiga tingkat agar kegagalan jaringan sementara tidak menjatuhkan monitoring Anda:

1. **Verifikasi online** — `POST https://billing.nexusquantum.id/api/v1/licenses/verify` melalui license service di sisi server.
2. **File `.lic` offline** — jika server tidak dapat dijangkau, file `.lic` yang sudah diunggah akan diverifikasi ulang secara lokal terhadap `LICENSE_PUBLIC_KEY`.
3. **Hasil DB yang di-cache + grace period** — jika keduanya di atas gagal, verifikasi sukses terakhir (disimpan di tabel `license`) tetap valid selama `LICENSE_GRACE_PERIOD_DAYS` (default **7** hari).

Selama dalam grace period, dashboard menampilkan banner peringatan dengan sisa hari. Setelah grace period habis, instance menjadi tidak berlisensi dan dialihkan kembali ke `/setup/license`.

{{% alert icon="⚡" context="info" %}}
Grace period direset pada setiap verifikasi yang sukses. Dalam praktiknya, selama license server dapat dijangkau setidaknya sekali per minggu (dengan default `LICENSE_GRACE_PERIOD_DAYS=7`), pengguna tidak akan pernah melihat banner grace period.
{{% /alert %}}

---

## Pemecahan Masalah

| Masalah | Solusi |
|---|---|
| "Invalid license key" | Periksa salah ketik; key bersifat case-insensitive dan tanda hubung otomatis ditambahkan oleh UI. |
| "License already in use" / `max_activations_reached` | Hubungi Nexus Quantum Tech untuk memindahkan, melepaskan, atau menaikkan batas aktivasi. |
| File `.lic` offline ditolak | Verifikasi `LICENSE_PUBLIC_KEY` sudah diset di `/opt/infrawatch/.env`, dan file tersebut memang dibuat untuk host ini. |
| Terjebak di `/setup/license` setelah aktivasi yang sukses | Bersihkan cache browser dan muat ulang; cek `GET /api/license/status` untuk memastikan server melihat lisensi sebagai aktif. |
| `Cannot reach license server` | Pastikan host memiliki HTTPS keluar ke `https://billing.nexusquantum.id`. Untuk instalasi airgap, gunakan [metode file offline](#offline--license-file-ui). |

---

## Sumber Kebenaran

- `app/api/license/activate/route.ts` — handler POST activate
- `app/api/license/upload/route.ts` — handler POST upload file offline
- `app/api/license/status/route.ts` — GET status lisensi saat ini
- `app/api/license/deactivate/route.ts` — handler POST deactivate
- `lib/server/license-service.ts` — logika tingkatan verifikasi, masking, dan persistensi
- `LICENSING_TUTOR.md` — panduan integrasi referensi (agnostik framework)
