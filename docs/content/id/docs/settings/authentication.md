+++
title = "Autentikasi"
description = "Login single-admin: scrypt password hashing, session 30 hari, rate limiting, dan proteksi CSRF"
weight = 61
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch menggunakan **satu administrator lokal** untuk semua operasi yang terautentikasi. Tidak ada sistem multi-pengguna dan tidak ada hierarki role — setiap request yang terautentikasi diperlakukan sebagai admin. Jika Anda memerlukan identitas federasi, padukan admin lokal ini dengan [SAML atau OIDC SSO](../sso/); admin lokal selalu tetap ada sebagai akun break-glass.

Implementasi ada di tiga file: `lib/server/auth.ts` (password hashing, sessions, rate limiting, pembuatan CSRF token), `app/api/auth/login/route.ts` (handler login), dan `middleware.ts` (gate session dan CSRF level request).

---

## Pengguna Admin

Pada boot pertama, `ensureAdminUser()` di `lib/server/auth.ts` memeriksa baris di tabel `admin_user`. Jika tabel kosong, ia membuat satu dari dua variabel environment:

| Variabel | Default | Tujuan |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Username login |
| `ADMIN_PASSWORD` | `admin` (dengan peringatan di konsol) | Password plaintext, segera di-hash dengan scrypt |

Password di-hash dengan `scryptSync(password, salt, 64)` bawaan Node, salt hex acak 16-byte, dan disimpan sebagai `salt:hash` di kolom `password_hash`. Verifikasi menggunakan `timingSafeEqual` terhadap derivasi scrypt yang fresh — lihat `hashPassword()` dan `verifyPassword()` di `lib/server/auth.ts`.

{{% alert icon="⚠️" context="warning" %}}
Jika Anda tidak men-set `ADMIN_PASSWORD` pada waktu install, server memulai dengan username `admin` dan password `admin` dan mencetak peringatan ke stdout. **Segera ubah ini** — lihat [Password & Encryption Key](../password/).
{{% /alert %}}

Installer (`infrawatch-installer`) meminta kedua nilai selama fase Configuration dan menuliskannya ke `/opt/infrawatch/.env`. Lihat [Instalasi](../../getting-started/installation/) untuk alur waktu install.

---

## Logging In

> 📸 **Screenshot needed:** `/images/settings/auth/login-page.png`
> **Page to capture:** `/login`
> **What to show:** Form login dengan field username dan password, tombol "Sign in", dan (jika SSO diaktifkan) tombol provider di-render di bawahnya.

Halaman login melakukan POST ke `POST /api/auth/login` dengan body JSON:

```json
{ "username": "admin", "password": "..." }
```

Handler menjalankan langkah-langkah ini secara berurutan:

1. **Pemeriksaan rate-limit** — `checkRateLimit(ip)` menghitung baris di `login_attempts` untuk IP ini dalam 15 menit terakhir. Lebih dari 5 → HTTP 429.
2. **Catat percobaan** — baris `login_attempts` baru ditulis untuk setiap request (valid atau tidak).
3. **Validasi kredensial** — `validateCredentials()` mencari username dan membandingkan hash scrypt.
4. **Jika sukses** — `createSession()` menyisipkan baris di `sessions` (TTL 30 hari), `generateCsrfToken()` mencetak token hex 32-byte, dan keduanya dikembalikan sebagai cookies.
5. **Jika gagal** — baris `auth.login_failed` ditulis ke `audit_log` dan response adalah HTTP 401.

Cookie session di-set sebagai:

| Cookie | `httpOnly` | `secure` | `sameSite` | Kedaluwarsa |
|---|---|---|---|---|
| `session` | ✅ ya | hanya ketika `APP_URL` dimulai dengan `https://` | `lax` | 30 hari |
| `csrf_token` | ❌ tidak (dapat dibaca oleh JS) | aturan sama dengan di atas | `lax` | 30 hari |

Flag `secure` di-resolve oleh `isSecureCookie()` di `lib/server/cookie-options.ts`: deployment HTTPS mendapat `secure: true`; HTTP (umum untuk instalasi air-gapped) mendapat `secure: false`.

---

## Sessions

State session ada di tabel `sessions`:

```sql
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  sso_provider TEXT,  -- populated only for SSO logins
  sso_email TEXT,
  sso_name TEXT
);
```

