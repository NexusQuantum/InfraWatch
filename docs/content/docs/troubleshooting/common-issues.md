+++
title = "Common Issues"
description = "Symptom, Cause, and Fix for the failure modes we see most often"
weight = 101
date = 2026-04-23

[extra]
toc = true
+++

Every entry below follows the same **Symptom / Cause / Fix** structure so you can scan quickly.

---

## Service & Runtime

### `systemctl status infrawatch` shows failed

**Symptom:** `sudo systemctl status infrawatch` prints `Active: failed (Result: exit-code)` or `Active: activating (auto-restart)` in a tight loop.

**Cause:** The Next.js process crashed on startup. The most common causes are an unreachable database, a missing or malformed `CONNECTOR_ENCRYPTION_KEY`, or the configured port being in use.

**Fix:** Tail the journal to get the crash reason:

```bash
sudo journalctl -u infrawatch -f
```

Then cross-reference the error against the database, CSRF, and port sections below. After fixing the underlying cause:

```bash
sudo systemctl restart infrawatch
sudo systemctl status infrawatch
```

---

### PostgreSQL connection failed

**Symptom:** The journal shows `ECONNREFUSED`, `password authentication failed`, `database "infrawatch" does not exist`, or `no pg_hba.conf entry for host`.

**Cause:** The `DATABASE_URL` in `/opt/infrawatch/.env` does not match the running PostgreSQL instance — wrong host, wrong port, wrong password, or SSL mismatch.

**Fix:** Verify PostgreSQL is running and listening on the expected port:

```bash
sudo systemctl status postgresql
sudo ss -tlnp | grep 5432
```

Then test the exact connection string from the InfraWatch host:

```bash
psql -h localhost -p 5432 -U infrawatch -d infrawatch
```

Check `/opt/infrawatch/.env` for:

- `DATABASE_URL` — must match what `psql` accepts above.
- `DATABASE_SSL` — set to `true` only when PostgreSQL is configured for SSL, otherwise leave unset or `false`.

The installer provisions PostgreSQL to listen on the `--db-port` you selected in `Full` mode; if you changed the port post-install, update both `postgresql.conf` (`listen_addresses`, `port`) and `DATABASE_URL`.

---

### Port 3001 already in use

**Symptom:** Service fails to start with `EADDRINUSE: address already in use :::3001` in the journal.

**Cause:** Another process (frequently a second copy of Next.js, a dev server, or an unrelated service) is already bound to port 3001.

**Fix:** Identify the offender:

```bash
sudo ss -tlnp | grep 3001
```

Kill it, or change InfraWatch's port by setting `PORT` in `/opt/infrawatch/.env` and restarting:

```bash
sudo sed -i 's/^PORT=.*/PORT=3002/' /opt/infrawatch/.env
sudo systemctl restart infrawatch
```

