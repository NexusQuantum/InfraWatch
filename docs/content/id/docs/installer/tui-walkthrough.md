+++
title = "TUI Walkthrough"
description = "Tur fase demi fase installer TUI InfraWatch dengan placeholder screenshot"
weight = 95
date = 2026-04-23

[extra]
toc = true
+++

Tur layar demi layar `sudo infrawatch-installer install` dari peluncuran pertama hingga layar penyelesaian. Setiap fase di bawah ini menunjukkan apa yang ditampilkan oleh TUI, tombol mana yang bekerja pada layar tersebut, dan menyertakan placeholder screenshot untuk PNG asli yang akan diambil kemudian.

Semua screenshot berada di bawah `/images/installer/`. File-file di bawah ini memang sengaja belum ada di repo — letakkan capture asli di `docs/static/images/installer/` untuk menggantikan placeholder.

---

## Fase 1 — Welcome

Installer dibuka dengan banner InfraWatch, string versi, dan ringkasan singkat tentang apa yang akan terjadi selama instalasi.

> 📸 **Screenshot needed:** `/images/installer/welcome.png`
> **Page to capture:** `infrawatch-installer install` — Welcome phase
> **What to show:** Layar welcome dengan logo ASCII InfraWatch dalam warna brand, tag versi, dan petunjuk tombol "Press Enter to continue  •  q to quit" di bagian bawah.

**Tombol:** **Enter** untuk lanjut, **q** atau **Ctrl+C** untuk membatalkan.

---

## Fase 2 — Mode Select

Sebuah list dari tiga mode instalasi dengan sorotan pada **Full** secara default. Lihat [Mode](../modes/) untuk semantik masing-masing.

> 📸 **Screenshot needed:** `/images/installer/mode-selection.png`
> **Page to capture:** `infrawatch-installer install` — Mode Select phase
> **What to show:** List tiga baris (Full / Minimal / Development) dengan deskripsi satu baris di bawah setiap baris. Baris yang disorot adalah "Full — PostgreSQL terpasang, build produksi, layanan systemd".

