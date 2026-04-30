+++
title = "Instalasi"
description = "Pasang InfraWatch menggunakan installer online, airgap, atau berbasis source"
weight = 21
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch dipasang melalui `infrawatch-installer` — sebuah TUI Rust tingkat produksi (Ratatui + Crossterm) yang menyediakan semua kebutuhan pada host Anda: preflight check, PostgreSQL, runtime Bun, build InfraWatch, file `.env`, dan service systemd `infrawatch`.

Pilih metode yang sesuai dengan lingkungan Anda.

---

## Persyaratan Sistem

| | Minimum | Direkomendasikan | Skala Besar |
|---|---|---|---|
| **Connector / host** | ≤10 / ~500 | 10–50 / ~2.000 | 50–200 / ~10.000 |
| **CPU** | 2 core | 4 core | 8+ core |
| **RAM** | 2 GB | 4 GB | 8–16 GB |
| **Disk** | 10 GB | SSD 20 GB | SSD 50 GB |
| **OS** | Ubuntu 22.04+, Debian 12+, RHEL 9+, Rocky 9+ | sama | sama |
| **Runtime** | Bun 1.3+ atau Node.js 20+ | sama | sama |
| **Database** | PostgreSQL 14+ | PostgreSQL 16 (dedicated) | PostgreSQL 16 + PgBouncer |
| **Jaringan** | HTTPS keluar ke instance NQRust Hypervisor + license server | sama | sama + load balancer untuk beberapa instance InfraWatch |

{{% alert icon="⚡" context="info" %}}
Profil Minimum sudah memadai untuk sebagian besar deployment homelab dan datacenter tunggal. Naik ke Direkomendasikan setelah menghubungkan lebih dari 10 instance NQRust Hypervisor atau memantau lebih dari ~500 host.
{{% /alert %}}

---

## Opsi 1 — Instalasi Cepat (Online)

Untuk host dengan akses internet. Perintah satu baris mengunduh script bootstrap `install.sh` terbaru, yang kemudian mengambil binary statis `infrawatch-installer` dari GitHub Releases dan menjalankan TUI.

```bash
curl -fsSL https://github.com/NexusQuantum/InfraWatch/releases/latest/download/install.sh | bash
```

Installer akan membuka TUI terpandu yang memandu Anda melalui setiap fase.

> 📸 **Screenshot needed:** `/images/installer/installer-welcome.png`
> **Page to capture:** `infrawatch-installer install` — Welcome phase
> **What to show:** Banner layar selamat datang dengan branding InfraWatch dan prompt "Press Enter to begin".

### Fase 1 — Welcome

Installer menampilkan banner produk, versi, dan ringkasan singkat tentang apa yang akan dilakukan. Tekan **Enter** untuk memulai.

### Fase 2 — Mode Select

Pilih mode instalasi. Sebagian besar deployment host tunggal menggunakan **Full**.

> 📸 **Screenshot needed:** `/images/installer/installer-mode-select.png`
> **Page to capture:** `infrawatch-installer install` — Mode Select phase
> **What to show:** Daftar tiga baris mode instalasi (Full / Minimal / Development) dengan sorotan pada "Full".

| Mode | PostgreSQL | Build | Service systemd |
|---|---|---|---|
| **Full** | Dipasang oleh installer | Build produksi (`bun --bun next build`) | Ya (`infrawatch.service`) |
| **Minimal** | Eksternal (Anda menyediakan `DATABASE_URL`) | Build produksi | Tidak |
| **Development** | Eksternal | Mode dev (`bun --bun next dev`) | Tidak |

### Fase 3 — Configuration

Tinjau dan sesuaikan path instalasi, kredensial database, kredensial admin, dan port HTTP. Nilai default sudah aman; satu-satunya input yang wajib dalam mode interaktif adalah password database dan password admin.

