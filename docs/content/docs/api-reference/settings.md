+++
title = "Settings"
description = "SSO provider configuration endpoints under /api/settings."
weight = 87
date = 2026-04-23

[extra]
toc = true
+++

The only settings endpoint exposed by InfraWatch today is the SSO config surface. All other tunables live in environment variables (`DATABASE_URL`, `CONNECTOR_ENCRYPTION_KEY`, `LICENSE_*`, etc. — see [Environment Variables](../../getting-started/installation/)).

{{% alert icon="🔐" context="warning" %}}
SSO configuration endpoints require an authenticated session. Secrets (`samlIdpCert`, `oidcClientSecret`) are **write-only**: `GET` returns `••••••••` placeholders, and sending the placeholder back on `PUT` is a no-op.
{{% /alert %}}

---

## `GET /api/settings/sso`

List both SAML and OIDC configurations (disabled providers included).

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | **Session required** |
| CSRF | Not required |

### Response — 200 OK

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

### Errors

| Status | Body | Meaning |
|---|---|---|
| 401 | `{ "error": "Authentication required" }` | No session. |
| 500 | `{ "error": "Failed to load SSO configs" }` | Database error. |

---

## `PUT /api/settings/sso`

Upsert a single SSO provider configuration. The `id` field picks which provider you are updating.

| Attribute | Value |
|---|---|
| Method | `PUT` |
| Auth | **Session required** |
| CSRF | **Required** |

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

### Field reference

| Field | Applies to | Description |
|---|---|---|
| `id` | both | `"saml"` or `"oidc"` — any other value returns `400`. |
| `enabled` | both | Toggles the provider on the login page and its callback endpoints. |
| `displayName` | both | Human-readable button label on the login page. |
| `samlIdpSsoUrl` | saml | IdP's SingleSignOn redirect URL. |
| `samlIdpIssuer` | saml | Expected `Issuer` on assertions. |
| `samlIdpCert` | saml | PEM IdP signing certificate. Send the value to update; omit (or send `••••••••`) to keep the stored one. |
| `samlSpEntityId` | saml | SP entity ID advertised in `/api/auth/sso/saml/metadata`. |
| `oidcIssuerUrl` | oidc | Issuer URL; discovery doc is fetched from `${issuer}/.well-known/openid-configuration`. |
| `oidcClientId` | oidc | IdP-assigned client id. |
| `oidcClientSecret` | oidc | IdP-assigned client secret. Send the value to update; omit (or send `••••••••`) to keep the stored one. |
| `oidcScopes` | oidc | Space-separated scopes, defaults to `openid profile email`. |

### Response — 200 OK

Returns the persisted config with secrets redacted:

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

The handler writes a `sso.config_updated` audit entry with the provider id and enabled flag.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Invalid provider ID" }` | `id` is not `saml` or `oidc`. |
| 401 | `{ "error": "Authentication required" }` | No session. |
| 403 | (standard CSRF reject) | Missing / wrong CSRF header. |
| 500 | `{ "error": "Failed to save SSO config" }` | Database error. |

### Example

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

## No other settings routes

At the time of writing, `GET`/`PUT /api/settings/sso` are the only endpoints under `/api/settings/`. Other admin-tunable behaviour is controlled through environment variables at process startup:

| Concern | Where to configure |
|---|---|
| Admin credentials | `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars (change password in UI after first login). |
| Database connection | `DATABASE_URL` / `DATABASE_SSL`. |
| Connector secret encryption | `CONNECTOR_ENCRYPTION_KEY`. |
| Licensing | `LICENSE_SERVER_URL`, `LICENSE_API_KEY`, `LICENSE_GRACE_PERIOD_DAYS`, `LICENSE_PUBLIC_KEY`, plus the [`/api/license/*` endpoints](../license/). |
| HTTP port | `PORT`. |

See [Getting Started → Installation](../../getting-started/installation/) for the full env-var reference.

---

## Next steps

- [Auth](../auth/) — the login endpoints that consume these SSO configs.
- [Settings & Admin → Authentication](../../settings/authentication/) — operator-facing UI for the same fields.
- [Security model → SAML / OAuth SSO](../../architecture/security-model/#saml--oauth-sso).
