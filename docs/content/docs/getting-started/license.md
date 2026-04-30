+++
title = "License Activation"
description = "Activate InfraWatch with a license key or offline .lic file, and understand grace-period behavior"
weight = 23
date = 2026-04-23

[extra]
toc = true
+++

After the installer completes and you log in for the first time, InfraWatch requires a license before the dashboard becomes usable. Unlicensed instances are redirected to `/setup/license` until a valid key is activated.

This page covers the three supported activation paths (UI, API, offline file), the environment variables that control license verification, and the grace-period fallback.

---

## Configuration

License behavior is controlled by four environment variables in `/opt/infrawatch/.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `LICENSE_API_KEY` | Yes (for online activation) | — | Bearer token used to authenticate against the license server. Issued by Nexus Quantum Tech. |
| `LICENSE_SERVER_URL` | No | `https://billing.nexusquantum.id` | Override the license server endpoint (rarely needed). |
| `LICENSE_GRACE_PERIOD_DAYS` | No | `7` | Days InfraWatch continues to operate after a verification failure, using the last cached result. |
| `LICENSE_PUBLIC_KEY` | Required for offline `.lic` files | — | Public key (PEM, with literal `\n` escapes) used to verify offline license signatures. RSA (with SHA-256), Ed25519, and Ed448 keys are all supported — the verifier picks the algorithm from the key type. |

{{% alert icon="⚡" context="info" %}}
Never expose `LICENSE_API_KEY` to the browser. All verification calls are made server-side from the Next.js route handlers under `/api/license/`.
{{% /alert %}}

---

## Activation Methods

There are two ways to activate your license:

| Method | When to use |
|---|---|
| **License Key** | Online environments with outbound HTTPS to `LICENSE_SERVER_URL` |
| **Offline File** | Air-gapped networks or restricted environments |

---

## Online — License Key (UI)

> 📸 **Screenshot needed:** `/images/license/setup-license.png`
> **Page to capture:** `/setup/license`
> **What to show:** The license setup page with the "License Key" tab selected and the `XXXX-XXXX-XXXX-XXXX` input empty and focused.

