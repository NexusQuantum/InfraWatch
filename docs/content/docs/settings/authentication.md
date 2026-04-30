+++
title = "Authentication"
description = "Single-admin login: scrypt password hashing, 30-day sessions, rate limiting, and CSRF protection"
weight = 61
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch uses a **single local administrator** for all authenticated operations. There is no multi-user system and no role hierarchy — any authenticated request is treated as admin. If you need federated identity, pair this local admin with [SAML or OIDC SSO](../sso/); the local admin always remains as a break-glass account.

The implementation lives in three files: `lib/server/auth.ts` (password hashing, sessions, rate limiting, CSRF token generation), `app/api/auth/login/route.ts` (the login handler), and `middleware.ts` (the request-level session and CSRF gate).

---

## The Admin User

On first boot, `ensureAdminUser()` in `lib/server/auth.ts` checks for a row in the `admin_user` table. If the table is empty, it creates one from two environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Login username |
| `ADMIN_PASSWORD` | `admin` (with a console warning) | Plaintext password, hashed immediately with scrypt |

The password is hashed with Node's built-in `scryptSync(password, salt, 64)`, a 16-byte random hex salt, and stored as `salt:hash` in the `password_hash` column. Verification uses `timingSafeEqual` against a fresh scrypt derivation — see `hashPassword()` and `verifyPassword()` in `lib/server/auth.ts`.

{{% alert icon="⚠️" context="warning" %}}
If you do not set `ADMIN_PASSWORD` at install time, the server starts with username `admin` and password `admin` and prints a warning to stdout. **Change this immediately** — see [Password & Encryption Key](../password/).
{{% /alert %}}

The installer (`infrawatch-installer`) prompts for both values during the Configuration phase and writes them into `/opt/infrawatch/.env`. See [Installation](../../getting-started/installation/) for the install-time flow.

---

## Logging In

> 📸 **Screenshot needed:** `/images/settings/auth/login-page.png`
> **Page to capture:** `/login`
> **What to show:** The login form with username and password fields, the "Sign in" button, and (if SSO is enabled) the provider buttons rendered below.

The login page posts to `POST /api/auth/login` with a JSON body:

```json
{ "username": "admin", "password": "..." }
```

The handler runs these steps in order:

1. **Rate-limit check** — `checkRateLimit(ip)` counts rows in `login_attempts` for this IP in the last 15 minutes. More than 5 → HTTP 429.
2. **Record the attempt** — a new `login_attempts` row is written for every request (valid or not).
3. **Validate credentials** — `validateCredentials()` looks up the username and compares the scrypt hash.
4. **On success** — `createSession()` inserts a row in `sessions` (30-day TTL), `generateCsrfToken()` mints a 32-byte hex token, and both are returned as cookies.
5. **On failure** — a `auth.login_failed` row is written to `audit_log` and the response is HTTP 401.

The session cookie is set as:

| Cookie | `httpOnly` | `secure` | `sameSite` | Expiry |
|---|---|---|---|---|
| `session` | ✅ yes | only when `APP_URL` starts with `https://` | `lax` | 30 days |
| `csrf_token` | ❌ no (readable by JS) | same rule as above | `lax` | 30 days |

The `secure` flag is resolved by `isSecureCookie()` in `lib/server/cookie-options.ts`: HTTPS deployments get `secure: true`; HTTP (common for air-gapped installs) gets `secure: false`.

---

## Sessions

Session state lives in the `sessions` table:

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

- The token is a 32-byte random hex string (`randomBytes(32).toString("hex")`).
- `expires_at` is set to **30 days** from creation.
- Every authenticated request hits `validateSession(token)`, which deletes the row if `expires_at` has already passed.
- Expired sessions can also be swept in bulk via `cleanExpiredSessions()` — see source for hook-up if you schedule it.
- `GET /api/auth/me` returns `{ authenticated: true }` for a valid session; if the session carries SSO identity columns, `ssoProvider`, `email`, and `name` are included.

> 📸 **Screenshot needed:** `/images/settings/auth/session-expiry.png`
> **Page to capture:** any protected page (e.g. `/fleet`) after the session cookie expires
> **What to show:** The automatic redirect to `/login` triggered by `middleware.ts`, with the original URL preserved in the browser address bar.

Logging out hits `POST /api/auth/logout`, which deletes the row from `sessions` and clears both cookies with `maxAge: 0`.

---

## Rate Limiting

Login rate limiting is IP-based and backed by the `login_attempts` table:

```sql
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at);
```

The threshold is **5 attempts per 15 minutes, per IP address**. The check is a single `SELECT COUNT(*)` on the indexed `(ip_address, attempted_at)` pair. There is no automatic purge; old rows accumulate until you prune them manually (`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days'` is a reasonable cron).

Client IP is resolved by `getClientIp(request)` in `lib/server/require-session.ts` (honours `x-forwarded-for` and `x-real-ip` headers). Behind a reverse proxy, make sure your proxy sets these correctly or every request will share the proxy's IP and the limit becomes global.

> 📸 **Screenshot needed:** `/images/settings/auth/rate-limit-error.png`
> **Page to capture:** `/login` after 5 failed attempts from the same IP within 15 minutes
> **What to show:** The toast / inline error reading "Too many login attempts. Try again later." returned with HTTP 429.

{{% alert icon="⚠️" context="warning" %}}
The rate limit is **per IP, not per username**. A shared NAT gateway with several admins will share the same counter. If you operate behind a large proxy, consider narrowing the scope with a per-username row or raising the ceiling — the logic is a single query in `checkRateLimit()` in `lib/server/auth.ts`.
{{% /alert %}}

---

## CSRF Protection

All mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) go through a **double-submit cookie** check in `middleware.ts`:

```ts
if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
  const csrfHeader = request.headers.get("x-csrf-token");
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }
}
```

The client must read `csrf_token` (non-`httpOnly`) and send the same value in the `X-CSRF-Token` header. Any mismatch returns HTTP 403. This is enforced for every authenticated route — API handlers do not need to check again.

The `GET /api/auth/login`, `GET /api/auth/sso/*/login`, and SSO callback routes are listed in the `PUBLIC_PATHS` set at the top of `middleware.ts` and bypass both the session and CSRF gates.

---

## Request Flow

The middleware in `middleware.ts` runs for every request except static assets. For a typical dashboard request:

```
Browser request ──▶ middleware.ts
                    ├─ PUBLIC_PATHS / PUBLIC_PREFIXES? → pass through
                    ├─ session cookie missing? → redirect to /login (or 401 for /api/*)
                    ├─ mutating method without matching CSRF? → 403
                    ├─ license cookie not "valid"? → redirect to /setup (except /api/license/*, /api/auth/*, /setup)
                    └─ all checks passed → route handler
```

The license gate is documented in [License Activation](../../getting-started/license/); it's enforced by the same middleware.

---

## Related

- [License Activation](../../getting-started/license/) — license cookie is checked in the same middleware
- [API Reference — Auth](../../api-reference/#auth) — full endpoint and payload reference
- [Architecture](../../architecture/) — how the Next.js middleware and the route handlers fit together
