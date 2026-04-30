+++
title = "Uninstall"
description = "Menghapus InfraWatch dengan infrawatch-installer uninstall, beserta opsi untuk mempertahankan data dan database"
weight = 94
date = 2026-04-23

[extra]
toc = true
+++

Binary yang sama yang memasang InfraWatch juga dapat menghapusnya. Subcommand `uninstall` membalik apa yang dikerjakan installer: ia menghentikan dan menghapus unit systemd `infrawatch.service`, menghapus binary yang terpasang dan direktori instalasi, dan (secara default) menghapus database.

{{% alert icon="⚠️" context="warning" %}}
`sudo infrawatch-installer uninstall --force` bersifat **destruktif secara default**: ia menghapus database PostgreSQL `infrawatch` dan menghapus direktori data aplikasi. Jika Anda ingin mempertahankan sesuatu di seluruh proses uninstall, berikan `--keep-data` dan/atau `--keep-database`.
{{% /alert %}}

---

## Uninstall Dasar

```bash
sudo infrawatch-installer uninstall --force
```

Ini melakukan teardown penuh. Flag `--force` menekan prompt konfirmasi interaktif, yang diperlukan saat dijalankan dari skrip dan sangat disarankan saat dijalankan secara interaktif agar Anda harus mengakui tindakan tersebut secara eksplisit.

### Opsi Pelestarian

```bash
# Keep your data: --keep-data
# Keep database:  --keep-database
```

Gabungkan flag sesuai kebutuhan:

```bash
# Keep application data on disk
sudo infrawatch-installer uninstall --force --keep-data

# Keep the database (useful when you plan to reinstall)
sudo infrawatch-installer uninstall --force --keep-database

# Keep both — common when rolling back a failed upgrade
sudo infrawatch-installer uninstall --force --keep-data --keep-database
```

---

## Apa yang Dihapus

Perintah `sudo infrawatch-installer uninstall --force` default menghapus:

- Unit systemd **`infrawatch.service`** — dihentikan, dinonaktifkan, dan dihapus dari `/etc/systemd/system/`. `systemctl daemon-reload` dipanggil setelahnya.
- **Binary installer** di `/usr/local/bin/infrawatch-installer`.
- **Direktori instalasi** di `/opt/infrawatch/` (repo yang di-clone, `node_modules/`, dan build produksi `.next`).
- **Direktori data default** yang dibuat oleh installer — state aplikasi dan cache.
- **Database PostgreSQL `infrawatch`** dan role `infrawatch` — installer menjalankan `DROP DATABASE infrawatch` dan `DROP ROLE infrawatch` terhadap PostgreSQL lokal.

PostgreSQL itu sendiri **tidak dihapus** — installer hanya menghapus objek yang dibuatnya, bukan server PostgreSQL, direktori datanya, atau database lain.

---

## Apa yang Dipertahankan oleh `--keep-data`

Dengan `--keep-data`, installer melewati penghapusan direktori data InfraWatch. File `.env` di `/opt/infrawatch/.env` dan state lokal apa pun yang telah ditulis oleh InfraWatch dibiarkan pada disk sehingga Anda dapat menyalin atau memeriksanya sebelum dibersihkan secara manual.

Unit systemd dan binary tetap dihapus.

---

## Apa yang Dipertahankan oleh `--keep-database`

Dengan `--keep-database`, installer **tidak** menghapus database `infrawatch` atau role `infrawatch`. PostgreSQL tetap berjalan dan database tetap utuh, sehingga `sudo infrawatch-installer install` berikutnya yang menggunakan `--db-password` yang sama dapat tersambung kembali ke database yang sudah ada tanpa kehilangan alert, connector, atau status lisensi.

Ini adalah kombinasi flag yang direkomendasikan untuk instalasi ulang yang terencana:

```bash
sudo infrawatch-installer uninstall --force --keep-database
# ... prepare the new install (copy config, adjust systemd unit template, etc.) ...
sudo infrawatch-installer install --mode full --db-password "<same-password>"
```

---

## Memulihkan dari Instalasi yang Gagal

Jika sebuah instalasi gagal di tengah jalan, aman untuk menjalankan `uninstall --force` untuk membersihkan state parsial dan mulai dari awal:

```bash
sudo infrawatch-installer uninstall --force
sudo infrawatch-installer install
```

Karena setiap operasi installer bersifat idempoten, Anda juga cukup menjalankan ulang `install` tanpa melakukan uninstall terlebih dahulu — user, database, dan layanan yang sudah ada dideteksi dan dibiarkan apa adanya. Pilih `uninstall` ketika Anda ingin kondisi bersih yang terjamin.
