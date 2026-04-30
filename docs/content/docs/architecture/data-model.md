+++
title = "Data Model"
description = "The PostgreSQL tables InfraWatch auto-creates on first startup and what each one stores."
weight = 71
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch owns its schema end-to-end: on first startup the app connects to `DATABASE_URL` and auto-creates every table listed below. You do not need to run migrations manually — but knowing the shape is useful when you need to back up, restore, or query operational data directly.

{{% alert icon="🛡" context="warning" %}}
Do not edit these tables manually in production. Sessions, alert throttling state, and license activation all depend on invariants the app enforces at write time. Use the UI or the [API reference](../../api-reference/) for changes.
{{% /alert %}}

---

## `license`

Holds the current license key and its verified activation state.

| Column | Type | Purpose |
|---|---|---|
| `id` | integer (PK) | Singleton row — only one license is active at a time. |
| `license_key` | text | The raw activation key supplied by the operator. |
| `status` | text | `active`, `grace`, `expired`, or `unlicensed`. |
| `activated_at` | timestamptz | When the key was last verified against the license server. |
| `last_checked_at` | timestamptz | Last successful re-check, used for grace-period math. |
| `payload` | jsonb | Signed metadata (product, tier, max connectors) from the license server. |

**Purpose.** Single source of truth for licensing. `LICENSE_GRACE_PERIOD_DAYS` controls how long the app stays operational after a failed online re-check; `LICENSE_PUBLIC_KEY` enables offline signature validation of `payload` (RSA+SHA-256, Ed25519, or Ed448 — algorithm is derived from the key type).

---

## `admin_user`

The single admin account used for local (non-SSO) login.

| Column | Type | Purpose |
|---|---|---|
| `id` | integer (PK) | Surrogate key. |
| `username` | text unique | Defaults to `admin` (`ADMIN_USERNAME` env var). |
| `password_hash` | text | scrypt hash of the password. |
| `created_at` | timestamptz | Row creation time. |
| `updated_at` | timestamptz | Bumped on password change. |

**Purpose.** Local admin credential store. On first boot, InfraWatch seeds this table from `ADMIN_USERNAME` / `ADMIN_PASSWORD` if it is empty — change the password immediately after first login.

---

## `sessions`

Browser session tokens issued at login.

| Column | Type | Purpose |
|---|---|---|
| `token` | text (PK) | Opaque high-entropy session identifier; stored in the `session` cookie. |
| `created_at` | timestamptz | When the session was issued. |
| `expires_at` | timestamptz | Hard expiry — 30 days after creation. |
| `sso_provider` | text | `saml` or `oidc` if the session was created through SSO; null for local logins. |
| `sso_email` | text | Email asserted by the IdP. |
| `sso_name` | text | Display name asserted by the IdP. |

**Purpose.** Sessions are server-side — rotating `CONNECTOR_ENCRYPTION_KEY` or restarting the app does not invalidate live sessions. Expired rows are cleaned lazily on lookup.

---

## `login_attempts`

Per-IP rate-limit ledger for local login.

| Column | Type | Purpose |
|---|---|---|
| `id` | bigserial (PK) | |
| `ip` | text | Client IP extracted from `X-Forwarded-For` / `X-Real-IP` / socket. |
| `attempted_at` | timestamptz | Insert time. |

**Purpose.** Enforces "5 failed attempts per 15 minutes" against `/api/auth/login`. Rows older than the window are ignored. No count is maintained; the policy is a rolling count of rows inside the window.

---

## `connectors`

Metrics source definitions — NQRust Hypervisor.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Generated at creation. |
| `name` | text | Operator-chosen display name. |
| `connector_type` | text | `nqrust_hypervisor`. |
| `base_url` | text | Prometheus-compatible `/api/v1` root. |
| `auth_type` | text | `none`, `basic`, or `bearer`. |
| `auth_credentials` | text | AES-256-GCM ciphertext of the secret (see [Security model](security-model/)). |
| `insecure_tls` | boolean | Skip TLS verification for self-signed certs. |
| `environment` | text | Namespacing label — `prod`, `stg`, etc. |
| `site` | text | Geographic label. |
| `datacenter` | text | Finer-grained location label. |
| `notes` | text | Free-form operator notes. |
| `enabled` | boolean | If false, domain layer skips this connector. |
| `created_at` / `updated_at` | timestamptz | Audit timestamps. |

