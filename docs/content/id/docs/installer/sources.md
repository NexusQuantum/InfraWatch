+++
title = "Sumber Instalasi"
description = "Instalasi online versus bundle --airgap, struktur bundle, dan ekstraksi manual"
weight = 92
date = 2026-04-23

[extra]
toc = true
+++

Installer dapat mengambil apa yang dibutuhkannya dari internet (default) atau mengonsumsi semuanya dari bundle yang sudah disiapkan pada disk (`--airgap`). Urutan fase dan hasil akhirnya identik — hanya langkah akuisisi untuk dependensi dan source InfraWatch yang berbeda.

---

## Matriks Sumber

| Flag | Deskripsi |
|------|-----------|
| *(default)* | **Online** — meng-clone repo dari GitHub, mengunduh Bun, memasang paket melalui `apt`/`dnf` |
| `--airgap` | **Offline** — menggunakan bundle pre-built dari `--bundle-path` (tidak perlu internet) |

---

## Online (Default)

Tanpa flag source, installer:

- Meng-clone repositori InfraWatch dari `https://github.com/NexusQuantum/InfraWatch.git` ke `/opt/infrawatch/`.
- Mengunduh runtime Bun (1.3+) dari `https://bun.sh/`.
- Memasang PostgreSQL dan paket dasar apa pun (`curl`, `git`, build tooling) melalui package manager yang terdeteksi — `apt-get` pada Debian/Ubuntu, `dnf` pada RHEL/Rocky 9+, `yum` sebagai fallback.

Jalur online memerlukan HTTPS keluar dari host target ke GitHub, `bun.sh`, dan mirror paket distribusi Anda.

### One-Liner

Jalur tercepat adalah skrip bootstrap rilis, yang mengunduh binary installer statis dan menjalankannya:

```bash
curl -fsSL https://github.com/NexusQuantum/InfraWatch/releases/latest/download/install.sh | bash
```

### Binary Langsung

Atau unduh binary statis `x86_64-unknown-linux-musl` dan jalankan sendiri:

```bash
curl -fsSL -o infrawatch-installer \
  https://github.com/NexusQuantum/InfraWatch/releases/latest/download/infrawatch-installer-x86_64-linux-musl
chmod +x infrawatch-installer
sudo ./infrawatch-installer install
```

---

## Airgap (`--airgap`)

Gunakan `--airgap` ketika host target tidak memiliki akses internet. Installer membaca setiap artefak dari `--bundle-path` alih-alih mengambilnya saat runtime, dan tidak ada panggilan jaringan yang terjadi selama instalasi.

Bundle didistribusikan sebagai **arsip `.run` yang self-extracting**. Pada mesin yang memiliki internet, unduh arsip dari [halaman Releases](https://github.com/NexusQuantum/InfraWatch/releases) dan pindahkan ke host target (USB, SCP, server artefak internal, media fisik, dll.):

```bash
curl -fsSL -o nqrust-infrawatch-airgap-v0.1.0.run \
  https://github.com/NexusQuantum/InfraWatch/releases/download/v0.1.0/nqrust-infrawatch-airgap-v0.1.0.run
```

Pada host target, buat agar dapat dieksekusi dan jalankan:

```bash
chmod +x nqrust-infrawatch-airgap-v0.1.0.run
sudo ./nqrust-infrawatch-airgap-v0.1.0.run
```

File `.run` akan self-extract ke direktori sementara dan secara otomatis meluncurkan `infrawatch-installer install --airgap --bundle-path <extracted-path>`.

---

## Struktur Bundle

Bundle airgap berisi segala hal yang biasanya akan diunduh oleh installer:

- **Aplikasi InfraWatch pre-built** — pohon source ditambah `node_modules/` dan build produksi `.next/` yang sudah dikompilasi, sehingga tidak perlu `bun install` atau `bun --bun next build` pada host airgap.
- **Binary runtime Bun** — executable Bun yang di-link secara statis untuk `x86_64-linux`.
- **Paket PostgreSQL `.deb`** — untuk target Debian/Ubuntu, paket PostgreSQL 14+ dikirim di dalam bundle dan dipasang melalui `dpkg -i`.
- **Binary installer statis** — `infrawatch-installer` itu sendiri, sehingga Anda dapat menjalankan ulang atau uninstall kemudian tanpa dependensi eksternal.

---

## Ekstraksi Airgap Manual

Jika Anda perlu memeriksa bundle sebelum menjalankannya — misalnya, agar tim keamanan Anda dapat mengaudit paket `.deb` yang disertakan — ekstrak tanpa mengeksekusi:

```bash
# Extract without running
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle
```

Ini akan mengekstrak seluruh bundle ke `/opt/infrawatch-bundle/` dan langsung keluar tanpa menjalankan installer. Tinjau file-file tersebut, lalu panggil installer secara manual ketika Anda siap:

```bash
# Run the installer manually
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap --bundle-path /opt/infrawatch-bundle
```

{{% alert icon="⚡" context="info" %}}
`--bundle-path` harus menunjuk ke direktori yang **sudah diekstrak**, bukan ke arsip `.run`. Jika installer gagal dengan error bundle-not-found, jalankan langkah ekstrak terlebih dahulu dan verifikasi bahwa path tersebut berisi `infrawatch-installer`, binary Bun, file `.deb` PostgreSQL, dan aplikasi pre-built.
{{% /alert %}}

Untuk instalasi airgap berbasis skrip, lihat [Instalasi Non-Interaktif](../non-interactive/).
