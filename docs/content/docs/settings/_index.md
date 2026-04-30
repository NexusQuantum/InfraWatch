+++
title = "Settings & Admin"
description = "Manage the admin user, session security, SSO providers, encryption keys, and the audit log"
weight = 60
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# Settings & Admin

InfraWatch ships with a **single-admin auth model**: one local administrator (username + scrypt-hashed password) plus optional SAML / OIDC single sign-on. All privileged operations are performed by that admin user, and every mutation is recorded to an append-only `audit_log` table in PostgreSQL.

This section covers the four administrative surfaces:

- Logging in (local admin, rate limiting, CSRF, sessions)
- Adding SAML or OIDC single sign-on
- Rotating the admin password and the encryption key that protects connector credentials
- Reading and retaining the audit log

---

## Sub-Pages

### [Authentication](authentication/)

How the local admin login works: scrypt password hashing, 30-day session cookies, the 5-attempt / 15-minute rate limit, and the double-submit CSRF pattern enforced by `middleware.ts`.

### [Single Sign-On (SSO)](sso/)

Configure SAML 2.0 (via `@node-saml/node-saml`) or OpenID Connect (via `openid-client`). Upload IdP metadata, set the callback URL, map email and name attributes, and fall back to the local admin when the IdP is unreachable.

### [Password & Encryption Key](password/)

Change the admin password and rotate the `CONNECTOR_ENCRYPTION_KEY` that wraps every stored connector credential and SSO client secret. Includes session-reset guidance.

### [Audit Log](audit-log/)

The `audit_log` table schema, the exact action keys emitted today (`auth.login`, `connector.create`, `sso.config_updated`, …), and how to prune old rows since retention is not automatic.

---

## Related

- [License Activation](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Architecture](../../architecture/)
