+++
title = "Mulai Cepat"
description = "Masuk, aktifkan lisensi Anda, dan tambahkan connector pertama"
weight = 22
date = 2026-04-23

[extra]
toc = true
+++

Panduan ini berasumsi Anda telah menyelesaikan [Instalasi](../installation/) dan service `infrawatch` sudah berjalan. Anda akan masuk, menerima EULA, mengaktifkan lisensi, dan menambahkan connector NQRust Hypervisor pertama Anda.

---

## 1. Buka UI Web

Arahkan browser ke host Anda. URL ditampilkan di layar penyelesaian installer, biasanya:

```
http://<your-host-ip>:3001
```

Anda akan dialihkan ke `/login`.

> 📸 **Screenshot needed:** `/images/quick-start/login-page.png`
> **Page to capture:** `/login`
> **What to show:** Formulir login InfraWatch dengan field Username dan Password serta tombol "Sign in".

Masuk dengan kredensial default:

- **Username:** `admin`
- **Password:** `admin`

{{% alert icon="⚠️" context="warning" %}}
Ubah password admin default segera setelah login pertama melalui **Settings → Account**. Endpoint login dibatasi (rate limit) pada 5 percobaan gagal per 15 menit, dan password admin di-hash dengan scrypt saat pertama kali digunakan.
{{% /alert %}}

---

## 2. Terima EULA

Pada login pertama, InfraWatch menampilkan End User License Agreement. Baca ketentuannya, centang kotak persetujuan, lalu klik **I Accept** untuk melanjutkan. EULA juga tersedia dalam Bahasa Indonesia melalui pemilih bahasa.

> 📸 **Screenshot needed:** `/images/quick-start/eula-modal.png`
> **Page to capture:** `/login` (post-auth EULA overlay) or `/setup`
> **What to show:** Modal EULA dengan teks perjanjian yang dapat digulir, pemilih bahasa, kotak centang persetujuan, dan tombol "I Accept".

Untuk ringkasan apa yang Anda setujui, lihat [EULA](../eula/).

---

## 3. Aktifkan Lisensi Anda

Setelah menerima EULA, InfraWatch mengalihkan instance yang belum berlisensi ke `/setup` (kemudian `/setup/license`). Aktifkan lisensi Anda menggunakan license key atau file `.lic` offline.

> 📸 **Screenshot needed:** `/images/quick-start/license-setup.png`
> **Page to capture:** `/setup/license`
> **What to show:** Halaman aktivasi lisensi dengan dua tab ("License Key" dan "Offline File") dan input key dengan format `XXXX-XXXX-XXXX-XXXX`.

Panduan lengkap dan detail API tersedia di [Aktivasi Lisensi](../license/).

---

## 4. Lihat Dashboard

Setelah lisensi aktif, Anda akan masuk ke dashboard utama. Tanpa connector yang dikonfigurasi, kartu ringkasan fleet akan menampilkan nol — hal ini wajar.

> 📸 **Screenshot needed:** `/images/quick-start/dashboard-empty.png`
> **Page to capture:** `/` (dashboard)
> **What to show:** Dashboard InfraWatch dengan kartu fleet kosong (0 host, 0 cluster, 0 alert) dan sidebar navigasi yang terlihat.

Sidebar adalah titik masuk Anda ke setiap area:

| Item navigasi | Kegunaan |
|---|---|
| **Dashboard** | Kartu ringkasan seluruh fleet |
| **Connectors** | Tambah dan kelola sumber data NQRust Hypervisor |
| **Hosts** | CPU, memori, disk, jaringan, dan uptime per host |
| **Clusters** | Drill-down cluster compute / storage |
| **VMs** | Inventaris NQRust MicroVM |
| **Alerts** | Aturan alert dan alert yang terpicu |
| **Settings** | Akun, lisensi, log audit |

---

## 5. Tambahkan Connector Pertama Anda

Klik **Connectors** di sidebar. Anda akan masuk ke daftar connector yang kosong.

> 📸 **Screenshot needed:** `/images/quick-start/connectors-empty.png`
> **Page to capture:** `/connectors`
> **What to show:** Halaman connector dalam keadaan kosong, menampilkan pesan "No connectors yet" dan tombol **Add Connector** yang menonjol.

Klik **Add Connector**. Dialog akan menanyakan nama, URL endpoint, dan mode autentikasi opsional.

> 📸 **Screenshot needed:** `/images/quick-start/add-connector-dialog.png`
> **Page to capture:** `/connectors` (Add Connector dialog open)
> **What to show:** Modal Add Connector dengan field: Name, URL, Authentication (none/basic/bearer), opsi TLS.

### Tipe connector

Gunakan `nqrust_hypervisor`.

### Isi detail koneksi

- **Name** — label yang mudah dikenali (misalnya `nqrust-prod-a`).
- **URL** — endpoint metrik NQRust Hypervisor.
- **Authentication** — `none`, `basic` (username + password), atau `bearer` (token).
- **TLS** — centang "Skip certificate verification" hanya untuk sertifikat self-signed yang Anda percaya.

### Uji sebelum menyimpan

Klik **Test Connection**. InfraWatch akan mem-ping endpoint, memvalidasi autentikasi, dan melaporkan latensi round-trip. Warna hijau berarti connector dapat dijangkau dan metrik terparse dengan benar.

> 📸 **Screenshot needed:** `/images/quick-start/connector-test-success.png`
> **Page to capture:** `/connectors` (Add Connector dialog with test result)
> **What to show:** Dialog setelah **Test Connection** berhasil, dengan badge hijau "Connection OK — 42ms" dan tombol **Save** yang aktif.

Klik **Save**. InfraWatch mengenkripsi kredensial dengan `CONNECTOR_ENCRYPTION_KEY` dan menulis baris ke tabel `connectors`.

---

## 6. Lihat Ringkasan Fleet

Kembali ke **Dashboard**. Dalam satu siklus polling SWR (30 detik secara default), kartu fleet akan terisi dengan host, cluster, dan jumlah VM yang ditarik melalui connector baru Anda.

> 📸 **Screenshot needed:** `/images/quick-start/dashboard-populated.png`
> **Page to capture:** `/` (dashboard, post-connector)
> **What to show:** Dashboard dengan kartu fleet terisi yang menampilkan jumlah host, rincian healthy/warning/critical, serta timestamp "Last updated" yang terus bergerak.

Dari sini, Anda dapat mendrill ke **Hosts** untuk CPU/memori/jaringan per server, **Clusters** untuk tampilan cluster compute dan storage, atau **Alerts** untuk mengonfigurasi aturan berbasis threshold pertama Anda.

---

## Langkah Selanjutnya

- **[Connectors](../../connectors/)** — konfigurasikan sumber NQRust Hypervisor lain di seluruh datacenter Anda.
- **[Fleet & Monitoring](../../fleet/)** — pahami tampilan host, cluster, dan VM.
- **[Alerts](../../alerts/)** — siapkan aturan alert berbasis threshold dengan evaluasi batch.
- **[Settings & Admin](../../settings/)** — ubah password admin, rotasi `CONNECTOR_ENCRYPTION_KEY`, dan tinjau log audit.