> 📸 **Screenshot needed:** `/images/installer/installer-configuration.png`
> **Page to capture:** `infrawatch-installer install` — Configuration phase
> **What to show:** Formulir konfigurasi dengan label untuk DB host, DB port, DB password, admin username, admin password, dan HTTP port.

### Fase 4 — Preflight

Installer memvalidasi sistem Anda sebelum menyentuh apa pun — versi OS, RAM dan disk yang tersedia, port yang dibutuhkan, akses `sudo`, dan (untuk mode online) konektivitas jaringan keluar.

> 📸 **Screenshot needed:** `/images/installer/installer-preflight.png`
> **Page to capture:** `infrawatch-installer install` — Preflight phase
> **What to show:** Daftar preflight dengan centang hijau untuk setiap pemeriksaan yang lolos dan ringkasan "All checks passed".

Semua pemeriksaan harus lolos untuk melanjutkan. Jika ada pemeriksaan yang gagal, installer akan menampilkan petunjuk perbaikan dan keluar dengan bersih — belum ada yang terpasang.

### Fase 5 — Installation Progress

Installer menyediakan setiap komponen secara berurutan dan menstream log secara langsung. Untuk instalasi Full di Ubuntu, urutannya adalah:

1. Pasang dependensi (PostgreSQL, runtime Bun)
2. Buat user database, database, dan grant
3. Clone dan build InfraWatch
4. Buat file `/opt/infrawatch/.env`
5. Pasang dan jalankan unit `infrawatch.service`
6. Verifikasi service mendengarkan pada port HTTP yang dikonfigurasi

> 📸 **Screenshot needed:** `/images/installer/installer-progress.png`
> **Page to capture:** `infrawatch-installer install` — Installation phase
> **What to show:** Tampilan progress dengan spinner per langkah, langkah yang selesai tercentang, dan tail log live di bagian bawah.

### Fase 6 — Verification

Setelah seluruh langkah selesai, installer menjalankan putaran akhir pemeriksaan kesehatan: keterjangkauan HTTP pada port yang dikonfigurasi, koneksi database, dan status service systemd.

> 📸 **Screenshot needed:** `/images/installer/installer-verification.png`
> **Page to capture:** `infrawatch-installer install` — Verification phase
> **What to show:** Panel verifikasi dengan baris "HTTP OK", "Database OK", dan "Service active".

### Fase 7 — Complete

Instalasi selesai. Installer menampilkan URL akses Anda, username admin, dan pengingat untuk mengubah password saat login pertama.

> 📸 **Screenshot needed:** `/images/installer/installer-complete.png`
> **Page to capture:** `infrawatch-installer install` — Complete phase
> **What to show:** Layar penyelesaian menampilkan `http://<host>:3001`, username admin, dan tautan langkah selanjutnya.

---

## Opsi 2 — Unduh Binary Langsung

Jika Anda ingin memeriksa installer sebelum menjalankannya, lewati perintah satu baris dan unduh binary statis musl secara langsung.

```bash
# Unduh binary statis (bekerja pada Linux x86_64 manapun)
curl -fsSL -o infrawatch-installer \
  https://github.com/NexusQuantum/InfraWatch/releases/latest/download/infrawatch-installer-x86_64-linux-musl
chmod +x infrawatch-installer

# Instalasi TUI interaktif (direkomendasikan)
sudo ./infrawatch-installer install
```

### Mode Non-Interaktif (Online)

Untuk pipeline CI dan instalasi berbasis skrip, gunakan `--non-interactive` beserta flag yang dibutuhkan:

```bash
sudo ./infrawatch-installer install \
  --non-interactive \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password" \
  --http-port 3001
```

Jalankan `infrawatch-installer install --help` untuk referensi flag lengkap.

---

## Opsi 3 — Instalasi Airgap / Offline

