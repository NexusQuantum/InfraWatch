+++
title = "Settings"
description = "Endpoint konfigurasi provider SSO di bawah /api/settings."
weight = 87
date = 2026-04-23

[extra]
toc = true
+++

Satu-satunya endpoint settings yang diekspos oleh InfraWatch saat ini adalah permukaan konfigurasi SSO. Semua penyesuaian lain berada pada environment variable (`DATABASE_URL`, `CONNECTOR_ENCRYPTION_KEY`, `LICENSE_*`, dll. — lihat [Environment Variables](../../getting-started/installation/)).

{{% alert icon="🔐" context="warning" %}}
Endpoint konfigurasi SSO membutuhkan session yang ter-autentikasi. Secret (`samlIdpCert`, `oidcClientSecret`) bersifat **write-only**: `GET` mengembalikan placeholder `••••••••`, dan mengirim placeholder kembali pada `PUT` adalah no-op.
{{% /alert %}}

---

## `GET /api/settings/sso`

Mendaftar kedua konfigurasi SAML dan OIDC (termasuk provider yang dinonaktifkan).

| Atribut | Nilai |
|---|---|
| Method | `GET` |
| Auth | **Session diperlukan** |
| CSRF | Tidak diperlukan |

### Respons — 200 OK

```json
{
  "configs": [
    {
      "id": "saml",
      "enabled": true,
      "displayName": "Corporate SAML",
      "samlIdpSsoUrl": "https://idp.example.com/saml/sso",
      "samlIdpIssuer": "https://idp.example.com/",
      "samlIdpCert": "••••••••",
      "samlSpEntityId": "https://infrawatch.example.com/",
      "updatedAt": "2026-04-22T09:00:00.000Z"
    },
    {
      "id": "oidc",
      "enabled": false,
      "displayName": "Corporate OIDC",
      "oidcIssuerUrl": "https://idp.example.com/",
      "oidcClientId": "infrawatch",
      "oidcClientSecret": "••••••••",
      "oidcScopes": "openid profile email",
      "updatedAt": "2026-04-20T09:00:00.000Z"
    }
  ]
}
```

### Error

| Status | Body | Arti |
|---|---|---|
| 401 | `{ "error": "Authentication required" }` | Tidak ada session. |
| 500 | `{ "error": "Failed to load SSO configs" }` | Error database. |

---

## `PUT /api/settings/sso`

Melakukan upsert satu konfigurasi provider SSO. Field `id` menentukan provider mana yang Anda perbarui.

| Atribut | Nilai |
|---|---|
| Method | `PUT` |
| Auth | **Session diperlukan** |
| CSRF | **Diperlukan** |

### Request body — SAML

```json
{
  "id": "saml",
  "enabled": true,
  "displayName": "Corporate SAML",
  "samlIdpSsoUrl": "https://idp.example.com/saml/sso",
  "samlIdpIssuer": "https://idp.example.com/",
  "samlIdpCert": "-----BEGIN CERTIFICATE-----\nMII…\n-----END CERTIFICATE-----",
  "samlSpEntityId": "https://infrawatch.example.com/"
}
```

### Request body — OIDC

```json
{
  "id": "oidc",
  "enabled": true,
  "displayName": "Corporate OIDC",
  "oidcIssuerUrl": "https://idp.example.com/",
  "oidcClientId": "infrawatch",
  "oidcClientSecret": "s3cr3t-val-from-idp",
  "oidcScopes": "openid profile email"
}
```

### Referensi field

