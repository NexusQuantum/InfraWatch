+++
title = "Single Sign-On (SSO)"
description = "Enable SAML 2.0 or OpenID Connect SSO with IdP metadata, callback URLs, attribute mapping, and a local-admin fallback"
weight = 62
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch supports two SSO protocols side-by-side with the local admin account:

- **SAML 2.0** — backed by [`@node-saml/node-saml`](https://www.npmjs.com/package/@node-saml/node-saml) `^5.1.0` (from `package.json`).
- **OpenID Connect (OIDC)** — backed by [`openid-client`](https://www.npmjs.com/package/openid-client) `^6.8.2` with PKCE.

Both providers are optional, can be enabled independently, and coexist with the local admin login so you always have a break-glass route.

Implementation lives in `lib/server/sso-saml.ts`, `lib/server/sso-oidc.ts`, and `lib/server/sso-store.ts`; the handlers are under `app/api/auth/sso/` and the admin configuration UI is `components/settings/sso-settings.tsx` served from `/settings`.

---

## Enabling SSO

> 📸 **Screenshot needed:** `/images/settings/sso/sso-overview.png`
> **Page to capture:** `/settings` → SSO section
> **What to show:** The two provider cards (SAML and OIDC) with their enable toggles, display-name field, and a "Save" button per provider.

Configuration is stored in the `sso_config` table (see `lib/server/sso-store.ts`):

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

Both `saml_idp_cert_enc` and `oidc_client_secret_enc` are encrypted with `CONNECTOR_ENCRYPTION_KEY`. The `GET /api/settings/sso` endpoint never returns these secrets — the UI shows `••••••••` and only overwrites them if you type a new value.

The admin API is:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/settings/sso` | List both configs (secrets redacted) |
| `PUT` | `/api/settings/sso` | Upsert a single provider. Writes `sso.config_updated` to `audit_log`. |

{{% alert icon="⚠️" context="warning" %}}
`CONNECTOR_ENCRYPTION_KEY` must be set and at least 16 characters in production (see `lib/server/encryption.ts`). If this key is rotated, every stored SAML IdP cert and OIDC client secret must be re-entered. See [Password & Encryption Key](../password/).
{{% /alert %}}

---

## SAML 2.0

### Configuration Fields

The SAML provider reads the following fields from `sso_config` (see `buildSamlClient()` in `lib/server/sso-saml.ts`):

| Field | UI label | What it is |
|---|---|---|
| `samlIdpSsoUrl` | IdP SSO URL | The IdP's SingleSignOnService endpoint (`entryPoint`) |
| `samlIdpIssuer` | IdP issuer | The `entityID` of your IdP |
| `samlIdpCert` | IdP signing cert | The PEM public cert used to verify assertions (stored encrypted) |
| `samlSpEntityId` | SP entity ID | Optional; defaults to `<APP_URL>/saml/metadata` |

The client is built with `wantAssertionsSigned: true`, `wantAuthnResponseSigned: false`, `acceptedClockSkewMs: 5 * 60 * 1000` (five minutes — tuned for air-gapped environments with drifting clocks), and `identifierFormat` `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`. See source.

> 📸 **Screenshot needed:** `/images/settings/sso/sso-saml-form.png`
> **Page to capture:** `/settings` → SSO → SAML card
> **What to show:** The form with IdP SSO URL, IdP issuer, the PEM-paste area for the signing cert, the SP entity ID field, and the "Download SP metadata" link.

### Service Provider (SP) Metadata

Point your IdP at the InfraWatch SP metadata XML — it is generated on demand at:

```
GET /api/auth/sso/saml/metadata
```

It is produced by `generateServiceProviderMetadata()` from `@node-saml/node-saml` using your current config (or defaults if nothing is configured yet). The endpoint is listed in `PUBLIC_PATHS` in `middleware.ts`, so no authentication is required to fetch it — the IdP configures itself from this URL.

### Callback URL

The SAML assertion is posted back to:

```
POST /api/auth/sso/saml/callback
```

Register this URL (the ACS endpoint) with your IdP. The app URL is derived from the `APP_URL` environment variable; if unset, the handler falls back to `x-forwarded-proto` + `host`. Set `APP_URL=https://infrawatch.example.com` in `/opt/infrawatch/.env` to avoid ambiguity behind reverse proxies.

### Assertion → Session

`validateSamlResponse()` in `lib/server/sso-saml.ts` pulls the user's identity from the assertion with these fallbacks:

| Identity field | Tries, in order |
|---|---|
| **Email** | `profile.email` → `profile.mail` → `profile["urn:oid:0.9.2342.19200300.100.1.3"]` → `profile.nameID` |
| **Name** | `profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]` → `profile.displayName` → `profile.cn` → *(omitted)* |

The email and optional name are written into the `sessions` row (`sso_provider`, `sso_email`, `sso_name`). A successful login writes `auth.sso_login` to the audit log; a failure writes `auth.sso_login_failed` with the error message.

> 📸 **Screenshot needed:** `/images/settings/sso/sso-saml-callback.png`
> **Page to capture:** the redirect that arrives at `/api/auth/sso/saml/callback` from the IdP
> **What to show:** The browser's address bar showing the POST redirect and the subsequent landing on `/` with the admin user signed in.

### IdP Metadata

InfraWatch does not currently parse IdP-side metadata XML; you paste the individual fields (SSO URL, issuer, cert) into the admin form manually. If your IdP exposes metadata at a URL, copy the cert and SSO URL from that document.

---

## OpenID Connect (OIDC)

### Configuration Fields

OIDC uses discovery — point the app at the IdP's issuer URL and `openid-client` loads the rest:

| Field | UI label | What it is |
|---|---|---|
| `oidcIssuerUrl` | Issuer URL | e.g. `https://accounts.google.com` or `https://your-okta.okta.com/oauth2/default` |
| `oidcClientId` | Client ID | OAuth2 client ID from your IdP |
| `oidcClientSecret` | Client secret | OAuth2 client secret (stored encrypted) |
| `oidcScopes` | Scopes | Defaults to `openid email profile` |

> 📸 **Screenshot needed:** `/images/settings/sso/sso-oidc-form.png`
> **Page to capture:** `/settings` → SSO → OIDC card
> **What to show:** The form with Issuer URL, Client ID, Client Secret, scopes, and the Callback URL displayed as a read-only copyable row.

### Callback URL

Register this exact URL with your IdP:

```
<APP_URL>/api/auth/sso/oidc/callback
```

The `GET /api/auth/sso/oidc/login` handler generates a fresh `state` (32 bytes), `nonce` (32 bytes), and a PKCE `code_verifier` via `openid-client`'s `randomPKCECodeVerifier()`. All three are persisted in the `sso_state` table keyed by `state` and consumed on callback (single-use, 10-minute TTL — see `consumeSsoState()` in `lib/server/sso-store.ts`).

### Flow

1. User clicks the OIDC button on `/login`.
2. Browser → `GET /api/auth/sso/oidc/login` → redirect to IdP authorize URL (with PKCE `code_challenge`).
3. IdP → `GET /api/auth/sso/oidc/callback?state=...&code=...` → InfraWatch.
4. Handler calls `consumeSsoState(state)`, rejects if missing or > 10 minutes old, and passes `nonce` + `codeVerifier` to `handleOidcCallback()` in `lib/server/sso-oidc.ts`.
5. On success, a session row is created with `sso_provider = 'oidc'` and the user lands on `/`.
6. `auth.sso_login` is written to the audit log.

Any `error` query parameter from the IdP is logged as `auth.sso_login_failed` with the `error_description` from the IdP.

---

## Attribute Mapping

| Claim / assertion | Mapped to | Notes |
|---|---|---|
| SAML `profile.email` et al. | `sessions.sso_email` | See fallback chain above |
| SAML `profile["…/claims/name"]` et al. | `sessions.sso_name` | Optional |
| OIDC `email` claim | `sessions.sso_email` | Handled inside `handleOidcCallback()` — see `lib/server/sso-oidc.ts` |
| OIDC `name` claim | `sessions.sso_name` | Optional |

There is no group-to-role mapping today — every SSO-authenticated user receives the same single-admin privileges as the local admin. If you need finer-grained access control, restrict who can reach your IdP application (standard IdP policy).

---

## Fallback to Local Admin

The local admin login form at `/login` is always present regardless of whether SSO is enabled. The public `GET /api/auth/sso/providers` endpoint returns only the *enabled* providers so the UI can render buttons for them; the username/password form stays visible in all cases.

If your IdP is unreachable, the SAML or OIDC login endpoint returns HTTP 404 (`SAML SSO is not configured` / `OIDC SSO is not configured`) when the provider row is disabled, or redirects to `/login?error=sso_callback_failed` when the IdP is simply down. The local admin still works.

{{% alert icon="⚠️" context="warning" %}}
Keep `ADMIN_PASSWORD` set to a strong value even after SSO is wired up. If your IdP goes down, the local admin is your only way back in. Store the password in a secrets manager, not in the repo or the `.env` template.
{{% /alert %}}

---

## Audit Trail

Every SSO action is logged to `audit_log` (see [Audit Log](../audit-log/)):

| Action | Written by |
|---|---|
| `sso.config_updated` | `PUT /api/settings/sso` — includes `{ provider, enabled }` |
| `auth.sso_login` | SAML callback + OIDC callback — includes `{ provider, email, name }` |
| `auth.sso_login_failed` | Both callbacks — includes `{ provider, error }` |

---

## Related

- [License Activation](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Architecture](../../architecture/)
