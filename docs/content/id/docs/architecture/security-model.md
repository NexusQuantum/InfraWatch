+++
title = "Security Model"
description = "Bagaimana InfraWatch melindungi kredensial, session, CSRF, rate limit, dan lalu lintas jaringan."
weight = 72
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch adalah aplikasi administrator tunggal yang berada di depan node-node NQRust Hypervisor — endpoint Prometheus bawaannya dapat diakses melalui jaringan privat. Threat model mengasumsikan:

- Operator terpercaya di sisi server.
- Jaringan publik yang tidak terpercaya antara browser dan aplikasi.
- Basis data semi-terpercaya (dienkripsi saat disimpan, namun dapat diakses oleh DBA).
- Endpoint Prometheus bawaan NQRust Hypervisor yang tidak menyimpan secret tetapi seharusnya tidak dapat di-query dari internet publik.

Halaman ini mendokumentasikan setiap pertahanan yang diimplementasikan aplikasi saat ini.

---

## Enkripsi kredensial connector

Material autentikasi connector (password basic atau bearer token) dienkripsi dengan **AES-256-GCM** sebelum ditulis ke kolom `connectors.auth_credentials`. Kunci simetris disuplai pada saat boot melalui environment variable `CONNECTOR_ENCRYPTION_KEY`.

| Properti | Nilai |
|---|---|
| Cipher | AES-256-GCM (authenticated encryption) |
| Sumber kunci | Env var `CONNECTOR_ENCRYPTION_KEY`, 32+ karakter acak |
| Nonce | 96 bit acak per nilai; disimpan bersama ciphertext |
| Auth tag | 128 bit; diverifikasi pada setiap dekripsi |
| Cakupan dekripsi | Process-local, transient — plaintext tidak pernah meninggalkan call stack klien Prometheus |

{{% alert icon="🔑" context="danger" %}}
Jika `CONNECTOR_ENCRYPTION_KEY` hilang, setiap kredensial yang tersimpan tidak dapat dipulihkan. Cadangkan nilai ini ke secrets store yang sama yang digunakan untuk `DATABASE_URL`. Untuk merotasi kunci, tambahkan kredensial baru di bawah kunci baru lalu hapus baris lama — saat ini tidak ada endpoint re-enkripsi in-place.
{{% /alert %}}

Setel kunci yang kuat di production:

```bash
export CONNECTOR_ENCRYPTION_KEY="$(openssl rand -base64 48 | tr -d '=+/' | head -c 64)"
```

---

## Cookie session

Pada login yang berhasil (lokal atau SSO) aplikasi menerbitkan dua cookie:

| Cookie | HttpOnly | SameSite | Secure | Tujuan |
|---|---|---|---|---|
| `session` | ya | `lax` | ya (di production) | Token session opaque, diperiksa terhadap tabel `sessions` pada setiap permintaan. |
| `csrf_token` | tidak | `lax` | ya (di production) | Dapat dibaca oleh SPA klien sehingga nilainya dapat di-echo di `X-CSRF-Token` saat mutasi. |

- Cookie menggunakan flag secure secara otomatis ketika permintaan dilayani melalui HTTPS (`isSecureCookie()` di `lib/server/cookie-options.ts`).
- Masa berlaku session adalah **30 hari**; `expires` cookie sesuai dengan kolom `sessions.expires_at`.
- Logout (`POST /api/auth/logout`) menghapus baris session dan menimpa kedua cookie dengan `maxAge=0`.

---

## Proteksi CSRF

Setiap route handler yang melakukan mutasi dan membutuhkan session juga membutuhkan token CSRF. Polanya adalah:

1. Login men-set `csrf_token` sebagai cookie non-HttpOnly sehingga browser dapat membacanya.
2. SPA menyalin nilai cookie ke dalam header permintaan `X-CSRF-Token` pada setiap POST/PATCH/PUT/DELETE.
3. `requireSession(request)` di `lib/server/require-session.ts` membandingkan header dengan cookie dan menolak ketidakcocokan dengan `403`.

{{% alert icon="⚡" context="info" %}}
Saat memanggil API dari `curl`, salin nilai cookie `csrf_token` dari session browser ke dalam header `X-CSRF-Token` bersama dengan header `Cookie: session=…`. Lihat [API reference](../../api-reference/) untuk contoh konkret.
{{% /alert %}}

---

## Rate limiting login

