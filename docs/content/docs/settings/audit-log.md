+++
title = "Audit Log"
description = "The audit_log table schema, the exact actions recorded, and how to prune old rows"
weight = 64
date = 2026-04-23

[extra]
toc = true
+++

Every security-relevant action in InfraWatch writes a row to `audit_log` in PostgreSQL via `logAudit()` in `lib/server/audit.ts`. The table is append-only from the application's perspective — the code never updates or deletes rows — so you get a complete chronological record of logins, connector changes, and SSO configuration changes.

There is **no automatic retention** today. Old rows stay forever unless you prune them.

---

## Schema

```sql
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  action      TEXT NOT NULL,                                -- e.g. "auth.login"
  target_id   TEXT,                                         -- opaque identifier of the affected object
  target_name TEXT,                                         -- human-readable name of the affected object
  detail      JSONB,                                        -- structured context (username, error, etc.)
  ip_address  TEXT,                                         -- client IP from x-forwarded-for / x-real-ip
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Every field except `action` and `created_at` is nullable. Handlers populate `target_id` / `target_name` when the action references a specific object (e.g. a connector), and `detail` is an arbitrary JSON object — there is no schema on it, only convention.

`logAudit()` catches and logs any database error internally (via `console.error`) and never throws — an audit-log outage does not break the request that triggered it. Review `lib/server/audit.ts` if you change that behavior.

---

## What Gets Recorded

The list below is **every action key written today**, verified by grepping the codebase. Treat this as authoritative — if a feature you expect to be audited is not listed here, it is not currently logged.

### Authentication

| Action | Emitted by | `detail` fields |
|---|---|---|
| `auth.login` | `POST /api/auth/login` on success | `{ username }` |
| `auth.login_failed` | `POST /api/auth/login` on bad credentials | `{ username }` (password never logged) |
| `auth.logout` | `POST /api/auth/logout` | *(none)* |
| `auth.sso_login` | `POST /api/auth/sso/saml/callback`, `GET /api/auth/sso/oidc/callback` on success | `{ provider, email, name }` |
| `auth.sso_login_failed` | Same two routes on failure | `{ provider, error }` |

### Connectors

| Action | Emitted by | `detail` fields |
|---|---|---|
| `connector.create` | `POST /api/connectors` | See `app/api/connectors/route.ts` |
| `connector.update` | `PATCH /api/connectors/[id]` | See `app/api/connectors/[id]/route.ts` |
| `connector.delete` | `DELETE /api/connectors/[id]` | See `app/api/connectors/[id]/route.ts` |

### SSO

| Action | Emitted by | `detail` fields |
|---|---|---|
| `sso.config_updated` | `PUT /api/settings/sso` | `{ provider, enabled }` |

### Not Yet Audited

The task brief lists alert-rule changes, license changes, and admin user updates as expected audit events. At the time of writing, **none of these surfaces call `logAudit()`** — see source for details:

- Alert rules (`app/api/alert-rules/*`) — not wired up. To add, call `logAudit("alert_rule.create" | "alert_rule.update" | "alert_rule.delete", …)` from the handlers.
- License changes (`app/api/license/*`) — not wired up.
- Admin user updates — there is no admin-update endpoint; the row is only seeded on first boot (see [Authentication](../authentication/)).

{{% alert icon="⚠️" context="warning" %}}
If your compliance requirements demand audit records for alert-rule or license changes, add `logAudit()` calls to the relevant route handlers. The helper signature is stable: `logAudit(action, { targetId?, targetName?, detail?, ip? })`.
{{% /alert %}}

---

## Viewing the Log

InfraWatch does not currently ship a dedicated audit-log viewer page — `app/settings/page.tsx` has no audit section, and there is no `/audit` route. Until one is added, query the table directly:

```sql
-- Recent events, newest first
SELECT created_at, action, ip_address, detail
FROM audit_log
ORDER BY created_at DESC
LIMIT 50;

-- Failed logins from a specific IP in the last day
SELECT created_at, detail->>'username' AS username
FROM audit_log
WHERE action = 'auth.login_failed'
  AND ip_address = '10.0.0.42'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Every SSO config change
SELECT created_at, detail
FROM audit_log
WHERE action = 'sso.config_updated'
ORDER BY created_at DESC;
```

> 📸 **Screenshot placeholder (page not yet implemented):** If an audit-log viewer is added under `/settings`, capture it at `/images/settings/audit-log/audit-log-viewer.png` showing the event list with action, timestamp, IP, and expanded detail row.

---

## Retention

**Retention is not automatic.** There is no background job, no cron entry installed by the installer, and no configuration setting to cap the table size. A quick search of `lib/server/` confirms only the alerts store has a purge routine (`purgeOldAlerts()` in `alerts-store.ts`); the audit log has no equivalent.

You have two options:

### Manual Pruning

Run a periodic delete — a daily cron is usually enough:

```sql
-- Keep the last 90 days
DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Or keep the last 1 000 000 rows
DELETE FROM audit_log
WHERE id < (SELECT id FROM audit_log ORDER BY id DESC OFFSET 1000000 LIMIT 1);
```

Wrap this in a `psql` call from cron or a systemd timer:

```bash
0 3 * * * psql -U infrawatch -d infrawatch \
  -c "DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';"
```

### External Archival

Before pruning, export to long-term storage so compliance queries survive:

```bash
psql -U infrawatch -d infrawatch \
  -c "\COPY (SELECT * FROM audit_log WHERE created_at < NOW() - INTERVAL '30 days') \
      TO '/var/backups/infrawatch/audit-$(date +%Y-%m).csv' CSV HEADER"
```

Rotate the CSVs off the host (S3, cold storage, SIEM ingestion, etc.) before deleting the rows from the live table.

{{% alert icon="⚠️" context="warning" %}}
Deleting from `audit_log` is an `INSERT`-only table's only destructive operation. Always back up first. If you need tamper-evidence, replicate rows to an append-only external store (e.g. object storage with object-lock) immediately after they are written — do not rely on the live table alone.
{{% /alert %}}

---

## Related

- [License Activation](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Architecture](../../architecture/)
