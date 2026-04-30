+++
title = "Security Model"
description = "How InfraWatch protects credentials, sessions, CSRF, rate limits, and network traffic."
weight = 72
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch is a single administrator app sitting in front of NQRust Hypervisor nodes whose embedded Prometheus endpoints are accessible over a private network. The threat model assumes:

- A trusted operator on the server side.
- An untrusted public network between the browser and the app.
- A semi-trusted database (encrypted at rest, but accessible to a DBA).
- NQRust Hypervisor endpoints that hold no secrets but should not be queryable from the public internet.

This page documents every defence the app implements today.

---

## Connector credential encryption

Connector auth material (basic password or bearer token) is encrypted with **AES-256-GCM** before it is written to the `connectors.auth_credentials` column. The symmetric key is supplied at boot via the `CONNECTOR_ENCRYPTION_KEY` environment variable.

| Property | Value |
|---|---|
| Cipher | AES-256-GCM (authenticated encryption) |
| Key source | `CONNECTOR_ENCRYPTION_KEY` env var, 32+ random characters |
| Nonce | 96 random bits per value; stored alongside the ciphertext |
| Auth tag | 128 bits; verified on every decrypt |
| Decryption scope | Process-local, transient — the plaintext never leaves the Prometheus client call stack |

{{% alert icon="🔑" context="danger" %}}
If you lose `CONNECTOR_ENCRYPTION_KEY`, every stored credential is unrecoverable. Back up the value to the same secrets store you use for `DATABASE_URL`. To rotate the key, add new credentials under the new key and delete the old rows — there is no in-place re-encryption endpoint today.
{{% /alert %}}

Set a strong key in production:

```bash
export CONNECTOR_ENCRYPTION_KEY="$(openssl rand -base64 48 | tr -d '=+/' | head -c 64)"
```

---

## Session cookies

On successful login (local or SSO) the app issues two cookies:

| Cookie | HttpOnly | SameSite | Secure | Purpose |
|---|---|---|---|---|
| `session` | yes | `lax` | yes (in production) | Opaque session token, checked against the `sessions` table on every request. |
| `csrf_token` | no | `lax` | yes (in production) | Readable by the client SPA so it can echo the value in `X-CSRF-Token` on mutations. |

- Cookies use the secure flag automatically when the request is served over HTTPS (`isSecureCookie()` in `lib/server/cookie-options.ts`).
- Session lifetime is **30 days**; the cookie `expires` matches the `sessions.expires_at` column.
- Logout (`POST /api/auth/logout`) deletes the session row and overwrites both cookies with `maxAge=0`.

---

## CSRF protection

Every mutating route handler that requires a session also requires the CSRF token. The pattern is:

1. Login sets `csrf_token` as a non-HttpOnly cookie so the browser can read it.
2. The SPA copies the cookie value into the `X-CSRF-Token` request header on every POST/PATCH/PUT/DELETE.
3. `requireSession(request)` in `lib/server/require-session.ts` compares the header to the cookie and rejects mismatches with `403`.

{{% alert icon="⚡" context="info" %}}
When calling the API from `curl`, copy the `csrf_token` cookie value from a browser session into an `X-CSRF-Token` header alongside the `Cookie: session=…` header. See the [API reference](../../api-reference/) for concrete examples.
{{% /alert %}}

---

## Login rate limiting

`POST /api/auth/login` enforces **5 failed attempts per 15 minutes per client IP** using the `login_attempts` table. On the 6th attempt the endpoint returns `429 Too Many Requests` without consulting the password. Successful logins do not reset the window — the window is pure time-based.

Client IP resolution is deterministic (`getClientIp`): `X-Forwarded-For` → `X-Real-IP` → socket address. Configure your reverse proxy to set these headers or the limit will collapse to the proxy's IP.

---

## Local admin password

The local admin credential is stored as a **scrypt** hash in `admin_user.password_hash`. On first boot, if the table is empty, the app seeds it from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars (defaulting to `admin` / `admin`). Change the password immediately after first login — the default is documented and cannot be treated as a secret.

---

## SAML / OAuth SSO

The app supports identity federation in addition to (or instead of) the local admin. Both providers are configured through `PUT /api/settings/sso` and persisted in the `sso_configs` table with secrets redacted in GET responses.

### SAML 2.0

| Field | Description |
|---|---|
| `samlIdpSsoUrl` | IdP's SingleSignOn redirect endpoint. |
| `samlIdpIssuer` | Expected `Issuer` on assertions. |
| `samlIdpCert` | PEM-encoded IdP signing certificate (write-only from the UI; GET returns `••••••••`). |
| `samlSpEntityId` | Entity ID InfraWatch advertises in `/api/auth/sso/saml/metadata`. |

Flow: `GET /api/auth/sso/saml/login` → IdP → `POST /api/auth/sso/saml/callback` → session cookie issued.

### OpenID Connect

| Field | Description |
|---|---|
| `oidcIssuerUrl` | Issuer URL; discovery document is fetched from `${issuer}/.well-known/openid-configuration`. |
| `oidcClientId` | Registered client ID at the IdP. |
| `oidcClientSecret` | Registered client secret (write-only; GET returns `••••••••`). |
| `oidcScopes` | Space-separated scopes; defaults to `openid profile email`. |

Flow: `GET /api/auth/sso/oidc/login` → IdP → `GET /api/auth/sso/oidc/callback` → session cookie issued.

{{% alert icon="🔐" context="warning" %}}
Secrets (`samlIdpCert`, `oidcClientSecret`) are write-only through the API. Reading `GET /api/settings/sso` returns `••••••••` placeholders. Sending the placeholder back on PUT is a no-op — only a fresh value replaces the stored secret.
{{% /alert %}}

---

## TLS termination

Bun/Node serves InfraWatch on plain HTTP (default port 3001). **Always run a TLS-terminating reverse proxy in production.**

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

Both examples forward the IP headers the rate limiter depends on.

---

## Database SSL

For any non-localhost PostgreSQL, set `DATABASE_SSL=true` and point `DATABASE_URL` at a TLS-enabled port. The app passes `ssl: { rejectUnauthorized: true }` to `pg` when the flag is on.

---

## Audit log

Every mutating route handler records an entry in `audit_log` via `logAudit(action, { targetId, targetName, detail, ip })`. Actions include:

- `auth.login`, `auth.login_failed`, `auth.logout`
- `connector.create`, `connector.update`, `connector.delete`
- `sso.config_updated`

Rotate or ship this table to your SIEM as your compliance posture requires.

---

## Next steps

- [Settings & Admin → Authentication](../../settings/authentication/) — operator-facing SSO configuration.
- [Data model](data-model/) — the table definitions behind these defences.
- [API reference → Auth](../../api-reference/auth/) — login/logout/me endpoints.