`POST /api/auth/login` menegakkan **5 percobaan gagal per 15 menit per IP klien** menggunakan tabel `login_attempts`. Pada percobaan ke-6, endpoint mengembalikan `429 Too Many Requests` tanpa memeriksa password. Login yang berhasil tidak mereset jendela waktu — jendela bersifat murni berbasis waktu.

Resolusi IP klien bersifat deterministik (`getClientIp`): `X-Forwarded-For` → `X-Real-IP` → alamat socket. Konfigurasikan reverse proxy untuk men-set header ini atau rate limit akan runtuh ke IP proxy.

---

## Password admin lokal

Kredensial admin lokal disimpan sebagai hash **scrypt** di `admin_user.password_hash`. Pada boot pertama, jika tabel kosong, aplikasi menyemainya dari env var `ADMIN_USERNAME` / `ADMIN_PASSWORD` (default `admin` / `admin`). Ubah password segera setelah login pertama — default terdokumentasi dan tidak dapat diperlakukan sebagai secret.

---

## SAML / OAuth SSO

Aplikasi mendukung federasi identitas di samping (atau sebagai pengganti) admin lokal. Kedua provider dikonfigurasikan melalui `PUT /api/settings/sso` dan disimpan di tabel `sso_configs` dengan secret yang diredaksi pada respons GET.

### SAML 2.0

| Field | Deskripsi |
|---|---|
| `samlIdpSsoUrl` | Endpoint redirect SingleSignOn milik IdP. |
| `samlIdpIssuer` | `Issuer` yang diharapkan pada assertion. |
| `samlIdpCert` | Sertifikat signing IdP ber-encoding PEM (write-only dari UI; GET mengembalikan `••••••••`). |
| `samlSpEntityId` | Entity ID yang diiklankan InfraWatch di `/api/auth/sso/saml/metadata`. |

Alur: `GET /api/auth/sso/saml/login` → IdP → `POST /api/auth/sso/saml/callback` → cookie session diterbitkan.

### OpenID Connect

| Field | Deskripsi |
|---|---|
| `oidcIssuerUrl` | URL issuer; discovery document diambil dari `${issuer}/.well-known/openid-configuration`. |
| `oidcClientId` | Client ID yang terdaftar di IdP. |
| `oidcClientSecret` | Client secret yang terdaftar (write-only; GET mengembalikan `••••••••`). |
| `oidcScopes` | Scope yang dipisahkan spasi; default `openid profile email`. |

Alur: `GET /api/auth/sso/oidc/login` → IdP → `GET /api/auth/sso/oidc/callback` → cookie session diterbitkan.

{{% alert icon="🔐" context="warning" %}}
Secret (`samlIdpCert`, `oidcClientSecret`) bersifat write-only melalui API. Membaca `GET /api/settings/sso` mengembalikan placeholder `••••••••`. Mengirim placeholder kembali pada PUT adalah no-op — hanya nilai baru yang menggantikan secret yang tersimpan.
{{% /alert %}}

---

## Terminasi TLS

Bun/Node melayani InfraWatch pada HTTP biasa (port default 3001). **Selalu jalankan reverse proxy yang menerminasi TLS di production.**

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name infrawatch.example.com;

    ssl_certificate     /etc/letsencrypt/live/infrawatch.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/infrawatch.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```caddy
infrawatch.example.com {
    reverse_proxy 127.0.0.1:3001 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

Kedua contoh meneruskan header IP yang dibutuhkan rate limiter.

---

## Database SSL

Untuk PostgreSQL mana pun yang bukan localhost, setel `DATABASE_SSL=true` dan arahkan `DATABASE_URL` ke port yang TLS-enabled. Aplikasi meneruskan `ssl: { rejectUnauthorized: true }` ke `pg` ketika flag ini aktif.

---

## Log audit

Setiap route handler yang melakukan mutasi mencatat entri di `audit_log` melalui `logAudit(action, { targetId, targetName, detail, ip })`. Aksi meliputi:

- `auth.login`, `auth.login_failed`, `auth.logout`
- `connector.create`, `connector.update`, `connector.delete`
- `sso.config_updated`

Rotasi atau kirim tabel ini ke SIEM sesuai postur kepatuhan yang berlaku.

---

## Langkah selanjutnya

- [Settings & Admin → Authentication](../../settings/authentication/) — konfigurasi SSO yang menghadap operator.
- [Data model](data-model/) — definisi tabel di balik pertahanan ini.
- [API reference → Auth](../../api-reference/auth/) — endpoint login/logout/me.
