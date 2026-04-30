+++
title = "Masalah Umum"
description = "Gejala, Penyebab, dan Perbaikan untuk mode kegagalan yang paling sering kami temui"
weight = 101
date = 2026-04-23

[extra]
toc = true
+++

Setiap entri di bawah ini mengikuti struktur **Gejala / Penyebab / Perbaikan** yang sama sehingga Anda dapat membacanya sekilas dengan cepat.

---

## Layanan & Runtime

### `systemctl status infrawatch` menampilkan failed

**Gejala:** `sudo systemctl status infrawatch` menampilkan `Active: failed (Result: exit-code)` atau `Active: activating (auto-restart)` dalam loop yang ketat.

**Penyebab:** Proses Next.js crash saat startup. Penyebab paling umum adalah database yang tidak dapat dijangkau, `CONNECTOR_ENCRYPTION_KEY` yang hilang atau salah bentuk, atau port yang dikonfigurasi sedang digunakan.

**Perbaikan:** Ikuti journal untuk mendapatkan alasan crash:

```bash
sudo journalctl -u infrawatch -f
```

Kemudian cocokkan error tersebut dengan bagian database, CSRF, dan port di bawah ini. Setelah memperbaiki penyebab yang mendasarinya:

```bash
sudo systemctl restart infrawatch
sudo systemctl status infrawatch
```

---

### Koneksi PostgreSQL gagal

**Gejala:** Journal menampilkan `ECONNREFUSED`, `password authentication failed`, `database "infrawatch" does not exist`, atau `no pg_hba.conf entry for host`.

**Penyebab:** `DATABASE_URL` di `/opt/infrawatch/.env` tidak cocok dengan instance PostgreSQL yang berjalan — host salah, port salah, password salah, atau ketidakcocokan SSL.

**Perbaikan:** Verifikasi PostgreSQL berjalan dan listen pada port yang diharapkan:

```bash
sudo systemctl status postgresql
sudo ss -tlnp | grep 5432
```

Kemudian uji string koneksi yang persis sama dari host InfraWatch:

```bash
psql -h localhost -p 5432 -U infrawatch -d infrawatch
```

Periksa `/opt/infrawatch/.env` untuk:

- `DATABASE_URL` — harus cocok dengan apa yang diterima `psql` di atas.
- `DATABASE_SSL` — atur ke `true` hanya ketika PostgreSQL dikonfigurasi untuk SSL, jika tidak, biarkan tidak diatur atau `false`.

Installer menyiapkan PostgreSQL untuk listen pada `--db-port` yang Anda pilih dalam mode `Full`; jika Anda mengubah port pasca-instalasi, perbarui baik `postgresql.conf` (`listen_addresses`, `port`) maupun `DATABASE_URL`.

---

### Port 3001 sudah digunakan

**Gejala:** Layanan gagal start dengan `EADDRINUSE: address already in use :::3001` di journal.

**Penyebab:** Proses lain (sering kali salinan kedua Next.js, dev server, atau layanan yang tidak terkait) sudah terikat ke port 3001.

**Perbaikan:** Identifikasi pelakunya:

```bash
sudo ss -tlnp | grep 3001
```

Matikan, atau ubah port InfraWatch dengan mengatur `PORT` di `/opt/infrawatch/.env` dan me-restart:

```bash
sudo sed -i 's/^PORT=.*/PORT=3002/' /opt/infrawatch/.env
sudo systemctl restart infrawatch
```

