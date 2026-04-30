+++
title = "Mode Instalasi"
description = "Mode instalasi Full, Minimal, dan Development beserta kapan masing-masing digunakan"
weight = 91
date = 2026-04-23

[extra]
toc = true
+++

Installer mendukung tiga mode instalasi. Pilih yang sesuai dengan target deployment Anda — `Full` adalah default dan pilihan yang tepat untuk sebagian besar instalasi produksi single-host.

---

## Matriks Mode

| Mode           | PostgreSQL | Build      | Layanan Systemd |
|----------------|------------|------------|-----------------|
| **Full**       | Terpasang  | Produksi   | Ya              |
| **Minimal**    | Eksternal  | Produksi   | Tidak           |
| **Development**| Eksternal  | Mode dev   | Tidak           |

---

## Kapan Menggunakan Setiap Mode

### Full

Default. Gunakan `--mode full` ketika Anda menginginkan deployment single-host kelas produksi dengan installer yang mengelola segalanya.

- **PostgreSQL** dipasang dan dikonfigurasi secara otomatis (termasuk listen pada `--db-port` yang Anda pilih).
- Aplikasi InfraWatch dibangun dalam mode **produksi** (`bun --bun next build`).
- Unit systemd `infrawatch.service` dibuat, diaktifkan saat boot, dan dijalankan.

Ini adalah mode yang direkomendasikan untuk:

- Deployment single-datacenter
- VM bergaya appliance atau host bare-metal yang didedikasikan untuk InfraWatch
- Lingkungan apa pun di mana Anda menginginkan satu perintah meninggalkan Anda dengan layanan yang berjalan di `http://<host>:3001`

### Minimal

Gunakan `--mode minimal` ketika Anda sudah mengoperasikan PostgreSQL secara terpisah (managed service, host DB yang didedikasikan, cluster bersama) dan menginginkan installer hanya menangani build dan konfigurasi aplikasi.

- **PostgreSQL tidak dipasang** — Anda menyediakan `DATABASE_URL` yang dapat dijangkau dan installer menuliskannya ke `/opt/infrawatch/.env`.
- Aplikasi tetap dibangun dalam mode **produksi**.
- **Tidak ada layanan systemd yang dibuat** — Anda diharapkan menjalankan InfraWatch di bawah supervisor proses Anda sendiri (unit systemd yang Anda kelola, container orchestrator, Docker, PM2, dll.).

Pilih `Minimal` ketika:

- Anda memiliki PostgreSQL khusus (misalnya RDS, Cloud SQL, cluster ber-PgBouncer) dan tidak ingin installer menyentuh paket postgres lokal.
- Anda menjalankan InfraWatch di dalam container atau pada host yang supervisor layanannya dikelola oleh tooling Anda sendiri.
- Anda ingin output build yang teraudit dan berulang di `/opt/infrawatch/.next` dan akan merangkai systemd sendiri.

### Development

Gunakan `--mode development` ketika Anda sedang mengerjakan InfraWatch itu sendiri dan ingin installer menyiapkan mesin tetapi meninggalkan aplikasi dalam mode dev-server.

- **PostgreSQL tidak dipasang** — sediakan `DATABASE_URL` Anda sendiri.
- Aplikasi berjalan dalam **mode dev** (`bun --bun next dev`), bukan `bun --bun next build`.
- **Tidak ada layanan systemd yang dibuat** — jalankan dev server secara manual dengan hot reload.

Gunakan mode ini hanya pada workstation developer atau CI test runner. Mode ini tidak aman untuk produksi: dev server melakukan rebuild setiap ada perubahan file, menyertakan source map, dan memiliki semantik caching yang berbeda dari build produksi.

---

## Memilih Mode Secara Interaktif

Selama fase **Mode Select** pada TUI, installer menampilkan ketiga mode dalam sebuah list. Gunakan **↑/↓** (atau **k**/**j**) untuk memindahkan pilihan dan **Enter** untuk mengonfirmasi. Pilihan default adalah **Full**.

## Memilih Mode Secara Non-Interaktif

Berikan flag `--mode` pada command line:

```bash
sudo ./infrawatch-installer install --non-interactive --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password"
```

Nilai yang valid adalah `full`, `minimal`, dan `development`. Lihat [Instalasi Non-Interaktif](../non-interactive/) untuk referensi flag lengkap.
