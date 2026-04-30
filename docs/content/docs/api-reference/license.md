+++
title = "License"
description = "License status inspection, activation, deactivation, and offline file upload."
weight = 86
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch ships with a built-in licensing system. The endpoints below drive the `/setup` activation flow and the license panel under Settings. All of them return the current `LicenseState` object (or a simple `{ ok: true }` on deactivate).

{{% alert icon="⚡" context="info" %}}
License endpoints are not session-guarded in the current implementation — they are intended to be callable from the `/setup` landing flow before any admin session exists. Put them behind the same reverse-proxy TLS boundary as the rest of the app.
{{% /alert %}}

---

## The `LicenseState` object

Every endpoint except `deactivate` returns this shape:

| Field | Type | Description |
|---|---|---|
| `isLicensed` | boolean | True iff `status` is `active` or `grace_period`. |
| `status` | enum | `active`, `expired`, `invalid`, `grace_period`, `unlicensed`, `unknown`. |
| `isGracePeriod` | boolean | True when the last online verification failed but the grace window is still open. |
| `graceDaysRemaining` | integer \| null | Days left in the grace window, or null if not applicable. |
| `customerName` | string \| null | Customer bound to the key (from the signed payload). |
| `product` | string \| null | Product slug (e.g. `infrawatch`). |
| `features` | string[] | Feature flags asserted by the license payload. |
| `expiresAt` | string \| null | RFC 3339 expiry from the license payload. |
| `activations` | integer \| null | Current activation count reported by the license server. |
| `maxActivations` | integer \| null | Max activations allowed by the tier. |
| `verifiedAt` | string \| null | Last successful verification timestamp. |
| `licenseKey` | string \| null | The current key, masked for display. |
| `errorMessage` | string \| null | Human-readable reason on any non-active status. |

---

## `GET /api/license/status`

Return the current license state without performing a fresh online check.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Not enforced |
| CSRF | Not required |

### Response — 200 OK

```json
{
  "isLicensed": true,
  "status": "active",
  "isGracePeriod": false,
  "graceDaysRemaining": null,
  "customerName": "Acme Co",
  "product": "infrawatch",
  "features": ["unlimited_connectors", "sso"],
  "expiresAt": "2027-04-23T00:00:00.000Z",
  "activations": 1,
  "maxActivations": 3,
  "verifiedAt": "2026-04-23T10:00:00.000Z",
  "licenseKey": "NQX-••••-••••-A1B2",
  "errorMessage": null
}
```

This endpoint never returns an error — if nothing is activated it returns the `UNLICENSED` state with `status: "unlicensed"`.

### Example

```bash
curl https://infrawatch.example.com/api/license/status
```

---

## `POST /api/license/activate`

Activate an online license key against the license server.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth | Not enforced |
| CSRF | Not required |

### Request body

```json
{ "licenseKey": "NQX-AAAA-BBBB-A1B2" }
```

### Response — 200 OK

Returns the resulting `LicenseState` (see shape above). On a successful activation, `status` becomes `active` and `verifiedAt` is stamped.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "licenseKey is required" }` | Missing or non-string key. |
| 500 | `{ "error": "Activation failed" }` or upstream message | License server unreachable, key invalid, activation limit reached. |

### Example

```bash
curl -X POST https://infrawatch.example.com/api/license/activate \
  -H 'Content-Type: application/json' \
  -d '{"licenseKey":"NQX-AAAA-BBBB-A1B2"}'
```

---

## `POST /api/license/deactivate`

Deactivate the current license locally (and notify the license server if reachable).

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth | Not enforced |
| CSRF | Not required |

### Request body

None.

### Response — 200 OK

```json
{ "ok": true }
```

After deactivation, `GET /api/license/status` returns the `UNLICENSED` state.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 500 | `{ "error": "Deactivation failed" }` | Unexpected internal failure. |

### Example

```bash
curl -X POST https://infrawatch.example.com/api/license/deactivate
```

---

## `POST /api/license/upload`

Upload an **offline** signed license file. The signature is verified against `LICENSE_PUBLIC_KEY` (RSA+SHA-256 by default; Ed25519 and Ed448 keys are also supported). Used by airgap and fully offline deployments.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth | Not enforced |
| CSRF | Not required |

### Request body

Send the raw file contents — typically a base64-wrapped JSON blob — as a string field:

```json
{ "fileContent": "-----BEGIN INFRAWATCH LICENSE-----\nMII…\n-----END INFRAWATCH LICENSE-----\n" }
```

### Response — 200 OK

Returns the resulting `LicenseState`. On success, `status` becomes `active` with the features and expiry from the signed payload.

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "fileContent is required" }` | Missing or non-string field. |
| 500 | `{ "error": "Upload failed" }` or a specific message like "Invalid signature" | Signature verification failed, payload malformed, `LICENSE_PUBLIC_KEY` not configured. |

### Example

```bash
curl -X POST https://infrawatch.example.com/api/license/upload \
  -H 'Content-Type: application/json' \
  -d "$(jq -Rn --arg f "$(cat license.lic)" '{fileContent:$f}')"
```

---

## Grace-period behaviour

Online activations are re-verified periodically. If the license server is unreachable:

1. The app keeps serving traffic for up to `LICENSE_GRACE_PERIOD_DAYS` (default 7) from the last successful verification.
2. `status` switches to `grace_period` and `graceDaysRemaining` counts down.
3. When the grace window expires, `status` becomes `expired` and the UI gates non-read-only actions.

Offline (uploaded) licenses do not require online verification; their `expiresAt` is the only clock that matters.

---

## Next steps

- [Settings & Admin → Licensing](../../settings/licensing/) — operator-facing UI.
- [Architecture → Data model → `license`](../../architecture/data-model/#license) — persistent state.
