+++
title = "Memulai"
description = "Pasang InfraWatch dan tampilkan fleet pertama Anda dalam waktu kurang dari 15 menit"
weight = 20
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# Memulai

InfraWatch dikirim bersama **installer TUI berbasis Rust** (`infrawatch-installer`) yang membawa host Linux yang masih bersih menjadi dashboard observability yang berjalan hanya dalam beberapa menit. Installer ini menangani preflight check, PostgreSQL, runtime Bun, build Next.js, serta service systemd `infrawatch` — baik online maupun sepenuhnya airgap.

---

## Apa yang Anda Perlukan

**Perangkat Keras (Minimum — hingga 10 connector, ~500 host)**

- 2 core CPU
- RAM 2 GB
- Disk kosong 10 GB

**Perangkat Keras (Direkomendasikan — 10–50 connector, ~2.000 host)**

- 4 core CPU
- RAM 4 GB
- SSD 20 GB

**Perangkat Lunak**

- Ubuntu 22.04+, Debian 12+, RHEL 9+, atau Rocky 9+
- Akses `sudo` pada host tujuan
- PostgreSQL 14+ (installer dapat menyediakannya untuk Anda dalam mode `full`)
- Bun 1.3+ atau Node.js 20+ (installer otomatis mengunduh Bun dalam mode online)
- Koneksi HTTPS keluar ke instance NQRust Hypervisor dan ke `https://billing.nexusquantum.id` untuk verifikasi lisensi (tidak diperlukan untuk instalasi airgap)

Lihat panduan [Instalasi](installation/) untuk matriks skala lengkap, termasuk profil skala besar (50–200 connector, ~10.000 host).

---

## Opsi Instalasi

### [Instalasi](installation/)

Jalankan installer TUI terpandu, bootstrap satu baris perintah, atau bundel airgap `.run` yang mengekstrak sendiri. Mencakup empat metode yang didukung: online, binary langsung, airgap, dan build dari source.

**Waktu yang dibutuhkan:** ~10 menit

### [Mulai Cepat](quick-start/)

Masuk ke InfraWatch yang baru saja terpasang, terima EULA, aktifkan lisensi Anda, dan tambahkan connector NQRust Hypervisor pertama.

**Waktu yang dibutuhkan:** ~5 menit (setelah instalasi)

### [Aktivasi Lisensi](license/)

Aktifkan InfraWatch menggunakan license key online atau file `.lic` offline. Mencakup environment variable `LICENSE_*`, halaman `/setup/license`, endpoint `/api/license/*`, serta perilaku grace period.

**Waktu yang dibutuhkan:** ~2 menit

### [EULA](eula/)

Baca dan terima End User License Agreement yang wajib disetujui saat login pertama. Tersedia dalam Bahasa Inggris dan Bahasa Indonesia.

**Waktu yang dibutuhkan:** ~3 menit

---

## Langkah Selanjutnya

Setelah installer selesai dan Anda berhasil masuk, lanjutkan ke bagian [Connectors](../connectors/) untuk menghubungkan InfraWatch ke instance NQRust Hypervisor Anda.
