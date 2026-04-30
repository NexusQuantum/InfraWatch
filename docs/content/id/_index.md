+++
title = "InfraWatch"
description = "Dashboard observability infrastruktur untuk fleet NQRust Hypervisor"
template = "index.html"
+++

# InfraWatch
### Dashboard Observability Terpadu

Agregasi metrik dari **NQRust Hypervisor** di setiap datacenter ke dalam satu UI real-time — lengkap dengan alert, drill-down, dan TUI installer Rust berkelas produksi.

+++

## Mengapa InfraWatch?

**InfraWatch** adalah dashboard monitoring dari [Nexus Quantum Tech](https://nexusquantum.id) yang fokus pada operasi NQRust Hypervisor. Dirancang untuk home lab dan private cloud, InfraWatch menyediakan satu tampilan untuk host, cluster, VM, dan storage pool pada fleet hypervisor Anda.

### Poin Utama

- **Agregasi Fokus Hypervisor**: hubungkan InfraWatch ke fleet NQRust Hypervisor dan pantau semuanya dari satu tempat
- **Ringkasan Fleet**: ringkasan kesehatan real-time untuk semua cluster, host, storage, dan aplikasi
- **Drill-Down Host & VM**: CPU, memori, disk, network, load, dan uptime per server — plus inventaris VM NQRust
- **Alert Threshold**: evaluasi batched setiap 60 detik dengan resolusi otomatis dan retensi 30 hari
- **Grafik Historis**: grafik time-series CPU, memori, dan network dengan rentang waktu yang dapat dikonfigurasi via Prometheus range query
- **Connector Health**: pelacakan latency, opsi TLS, dan autentikasi fleksibel — none, basic, atau bearer — kredensial terenkripsi saat disimpan
- **Aman Secara Default**: admin ter-scrypt, proteksi CSRF, rate-limit login, SSO SAML/OAuth opsional, audit log lengkap
- **UI Modern**: frontend Next.js 16 + React 19 dengan Tailwind v4 dan SWR polling
- **Siap Produksi**: backend PostgreSQL, aktivasi lisensi dengan grace period, siap multi-host di belakang load balancer

+++

## Mulai Cepat

Jalankan InfraWatch di host Linux baru dalam hitungan menit:

- [**Panduan Instalasi**](/id/docs/getting-started/installation/) — Langkah demi langkah menggunakan TUI installer
- [**Mulai Cepat**](/id/docs/getting-started/quick-start/) — Tambahkan connector pertama dan lihat metrik mengalir
- [**Pendahuluan**](/id/docs/introduction/) — Ikhtisar produk dan arsitektur lengkap

+++

## Arsitektur

InfraWatch adalah satu deployable Next.js yang menarik data dari berbagai source metrik remote:

- **Next.js 16 App Router** (React 19 + Tailwind v4): Server Components secara default, SWR polling setiap 30 detik untuk tampilan live
- **Route Handlers** (`/api/*`): autentikasi, connector, alert, data live, forwarding query Prometheus, dan endpoint lisensi
- **Domain Layer** (`lib/server/domains/`): cache, alert evaluator, dan Prometheus client dengan concurrency limit
- **PostgreSQL 14+**: menyimpan connector, alert, session, audit log, dan state lisensi

Lihat [Pendahuluan](/id/docs/introduction/) untuk diagram arsitektur lengkap.

+++

## Fitur

Jelajahi cakupan InfraWatch:

- [**Connector**](/id/docs/connectors/) — setup dan operasi connector NQRust Hypervisor
- [**Fleet & Monitoring**](/id/docs/fleet/) — host, cluster, VM, storage, dan aplikasi dalam satu tampilan
- [**Alert**](/id/docs/alerts/) — aturan threshold dengan evaluasi batched dan resolusi otomatis
- [**Pengaturan & Admin**](/id/docs/settings/) — admin user, SSO, aktivasi lisensi, audit log
- [**Arsitektur**](/id/docs/architecture/) — bagaimana layer agregasi, cache, dan alert evaluator bekerja sama
- [**TUI Installer**](/id/docs/installer/) — mode online, airgap, interaktif, dan non-interaktif

+++

## Bantuan

- [Dokumentasi](/id/docs/introduction/) — Panduan dan referensi lengkap
- [GitHub Issues](https://github.com/NexusQuantum/InfraWatch/issues) — Laporkan bug atau minta fitur
- [Referensi API](/id/docs/api-reference/) — Setiap route handler terdokumentasi

+++

## Lisensi

InfraWatch adalah software berpemilik oleh **Nexus Quantum Tech**. Lihat [EULA](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md) untuk syarat.

Dibangun oleh tim Nexus Quantum. Ditenagai oleh Rust & ☕.