1. Navigate to `http://<your-host>:3001/setup/license` (you'll be redirected here automatically on first login).
2. Make sure the **License Key** tab is selected.
3. Enter your key in the format `XXXX-XXXX-XXXX-XXXX`. The input auto-uppercases and auto-inserts dashes as you type.
4. Click **Activate License**.

On success you'll be redirected to the dashboard.

> 📸 **Screenshot needed:** `/images/license/activation-success.png`
> **Page to capture:** `/setup/license` (post-activation state)
> **What to show:** The success panel showing the license status ("active"), customer name, product, expiry date, and activation count (e.g. "2 / 5").

{{% alert icon="🔑" context="info" %}}
License keys are issued by Nexus Quantum Tech. Contact your account representative or check your purchase confirmation email if you don't have one.
{{% /alert %}}

---

## Online — License Key (API)

The UI is a thin wrapper over the activation endpoint — you can activate headlessly from a shell or CI pipeline.

**Endpoint:** `POST /api/license/activate`

**Request body:**

```json
{
  "licenseKey": "ABCD-EFGH-IJKL-MNOP"
}
```

**Example:**

```bash
curl -X POST http://<your-host>:3001/api/license/activate \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"licenseKey":"ABCD-EFGH-IJKL-MNOP"}'
```

**Success response** — the full `LicenseState`:

```json
{
  "isLicensed": true,
  "status": "active",
  "isGracePeriod": false,
  "graceDaysRemaining": null,
  "customerName": "Acme Corp",
  "product": "InfraWatch",
  "features": ["multi-connector", "alerts"],
  "expiresAt": "2027-01-01",
  "activations": 2,
  "maxActivations": 5,
  "verifiedAt": "2026-04-23T10:15:00.000Z",
  "licenseKey": "ABCD-****-****-MNOP",
  "errorMessage": null
}
```

On failure, `isLicensed` is `false` and `errorMessage` contains a human-readable reason (`license_expired`, `invalid_license`, `max_activations_reached`, `license_revoked`).

The activation endpoint is admin-only and CSRF-protected — make sure you've already logged in and are reusing the session cookie.

---

## Offline — License File (UI)

Use this method when the InfraWatch host has no outbound internet access (airgap install).

> 📸 **Screenshot needed:** `/images/license/setup-offline.png`
> **Page to capture:** `/setup/license` (Offline File tab)
> **What to show:** The "Offline File" tab active, with the drag-and-drop upload area and the "Upload & Activate" button disabled until a file is selected.

1. Obtain a `.lic` license file from Nexus Quantum Tech. The file is a signed payload (RSA with SHA-256 by default; Ed25519 and Ed448 are also supported) — tampering with it invalidates the signature.
2. Ensure `LICENSE_PUBLIC_KEY` is set in `/opt/infrawatch/.env` (the installer can wire this for airgap installs).
3. Navigate to `/setup/license` and select the **Offline File** tab.
4. Click the upload area or drag-and-drop your `.lic` file.
5. Click **Upload & Activate**.

{{% alert icon="⚠️" context="warning" %}}
Offline license files are tied to the machine fingerprint they were issued for. Do not copy `.lic` files between hosts — they will be rejected.
{{% /alert %}}

---

## Offline — License File (API)

**Endpoint:** `POST /api/license/upload`

**Request body** — the raw text contents of the `.lic` file, sent as JSON:

```json
{
  "fileContent": "-----BEGIN LICENSE-----\n...\n-----END LICENSE-----\n-----BEGIN SIGNATURE-----\n...\n-----END SIGNATURE-----"
}
```

**Example:**

```bash
curl -X POST http://<your-host>:3001/api/license/upload \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d "$(jq -Rs '{fileContent: .}' < license.lic)"
```

The server verifies the signature against `LICENSE_PUBLIC_KEY` — selecting the algorithm from the key type (RSA+SHA-256, Ed25519, or Ed448) — decodes the base64 payload, checks the expiration date, persists the file alongside the key, and caches the result in the `license` table.

---

## Check License Status

**Endpoint:** `GET /api/license/status`

Returns the current `LicenseState` (same shape as the activate response). This is the endpoint the client-side guard polls to detect license revocation or expiration mid-session.

```bash
curl http://<your-host>:3001/api/license/status -b cookies.txt
```

Example response for a valid license:

```json
{
  "isLicensed": true,
  "status": "active",
  "isGracePeriod": false,
  "customerName": "Acme Corp",
  "expiresAt": "2027-01-01",
  "licenseKey": "ABCD-****-****-MNOP"
}
```

Example response while in grace period after a verification failure:

```json
{
  "isLicensed": true,
  "status": "grace_period",
  "isGracePeriod": true,
  "graceDaysRemaining": 4,
  "verifiedAt": "2026-04-19T09:00:00.000Z"
}
```

---

## Deactivation

To release an activation slot (for example, when migrating InfraWatch to a new host), deactivate the current installation first.

**Endpoint:** `POST /api/license/deactivate`

```bash
curl -X POST http://<your-host>:3001/api/license/deactivate -b cookies.txt
```

The server clears the persisted key, removes the cached license row, and returns `{ "ok": true }` on success. After deactivation, the instance reverts to the unlicensed state and redirects all non-public routes back to `/setup/license`.

---

## Grace Period

InfraWatch uses a three-tier verification strategy so transient network failures don't take down your monitoring:

1. **Online verification** — `POST https://billing.nexusquantum.id/api/v1/licenses/verify` via the server-side license service.
2. **Offline `.lic` file** — if the server is unreachable, any uploaded `.lic` file is re-verified locally against `LICENSE_PUBLIC_KEY`.
3. **Cached DB result + grace period** — if both of the above fail, the last successful verification (stored in the `license` table) remains valid for `LICENSE_GRACE_PERIOD_DAYS` (default **7** days).

While in grace period, the dashboard shows a warning banner with the remaining days. Once the grace period expires, the instance becomes unlicensed and redirects back to `/setup/license`.

{{% alert icon="⚡" context="info" %}}
The grace period resets on every successful verification. In practice, as long as the license server is reachable at least once per week (with the default `LICENSE_GRACE_PERIOD_DAYS=7`), users will never see the grace-period banner.
{{% /alert %}}

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Invalid license key" | Check for typos; keys are case-insensitive and auto-dashed by the UI. |
| "License already in use" / `max_activations_reached` | Contact Nexus Quantum Tech to transfer, release, or raise the activation limit. |
| Offline `.lic` file rejected | Verify `LICENSE_PUBLIC_KEY` is set in `/opt/infrawatch/.env`, and that the file was generated for this exact host. |
| Stuck on `/setup/license` after a successful activation | Clear browser cache and reload; check `GET /api/license/status` to confirm the server sees the license as active. |
| `Cannot reach license server` | Confirm the host has outbound HTTPS to `https://billing.nexusquantum.id`. For airgap installs, use the [offline file method](#offline--license-file-ui) instead. |

---

## Source of Truth

- `app/api/license/activate/route.ts` — POST activate handler
- `app/api/license/upload/route.ts` — POST offline file upload handler
- `app/api/license/status/route.ts` — GET current license state
- `app/api/license/deactivate/route.ts` — POST deactivate handler
- `lib/server/license-service.ts` — the verification tier logic, masking, and persistence
- `LICENSING_TUTOR.md` — reference integration guide (framework-agnostic)
