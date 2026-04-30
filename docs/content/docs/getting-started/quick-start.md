+++
title = "Quick Start"
description = "Log in, activate your license, and add your first connector"
weight = 22
date = 2026-04-23

[extra]
toc = true
+++

This guide assumes you have completed the [Installation](../installation/) and the `infrawatch` service is running. You'll log in, accept the EULA, activate your license, and add your first NQRust Hypervisor connector.

---

## 1. Open the Web UI

Navigate to your host in a browser. The URL is shown on the installer's completion screen, typically:

```
http://<your-host-ip>:3001
```

You will be redirected to `/login`.

> 📸 **Screenshot needed:** `/images/quick-start/login-page.png`
> **Page to capture:** `/login`
> **What to show:** The InfraWatch login form with Username and Password fields and the "Sign in" button.

Log in with the default credentials:

- **Username:** `admin`
- **Password:** `admin`

{{% alert icon="⚠️" context="warning" %}}
Change the default admin password immediately after first login via **Settings → Account**. The login endpoint is rate-limited to 5 failed attempts per 15 minutes, and the admin password is scrypt-hashed on first use.
{{% /alert %}}

---

## 2. Accept the EULA

On first login, InfraWatch displays the End User License Agreement. Read the terms, tick the checkbox, and click **I Accept** to continue. The EULA is also available in Bahasa Indonesia via the language selector.

> 📸 **Screenshot needed:** `/images/quick-start/eula-modal.png`
> **Page to capture:** `/login` (post-auth EULA overlay) or `/setup`
> **What to show:** The EULA modal with scrollable agreement text, the language selector, the acceptance checkbox, and the "I Accept" button.

For a summary of what you're agreeing to, see [EULA](../eula/).

---

## 3. Activate Your License

After accepting the EULA, InfraWatch redirects unlicensed instances to `/setup` (and then `/setup/license`). Activate your license using either a license key or an offline `.lic` file.

> 📸 **Screenshot needed:** `/images/quick-start/license-setup.png`
> **Page to capture:** `/setup/license`
> **What to show:** The license activation page with the two tabs ("License Key" and "Offline File") and the key input formatted as `XXXX-XXXX-XXXX-XXXX`.

Full walkthrough and API details live in [License Activation](../license/).

---

## 4. View the Dashboard

Once the license is active, you land on the main dashboard. With no connectors configured, the fleet summary cards will show zeroes — that's expected.

> 📸 **Screenshot needed:** `/images/quick-start/dashboard-empty.png`
> **Page to capture:** `/` (dashboard)
> **What to show:** The InfraWatch dashboard with empty fleet cards (0 hosts, 0 clusters, 0 alerts) and the sidebar navigation visible.

The sidebar is your entry point to every area:

| Nav item | Purpose |
|---|---|
| **Dashboard** | Fleet-wide overview cards |
| **Connectors** | Add and manage NQRust Hypervisor data sources |
| **Hosts** | Per-host CPU, memory, disk, network, uptime |
| **Clusters** | Compute and storage cluster drill-down |
| **VMs** | NQRust MicroVM inventory |
| **Alerts** | Alert rules and fired alerts |
| **Settings** | Account, license, audit log |

---

## 5. Add Your First Connector

Click **Connectors** in the sidebar. You'll land on an empty connectors list.

> 📸 **Screenshot needed:** `/images/quick-start/connectors-empty.png`
> **Page to capture:** `/connectors`
> **What to show:** The connectors page in its empty state, showing the "No connectors yet" message and the prominent **Add Connector** button.

Click **Add Connector**. The dialog asks for a name, endpoint URL, and optional authentication mode.

> 📸 **Screenshot needed:** `/images/quick-start/add-connector-dialog.png`
> **Page to capture:** `/connectors` (Add Connector dialog open)
> **What to show:** The Add Connector modal with fields: Name, URL, Authentication (none/basic/bearer), TLS options.

### Connector type

Use `nqrust_hypervisor`.

### Fill in the connection details

- **Name** — a friendly label (e.g. `nqrust-prod-a`).
- **URL** — the NQRust Hypervisor metrics endpoint.
- **Authentication** — `none`, `basic` (username + password), or `bearer` (token).
- **TLS** — tick "Skip certificate verification" only for self-signed certs you trust.

### Test before saving

Click **Test Connection**. InfraWatch pings the endpoint, validates auth, and reports the round-trip latency. Green means the connector is reachable and metrics parse correctly.

> 📸 **Screenshot needed:** `/images/quick-start/connector-test-success.png`
> **Page to capture:** `/connectors` (Add Connector dialog with test result)
> **What to show:** The dialog after a successful **Test Connection**, with a green "Connection OK — 42ms" badge and the **Save** button enabled.

Click **Save**. InfraWatch encrypts the credentials with `CONNECTOR_ENCRYPTION_KEY` and writes the row to the `connectors` table.

---

## 6. View the Fleet Overview

Head back to the **Dashboard**. Within one SWR polling cycle (30 seconds by default) the fleet cards populate with hosts, clusters, and VM counts pulled through your new connector.

> 📸 **Screenshot needed:** `/images/quick-start/dashboard-populated.png`
> **Page to capture:** `/` (dashboard, post-connector)
> **What to show:** The dashboard with populated fleet cards showing host counts, healthy/warning/critical breakdowns, and the "Last updated" timestamp ticking.

From here, drill into **Hosts** for per-server CPU/memory/network, **Clusters** for compute and storage cluster views, or **Alerts** to configure your first threshold-based rule.

---

## Next Steps

- **[Connectors](../../connectors/)** — configure additional NQRust Hypervisor sources across your datacenters.
- **[Fleet & Monitoring](../../fleet/)** — understand the host, cluster, and VM views.
- **[Alerts](../../alerts/)** — set up threshold-based alert rules with batched evaluation.
- **[Settings & Admin](../../settings/)** — change the admin password, rotate `CONNECTOR_ENCRYPTION_KEY`, and review the audit log.
