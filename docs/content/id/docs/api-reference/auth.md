+++
title = "Auth"
description = "Endpoint login, logout, dan inspeksi session di bawah /api/auth."
weight = 81
date = 2026-04-23

[extra]
toc = true
+++

Endpoint autentikasi. Login admin lokal menggunakan `POST /api/auth/login`; entrypoint SSO berada di bawah `/api/auth/sso/*` dan dibahas di bagian akhir halaman ini.

---

## `POST /api/auth/login`

Memvalidasi kredensial admin dan menerbitkan session.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth diperlukan | Tidak (publik) |
| CSRF diperlukan | Tidak |
| Rate-limited | Ya — 5 percobaan gagal per IP per 15 menit |

### Request body

```json
{
  "username": "admin",
  "password": "<your-password>"
}
```

### Respons — 200 OK

```json
{ "ok": true }
```

Men-set dua cookie:

- `session` — HttpOnly, SameSite=Lax, expiry 30 hari. Token session opaque.
- `csrf_token` — dapat dibaca oleh JS, SameSite=Lax, expiry 30 hari. Harus di-echo sebagai `X-CSRF-Token` pada setiap permintaan yang melakukan mutasi.

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "Username and password are required" }` | Ada field yang hilang di body. |
| 401 | `{ "error": "Invalid username or password" }` | Kredensial tidak cocok. |
| 429 | `{ "error": "Too many login attempts. Try again later." }` | Rate limit terpicu. |
| 500 | `{ "error": "Internal server error" }` | Kegagalan tak terduga — periksa log. |

### Contoh

```bash
curl -c cookies.txt -X POST https://infrawatch.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"change-me"}'
```

---

## `POST /api/auth/logout`

Menghancurkan session saat ini dan menghapus kedua cookie.

| Atribut | Nilai |
|---|---|
| Method | `POST` |
| Auth diperlukan | Implisit — beroperasi pada cookie `session` jika ada |
| CSRF diperlukan | Tidak (handler menghapus cookie tanpa syarat) |

### Request body

Tidak ada.

### Respons — 200 OK

```json
{ "ok": true }
```

Menimpa cookie `session` dan `csrf_token` dengan `maxAge=0`. Jika tidak ada cookie session yang dikirim, endpoint tetap mengembalikan `200` — logout bersifat idempoten.

### Contoh

```bash
curl -b cookies.txt -X POST https://infrawatch.example.com/api/auth/logout
```

---

## `GET /api/auth/me`

Memeriksa apakah cookie saat ini merepresentasikan session yang valid.

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth diperlukan | Ya (mengembalikan 401 jika tidak) |
| CSRF diperlukan | Tidak (read-only) |

### Request

Tanpa body. Membaca cookie `session`.

### Respons — 200 OK (login lokal)

```json
{ "authenticated": true }
```

### Respons — 200 OK (login SSO)

Field identitas tambahan disertakan ketika session dibuat melalui SSO:

```json
{
  "authenticated": true,
  "ssoProvider": "oidc",
  "email": "jane@example.com",
  "name": "Jane Doe"
}
```

### Error

| Status | Body | Arti |
|---|---|---|
| 401 | `{ "authenticated": false }` | Tidak ada cookie, session tidak dikenal, atau session expired. |

### Contoh

```bash
curl -b cookies.txt https://infrawatch.example.com/api/auth/me
```

---

## Endpoint SSO

Route-route ini tidak dipanggil langsung oleh script — keduanya merupakan target redirect untuk browser selama round-trip IdP. Route ini dicantumkan di sini untuk kelengkapan. Lihat [Security model → SAML / OAuth SSO](../../architecture/security-model/#saml--oauth-sso) untuk alur tingkat-tinggi dan [Settings & Admin → Authentication](../../settings/authentication/) untuk konfigurasi.

| Route | Method | Tujuan |
|---|---|---|
| `/api/auth/sso/providers` | `GET` | Mengembalikan provider SSO yang aktif sehingga halaman login dapat merender tombol. Publik. |
| `/api/auth/sso/saml/login` | `GET` | Mengalihkan browser ke IdP SAML dengan `AuthnRequest` yang ditandatangani. |
| `/api/auth/sso/saml/callback` | `POST` | Menerima assertion SAML dari IdP, memvalidasi tanda tangan, dan menerbitkan cookie session. |
| `/api/auth/sso/saml/metadata` | `GET` | Mengembalikan XML metadata SP yang di-paste oleh admin IdP ke konfigurasi trust mereka. |
| `/api/auth/sso/oidc/login` | `GET` | Mengalihkan browser ke endpoint authorize OIDC. |
| `/api/auth/sso/oidc/callback` | `GET` | Menukar authorization code dengan ID token dan menerbitkan cookie session. |

### `GET /api/auth/sso/providers`

Mendaftar provider yang aktif untuk halaman login publik.

#### Respons — 200 OK

```json
{
  "providers": [
    { "id": "oidc", "displayName": "Corporate SSO" }
  ]
}
```

Mengembalikan `{ "providers": [] }` pada setiap error internal — halaman login akan fallback ke login lokal dalam kasus itu.

---

## Langkah selanjutnya

- [Connectors](../connectors/) — hal pertama yang harus dibuat setelah login.
- [Settings & Admin → Authentication](../../settings/authentication/) — mengaktifkan dan mengonfigurasi provider SSO.
- [Security model](../../architecture/security-model/) — bagaimana session, CSRF, dan rate limiting bekerja di balik layar.