- Token adalah string hex acak 32-byte (`randomBytes(32).toString("hex")`).
- `expires_at` di-set ke **30 hari** dari pembuatan.
- Setiap request yang terautentikasi memanggil `validateSession(token)`, yang menghapus baris jika `expires_at` sudah terlewati.
- Session yang kedaluwarsa juga dapat disapu massal via `cleanExpiredSessions()` — lihat source untuk hook-up jika Anda menjadwalkannya.
- `GET /api/auth/me` mengembalikan `{ authenticated: true }` untuk session yang valid; jika session membawa kolom identitas SSO, `ssoProvider`, `email`, dan `name` disertakan.

> 📸 **Screenshot needed:** `/images/settings/auth/session-expiry.png`
> **Page to capture:** halaman terproteksi apapun (mis. `/fleet`) setelah cookie session kedaluwarsa
> **What to show:** Redirect otomatis ke `/login` yang dipicu oleh `middleware.ts`, dengan URL asli yang dipertahankan di address bar browser.

Logging out memanggil `POST /api/auth/logout`, yang menghapus baris dari `sessions` dan membersihkan kedua cookie dengan `maxAge: 0`.

---

## Rate Limiting

Rate limiting login berbasis IP dan didukung oleh tabel `login_attempts`:

```sql
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at);
```

Threshold-nya adalah **5 percobaan per 15 menit, per alamat IP**. Pemeriksaan adalah `SELECT COUNT(*)` tunggal pada pasangan `(ip_address, attempted_at)` yang ter-index. Tidak ada purge otomatis; baris lama menumpuk sampai Anda memangkasnya manual (`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days'` adalah cron yang masuk akal).

IP klien di-resolve oleh `getClientIp(request)` di `lib/server/require-session.ts` (menghormati header `x-forwarded-for` dan `x-real-ip`). Di belakang reverse proxy, pastikan proxy Anda men-set ini dengan benar atau setiap request akan berbagi IP proxy dan rate limit menjadi global.

> 📸 **Screenshot needed:** `/images/settings/auth/rate-limit-error.png`
> **Page to capture:** `/login` setelah 5 percobaan gagal dari IP yang sama dalam 15 menit
> **What to show:** Toast / error inline yang bertuliskan "Too many login attempts. Try again later." yang dikembalikan dengan HTTP 429.

{{% alert icon="⚠️" context="warning" %}}
Rate limit adalah **per IP, bukan per username**. Gateway NAT bersama dengan beberapa admin akan berbagi counter yang sama. Jika Anda beroperasi di belakang proxy besar, pertimbangkan untuk mempersempit scope dengan baris per-username atau menaikkan batas atas — logikanya adalah satu query di `checkRateLimit()` di `lib/server/auth.ts`.
{{% /alert %}}

---

## Proteksi CSRF

Semua request mutasi (`POST`, `PATCH`, `PUT`, `DELETE`) melalui pemeriksaan **double-submit cookie** di `middleware.ts`:

```ts
if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
  const csrfHeader = request.headers.get("x-csrf-token");
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }
}
```

Klien harus membaca `csrf_token` (non-`httpOnly`) dan mengirim nilai yang sama di header `X-CSRF-Token`. Ketidakcocokan apapun mengembalikan HTTP 403. Ini ditegakkan untuk setiap route terautentikasi — handler API tidak perlu memeriksa lagi.

Route `GET /api/auth/login`, `GET /api/auth/sso/*/login`, dan callback SSO tercantum di set `PUBLIC_PATHS` di bagian atas `middleware.ts` dan melewati gate session maupun CSRF.

---

## Alur Request

Middleware di `middleware.ts` berjalan untuk setiap request kecuali aset statis. Untuk request dashboard biasa:

```
Browser request ──▶ middleware.ts
                    ├─ PUBLIC_PATHS / PUBLIC_PREFIXES? → pass through
                    ├─ session cookie missing? → redirect to /login (or 401 for /api/*)
                    ├─ mutating method without matching CSRF? → 403
                    ├─ license cookie not "valid"? → redirect to /setup (except /api/license/*, /api/auth/*, /setup)
                    └─ all checks passed → route handler
```

Gate lisensi didokumentasikan di [Aktivasi Lisensi](../../getting-started/license/); itu ditegakkan oleh middleware yang sama.

---

## Terkait

- [Aktivasi Lisensi](../../getting-started/license/) — cookie lisensi diperiksa di middleware yang sama
- [API Reference — Auth](../../api-reference/#auth) — referensi endpoint dan payload lengkap
- [Arsitektur](../../architecture/) — bagaimana middleware Next.js dan handler route bersatu
