+++
title = "TUI Installer"
description = "Installer terminal Rust + Ratatui InfraWatch — fase, mode, sumber, dan penggunaan dalam skrip"
weight = 90
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# TUI Installer

InfraWatch hadir dengan **`infrawatch-installer`** — installer terminal kelas produksi yang ditulis dalam **Rust** di atas stack **Ratatui** + **Crossterm**. Ia membawa host Linux yang masih bersih (Ubuntu 22.04+, Debian 12+, RHEL 9+, Rocky 9+) menjadi instance InfraWatch yang berjalan dan dikelola systemd dalam satu sesi terpandu, baik online maupun sepenuhnya airgap.

Installer ini adalah satu binary statis `x86_64-unknown-linux-musl` tanpa dependensi runtime. Ia didistribusikan sebagai aset rilis berdiri sendiri, dikemas di dalam arsip airgap `.run` yang self-extracting, dan juga dihasilkan oleh `cargo build --release` di dalam direktori `installer/` pada repositori.

---

## Tujuh Fase

Setiap pemanggilan `infrawatch-installer install` melewati state machine tujuh-fase yang sama. Fase berikutnya hanya berjalan ketika fase sebelumnya berhasil; kegagalan memunculkan petunjuk perbaikan dan keluar dengan rapi tanpa meninggalkan sistem yang setengah terpasang.

```
Welcome → Mode Select → Configuration → Preflight → Installation → Verification → Complete
```

| # | Fase | Apa yang terjadi |
|---|---|---|
| 1 | **Welcome** | Banner produk, string versi, dan ringkasan singkat tentang apa yang akan terjadi. Tekan **Enter** untuk memulai. |
| 2 | **Mode Select** | Pilih antara `Full`, `Minimal`, atau `Development`. Lihat [Mode](modes/). |
| 3 | **Configuration** | Tinjau dan sesuaikan path instalasi, kredensial database, kredensial admin, dan port HTTP. Nilai default sudah aman. |
| 4 | **Preflight** | Validasi versi OS, RAM, disk, port yang dibutuhkan, akses `sudo`, dan (mode online) konektivitas keluar. Belum ada apa pun yang ditulis ke disk. |
| 5 | **Installation** | Menyiapkan dependensi, membuat database, membangun InfraWatch, menghasilkan `/opt/infrawatch/.env`, dan memasang unit systemd `infrawatch.service`. Log langsung mengalir di panel yang dapat di-scroll. |
| 6 | **Verification** | Health-check layanan yang berjalan: jangkauan HTTP pada port yang dikonfigurasi, koneksi database, dan status layanan systemd. |
| 7 | **Complete** | Menampilkan URL akses, username admin, dan tautan langkah berikutnya. |

Untuk tur layar demi layar dengan gambar placeholder, lihat [TUI Walkthrough](tui-walkthrough/).

---

## Arsitektur

Installer mengikuti pemisahan tiga lapisan yang rapi, semuanya dikemas dalam satu binary:

- **State machine (`app.rs`)** — satu struct `App` menyimpan setiap bagian state yang mutable: layar saat ini, konfigurasi, status fase, buffer log, ukuran terminal. Navigasi adalah transisi `next_screen()` / `prev_screen()` yang sederhana.
- **Lapisan UI (`ui/`)** — satu fungsi render per layar, ditambah widget yang dapat digunakan kembali (`phase_progress`, `log_viewer`, `status_bar`). Renderer bersifat murni: mereka membaca `App` dan menggambar; mereka tidak pernah memutasi state.
- **Modul installer (`installer/`)** — satu modul per perhatian: `preflight`, `deps`, `database`, `build`, `config`, `services`, `verify`. Setiap fungsi mengembalikan `Vec<LogEntry>` sehingga operasi tetap sepenuhnya terpisah dari UI.

Instalasi itu sendiri berjalan di thread latar belakang dan berkomunikasi dengan UI melalui channel `mpsc` yang membawa varian `InstallMessage` (`PhaseStart`, `PhaseProgress`, `PhaseComplete`, `Log`, `Error`). Hal ini menjaga loop polling input 100 ms tetap responsif — spinner tetap berputar, panel log tetap dapat di-scroll, dan `Ctrl+C` bekerja setiap saat bahkan ketika `apt-get install` atau `bun install` sedang berjalan di latar belakang.

{{% alert icon="⚡" context="info" %}}
Setiap operasi installer bersifat **idempoten**. Menjalankan ulang installer setelah interupsi selalu aman — pembuatan user, penyediaan database, pemasangan unit systemd, dan setiap langkah lainnya memeriksa "sudah selesai?" sebelum bertindak.
{{% /alert %}}

---

## Apa yang Dikerjakan Installer (Mode Full)

Untuk instalasi `Full` di Ubuntu, installer melakukan langkah-langkah ini secara berurutan:

1. Menjalankan pemeriksaan preflight (OS, RAM, disk, port, `sudo`)
2. Memasang dependensi (PostgreSQL, runtime Bun) melalui package manager yang terdeteksi (`apt-get`, `dnf`, atau `yum`)
3. Menyiapkan database — membuat user `infrawatch`, database, dan grant
4. Mengonfigurasi PostgreSQL untuk listen pada `db_port` yang dikonfigurasi
5. Meng-clone dan membangun InfraWatch (`bun install` + `bun --bun next build`)
6. Menghasilkan `/opt/infrawatch/.env` dengan kredensial pilihan Anda dan `CONNECTOR_ENCRYPTION_KEY` acak
7. Membuat dan menjalankan unit systemd `infrawatch.service`
8. Memverifikasi bahwa layanan merespons pada port HTTP yang dikonfigurasi

Lihat [Mode](modes/) untuk perbedaan pada mode `Minimal` dan `Development`.

---

## Sub-halaman

### [Mode Instalasi](modes/)

Pilih antara `Full`, `Minimal`, dan `Development`. Full menyiapkan segalanya termasuk PostgreSQL dan layanan systemd; Minimal mengharapkan database eksternal dan tidak memasang unit systemd; Development menjalankan `bun --bun next dev` untuk hot reload.

### [Sumber Instalasi](sources/)

Online (default — clone dari GitHub, unduh Bun, pasang paket melalui `apt`/`dnf`) versus `--airgap` (gunakan bundle pre-built pada disk). Mencakup tata letak arsip `.run` yang self-extracting dan ekstraksi manual dengan `--noexec`.

### [Instalasi Non-Interaktif](non-interactive/)

Jalankan installer dari CI, configuration management, atau skrip shell dengan `--non-interactive`. Setiap flag yang membentuk instalasi didokumentasikan di sini.

### [Uninstall](uninstall/)

`sudo infrawatch-installer uninstall --force`, ditambah `--keep-data` dan `--keep-database` untuk penghapusan yang non-destruktif.

### [TUI Walkthrough](tui-walkthrough/)

Panduan fase demi fase dengan placeholder screenshot untuk setiap layar TUI: welcome, pemilihan mode, konfigurasi, pemeriksaan preflight (hijau / kuning / merah), progres instalasi, verifikasi, dan penyelesaian.

---

## Langkah Berikutnya

Setelah installer selesai, kembali ke [Memulai → Mulai Cepat](../../getting-started/quick-start/) untuk menerima EULA, mengaktifkan lisensi, dan menambahkan connector pertama Anda. Untuk kebutuhan operasional berkelanjutan, lihat [Pemecahan Masalah](../troubleshooting/).
