+++
title = "Auth"
description = "Login, logout, and session inspection endpoints under /api/auth."
weight = 81
date = 2026-04-23

[extra]
toc = true
+++

Authentication endpoints. Local admin login uses `POST /api/auth/login`; SSO entrypoints live under `/api/auth/sso/*` and are covered at the end of this page.

---

## `POST /api/auth/login`

Validate admin credentials and issue a session.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth required | No (public) |
| CSRF required | No |
| Rate limited | Yes — 5 failed attempts per IP per 15 min |

### Request body

```json
{
  "username": "admin",
  "password": "<your-password>"
}
```

### Response — 200 OK

```json
{ "ok": true }
```

Sets two cookies:

- `session` — HttpOnly, SameSite=Lax, 30-day expiry. Opaque session token.
- `csrf_token` — readable by JS, SameSite=Lax, 30-day expiry. Must be echoed as `X-CSRF-Token` on every mutating request.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Username and password are required" }` | Missing field in body. |
| 401 | `{ "error": "Invalid username or password" }` | Credentials did not match. |
| 429 | `{ "error": "Too many login attempts. Try again later." }` | Rate limit tripped. |
| 500 | `{ "error": "Internal server error" }` | Unexpected failure — check logs. |

### Example

```bash
curl -c cookies.txt -X POST https://infrawatch.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"change-me"}'
```

---

## `POST /api/auth/logout`

Destroy the current session and clear both cookies.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth required | Implicit — operates on the `session` cookie if present |
| CSRF required | No (the handler clears cookies unconditionally) |

### Request body

None.

### Response — 200 OK

```json
{ "ok": true }
```

Overwrites the `session` and `csrf_token` cookies with `maxAge=0`. If no session cookie was sent the endpoint still returns `200` — logout is idempotent.

### Example

```bash
curl -b cookies.txt -X POST https://infrawatch.example.com/api/auth/logout
```

---

## `GET /api/auth/me`

Check whether the current cookie represents a valid session.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth required | Yes (returns 401 otherwise) |
| CSRF required | No (read-only) |

### Request

No body. Reads the `session` cookie.

### Response — 200 OK (local login)

```json
{ "authenticated": true }
```

### Response — 200 OK (SSO login)

Additional identity fields are included when the session was created via SSO:

```json
{
  "authenticated": true,
  "ssoProvider": "oidc",
  "email": "jane@example.com",
  "name": "Jane Doe"
}
```

### Errors

| Status | Body | Meaning |
|---|---|---|
| 401 | `{ "authenticated": false }` | No cookie, unknown session, or expired session. |

### Example

```bash
curl -b cookies.txt https://infrawatch.example.com/api/auth/me
```

---

## SSO endpoints

These routes are not called directly by scripts — they are redirect targets for the browser during an IdP round-trip. They are listed here for completeness. See [Security model → SAML / OAuth SSO](../../architecture/security-model/#saml--oauth-sso) for the high-level flow and [Settings & Admin → Authentication](../../settings/authentication/) for configuration.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/sso/providers` | `GET` | Returns enabled SSO providers so the login page can render buttons. Public. |
| `/api/auth/sso/saml/login` | `GET` | Redirects the browser to the SAML IdP with a signed `AuthnRequest`. |
| `/api/auth/sso/saml/callback` | `POST` | Receives the IdP's SAML assertion, validates the signature, and issues session cookies. |
| `/api/auth/sso/saml/metadata` | `GET` | Returns the SP metadata XML that IdP admins paste into their trust config. |
| `/api/auth/sso/oidc/login` | `GET` | Redirects the browser to the OIDC authorize endpoint. |
| `/api/auth/sso/oidc/callback` | `GET` | Exchanges the authorization code for an ID token and issues session cookies. |

### `GET /api/auth/sso/providers`

Lists enabled providers for the public login page.

#### Response — 200 OK

```json
{
  "providers": [
    { "id": "oidc", "displayName": "Corporate SSO" }
  ]
}
```

Returns `{ "providers": [] }` on any internal error — the login page falls back to local login in that case.

---

## Next steps

- [Connectors](../connectors/) — first thing to create once logged in.
- [Settings & Admin → Authentication](../../settings/authentication/) — enable and configure SSO providers.
- [Security model](../../architecture/security-model/) — how sessions, CSRF, and rate limiting work under the hood.