**Purpose.** Every host, cluster, VM, and alert in the fleet view is sourced through a row here. Secrets are encrypted at rest; only decrypted transiently by the Prometheus client.

---

## `connector_health`

Rolling health history for each connector.

| Column | Type | Purpose |
|---|---|---|
| `id` | bigserial (PK) | |
| `connector_id` | uuid (FK → `connectors.id`) | Parent connector. |
| `checked_at` | timestamptz | When the probe ran. |
| `status` | text | `healthy`, `degraded`, `unreachable`. |
| `latency_ms` | integer | Round-trip time of the probe. |
| `error` | text | Optional diagnostic message on failure. |

**Purpose.** Feeds the Connectors page (`/live/connectors`) and supports trend charts. Written by the test endpoint and by periodic background probes.

---

## `alert_rules`

Operator-defined thresholds that drive alert firing.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | Human-readable rule name. |
| `entity_type` | text | `host`, `compute_cluster`, `storage_cluster`, … |
| `metric` | text | Entity attribute or derived metric (e.g. `cpu_pct`, `memory_pct`). |
| `operator` | text | `>`, `>=`, `<`, `<=`, `==`, `!=`. |
| `threshold` | double precision | Numeric boundary. |
| `severity` | text | `info`, `warning`, `critical`. |
| `enabled` | boolean | Evaluator skips disabled rules. |
| `scope` | jsonb | Optional filters (environment, site, datacenter, name regex). |
| `created_at` / `updated_at` | timestamptz | |

**Purpose.** Drives `alert-evaluator.ts`. Rules are evaluated against every entity the evaluator sees, scoped by `scope`, using the same live cache as the UI.

---

## `alerts`

Fired (and resolved) alerts.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | |
| `rule_id` | uuid (FK → `alert_rules.id`) | Rule that fired. |
| `entity_type` | text | Mirror of the rule's `entity_type`. |
| `entity_id` | text | Stable id of the entity (e.g. host id, cluster id). |
| `entity_name` | text | Display name at fire time. |
| `severity` | text | Copied from the rule at fire time. |
| `status` | text | `firing`, `acknowledged`, or `resolved`. |
| `value` | double precision | Observed value that crossed the threshold. |
| `threshold` | double precision | Threshold from the rule at fire time. |
| `fired_at` | timestamptz | When the alert opened. |
| `acknowledged_at` | timestamptz | Set by `PATCH /api/alerts/[id]` with `action=acknowledge`. |
| `resolved_at` | timestamptz | Set on auto-resolve or explicit `action=resolve`. |
| `labels` | jsonb | Environment, site, datacenter and any other scope labels. |

**Purpose.** Single alert stream for the UI, count badge, and audit. Compound indexes on `(status, fired_at)` and `(entity_type, entity_id)` keep lookups fast at millions of rows. Rows with `status=resolved` and `resolved_at < now() - 30 days` are purged by the evaluator.

---

## `audit_log`

Administrative actions.

| Column | Type | Purpose |
|---|---|---|
| `id` | bigserial (PK) | |
| `action` | text | Dotted key — `auth.login`, `auth.logout`, `connector.create`, `connector.update`, `connector.delete`, `sso.config_updated`, … |
| `target_id` | text | Optional target resource id. |
| `target_name` | text | Optional target display name. |
| `detail` | jsonb | Arbitrary action-specific metadata. |
| `ip` | text | Client IP extracted from request headers. |
| `created_at` | timestamptz | Insert time. |

**Purpose.** Non-repudiable record of who did what. Written by `lib/server/audit.ts` from every mutating route handler. Retain indefinitely unless your compliance policy says otherwise.

---

## Next steps

- [Security model](security-model/) — how the secret columns above are protected.
- [Settings & Admin](../../settings/) — the UI that writes into these tables.