| Field | Berlaku pada | Deskripsi |
|---|---|---|
| `id` | keduanya | `"saml"` atau `"oidc"` — nilai lain mengembalikan `400`. |
| `enabled` | keduanya | Men-toggle provider pada halaman login dan endpoint callback-nya. |
| `displayName` | keduanya | Label tombol yang mudah dibaca manusia di halaman login. |
| `samlIdpSsoUrl` | saml | URL redirect SingleSignOn milik IdP. |
| `samlIdpIssuer` | saml | `Issuer` yang diharapkan pada assertion. |
| `samlIdpCert` | saml | Sertifikat signing IdP dalam PEM. Kirim nilai untuk memperbarui; hilangkan (atau kirim `••••••••`) untuk mempertahankan yang tersimpan. |
| `samlSpEntityId` | saml | Entity ID SP yang diiklankan di `/api/auth/sso/saml/metadata`. |
| `oidcIssuerUrl` | oidc | URL issuer; dokumen discovery diambil dari `${issuer}/.well-known/openid-configuration`. |
| `oidcClientId` | oidc | Client id yang diberikan IdP. |
| `oidcClientSecret` | oidc | Client secret yang diberikan IdP. Kirim nilai untuk memperbarui; hilangkan (atau kirim `••••••••`) untuk mempertahankan yang tersimpan. |
| `oidcScopes` | oidc | Scope yang dipisahkan spasi, default `openid profile email`. |

### Respons — 200 OK

Mengembalikan konfigurasi yang dipersistensikan dengan secret yang diredaksi:

```json
{
  "ok": true,
  "config": {
    "id": "saml",
    "enabled": true,
    "displayName": "Corporate SAML",
    "samlIdpSsoUrl": "https://idp.example.com/saml/sso",
    "samlIdpIssuer": "https://idp.example.com/",
    "samlIdpCert": "••••••••",
    "samlSpEntityId": "https://infrawatch.example.com/"
  }
}
```

Handler menulis entri audit `sso.config_updated` dengan id provider dan flag enabled.

### Error

| Status | Body | Arti |
|---|---|---|
| 400 | `{ "error": "Invalid provider ID" }` | `id` bukan `saml` atau `oidc`. |
| 401 | `{ "error": "Authentication required" }` | Tidak ada session. |
| 403 | (penolakan CSRF standar) | Header CSRF hilang / salah. |
| 500 | `{ "error": "Failed to save SSO config" }` | Error database. |

### Contoh

```bash
curl -b cookies.txt -X PUT https://infrawatch.example.com/api/settings/sso \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "id":"oidc",
    "enabled":true,
    "displayName":"Corporate OIDC",
    "oidcIssuerUrl":"https://idp.example.com/",
    "oidcClientId":"infrawatch",
    "oidcClientSecret":"s3cr3t-val-from-idp",
    "oidcScopes":"openid profile email"
  }'
```

---

## Tidak ada route settings lain

Saat tulisan ini dibuat, `GET`/`PUT /api/settings/sso` adalah satu-satunya endpoint di bawah `/api/settings/`. Perilaku admin-tunable lainnya dikontrol melalui environment variable pada startup proses:

| Perihal | Tempat konfigurasi |
|---|---|
| Kredensial admin | Env var `ADMIN_USERNAME` / `ADMIN_PASSWORD` (ubah password di UI setelah login pertama). |
| Koneksi database | `DATABASE_URL` / `DATABASE_SSL`. |
| Enkripsi secret connector | `CONNECTOR_ENCRYPTION_KEY`. |
| Lisensi | `LICENSE_SERVER_URL`, `LICENSE_API_KEY`, `LICENSE_GRACE_PERIOD_DAYS`, `LICENSE_PUBLIC_KEY`, ditambah [endpoint `/api/license/*`](../license/). |
| Port HTTP | `PORT`. |

Lihat [Getting Started → Installation](../../getting-started/installation/) untuk referensi env-var lengkap.

---

## Langkah selanjutnya

- [Auth](../auth/) — endpoint login yang mengonsumsi konfigurasi SSO ini.
- [Settings & Admin → Authentication](../../settings/authentication/) — UI yang menghadap operator untuk field yang sama.
- [Security model → SAML / OAuth SSO](../../architecture/security-model/#saml--oauth-sso).
