+++
title = "Log"
description = "Tempat log layanan InfraWatch, log installer, dan log aplikasi Next.js berada"
weight = 102
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch menulis output diagnostik ke empat tempat. Ketika melakukan triase sebuah insiden, mulailah dengan journal systemd untuk layanan, lalu perluas pencarian sesuai kebutuhan.

---

## 1. Log Layanan (systemd / journald)

Unit `infrawatch.service` mengalirkan seluruh output aplikasi ke journal systemd. Ini adalah sumber log utama untuk apa pun yang dilakukan aplikasi Next.js saat runtime — request, error database, evaluasi alert, pemeriksaan lisensi.

Ikuti log secara langsung:

```bash
sudo journalctl -u infrawatch -f
```

Ambil 100 baris terakhir tanpa mengikuti:

```bash
sudo journalctl -u infrawatch -n 100 --no-pager
```

Dump 500 baris terakhir ke sebuah file untuk dibagikan:

```bash
sudo journalctl -u infrawatch -n 500 --no-pager > /tmp/infrawatch.log
```

Filter berdasarkan rentang waktu:

```bash
sudo journalctl -u infrawatch --since "1 hour ago"
sudo journalctl -u infrawatch --since "2026-04-23 09:00" --until "2026-04-23 10:00"
```

---

## 2. Direktori Log Buatan Installer — `/var/log/infrawatch/`

Installer dapat membuat `/var/log/infrawatch/` untuk file log level aplikasi jika environment dikonfigurasi untuk menulis di luar journal. Direktori ini tidak dijamin ada pada setiap instalasi — ia hanya ada ketika installer atau konfigurasi Anda sendiri menyiapkan logging berbasis file.

```bash
ls -la /var/log/infrawatch/
sudo tail -f /var/log/infrawatch/*.log
```

Jika direktori tersebut tidak ada, semuanya mengalir ke journal saja (lihat di atas).

---

## 3. Log Aplikasi Next.js

Log Next.js App Router (penanganan request, server component, route API) dipancarkan ke stdout oleh proses `bun --bun next start` yang diluncurkan oleh unit systemd. Karena berupa stdout, mereka berakhir di journal systemd bersama dengan sisa output layanan:

```bash
sudo journalctl -u infrawatch -f
```

Jika Anda menjalankan InfraWatch dalam mode `Minimal` atau `Development` tanpa unit systemd yang dikelola installer, log akan mengalir ke terminal tempat Anda meluncurkan aplikasi. Tangkap mereka dengan shell redirection atau supervisor proses Anda sendiri.

---

## 4. File Log Installer Sendiri

Binary `infrawatch-installer` menyimpan lognya sendiri untuk setiap fase, perintah, dan output. Ini adalah file yang harus diambil ketika instalasi atau uninstall berperilaku tidak semestinya.

Saat menjalankan TUI, setiap operasi ditampilkan secara live di panel log yang dapat di-scroll dan disalin ke disk. Periksa output installer dan lokasi log sistem standar saat kegagalan:

```bash
# Re-run the installer with the full log visible
sudo infrawatch-installer install 2>&1 | tee /tmp/infrawatch-installer.log
```

Untuk uninstall:

```bash
sudo infrawatch-installer uninstall --force 2>&1 | tee /tmp/infrawatch-uninstall.log
```

---

## Perintah Triase Cepat

```bash
# Service running?
sudo systemctl status infrawatch

# Service logs (follow)
sudo journalctl -u infrawatch -f

# PostgreSQL running?
sudo systemctl status postgresql

# Is the port listening?
sudo ss -tlnp | grep 3001

# Recent errors only
sudo journalctl -u infrawatch -p err -n 100 --no-pager
```

Untuk cara menginterpretasikan tanda-tanda kegagalan umum, lihat [Masalah Umum](../common-issues/).
