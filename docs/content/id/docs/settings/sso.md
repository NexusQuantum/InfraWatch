+++
title = "Single Sign-On (SSO)"
description = "Aktifkan SSO SAML 2.0 atau OpenID Connect dengan metadata IdP, callback URL, pemetaan atribut, dan fallback admin lokal"
weight = 62
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch mendukung dua protokol SSO berdampingan dengan akun admin lokal:

- **SAML 2.0** — didukung oleh [`@node-saml/node-saml`](https://www.npmjs.com/package/@node-saml/node-saml) `^5.1.0` (dari `package.json`).
- **OpenID Connect (OIDC)** — didukung oleh [`openid-client`](https://www.npmjs.com/package/openid-client) `^6.8.2` dengan PKCE.

Kedua provider bersifat opsional, dapat diaktifkan secara independen, dan koeksis dengan login admin lokal sehingga Anda selalu memiliki rute break-glass.

Implementasi ada di `lib/server/sso-saml.ts`, `lib/server/sso-oidc.ts`, dan `lib/server/sso-store.ts`; handler berada di bawah `app/api/auth/sso/` dan UI konfigurasi admin adalah `components/settings/sso-settings.tsx` yang dilayani dari `/settings`.

---

## Mengaktifkan SSO

> 📸 **Screenshot needed:** `/images/settings/sso/sso-overview.png`
> **Page to capture:** `/settings` → bagian SSO
> **What to show:** Dua kartu provider (SAML dan OIDC) dengan toggle enable masing-masing, field display-name, dan tombol "Save" per provider.

Konfigurasi disimpan di tabel `sso_config` (lihat `lib/server/sso-store.ts`):

```sql
CREATE TABLE sso_config (
  id TEXT PRIMARY KEY,                 -- 'saml' or 'oidc'
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT NOT NULL DEFAULT '',
  saml_idp_sso_url TEXT,
  saml_idp_issuer TEXT,
  saml_idp_cert_enc TEXT,              -- AES-256-GCM, key from CONNECTOR_ENCRYPTION_KEY
  saml_sp_entity_id TEXT,
  oidc_issuer_url TEXT,
  oidc_client_id TEXT,
  oidc_client_secret_enc TEXT,         -- encrypted
  oidc_scopes TEXT DEFAULT 'openid email profile',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Baik `saml_idp_cert_enc` maupun `oidc_client_secret_enc` dienkripsi dengan `CONNECTOR_ENCRYPTION_KEY`. Endpoint `GET /api/settings/sso` tidak pernah mengembalikan secret ini — UI menampilkan `••••••••` dan hanya menimpanya jika Anda mengetik nilai baru.

API admin adalah:

| Metode | Path | Tujuan |
|---|---|---|
| `GET` | `/api/settings/sso` | Daftar kedua konfig (secret diredaksi) |
| `PUT` | `/api/settings/sso` | Upsert satu provider. Menulis `sso.config_updated` ke `audit_log`. |

{{% alert icon="⚠️" context="warning" %}}
`CONNECTOR_ENCRYPTION_KEY` harus di-set dan minimal 16 karakter di production (lihat `lib/server/encryption.ts`). Jika key ini dirotasi, setiap cert IdP SAML dan client secret OIDC yang tersimpan harus dimasukkan ulang. Lihat [Password & Encryption Key](../password/).
{{% /alert %}}

---

## SAML 2.0

### Field Konfigurasi

Provider SAML membaca field-field berikut dari `sso_config` (lihat `buildSamlClient()` di `lib/server/sso-saml.ts`):

| Field | UI label | Apa itu |
|---|---|---|
| `samlIdpSsoUrl` | IdP SSO URL | Endpoint SingleSignOnService IdP (`entryPoint`) |
| `samlIdpIssuer` | IdP issuer | `entityID` dari IdP Anda |
| `samlIdpCert` | IdP signing cert | PEM public cert yang dipakai untuk memverifikasi assertion (disimpan terenkripsi) |
| `samlSpEntityId` | SP entity ID | Opsional; default ke `<APP_URL>/saml/metadata` |

Klien dibangun dengan `wantAssertionsSigned: true`, `wantAuthnResponseSigned: false`, `acceptedClockSkewMs: 5 * 60 * 1000` (lima menit — dituning untuk lingkungan air-gapped dengan jam yang drift), dan `identifierFormat` `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`. Lihat source.

> 📸 **Screenshot needed:** `/images/settings/sso/sso-saml-form.png`
> **Page to capture:** `/settings` → SSO → kartu SAML
> **What to show:** Form dengan IdP SSO URL, IdP issuer, area paste PEM untuk signing cert, field SP entity ID, dan tautan "Download SP metadata".

### Metadata Service Provider (SP)

Arahkan IdP Anda ke XML metadata SP InfraWatch — ini dibuat on-demand di:

```
GET /api/auth/sso/saml/metadata
```

Ini dihasilkan oleh `generateServiceProviderMetadata()` dari `@node-saml/node-saml` menggunakan konfig Anda saat ini (atau default jika belum dikonfigurasi). Endpoint tercantum di `PUBLIC_PATHS` di `middleware.ts`, jadi tidak diperlukan autentikasi untuk mengambilnya — IdP akan mengonfigurasikan dirinya sendiri dari URL ini.

### Callback URL

Assertion SAML di-POST kembali ke:

```
POST /api/auth/sso/saml/callback
```

Daftarkan URL ini (endpoint ACS) ke IdP Anda. URL aplikasi diturunkan dari variabel environment `APP_URL`; jika tidak di-set, handler fallback ke `x-forwarded-proto` + `host`. Set `APP_URL=https://infrawatch.example.com` di `/opt/infrawatch/.env` untuk menghindari ambiguitas di belakang reverse proxy.

### Assertion → Session

`validateSamlResponse()` di `lib/server/sso-saml.ts` mengambil identitas pengguna dari assertion dengan fallback berikut:

| Field identitas | Dicoba, secara berurutan |
|---|---|
| **Email** | `profile.email` → `profile.mail` → `profile["urn:oid:0.9.2342.19200300.100.1.3"]` → `profile.nameID` |
| **Name** | `profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]` → `profile.displayName` → `profile.cn` → *(dihilangkan)* |

Email dan name opsional ditulis ke baris `sessions` (`sso_provider`, `sso_email`, `sso_name`). Login sukses menulis `auth.sso_login` ke audit log; kegagalan menulis `auth.sso_login_failed` dengan pesan error.

> 📸 **Screenshot needed:** `/images/settings/sso/sso-saml-callback.png`
> **Page to capture:** redirect yang tiba di `/api/auth/sso/saml/callback` dari IdP
> **What to show:** Address bar browser menampilkan POST redirect dan pendaratan berikutnya di `/` dengan pengguna admin ter-sign-in.

### Metadata IdP

InfraWatch saat ini tidak mem-parse XML metadata sisi IdP; Anda paste field individual (SSO URL, issuer, cert) ke form admin secara manual. Jika IdP Anda mengekspos metadata di sebuah URL, salin cert dan SSO URL dari dokumen tersebut.

---

## OpenID Connect (OIDC)

### Field Konfigurasi

OIDC menggunakan discovery — arahkan aplikasi ke URL issuer IdP dan `openid-client` akan memuat sisanya:

| Field | UI label | Apa itu |
|---|---|---|
| `oidcIssuerUrl` | Issuer URL | mis. `https://accounts.google.com` atau `https://your-okta.okta.com/oauth2/default` |
| `oidcClientId` | Client ID | Client ID OAuth2 dari IdP Anda |
| `oidcClientSecret` | Client secret | Client secret OAuth2 (disimpan terenkripsi) |
| `oidcScopes` | Scopes | Default ke `openid email profile` |

> 📸 **Screenshot needed:** `/images/settings/sso/sso-oidc-form.png`
> **Page to capture:** `/settings` → SSO → kartu OIDC
> **What to show:** Form dengan Issuer URL, Client ID, Client Secret, scopes, dan Callback URL ditampilkan sebagai baris read-only yang dapat disalin.

### Callback URL

Daftarkan URL persis ini ke IdP Anda:

```
<APP_URL>/api/auth/sso/oidc/callback
```

Handler `GET /api/auth/sso/oidc/login` menghasilkan `state` baru (32 byte), `nonce` (32 byte), dan PKCE `code_verifier` via `randomPKCECodeVerifier()` dari `openid-client`. Ketiganya di-persist di tabel `sso_state` dengan kunci `state` dan dikonsumsi pada callback (sekali pakai, TTL 10-menit — lihat `consumeSsoState()` di `lib/server/sso-store.ts`).

### Alur

1. Pengguna mengklik tombol OIDC di `/login`.
2. Browser → `GET /api/auth/sso/oidc/login` → redirect ke URL authorize IdP (dengan `code_challenge` PKCE).
3. IdP → `GET /api/auth/sso/oidc/callback?state=...&code=...` → InfraWatch.
4. Handler memanggil `consumeSsoState(state)`, menolak jika hilang atau > 10 menit, dan meneruskan `nonce` + `codeVerifier` ke `handleOidcCallback()` di `lib/server/sso-oidc.ts`.
5. Jika sukses, baris session dibuat dengan `sso_provider = 'oidc'` dan pengguna mendarat di `/`.
6. `auth.sso_login` ditulis ke audit log.

Parameter query `error` apapun dari IdP dicatat sebagai `auth.sso_login_failed` dengan `error_description` dari IdP.

---

## Pemetaan Atribut

| Claim / assertion | Dipetakan ke | Catatan |
|---|---|---|
| SAML `profile.email` dll. | `sessions.sso_email` | Lihat rantai fallback di atas |
| SAML `profile["…/claims/name"]` dll. | `sessions.sso_name` | Opsional |
| OIDC claim `email` | `sessions.sso_email` | Ditangani di dalam `handleOidcCallback()` — lihat `lib/server/sso-oidc.ts` |
| OIDC claim `name` | `sessions.sso_name` | Opsional |

Tidak ada pemetaan group-ke-role saat ini — setiap pengguna yang terautentikasi via SSO menerima privilese single-admin yang sama dengan admin lokal. Jika Anda memerlukan kontrol akses yang lebih halus, batasi siapa yang dapat mencapai aplikasi IdP Anda (kebijakan standar IdP).

---

## Fallback ke Admin Lokal

Form login admin lokal di `/login` selalu ada terlepas dari apakah SSO diaktifkan. Endpoint publik `GET /api/auth/sso/providers` hanya mengembalikan provider yang *diaktifkan* sehingga UI dapat me-render tombol untuknya; form username/password tetap terlihat dalam semua kasus.

Jika IdP Anda tidak dapat dijangkau, endpoint login SAML atau OIDC mengembalikan HTTP 404 (`SAML SSO is not configured` / `OIDC SSO is not configured`) ketika baris provider dinonaktifkan, atau redirect ke `/login?error=sso_callback_failed` ketika IdP memang down. Admin lokal tetap berfungsi.

{{% alert icon="⚠️" context="warning" %}}
Tetapkan `ADMIN_PASSWORD` ke nilai yang kuat bahkan setelah SSO disambungkan. Jika IdP Anda down, admin lokal adalah satu-satunya cara untuk masuk kembali. Simpan password di secrets manager, bukan di repo atau template `.env`.
{{% /alert %}}

---

## Jejak Audit

Setiap aksi SSO dicatat ke `audit_log` (lihat [Log Audit](../audit-log/)):

| Aksi | Ditulis oleh |
|---|---|
| `sso.config_updated` | `PUT /api/settings/sso` — mencakup `{ provider, enabled }` |
| `auth.sso_login` | Callback SAML + callback OIDC — mencakup `{ provider, email, name }` |
| `auth.sso_login_failed` | Kedua callback — mencakup `{ provider, error }` |

---

## Terkait

- [Aktivasi Lisensi](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Arsitektur](../../architecture/)
