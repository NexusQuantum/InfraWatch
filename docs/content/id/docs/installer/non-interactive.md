+++
title = "Instalasi Non-Interaktif"
description = "Menjalankan infrawatch-installer dari CI, configuration management, atau skrip shell"
weight = 93
date = 2026-04-23

[extra]
toc = true
+++

Untuk pipeline CI, configuration management (Ansible, Chef, Puppet), dan provisioning berbasis skrip, `infrawatch-installer` mendukung mode sepenuhnya non-interaktif. Berikan `--non-interactive` bersama flag yang diperlukan, dan installer akan berjalan langsung melewati setiap fase tanpa TUI.

Dalam mode non-interaktif, installer tetap melakukan tujuh fase yang sama (Welcome → Mode Select → Configuration → Preflight → Installation → Verification → Complete) — ia hanya mengonsumsi jawaban dari flag alih-alih prompt dan mengalirkan progres plain-text ke stdout alih-alih UI Ratatui.

---

## Online Non-Interaktif

Untuk instalasi online standar pada host dengan akses internet:

```bash
# Online
sudo ./infrawatch-installer install \
  --non-interactive \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password" \
  --http-port 3001
```

Instalasi ini akan:

- Menjalankan pemeriksaan preflight.
- Memasang PostgreSQL dan Bun melalui package manager yang terdeteksi.
- Membuat user database `infrawatch` dengan password dari `--db-password`.
- Meng-clone dan membangun InfraWatch, menetapkan password admin ke `--admin-password`, dan mengonfigurasi aplikasi untuk listen pada port `3001`.
- Memasang dan menjalankan `infrawatch.service`.

---

## Airgap Non-Interaktif

Untuk host offline / airgap, ekstrak bundle terlebih dahulu (lihat [Sumber Instalasi](../sources/)) lalu jalankan installer terhadap direktori yang sudah diekstrak:

```bash
# Offline / air-gapped
sudo ./infrawatch-installer install \
  --non-interactive \
  --airgap \
  --bundle-path /opt/infrawatch-bundle \
  --mode full
```

Anda juga dapat menambahkan `--db-password` dan `--admin-password` di sini; jika Anda menghilangkannya, installer akan menghasilkan nilai acak yang kuat dan menampilkannya saat selesai.

---

## Referensi Flag

Setiap flag yang didokumentasikan di bawah ini diterima oleh `infrawatch-installer install`. Hanya `--non-interactive` yang wajib untuk penggunaan berbasis skrip; sisanya memiliki default yang aman atau hanya relevan untuk mode tertentu.

| Flag | Tujuan |
|------|--------|
| `--non-interactive` | Melewati TUI. Installer berjalan langsung dengan flag yang disediakan dan default bawaan. Wajib untuk instalasi berbasis skrip. |
| `--mode <mode>` | Mode instalasi: `full`, `minimal`, atau `development`. Default adalah `full`. Lihat [Mode](../modes/) untuk semantik masing-masing. |
| `--db-password <pw>` | Password untuk user PostgreSQL `infrawatch`. Dalam mode `full`, installer menetapkan password ini pada user baru yang dibuatnya; dalam mode `minimal`/`development` password ini ditulis ke `DATABASE_URL` di dalam `/opt/infrawatch/.env`. Jika dihilangkan dalam mode non-interaktif, password acak yang kuat akan dihasilkan. |
| `--admin-password <pw>` | Password untuk user admin default (username `admin`). Disimpan sebagai hash scrypt dalam tabel `admin_user` pada startup pertama. Ubah setelah login pertama. |
| `--http-port <port>` | Port tempat server HTTP InfraWatch listen. Default adalah `3001`. Menetapkan `PORT=` di `/opt/infrawatch/.env`. |
| `--airgap` | Menggunakan bundle yang sudah disiapkan pada disk alih-alih mengambil paket, Bun, dan source InfraWatch dari internet. Memerlukan `--bundle-path`. |
| `--bundle-path <path>` | Path absolut ke direktori bundle airgap yang sudah diekstrak. Hanya bermakna bersama `--airgap`. Default: `/opt/infrawatch-bundle`. |

{{% alert icon="⚡" context="info" %}}
Jalankan `infrawatch-installer install --help` untuk semua opsi, termasuk flag yang kurang umum seputar direktori instalasi, TLS, dan override package manager.
{{% /alert %}}

---

## Tips untuk CI dan Configuration Management

- Selalu berikan `--db-password` dan `--admin-password` secara eksplisit agar nilai yang dihasilkan bersifat deterministik antar eksekusi.
- Tangkap kode exit installer: exit non-zero berarti sebuah fase gagal dan tidak ada layanan systemd yang dijalankan.
- Ikuti `journalctl -u infrawatch` setelah installer selesai untuk memastikan layanan mencapai status sehat. Lihat [Log](../../troubleshooting/logs/).
- Pada eksekusi ulang, `infrawatch-installer install` bersifat idempoten — user, database, dan layanan yang sudah ada dideteksi dan dibiarkan apa adanya. Untuk memulai dari kondisi bersih, jalankan [`uninstall`](../uninstall/) terlebih dahulu.
