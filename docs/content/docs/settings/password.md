+++
title = "Password & Encryption Key"
description = "Rotate the admin password, the CONNECTOR_ENCRYPTION_KEY that protects connector credentials and SSO secrets, and reset sessions"
weight = 63
date = 2026-04-23

[extra]
toc = true
+++

Two secrets underpin every authenticated operation in InfraWatch:

1. The **admin password** — used to log in as the local administrator.
2. The **`CONNECTOR_ENCRYPTION_KEY`** — used to AES-256-GCM encrypt every connector credential and every SSO client secret at rest.

This page describes how to rotate each and how to force all active sessions to sign out afterwards.

---

## Changing the Admin Password

The admin user row in `admin_user` is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on first boot (see [Authentication](../authentication/)). After that, the row is the source of truth — changing the env var alone does **not** change the live password.

There is currently no "change password" UI in `/settings` (the form in `app/settings/page.tsx` is a placeholder). Rotate the password with one of these two paths:

### Option 1 — Re-seed from the env var

1. Stop InfraWatch (`sudo systemctl stop infrawatch`).
2. Delete the admin row: `psql -U infrawatch -d infrawatch -c "DELETE FROM admin_user;"`.
3. Edit `/opt/infrawatch/.env` and set a new `ADMIN_PASSWORD`.
4. Start InfraWatch (`sudo systemctl start infrawatch`). `ensureAdminUser()` in `lib/server/auth.ts` will re-seed the row with the new scrypt hash.

### Option 2 — Update the hash directly

Generate a scrypt hash with the same algorithm used in `lib/server/auth.ts` (`hashPassword()`):

```js
// node --experimental-repl-await
const { scryptSync, randomBytes } = require("node:crypto");
const plain = "new-secure-password";
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(plain, salt, 64).toString("hex");
console.log(`${salt}:${hash}`);
```

Then update the row:

```sql
UPDATE admin_user
SET password_hash = '<paste salt:hash here>', updated_at = NOW()
WHERE username = 'admin';
```

Both paths leave the `sessions` table untouched — see **Forcing Session Reset** below to revoke live logins.

{{% alert icon="⚠️" context="warning" %}}
Choose a password of at least 16 characters mixing upper/lower/digits/symbols. Scrypt is slow by design, but a weak password still loses to a large GPU cluster. If an SSO provider is enabled ([SSO](../sso/)), also consider taking the local admin out of daily rotation and reserving it for break-glass only.
{{% /alert %}}

---

## Rotating `CONNECTOR_ENCRYPTION_KEY`

`CONNECTOR_ENCRYPTION_KEY` is read by `getEncryptionKey()` in `lib/server/encryption.ts`. The raw string is SHA-256 hashed to produce the 32-byte AES-256-GCM key used by `encryptString()` and `decryptString()`.

This key protects:

- Every NQRust Hypervisor connector credential (auth tokens, API keys, and basic-auth passwords).
- SAML IdP signing certs stored in `sso_config.saml_idp_cert_enc`.
- OIDC client secrets stored in `sso_config.oidc_client_secret_enc`.

### Production Requirements

`getEncryptionKey()` enforces two rules when `NODE_ENV=production`:

- The key must not equal the dev default `local-dev-connector-key-change-me`.
- The key must be at least 16 characters.

The installer generates a random value during the Configuration phase and writes it to `/opt/infrawatch/.env`. The same value is referenced from the `.env.example` conventions below.

{{% alert icon="⚠️" context="warning" %}}
Use **32 or more random characters** for this key in production. 16 is the minimum the code enforces; 32+ is the recommended length. Generate with `openssl rand -base64 32` or `head -c 32 /dev/urandom | base64`.
{{% /alert %}}

### Rotation Procedure

Because every encrypted value is AES-GCM with IV + auth tag embedded, you cannot simply swap the key without re-wrapping each secret. The minimum-downtime procedure is:

1. **Inventory** every encrypted secret you must re-enter:
   - All connector credentials (`/connectors` → each connector has an **Edit credentials** action).
   - SAML IdP cert (`/settings` → SSO → SAML → re-paste the PEM).
   - OIDC client secret (`/settings` → SSO → OIDC → re-enter the secret).
2. **Stop InfraWatch:** `sudo systemctl stop infrawatch`.
3. **Back up the database:** `pg_dump infrawatch > infrawatch-before-key-rotation.sql`.
4. **Set the new key** in `/opt/infrawatch/.env` (`CONNECTOR_ENCRYPTION_KEY=<new-32+-char-value>`).
5. **Clear the encrypted columns** (simplest; avoids ciphertext-under-wrong-key errors):
   ```sql
   UPDATE connectors SET credentials_encrypted = NULL;
   UPDATE sso_config SET saml_idp_cert_enc = NULL, oidc_client_secret_enc = NULL;
   ```
6. **Start InfraWatch:** `sudo systemctl start infrawatch`.
7. **Re-enter every secret** via the UI. Each save writes a new ciphertext using the new key.
8. **Verify** connectors show green health and SSO login still works end-to-end.

There is no built-in "re-wrap with new key" migration. If you need zero downtime, write a script that `decryptString()` each row with the **old** key, then `encryptString()` with the **new** key — both functions live in `lib/server/encryption.ts` and are pure.

---

## `.env.example` Conventions

InfraWatch follows the standard Next.js `.env.example` convention — the repository ships an `.env.example` with every tunable variable documented, and the installer produces the real `.env` at `/opt/infrawatch/.env` with the same keys (see `installer/src/installer/config.rs`). The relevant keys for this page:

```bash
# Required in production, must be 16+ chars (32+ recommended)
CONNECTOR_ENCRYPTION_KEY=change-me-to-a-strong-random-value

# Seeded into admin_user on first boot; change immediately after install
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-immediately

# Used to build SSO callback URLs and to decide cookie `secure` flag
APP_URL=http://<host>:3001
```

{{% alert icon="⚠️" context="warning" %}}
**Never commit `.env` to version control.** Add it to `.gitignore` (it already is in the InfraWatch repo). The `.env.example` is a template only and must contain placeholders, not real values. Rotate immediately if a real key ever lands in a commit.
{{% /alert %}}

---

## Forcing Session Reset

Rotating the password does not invalidate existing session cookies — they remain valid until the 30-day `expires_at` stamp passes. To force every client to sign in again:

```sql
DELETE FROM sessions;
```

Every request after that will fail the `validateSession()` check in `lib/server/auth.ts` and be redirected to `/login` by the middleware. The CSRF cookies will be re-issued on the next successful login.

If you only want to sign *yourself* out, `POST /api/auth/logout` is enough — it deletes the single row for your token and clears both cookies.

---

## Related

- [License Activation](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Architecture](../../architecture/)
