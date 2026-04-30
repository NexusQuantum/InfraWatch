+++
title = "API Reference"
description = "Endpoint REST yang diekspos di bawah /api/* — auth, connector, alert, data live, Prometheus, lisensi, dan pengaturan."
weight = 80
date = 2026-04-23

[extra]
toc = true
+++

Setiap route di bawah `app/api/` didokumentasikan pada bagian ini. UI mengonsumsi endpoint yang sama persis, sehingga apa pun yang dapat dilakukan dashboard juga dapat di-scriptkan dari `curl`, CI, atau tool downstream.

---

## Model autentikasi

InfraWatch menggunakan **cookie session server-side** ditambah **token CSRF** untuk mutasi.

1. `POST /api/auth/login` dengan kredensial JSON mengembalikan dua cookie:
   - `session` — HttpOnly, expiry 30 hari, token opaque yang diperiksa terhadap tabel `sessions`.
   - `csrf_token` — dapat dibaca oleh klien, di-echo pada setiap mutasi.
2. Setiap route yang terproteksi mengharapkan cookie `session`. Route yang melakukan mutasi selain itu juga mengharapkan `X-CSRF-Token: <nilai cookie csrf>`.
3. Alur SSO (`/api/auth/sso/saml/*`, `/api/auth/sso/oidc/*`) menerbitkan cookie yang sama pada akhir round-trip IdP.

{{% alert icon="🔐" context="warning" %}}
Route handler yang memanggil `requireSession(request)` menolak permintaan yang tidak ter-autentikasi dengan `401`, dan mutasi tanpa header CSRF yang cocok dengan `403`. Endpoint helper read-only (data live, count alert) bersifat publik secara default; lihat setiap halaman untuk detail spesifik.
{{% /alert %}}

### Menggunakan API dari `curl`

```bash
# 1. Log in and save cookies
curl -c cookies.txt -X POST https://infrawatch.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<your-password>"}'

# 2. Read the CSRF token
CSRF=$(awk '$6=="csrf_token"{print $7}' cookies.txt)

# 3. Call a mutation
curl -b cookies.txt -X POST https://infrawatch.example.com/api/connectors \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"name":"nqrust-prod","connectorType":"nqrust_hypervisor","baseUrl":"http://prom:9090","authType":"none"}'
```

---

## Base URL

InfraWatch adalah aplikasi single-origin. Base URL API adalah host dan scheme yang sama dengan dashboard, pada path `/api`:

```
https://<your-infrawatch-host>/api
```

Semua endpoint di bawah ini relatif terhadap base tersebut.

---

## Bentuk respons

Respons JSON yang berhasil mengikuti salah satu dari tiga bentuk tergantung pada keluarga endpoint:

| Bentuk | Contoh | Digunakan oleh |
|---|---|---|
| `{ "data": <value> }` | `{ "data": [ { "id": "…" } ] }` | Endpoint connector, alert, alert-rule. |
| Payload domain | `{ "data": [...], "meta": {...} }` | Endpoint live (`/api/live/*`) dan proxy Prometheus. |
| Hasil aksi | `{ "ok": true }` / `{ "success": true }` | Mutasi auth, lisensi, pengaturan. |

Error selalu mengembalikan status HTTP non-2xx dengan:

```json
{ "error": "Human-readable message" }
```

---

## Grup endpoint

| Grup | Prefix path | Tujuan |
|---|---|---|
| [Auth](auth/) | `/api/auth` | Login, logout, pemeriksaan session, alur SSO. |
| [Connectors](connectors/) | `/api/connectors` | CRUD dan test konektivitas untuk sumber metric. |
| [Alerts](alerts/) | `/api/alerts`, `/api/alert-rules` | Aliran alert, rule, acknowledge/resolve. |
| [Live data](live/) | `/api/live/*` | Data dashboard yang di-poll oleh SWR (overview, hosts, clusters, VMs, apps, connectors, dashboards). |
| [Prometheus](prometheus/) | `/api/prometheus` | Proxy PromQL `query` dan `query_range` per-connector. |
| [License](license/) | `/api/license` | Status lisensi, aktivasi, deaktivasi, upload file offline. |
| [Settings](settings/) | `/api/settings` | Konfigurasi provider SSO. |

---

## Langkah selanjutnya

- Baru mengenal API? Mulai dengan [Auth](auth/) untuk mendapatkan session yang berfungsi, lalu panggil [Live data](live/) untuk melihat data armada sungguhan.
- Sedang membangun otomasi? Lihat [Connectors](connectors/) untuk provisioning dan [Alerts](alerts/) untuk manajemen rule.
- Menjalankan PromQL ad-hoc? Lompat langsung ke [Prometheus](prometheus/).
