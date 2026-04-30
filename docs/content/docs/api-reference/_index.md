+++
title = "API Reference"
description = "REST endpoints exposed under /api/* — auth, connectors, alerts, live data, Prometheus, license, and settings."
weight = 80
date = 2026-04-23

[extra]
toc = true
+++

Every route under `app/api/` is documented in this section. The UI consumes the exact same endpoints, so anything the dashboard can do is scriptable from `curl`, CI, or a downstream tool.

---

## Authentication model

InfraWatch uses **server-side session cookies** plus a **CSRF token** for mutations.

1. `POST /api/auth/login` with JSON credentials returns two cookies:
   - `session` — HttpOnly, 30-day expiry, opaque token checked against the `sessions` table.
   - `csrf_token` — readable by the client, echoed on every mutation.
2. Every protected route expects the `session` cookie. Mutating routes additionally expect `X-CSRF-Token: <csrf cookie value>`.
3. SSO flows (`/api/auth/sso/saml/*`, `/api/auth/sso/oidc/*`) issue the same cookies at the end of the IdP round-trip.

{{% alert icon="🔐" context="warning" %}}
Route handlers that call `requireSession(request)` reject unauthenticated requests with `401`, and mutations without a matching CSRF header with `403`. Read-only helper endpoints (live data, alert counts) are public by default; see each page for specifics.
{{% /alert %}}

### Using the API from `curl`

```bash
# 1. Log in and save cookies
curl -c cookies.txt -X POST https://infrawatch.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<your-password>"}'

# 2. Read the CSRF token
CSRF=$(awk '$6=="csrf_token"{print $7}' cookies.txt)

# 3. Call a mutation
curl -b cookies.txt -X POST https://infrawatch.example.com/api/connectors \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"name":"nqrust-prod","connectorType":"nqrust_hypervisor","baseUrl":"http://prom:9090","authType":"none"}'
```

---

## Base URL

InfraWatch is a single-origin app. The API base URL is the same host and scheme as the dashboard, at path `/api`:

```
https://<your-infrawatch-host>/api
```

All endpoints below are relative to that base.

---

## Response shape

Successful JSON responses follow one of three shapes depending on the endpoint family:

| Shape | Example | Used by |
|---|---|---|
| `{ "data": <value> }` | `{ "data": [ { "id": "…" } ] }` | Connector, alert, alert-rule endpoints. |
| Domain payload | `{ "data": [...], "meta": {...} }` | Live endpoints (`/api/live/*`) and Prometheus proxy. |
| Action result | `{ "ok": true }` / `{ "success": true }` | Auth, license, settings mutations. |

Errors always return a non-2xx HTTP status with:

```json
{ "error": "Human-readable message" }
```

---

## Endpoint groups

| Group | Path prefix | Purpose |
|---|---|---|
| [Auth](auth/) | `/api/auth` | Login, logout, session check, SSO flows. |
| [Connectors](connectors/) | `/api/connectors` | CRUD and connectivity test for metrics sources. |
| [Alerts](alerts/) | `/api/alerts`, `/api/alert-rules` | Alert streams, rules, acknowledge/resolve. |
| [Live data](live/) | `/api/live/*` | SWR-polled dashboard data (overview, hosts, clusters, VMs, apps, connectors, dashboards). |
| [Prometheus](prometheus/) | `/api/prometheus` | Per-connector PromQL `query` and `query_range` proxy. |
| [License](license/) | `/api/license` | License status, activation, deactivation, offline file upload. |
| [Settings](settings/) | `/api/settings` | SSO provider configuration. |

---

## Next steps

- New to the API? Start with [Auth](auth/) to get a working session, then hit [Live data](live/) to see real fleet data.
- Building an automation? See [Connectors](connectors/) for provisioning and [Alerts](alerts/) for rule management.
- Running ad-hoc PromQL? Jump straight to [Prometheus](prometheus/).
