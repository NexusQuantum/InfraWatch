+++
title = "Daftar Isi"
description = "Navigasikan seluruh dokumentasi InfraWatch dari satu indeks datar."
icon = "Toc"
weight = 110
layout = "single"
date = 2026-04-23

[extra]
toc = true
+++

{{% alert icon="📚" context="info" %}}
Halaman ini adalah indeks datar dari setiap halaman dokumentasi InfraWatch. Gunakan ketika Anda mengetahui topik yang diinginkan tetapi belum tahu bagian mana yang memuatnya. Setiap tautan mengarah ke halaman di sidebar sebelah kiri.
{{% /alert %}}

### **Pendahuluan**

- [**Apa itu InfraWatch?**](../introduction/) - Ringkasan produk, masalah yang dipecahkannya, dan posisinya di dalam stack Anda

---

### **Memulai**

- [**Ringkasan Memulai**](../getting-started/) - Pilih jalur yang tepat: installer, mulai cepat, atau lisensi
- [Instalasi](../getting-started/installation/) - Jalankan TUI installer dan naikkan stack PostgreSQL + Next.js
- [Mulai Cepat](../getting-started/quick-start/) - Login, tambahkan connector pertama Anda, dan saksikan metric mengalir
- [Lisensi & Aktivasi](../getting-started/license/) - Aktifkan license key dan pahami tier trial vs berbayar
- [EULA](../getting-started/eula/) - Baca end user license agreement (Bahasa Inggris & Bahasa Indonesia)

---

### **Connectors**

- [**Ringkasan Connectors**](../connectors/) - Bagaimana InfraWatch menarik metric dari sumber NQRust Hypervisor
- [NQRust Hypervisor](../connectors/nqrust-hypervisor/) - Hubungkan ke control plane NQRust Hypervisor dan konsumsi telemetri VM
- [Kelola Connector](../connectors/manage-connectors/) - Buat, test, aktifkan, nonaktifkan, dan hapus connector dengan aman

---

### **Fleet & Monitoring**

- [**Ringkasan Fleet**](../fleet/) - Bagaimana InfraWatch mengagregasikan setiap host, cluster, VM, dan aplikasi ke dalam satu tampilan fleet
- [Fleet Landing](../fleet/overview/) - Kartu ringkasan, badge kesehatan, dan navigasi cepat ke segmen fleet
- [Hosts](../fleet/hosts/) - Host bare-metal dan VM dengan chart CPU, memory, disk, dan network
- [Clusters](../fleet/clusters/) - Pengelompokan logis dari host dan connector
- [Virtual Machines](../fleet/virtual-machines/) - VM NQRust dengan CPU live, memory, disk I/O, dan power state
- [Storage](../fleet/storage/) - Volume, pool, dan tren kapasitas di seluruh connector
- [Applications](../fleet/applications/) - Rollup level layanan dengan konteks dependency

---

### **Alerts**

- [**Ringkasan Alerts**](../alerts/) - Pipeline alert: rule, evaluasi, notifikasi, dan history
- [Buat Alert Rule](../alerts/create-alert-rule/) - Definisikan ekspresi PromQL, threshold, dan target notifikasi
- [Kelola Alert](../alerts/manage-alerts/) - Acknowledge, silence, reroute, dan sesuaikan rule yang ada

---

### **Pengaturan & Admin**

- [Autentikasi](../settings/authentication/) - Akun lokal, session, CSRF, dan kebijakan password
- [Single Sign-On (SSO)](../settings/sso/) - Konfigurasi provider SAML dan OAuth dengan production hardening
- [Manajemen Password](../settings/password/) - Alur reset, aturan kompleksitas, dan rotasi
- [Log Audit](../settings/audit-log/) - Siapa melakukan apa, kapan, dari IP mana

---

### **Arsitektur**

- [**Ringkasan Arsitektur**](../architecture/) - Aplikasi Next.js, penyimpanan PostgreSQL, lapisan polling SWR, dan fan-out connector
- [Data Model](../architecture/data-model/) - Tabel, relasi, dan kebijakan retensi
- [Security Model](../architecture/security-model/) - Auth, CSRF, penyimpanan session, dan batas jaringan

---

### **Referensi API**

- [**Ringkasan API**](../api-reference/) - Konvensi route, bentuk JSON, kode error, dan pagination
- [API Autentikasi](../api-reference/auth/) - Endpoint login, logout, session, dan password
- [API Connectors](../api-reference/connectors/) - Endpoint CRUD, test, toggle, dan list connector
- [API Alerts](../api-reference/alerts/) - Endpoint CRUD rule, evaluasi, dan history alert
- [Live API](../api-reference/live/) - Endpoint metric berlatensi rendah yang digunakan oleh polling SWR
- [API Prometheus](../api-reference/prometheus/) - Endpoint proxy yang digunakan untuk meneruskan query PromQL ke Prometheus bawaan NQRust Hypervisor
- [API Lisensi](../api-reference/license/) - Endpoint aktivasi, status, dan entitlement
- [API Settings](../api-reference/settings/) - Endpoint admin settings dan audit

---

### **TUI Installer**

- [**Ringkasan Installer**](../installer/) - Mengapa TUI Ratatui + Crossterm, apa yang dihasilkannya, dan bagaimana menjalankannya
- [Mode Instalasi](../installer/modes/) - Mode Full, Minimal, dan Development beserta kapan masing-masing digunakan
- [Sumber Instalasi](../installer/sources/) - Repositori online vs tarball airgap
- [Mode Non-Interaktif](../installer/non-interactive/) - Flag CLI dan file konfigurasi untuk instalasi unattended
- [Uninstall](../installer/uninstall/) - Penghapusan layanan, data, dan user yang bersih
- [TUI Walkthrough](../installer/tui-walkthrough/) - Tur layar demi layar installer interaktif

---

### **Pemecahan Masalah**

- [**Ringkasan Pemecahan Masalah**](../troubleshooting/) - Pola pikir diagnostik, lokasi log, dan eskalasi dukungan
- [Masalah Umum](../troubleshooting/common-issues/) - Perbaikan untuk error connector, kegagalan login, dan metric yang hilang
- [Log](../troubleshooting/logs/) - Tempat setiap layanan menulis log dan cara mengikutinya

---

{{% alert icon="ℹ️" context="info" %}}
Tidak menemukan yang Anda cari? Buka issue di [github.com/NexusQuantum/InfraWatch](https://github.com/NexusQuantum/InfraWatch) atau gunakan kotak pencarian di bagian atas sidebar.
{{% /alert %}}

---