Variabel environment `PORT` didokumentasikan di [Referensi Konfigurasi](../../getting-started/installation/#what-gets-installed).

---

## Connectors

### Test connector gagal

**Gejala:** Tombol **Test** di `/connectors/<id>/edit` menampilkan error — `connection refused`, `401 Unauthorized`, `TLS handshake failed`, atau `timeout`.

**Penyebab:** Salah satu dari: URL salah, kredensial pada connector tidak cocok dengan yang diharapkan NQRust Hypervisor, sertifikat TLS hypervisor tidak dipercaya, atau firewall antara InfraWatch dan hypervisor menjatuhkan request.

**Perbaikan:** Reproduksi request dari host InfraWatch dengan `curl` menggunakan URL dan auth yang sama seperti pada connector. NQRust Hypervisor mengekspos Prometheus bawaan-nya pada endpoint yang dikonfigurasi:

```bash
# NQRust Hypervisor — no auth
curl -fsS 'http://hypervisor.internal:9090/api/v1/query?query=up'

# NQRust Hypervisor — basic auth
curl -fsS -u 'username:password' 'https://hypervisor.internal/api/v1/query?query=up'

# NQRust Hypervisor — bearer token
curl -fsS -H 'Authorization: Bearer <token>' 'https://hypervisor.internal/api/v1/query?query=up'
```

- Jika `curl` gagal dengan `Connection refused` — URL salah atau firewall memblokir.
- Jika `curl` gagal dengan `401 Unauthorized` — mode auth/kredensial pada connector tidak cocok dengan yang diharapkan hypervisor.
- Jika `curl` gagal dengan `SSL certificate problem` — hypervisor menampilkan cert yang tidak dipercaya InfraWatch. Percayai CA penerbit pada host InfraWatch, atau aktifkan opsi "skip TLS verify" pada connector jika hal itu dapat diterima untuk lingkungan tersebut.
- Jika `curl` menggantung — masalah firewall atau jalur jaringan.

---

### Alert tidak terpicu

**Gejala:** Sebuah metric jelas melanggar threshold pada chart, tetapi tidak ada alert yang terpicu.

**Penyebab:** Salah satu dari tiga hal: **connector** yang mendasarinya **tidak sehat** (sehingga evaluator tidak memiliki data), **threshold atau operator alert-rule salah konfigurasi**, atau Anda melihat terlalu cepat — evaluator alert berjalan paling banyak **sekali per 60 detik** terlepas dari seberapa sering UI melakukan polling.

**Perbaikan:** Telusuri rantai tersebut:

1. Buka **Connectors** dan konfirmasikan connector sumber berstatus **Healthy** dan latensinya wajar.
2. Buka alert rule dan verifikasi nama metric, operator, threshold, dan durasi `for`.
3. Tunggu setidaknya 60 detik setelah pelanggaran — evaluator dibatasi sekali per menit.

Lihat [Alerts](../../alerts/) untuk semantik rule dan kadensi evaluasi.

---

### Chart kosong

**Gejala:** Sebuah chart yang dulu memiliki data sekarang kosong atau sesekali kosong, meskipun NQRust Hypervisor memiliki datanya.

**Penyebab:** Client Prometheus InfraWatch membatasi query bersamaan ke **20 secara global**. Di bawah beban berat — banyak connector, banyak viewer dashboard bersamaan — query baru mengantri di belakang yang sedang in-flight. Ketika antrian menumpuk melewati timeout request, UI merender chart kosong.

**Perbaikan:** Kurangi tekanan query pada connector NQRust Hypervisor:

- Kurangi jumlah dashboard yang auto-refresh pada kadensi yang sama, atau perpanjang interval polling SWR untuk view yang berat.
- Jika sebuah node NQRust Hypervisor berada di bawah beban query yang berkelanjutan, periksa apakah hypervisor itu sendiri mengalami keterbatasan resource (CPU, memory) dan scale sesuai kebutuhan.
- Pastikan timeout yang dikonfigurasi pada connector cukup besar untuk jumlah host yang dikelola hypervisor — fleet besar menghasilkan respons query yang lebih besar.

---

## Autentikasi & Middleware

### Error CSRF pada mutation

**Gejala:** Request `POST`, `PATCH`, `PUT`, atau `DELETE` mengembalikan `403 CSRF validation failed` dari `/api/*`.

**Penyebab:** Middleware InfraWatch mengharuskan header request `x-csrf-token` pada setiap method mutation, dan nilai header harus sama dengan nilai cookie `csrf_token`. Token yang hilang atau tidak cocok ditolak dengan 403.

**Perbaikan:** Pada setiap request mutation, sertakan header `x-csrf-token` yang cocok dengan cookie `csrf_token`:

```bash
# Read the cookie from your browser session, then:
curl -X DELETE \
  -H "Cookie: session=<session>; csrf_token=<token>" \
  -H "x-csrf-token: <token>" \
  https://your-infrawatch.example.com/api/connectors/<id>
```

UI di dalam aplikasi menangani ini secara otomatis. Jika Anda menulis sebuah client atau skrip, pastikan ia membaca cookie `csrf_token` dari respons login dan mengembalikannya di header `x-csrf-token` pada setiap request non-GET.

---

### Grace period lisensi kedaluwarsa

**Gejala:** Log aplikasi menampilkan respons `license_required`, panggilan API mulai mengembalikan `403 license_required`, dan UI mengarahkan Anda ke `/setup`.

**Penyebab:** Lisensi telah kedaluwarsa atau tidak dapat diverifikasi terhadap server lisensi, dan `LICENSE_GRACE_PERIOD_DAYS` (default `7`) telah habis.

**Perbaikan:** Aktifkan ulang lisensi di `/setup/license`:

- Jika host InfraWatch memiliki internet keluar, tempelkan license key Anda dan klik **Activate**. Aplikasi berkomunikasi dengan `LICENSE_SERVER_URL` (default `https://billing.nexusquantum.id`) untuk melakukan verifikasi ulang.
- Jika host bersifat airgap, letakkan file `.lic` offline pada form upload di `/setup/license`. Validasi menggunakan public key `LICENSE_PUBLIC_KEY` (RSA+SHA-256, Ed25519, atau Ed448) yang dikonfigurasi di `/opt/infrawatch/.env`.

Setelah diaktifkan, cookie `nqrust_license_status` berubah menjadi `valid` dan middleware berhenti melakukan redirect.

---

### Browser menampilkan "license not activated"

**Gejala:** Setiap halaman diarahkan ke `/setup` dan panggilan API mengembalikan `403 license_required`.

**Penyebab:** Lisensi tidak pernah diaktifkan, atau status lisensi yang tersimpan hilang atau tidak valid.

**Perbaikan:** Periksa status lisensi saat ini dari API:

```bash
curl -fsS -H "Cookie: session=<session>" https://your-infrawatch.example.com/api/license/status
```

Kemudian buka **`/setup`** di browser dan selesaikan alur aktivasi lisensi. Middleware secara khusus mengecualikan `/setup`, `/api/license/`, dan `/api/auth/` sehingga Anda selalu dapat menjangkau halaman-halaman tersebut meskipun tidak ada lisensi aktif.

---

## Installer

### Installer gagal pada airgap

**Gejala:** `infrawatch-installer install --airgap` keluar dengan error tentang file bundle yang hilang, `.deb` yang tidak dapat ditemukan, atau binary Bun tidak dapat dieksekusi.

**Penyebab:** `--bundle-path` mengarah ke lokasi yang salah — baik ke arsip `.run` itu sendiri (bukan direktori yang sudah diekstrak), atau ke direktori yang tidak berisi bundle lengkap.

**Perbaikan:** Ekstrak ulang bundle dengan bersih dan arahkan `--bundle-path` ke direktori yang sudah diekstrak:

```bash
# Extract without running
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle

# Verify the expected files are present
ls /opt/infrawatch-bundle

# Run the installer manually
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap --bundle-path /opt/infrawatch-bundle
```

Direktori yang sudah diekstrak harus berisi binary `infrawatch-installer`, runtime Bun, file `.deb` PostgreSQL, dan aplikasi InfraWatch pre-built. Lihat [Sumber Instalasi](../../installer/sources/).

---

## Masih Terjebak?

Ambil log layanan lengkap dan status systemd sebelum menghubungi kami:

```bash
sudo systemctl status infrawatch --no-pager
sudo journalctl -u infrawatch -n 500 --no-pager > /tmp/infrawatch.log
```

Kemudian lihat [Log](../logs/) untuk tempat output diagnostik selebihnya berada.