The `PORT` environment variable is documented in the [Configuration reference](../../getting-started/installation/#what-gets-installed).

---

## Connectors

### Connector test fails

**Symptom:** The **Test** button on `/connectors/<id>/edit` returns an error — `connection refused`, `401 Unauthorized`, `TLS handshake failed`, or `timeout`.

**Cause:** One of: the URL is wrong, the credentials on the connector don't match what the NQRust Hypervisor expects, the hypervisor's TLS certificate isn't trusted, or a firewall between InfraWatch and the hypervisor is dropping the request.

**Fix:** Reproduce the request from the InfraWatch host with `curl` using the same URL and auth as the connector. The NQRust Hypervisor exposes its embedded Prometheus on the configured endpoint:

```bash
# NQRust Hypervisor — no auth
curl -fsS 'http://hypervisor.internal:9090/api/v1/query?query=up'

# NQRust Hypervisor — basic auth
curl -fsS -u 'username:password' 'https://hypervisor.internal/api/v1/query?query=up'

# NQRust Hypervisor — bearer token
curl -fsS -H 'Authorization: Bearer <token>' 'https://hypervisor.internal/api/v1/query?query=up'
```

- If `curl` fails with `Connection refused` — the URL is wrong or a firewall is blocking.
- If `curl` fails with `401 Unauthorized` — the auth mode/credentials on the connector do not match what the hypervisor expects.
- If `curl` fails with `SSL certificate problem` — the hypervisor presents a cert InfraWatch doesn't trust. Either trust the issuing CA on the InfraWatch host, or toggle the "skip TLS verify" option on the connector if that is acceptable for your environment.
- If `curl` hangs — firewall or network path issue.

---

### Alerts not firing

**Symptom:** A metric is clearly breaching a threshold in the chart, but no alert is firing.

**Cause:** One of three things: the underlying **connector is unhealthy** (so the evaluator has no data), the **alert-rule threshold or operator is misconfigured**, or you are looking too soon — the alert evaluator runs at most **once per 60 seconds** regardless of how often the UI polls.

**Fix:** Walk the chain:

1. Go to **Connectors** and confirm the source connector is **Healthy** and the latency is reasonable.
2. Open the alert rule and verify the metric name, operator, threshold, and `for` duration.
3. Wait at least 60 seconds past the breach — the evaluator is throttled to once per minute.

See [Alerts](../../alerts/) for rule semantics and evaluation cadence.

---

### Charts empty

**Symptom:** A chart that used to have data is now blank or intermittently empty, even though the NQRust Hypervisor has the data.

**Cause:** The InfraWatch Prometheus client limits concurrent queries to **20 globally**. Under heavy load — many connectors, many simultaneous dashboard viewers — new queries queue behind in-flight ones. When the queue backs up past the request timeout, the UI renders an empty chart.

**Fix:** Reduce query pressure on the NQRust Hypervisor connectors:

- Reduce the number of dashboards auto-refreshing at the same cadence, or lengthen the SWR polling interval for heavy views.
- If a single NQRust Hypervisor node is under sustained query load, check whether the hypervisor itself is resource-constrained (CPU, memory) and scale accordingly.
- Confirm the connector's configured timeout is high enough for the number of hosts the hypervisor manages — large fleets produce larger query responses.

---

## Authentication & Middleware

### CSRF errors on mutation

**Symptom:** `POST`, `PATCH`, `PUT`, or `DELETE` requests return `403 CSRF validation failed` from `/api/*`.

**Cause:** InfraWatch middleware requires an `x-csrf-token` request header on every mutation method, and the header value must equal the `csrf_token` cookie value. Missing or mismatched tokens are rejected with 403.

**Fix:** On every mutation request include the `x-csrf-token` header matching the `csrf_token` cookie:

```bash
# Read the cookie from your browser session, then:
curl -X DELETE \
  -H "Cookie: session=<session>; csrf_token=<token>" \
  -H "x-csrf-token: <token>" \
  https://your-infrawatch.example.com/api/connectors/<id>
```

The in-app UI handles this automatically. If you are writing a client or script, make sure it reads the `csrf_token` cookie from the login response and echoes it back in the `x-csrf-token` header on every non-GET request.

---

### License grace period expired

**Symptom:** The app logs show `license_required` responses, API calls start returning `403 license_required`, and the UI redirects you to `/setup`.

**Cause:** The license has expired or cannot be verified against the license server, and the `LICENSE_GRACE_PERIOD_DAYS` (default `7`) has elapsed.

**Fix:** Re-activate the license at `/setup/license`:

- If the InfraWatch host has outbound internet, paste your license key and click **Activate**. The app talks to `LICENSE_SERVER_URL` (default `https://billing.nexusquantum.id`) to re-verify.
- If the host is air-gapped, drop an offline `.lic` file into the upload form on `/setup/license`. Validation uses the `LICENSE_PUBLIC_KEY` public key (RSA+SHA-256, Ed25519, or Ed448) configured in `/opt/infrawatch/.env`.

Once activated the `nqrust_license_status` cookie flips to `valid` and the middleware stops redirecting.

---

### Browser shows "license not activated"

**Symptom:** Every page redirects to `/setup` and API calls return `403 license_required`.

**Cause:** The license has never been activated, or the saved license state is missing or invalid.

**Fix:** Check the current license state from the API:

```bash
curl -fsS -H "Cookie: session=<session>" https://your-infrawatch.example.com/api/license/status
```

Then open **`/setup`** in the browser and complete the license activation flow. The middleware specifically exempts `/setup`, `/api/license/`, and `/api/auth/` so you can always reach those pages even when no license is active.

---

## Installer

### Installer fails on airgap

**Symptom:** `infrawatch-installer install --airgap` exits with an error about missing bundle files, an `.deb` it can't find, or the Bun binary not being executable.

**Cause:** `--bundle-path` is pointing at the wrong location — either the `.run` archive itself (instead of the extracted directory), or a directory that doesn't contain the full bundle.

**Fix:** Re-extract the bundle cleanly and point `--bundle-path` at the extracted directory:

```bash
# Extract without running
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle

# Verify the expected files are present
ls /opt/infrawatch-bundle

# Run the installer manually
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap --bundle-path /opt/infrawatch-bundle
```

The extracted directory must contain the `infrawatch-installer` binary, the Bun runtime, the PostgreSQL `.deb` files, and the pre-built InfraWatch app. See [Install Sources](../../installer/sources/).

---

## Still Stuck?

Capture the full service log and the systemd status before reaching out:

```bash
sudo systemctl status infrawatch --no-pager
sudo journalctl -u infrawatch -n 500 --no-pager > /tmp/infrawatch.log
```

Then see [Logs](../logs/) for where the rest of the diagnostic output lives.
