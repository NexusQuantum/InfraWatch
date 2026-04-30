+++
title = "Manage Connectors"
description = "Create, edit, test, enable/disable, and delete NQRust Hypervisor connectors."
weight = 34
date = 2026-04-23

[extra]
toc = true
+++

The `/connectors` page is the control center for InfraWatch connector operations.

> 📸 **Screenshot needed:** `/images/connectors/list.png`
> **Page to capture:** `/connectors`
> **What to show:** List view with stats cards, status chips, and connector coverage columns.

---

## Create

Click **Add Connector** and submit:

```json
{
  "connectorType": "nqrust_hypervisor",
  "name": "NQRust Production",
  "baseUrl": "https://example/api/v1/...",
  "authMode": "bearer",
  "bearerToken": "...",
  "environment": "production",
  "site": "dc-a",
  "datacenter": "rack-1",
  "insecureTls": true,
  "notes": "optional"
}
```

InfraWatch encrypts secrets, writes an audit event (`connector.create`), and invalidates `live:` cache entries.

> 📸 **Screenshot needed:** `/images/connectors/add-dialog.png`
> **Page to capture:** `/connectors` (click **Add Connector**)
> **What to show:** Completed Add Connector form for an NQRust Hypervisor endpoint before save.

---

## Edit

Open `/connectors/{id}`, click **Edit**, and patch only changed fields.
If auth fields are provided, secret data is re-encrypted before save.

> 📸 **Screenshot needed:** `/images/connectors/edit-dialog.png`
> **Page to capture:** `/connectors/{id}` (click **Edit**)
> **What to show:** Edit side-sheet prefilled with current connector values.

---

## Test

**Test Connection** calls:

```http
POST /api/connectors/{id}/test
```

The backend decrypts stored auth config, runs `sum(up)`, and returns success/error plus latency.

---

## Enable and Disable

Disabling a connector keeps its encrypted credentials but removes it from live aggregation until re-enabled.

---

## Delete

Delete removes the connector record permanently and writes `connector.delete` to the audit log.

> 📸 **Screenshot needed:** `/images/connectors/row-actions.png`
> **Page to capture:** `/connectors` (hover connector row)
> **What to show:** Hover state revealing delete and open-details actions.

> 📸 **Screenshot needed:** `/images/connectors/delete-confirm.png`
> **Page to capture:** `/connectors` (click delete on a row)
> **What to show:** Confirmation popup before final connector deletion.

---

## Encryption

Connector credentials are stored in `secret_enc`, encrypted with AES-256-GCM using a key derived from `CONNECTOR_ENCRYPTION_KEY`.

---

## Source files

- `app/connectors/page.tsx`
- `app/connectors/[id]/page.tsx`
- `app/api/connectors/route.ts`
- `app/api/connectors/[id]/route.ts`
- `app/api/connectors/[id]/test/route.ts`
- `lib/server/connectors-store.ts`
- `lib/server/encryption.ts`

---

## Related

- [Connectors overview](../)
- [NQRust Hypervisor](../nqrust-hypervisor/)
- [Fleet & Monitoring](../../fleet/)
- [API Reference > Connectors](../../api-reference/#connectors)
