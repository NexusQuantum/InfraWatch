+++
title = "Pengaturan & Admin"
description = "Kelola pengguna admin, keamanan session, provider SSO, encryption key, dan audit log"
weight = 60
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# Pengaturan & Admin

InfraWatch dikirim dengan **model auth single-admin**: satu administrator lokal (username + password yang di-hash dengan scrypt) plus single sign-on SAML / OIDC opsional. Semua operasi terprivilese dilakukan oleh pengguna admin tersebut, dan setiap mutasi dicatat ke tabel append-only `audit_log` di PostgreSQL.

Bagian ini mencakup empat permukaan administratif:

- Logging in (admin lokal, rate limiting, CSRF, sessions)
- Menambahkan single sign-on SAML atau OIDC
- Merotasi password admin dan encryption key yang melindungi kredensial connector
- Membaca dan meretensi audit log

---

## Sub-Halaman

### [Autentikasi](authentication/)

Bagaimana login admin lokal bekerja: scrypt password hashing, cookie session 30 hari, rate limit 5-percobaan / 15-menit, dan pola double-submit CSRF yang ditegakkan oleh `middleware.ts`.

### [Single Sign-On (SSO)](sso/)

Konfigurasi SAML 2.0 (via `@node-saml/node-saml`) atau OpenID Connect (via `openid-client`). Unggah metadata IdP, set callback URL, pemetaan atribut email dan name, dan fallback ke admin lokal ketika IdP tidak dapat dijangkau.

### [Password & Encryption Key](password/)

Ubah password admin dan rotasi `CONNECTOR_ENCRYPTION_KEY` yang membungkus setiap kredensial connector dan client secret SSO yang tersimpan. Termasuk panduan session-reset.

### [Log Audit](audit-log/)

Skema tabel `audit_log`, kunci aksi persis yang dipancarkan saat ini (`auth.login`, `connector.create`, `sso.config_updated`, …), dan cara memangkas baris lama karena retensi tidak otomatis.

---

## Terkait

- [Aktivasi Lisensi](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Arsitektur](../../architecture/)