**Tombol:** **↑/↓** (atau **k**/**j**) untuk memindahkan pilihan, **Enter** untuk mengonfirmasi, **Esc** untuk kembali ke Welcome.

---

## Fase 3 — Configuration

Sebuah form di mana setiap default aman. Dua field yang paling sering disentuh pengguna adalah **DB password** dan **Admin password**; selainnya (path instalasi, DB host, DB port, HTTP port, admin username) memiliki default yang masuk akal.

Konfigurasi terbagi ke dalam beberapa sub-layar yang fokus.

### Port database

> 📸 **Screenshot needed:** `/images/installer/configuration-db-port.png`
> **Page to capture:** `infrawatch-installer install` — Configuration (DB port)
> **What to show:** Field "Database port" yang terpilih dengan nilai default `5432` terlihat dan prompt edit inline aktif.

### User admin

> 📸 **Screenshot needed:** `/images/installer/configuration-admin-user.png`
> **Page to capture:** `infrawatch-installer install` — Configuration (Admin user)
> **What to show:** Field username/password admin dengan username di-default ke `admin` dan field password menampilkan input yang di-mask.

### Port HTTP

> 📸 **Screenshot needed:** `/images/installer/configuration-http-port.png`
> **Page to capture:** `infrawatch-installer install` — Configuration (HTTP port)
> **What to show:** Field "HTTP port" dengan nilai default `3001` disorot dan baris petunjuk tombol menampilkan "e Edit  •  Enter Continue  •  Esc Back".

**Tombol:** **↑/↓** untuk berpindah antar field, **e** atau **Space** untuk mengedit field yang terpilih (beralih ke input teks inline), **Enter** untuk menyimpan hasil edit dan melanjutkan, **Esc** untuk membatalkan edit atau kembali ke Mode Select.

---

## Fase 4 — Preflight

Installer memvalidasi sistem Anda sebelum menyentuh apa pun. Setiap pemeriksaan dirender dengan simbol status:

- **Hijau `✓`** — pemeriksaan lolos.
- **Kuning `⚠`** — peringatan. Instalasi dapat dilanjutkan tetapi operator sebaiknya mencatat temuan tersebut.
- **Merah `✗`** — gagal. Instalasi tidak dapat dilanjutkan sampai kondisi tersebut diperbaiki.

> 📸 **Screenshot needed:** `/images/installer/preflight-checks.png`
> **Page to capture:** `infrawatch-installer install` — Preflight phase
> **What to show:** Daftar pemeriksaan preflight dengan campuran pemeriksaan hijau (versi OS, akses sudo, ruang disk), satu peringatan kuning (misalnya "RAM 2GB — minimum yang didukung; 4GB direkomendasikan"), dan tanpa kegagalan merah. Baris status di bagian bawah: "All checks passed — Enter to continue".

Jika ada pemeriksaan yang merah, installer menampilkan petunjuk perbaikan, menonaktifkan **Enter**, dan keluar dengan rapi pada **q** — belum ada apa pun yang ditulis ke disk.

**Tombol:** **Enter** untuk melanjutkan ke Installation (hanya ketika tidak ada pemeriksaan yang merah), **Esc** untuk kembali ke Configuration, **q** atau **Ctrl+C** untuk membatalkan.

---

## Fase 5 — Installation

Fase kerja utama. TUI terbagi menjadi tiga wilayah vertikal:

1. Sebuah **gauge** progres di bagian atas yang menampilkan persentase keseluruhan dan jumlah fase `(completed / total)`.
2. Sebuah **checklist fase** dengan simbol status per langkah (`○` pending, `◐` berjalan, `✓` sukses, `⚠` peringatan, `✗` error, `⊘` dilewati).
3. Sebuah **log viewer** yang dapat di-scroll, mengalirkan output setiap operasi secara real time, dengan timestamp dan level berkode warna (`INF`, `OK`, `WRN`, `ERR`).

Thread latar belakang menjalankan instalasi; UI tetap sepenuhnya responsif, spinner terus berputar, dan scroll log bekerja di sepanjang waktu.

### Installation sedang berjalan

> 📸 **Screenshot needed:** `/images/installer/installation-progress.png`
> **Page to capture:** `infrawatch-installer install` — Installation phase (mid-run)
> **What to show:** Tata letak tiga-panel dengan gauge progres keseluruhan di ~60%, daftar fase menunjukkan beberapa fase pertama sebagai centang hijau dan fase saat ini (misalnya "Install — Building InfraWatch") berputar dalam warna brand, serta panel log menampilkan output `bun install` / `next build`.

### Installation selesai (pra-verifikasi)

> 📸 **Screenshot needed:** `/images/installer/installation-progress-complete.png`
> **Page to capture:** `infrawatch-installer install` — Installation phase (all phases complete)
> **What to show:** Gauge progres di 100%, setiap baris fase bercentang hijau, panel log menampilkan pesan final "Service started successfully", dan petunjuk di bagian bawah yang berbunyi "Enter to continue to verification".

**Tombol:** **↑/↓** untuk men-scroll panel log, **Enter** untuk melanjutkan setelah setiap fase selesai, **Ctrl+C** untuk membatalkan (installer menghentikan fase yang sedang berjalan dan keluar).

---

## Fase 6 — Verification

Babak terakhir pemeriksaan kesehatan terhadap layanan yang berjalan: jangkauan HTTP pada port yang dikonfigurasi, koneksi database, dan status layanan systemd. Setiap pemeriksaan mencoba ulang beberapa kali dengan backoff karena layanan perlu sedikit waktu untuk selesai melakukan startup.

> 📸 **Screenshot needed:** `/images/installer/verification.png`
> **Page to capture:** `infrawatch-installer install` — Verification phase
> **What to show:** Panel hasil tiga-baris yang rapi dengan "HTTP OK — GET /api/health returned 200", "Database OK — SELECT 1 returned 1 row", dan "Service active — infrawatch.service (running)" semua hijau. Baris status di bagian bawah berbunyi "Verification passed — Enter to continue".

Jika sebuah pemeriksaan verifikasi gagal, installer tetap membiarkan layanan terpasang tetapi memunculkan error dengan petunjuk perbaikan (biasanya "check `journalctl -u infrawatch -f`") — lihat [Masalah Umum](../../troubleshooting/common-issues/).

**Tombol:** **Enter** untuk melanjutkan ke Complete.

---

## Fase 7 — Complete

Installer menampilkan URL akses, username admin, dan tautan ke langkah berikutnya.

> 📸 **Screenshot needed:** `/images/installer/complete-screen.png`
> **Page to capture:** `infrawatch-installer install` — Complete phase
> **What to show:** Layar penyelesaian dengan centang hijau besar, header "Installation complete", URL akses (`http://<host>:3001`), username admin, dan pengingat untuk mengubah password admin saat login pertama. Petunjuk tombol di bagian bawah: "Enter to exit".

**Tombol:** **Enter** untuk keluar dari installer.

{{% alert icon="⚠️" context="warning" %}}
Ubah password admin default segera setelah login pertama melalui **Settings → Account**, dan tetapkan `CONNECTOR_ENCRYPTION_KEY` yang kuat (32+ karakter acak) di `/opt/infrawatch/.env` sebelum menambahkan connector apa pun.
{{% /alert %}}

Lanjutkan ke [Memulai → Mulai Cepat](../../getting-started/quick-start/) untuk menerima EULA, mengaktifkan lisensi, dan menambahkan connector pertama Anda.