Untuk lingkungan tanpa akses internet, unduh bundel self-extracting `.run` dari halaman [Releases](https://github.com/NexusQuantum/InfraWatch/releases) di mesin yang terkoneksi, lalu pindahkan ke host tujuan.

**Langkah 1 — Unduh bundel di mesin yang terkoneksi:**

```bash
curl -fsSL -o nqrust-infrawatch-airgap-v0.1.0.run \
  https://github.com/NexusQuantum/InfraWatch/releases/download/v0.1.0/nqrust-infrawatch-airgap-v0.1.0.run
```

**Langkah 2 — Transfer ke host tujuan** (USB, SCP, dll.):

```bash
scp nqrust-infrawatch-airgap-v0.1.0.run user@target-host:/tmp/
```

**Langkah 3 — Jalankan di host tujuan:**

```bash
chmod +x nqrust-infrawatch-airgap-v0.1.0.run
sudo ./nqrust-infrawatch-airgap-v0.1.0.run
```

File `.run` akan mengekstrak sendiri ke direktori sementara dan menjalankan installer dengan `--airgap` secara otomatis. Installer beroperasi sepenuhnya offline — tidak ada proses unduh yang terjadi selama instalasi berlangsung.

Bundel airgap berisi:

- Aplikasi InfraWatch yang sudah dibangun (source + `node_modules` + build `.next`)
- Binary runtime Bun
- Paket `.deb` PostgreSQL (Ubuntu/Debian)
- Binary statis `infrawatch-installer`

### Ekstraksi Manual Bundel Airgap

Jika Anda ingin memeriksa isi bundel sebelum menjalankan installer (misalnya untuk meninjau paket `.deb` yang perlu diaudit tim keamanan Anda), ekstrak tanpa mengeksekusi:

```bash
# Ekstrak ke sebuah direktori tanpa menjalankan
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle

# Kemudian jalankan installer secara manual terhadap bundel yang sudah diekstrak
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap \
  --bundle-path /opt/infrawatch-bundle
```

### Mode Non-Interaktif (Airgap)

```bash
sudo ./infrawatch-installer install \
  --non-interactive \
  --airgap \
  --bundle-path /opt/infrawatch-bundle \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password"
```

---

## Opsi 4 — Build dari Source

Jika Anda perlu menyesuaikan InfraWatch atau mengikuti branch `main`, clone dan build secara langsung:

```bash
# 1. Clone
git clone https://github.com/NexusQuantum/InfraWatch.git
cd InfraWatch

# 2. Pasang dependensi
bun install

# 3. Konfigurasi
cp .env.example .env
# Sunting .env dengan DATABASE_URL, kredensial admin, dan setting lisensi Anda

# 4. Build
bun --bun next build

# 5. Jalankan
bun --bun next start --port 3001
```

Anda tetap harus menyediakan PostgreSQL dan membuat unit systemd sendiri; installer mengerjakannya untuk Anda dalam mode `Full`.

---

## Opsi 5 — Build Installer dari Source

Installer sendiri merupakan binary Rust di direktori `installer/` pada repo. Bangun installer jika Anda ingin memodifikasi perilakunya atau menghasilkan release kustom:

```bash
cd InfraWatch/installer
cargo build --release
sudo ./target/release/infrawatch-installer install
```

Binary hasil build merupakan build `x86_64-unknown-linux-musl` yang sepenuhnya statis jika dikompilasi dengan profil release dari repo — letakkan di mana saja pada `PATH` Anda.

---

## Apa yang Terpasang

Setelah instalasi `Full` berhasil:

| Path | Isi |
|---|---|
| `/opt/infrawatch/` | Repositori hasil clone, output build `.next/`, `node_modules/` |
| `/opt/infrawatch/.env` | Konfigurasi environment (URL DB, kredensial admin, setting lisensi) |
| `/usr/local/bin/infrawatch-installer` | Binary installer itu sendiri (untuk `uninstall`/`reinstall` di kemudian hari) |
| `/etc/systemd/system/infrawatch.service` | Unit systemd |
| Direktori data PostgreSQL | Path default distro (misalnya `/var/lib/postgresql/16/main` di Ubuntu) |
| `journalctl -u infrawatch` | Log service |

InfraWatch otomatis membuat semua tabel PostgreSQL yang dibutuhkan saat startup pertama: `license`, `admin_user`, `sessions`, `login_attempts`, `connectors`, `connector_health`, `alert_rules`, `alerts`, dan `audit_log`.

---

## Service

Service dikelola oleh systemd:

```bash
# Cek status
sudo systemctl status infrawatch

# Start / stop / restart
sudo systemctl start infrawatch
sudo systemctl stop infrawatch
sudo systemctl restart infrawatch

# Ikuti log
sudo journalctl -u infrawatch -f

# Aktifkan saat boot (installer melakukannya untuk Anda dalam mode Full)
sudo systemctl enable infrawatch
```

URL default adalah `http://<host>:3001`. Port dapat diubah saat instalasi dengan `--http-port` atau kemudian dengan menyunting `PORT=` di `/opt/infrawatch/.env` lalu menjalankan `sudo systemctl restart infrawatch`.

---

## Uninstall

Installer menyertakan subcommand `uninstall` yang menghapus unit systemd, direktori instalasi, dan secara opsional database:

```bash
# Uninstall penuh (menghapus service, file, dan database)
sudo infrawatch-installer uninstall --force

# Pertahankan data aplikasi di disk
sudo infrawatch-installer uninstall --force --keep-data

# Pertahankan database (berguna bila Anda berencana melakukan reinstall)
sudo infrawatch-installer uninstall --force --keep-database
```

---

## Pemecahan Masalah

### Koneksi database gagal

InfraWatch tidak akan berjalan jika tidak dapat mencapai PostgreSQL. Periksa dulu service-nya:

```bash
# Pastikan PostgreSQL berjalan
sudo systemctl status postgresql

# Uji connection string dari host
psql -h localhost -p 5432 -U infrawatch -d infrawatch
```

Jika PostgreSQL berjalan tetapi koneksi tetap gagal, pastikan `postgresql.conf` memiliki `listen_addresses` yang diset dengan benar (installer mengkonfigurasinya dalam mode `Full`) dan `pg_hba.conf` mengizinkan user `infrawatch`.

### Service tidak jalan

Periksa log service terlebih dahulu:

```bash
sudo journalctl -u infrawatch -n 100 --no-pager
```

Penyebab umum:

- `DATABASE_URL` di `/opt/infrawatch/.env` tidak dapat dijangkau — lihat di atas.
- `CONNECTOR_ENCRYPTION_KEY` tidak ada atau terlalu pendek. Harus minimal 32 karakter acak.
- `PORT` yang dikonfigurasi sudah digunakan. Ubah di `.env` dan restart.

### Reinstall

Untuk melakukan reinstall bersih setelah percobaan yang gagal:

```bash
sudo infrawatch-installer uninstall --force
sudo infrawatch-installer install
```

Jika Anda perlu mempertahankan data antar reinstall, gunakan `--keep-data --keep-database` pada `uninstall` lalu jalankan `install` lagi dengan kredensial database yang sama.

---

## Setelah Instalasi

Buka UI web di browser Anda pada URL yang ditampilkan di layar penyelesaian installer:

| Setting | Default |
|---|---|
| **UI Web** | `http://<host>:3001` |
| **Username admin** | `admin` (atau yang Anda set via `--admin-username`) |
| **Password admin** | `admin` (atau yang Anda set via `--admin-password`) |

{{% alert icon="⚠️" context="warning" %}}
Ubah password admin default segera setelah login pertama melalui **Settings → Account**. Set juga `CONNECTOR_ENCRYPTION_KEY` yang kuat (minimal 32 karakter acak) di `/opt/infrawatch/.env` sebelum menambahkan connector apa pun.
{{% /alert %}}

Lanjutkan ke [Mulai Cepat](../quick-start/) untuk menerima EULA, mengaktifkan lisensi, dan menambahkan connector pertama Anda.
