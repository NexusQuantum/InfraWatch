+++
title = "Pemecahan Masalah"
description = "Mendiagnosis masalah layanan, database, connector, lisensi, alerting, dan installer"
weight = 100
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# Pemecahan Masalah

Ketika InfraWatch berperilaku tidak semestinya, hampir setiap masalah masuk ke salah satu dari empat kelompok: **layanan itu sendiri** tidak berjalan, **database** tidak dapat dijangkau, sebuah **connector** tidak dapat mengambil metric, atau middleware **lisensi** menolak request. Bagian ini membahas tanda-tanda kegagalan umum untuk setiap kelompok dengan format **Gejala / Penyebab / Perbaikan** yang dapat Anda scan dengan cepat saat insiden.

Sebelum segala sesuatu yang lain, ambil status saat ini dengan dua perintah berikut — keduanya menjawab setidaknya setengah dari pertanyaan di bawah:

```bash
sudo systemctl status infrawatch
sudo journalctl -u infrawatch -f
```

---

## Sub-halaman

### [Masalah Umum](common-issues/)

Daftar terkurasi mode kegagalan yang paling sering kami temui — kegagalan systemd, error koneksi PostgreSQL, kegagalan test connector, 403 license-middleware, chart kosong, penolakan CSRF, konflik port, dan kesalahan bundle airgap. Masing-masing ditulis dalam format **Gejala → Penyebab → Perbaikan** sehingga Anda dapat membacanya sekilas di tengah sebuah outage.

### [Log](logs/)

Tempat log sebenarnya berada: `journalctl -u infrawatch -f` untuk layanan, `/var/log/infrawatch/` untuk file yang dibuat installer, log aplikasi Next.js, dan file log installer itu sendiri.

---

## Bagian Terkait

- [Installer](../installer/) — untuk fase-fase spesifik installer dan opsi uninstall.
- [Memulai → Instalasi](../getting-started/installation/) — persyaratan sistem dan pemeriksaan pasca-instalasi.
- [Connectors](../connectors/) — untuk konfigurasi connector (URL, auth, TLS).
- [Alerts](../alerts/) — untuk semantik alert rule dan kadensi evaluasi 60 detik.
