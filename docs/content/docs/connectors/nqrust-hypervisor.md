+++
title = "NQRust Hypervisor"
description = "Host metrics and per-VM inventory from an NQRust Hypervisor cluster."
weight = 32
date = 2026-04-23

[extra]
toc = true
+++

The `nqrust_hypervisor` connector is purpose-built for **NQRust Hypervisor** environments. InfraWatch talks to the hypervisor's built-in Prometheus through the Rancher/Harvester proxy endpoint and authenticates with an Access Key / Secret Key pair.

---

## What you get

- Host CPU, memory, disk, network, load, and uptime telemetry
- VM inventory and VM lifecycle visibility
- VM-to-host placement mapping for capacity planning
- Storage telemetry from hypervisor-integrated stacks

---

## Setup walkthrough

The connector needs two things from your NQRust Hypervisor:

1. **A Prometheus URL** — exposed by the `rancher-monitoring` add-on.
2. **An API Key pair** — generated from the admin's Account & API Keys page.

Complete step 1 first (so Prometheus is actually collecting metrics), then step 2.

### 1. Enable rancher-monitoring

The Prometheus stack ships as an opt-in add-on. Enable it once per hypervisor.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/1-addons.png" alt="Advanced → Add-ons" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Open the NQRust Hypervisor console and navigate to **Advanced → Add-ons**. You will see a list that includes `rancher-monitoring` in the **Disabled** state.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/2-rancher-mon-addons.png" alt="rancher-monitoring add-on detail" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Click `rancher-monitoring` to open the add-on detail page.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/3-enable.png" alt="Enable rancher-monitoring from the overflow menu" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Open the overflow menu (the `⋮` next to **Show Configuration**) and choose **Enable**. Deployment takes a minute or two; the status transitions `Disabled → Enabling → Deploy Successful`.

{{% alert icon="⚡" context="info" %}}
Defaults work for most fleets: Scrape Interval `1m`, Retention `5d`, Retention Size `50GiB`, CPU request `750m`, memory request `1750Mi`. Tune only if you need longer retention or have tight node resources.
{{% /alert %}}

### 2. Copy the Prometheus URL

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/4-navigate-to-prome.png" alt="Prometheus tab on rancher-monitoring" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Once the add-on shows **Deploy Successful**, click the **Prometheus** tab and then the external-link icon next to **Prometheus Graph**. The browser opens the Prometheus UI through the Rancher proxy. Copy the URL from the address bar — it looks like this:

```text
https://<hypervisor-host>/k8s/clusters/local/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy
```

Example:

```text
https://192.168.18.230/k8s/clusters/local/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy
```

That entire string — including the `/proxy` suffix and **not** anything after it — goes into the Hypervisor Prometheus URL field in InfraWatch.

### 3. Create an Access Key and Secret Key

NQRust Hypervisor issues credentials as an **Access Key + Secret Key** pair. InfraWatch combines them into a single bearer token.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/api/1.png" alt="Avatar menu → Account & API Keys" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Click the admin avatar at the top right and choose **Account & API Keys**.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/api/2.png" alt="API Keys list" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

The page lists existing keys and shows the API Endpoint (e.g. `https://192.168.18.230/v3`). Click **Create API Key** in the top-right.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/api/3.png" alt="API Key creation form" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Fill the form:

- **Description** — something identifiable, e.g. `infrawatch-readonly`
- **Scope** — leave as `No Scope` for full cluster read access
- **Automatically expire** — pick `Never` for a long-lived connector token (or any expiry that matches your rotation policy)

Click **Create**. The next screen shows the **Access Key** (looks like `token-f56kh`) and **Secret Key** (a long opaque string). The Secret Key is shown **only once** — copy both immediately.

### 4. Paste into InfraWatch

In InfraWatch, open `/connectors` → **Add Connector**:

| Field | Value |
|---|---|
| Cluster Name | Any display name — e.g. `NQRust Production` |
| Hypervisor Prometheus URL | The full `.../proxy` URL from step 2 |
| Auth Mode | **Bearer token** |
| Bearer Token | `<access_key>:<secret_key>` — the two keys joined with a colon |
| Environment / Site / Datacenter | Labels used for fleet grouping |
| Insecure TLS | Enable if the hypervisor uses a self-signed certificate |

Example bearer token:

```text
token-f56kh:j8qkrvgqlljmrxwgzjh6t2p6m9srrmmq79jvdh9lfjjttsck8v2z27
```

Click **Add Connector**, then **Test Connection** on the connector detail page. A healthy test returns latency in the low hundreds of milliseconds.

{{% alert icon="🔐" context="info" %}}
Prefer Basic auth? Switch **Auth Mode** to Basic and use the Access Key as the username and the Secret Key as the password. Either mode works; Bearer is just one field to manage.
{{% /alert %}}

Credentials are encrypted at rest with AES-256-GCM — see [Security model](../../architecture/security-model/) for details.

---

## Test connection

**Test Connection** runs `sum(up)` against the endpoint and reports round-trip latency. On save, InfraWatch also runs required hypervisor checks and marks rows `healthy` or `degraded`.

> 📸 **Screenshot needed:** `/images/connectors/nqrust-hypervisor-test-success.png`
> **Page to capture:** `/connectors/{id}` (after **Test Connection**)
> **What to show:** Successful test banner with latency and healthy status.

---

## Troubleshooting

### Host metrics missing

Verify the `rancher-monitoring` add-on is in **Deploy Successful** state, and that node exporters (shown under the **Prometheus Node Exporter** tab) are running.

### Storage metrics missing

Confirm your storage stack is being scraped by `rancher-monitoring`. Check the same Prometheus UI you opened in step 2 for a live `up == 1` result on the storage exporters.

### 401 or 403 on test

The Access Key or Secret Key is wrong, revoked, or the key expired. Regenerate a pair from **Account & API Keys** and update the connector.

### Connection refused / timeout

Confirm the hypervisor host is reachable from InfraWatch (`curl -k https://<host>/k8s/clusters/local/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy/api/v1/query?query=up`). If the hypervisor uses a self-signed certificate, enable **Insecure TLS** on the connector.

---

## Related

- [Connectors overview](../)
- [Manage Connectors](../manage-connectors/)
- [Fleet & Monitoring](../../fleet/)
- [API Reference > Connectors](../../api-reference/#connectors)
