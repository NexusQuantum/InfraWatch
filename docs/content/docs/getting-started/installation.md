+++
title = "Installation"
description = "Install InfraWatch using the online, airgap, or source-based installer"
weight = 21
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch is installed via `infrawatch-installer` — a production-grade Rust TUI (Ratatui + Crossterm) that provisions everything on your host: preflight checks, PostgreSQL, the Bun runtime, the InfraWatch build, the `.env` file, and the `infrawatch` systemd service.

Choose the method that matches your environment.

---

## System Requirements

| | Minimum | Recommended | Large Scale |
|---|---|---|---|
| **Connectors / hosts** | ≤10 / ~500 | 10–50 / ~2,000 | 50–200 / ~10,000 |
| **CPU** | 2 cores | 4 cores | 8+ cores |
| **RAM** | 2 GB | 4 GB | 8–16 GB |
| **Disk** | 10 GB | 20 GB SSD | 50 GB SSD |
| **OS** | Ubuntu 22.04+, Debian 12+, RHEL 9+, Rocky 9+ | same | same |
| **Runtime** | Bun 1.3+ or Node.js 20+ | same | same |
| **Database** | PostgreSQL 14+ | PostgreSQL 16 (dedicated) | PostgreSQL 16 + PgBouncer |
| **Network** | Outbound HTTPS to NQRust Hypervisor instances + license server | same | same + load balancer for multiple InfraWatch instances |

{{% alert icon="⚡" context="info" %}}
The Minimum profile is sufficient for most homelab and single-datacenter deployments. Move to Recommended once you connect more than 10 NQRust Hypervisor instances or monitor more than ~500 hosts.
{{% /alert %}}

---

## Option 1 — Quick Install (Online)

For hosts with internet access. The one-liner downloads the latest `install.sh` bootstrap script, which fetches the static `infrawatch-installer` binary from GitHub Releases and launches the TUI.

```bash
curl -fsSL https://github.com/NexusQuantum/InfraWatch/releases/latest/download/install.sh | bash
```

The installer opens a guided TUI that walks you through each phase.

> 📸 **Screenshot needed:** `/images/installer/installer-welcome.png`
> **Page to capture:** `infrawatch-installer install` — Welcome phase
> **What to show:** The welcome screen banner with InfraWatch branding and the "Press Enter to begin" prompt.

### Phase 1 — Welcome

The installer prints the product banner, version, and a short summary of what will happen. Press **Enter** to begin.

### Phase 2 — Mode Select

Pick the install mode. Most single-host deployments use **Full**.

> 📸 **Screenshot needed:** `/images/installer/installer-mode-select.png`
> **Page to capture:** `infrawatch-installer install` — Mode Select phase
> **What to show:** The three-row list of install modes (Full / Minimal / Development) with the highlight on "Full".

| Mode | PostgreSQL | Build | Systemd service |
|---|---|---|---|
| **Full** | Installed by the installer | Production build (`bun --bun next build`) | Yes (`infrawatch.service`) |
| **Minimal** | External (you provide `DATABASE_URL`) | Production build | No |
| **Development** | External | Dev mode (`bun --bun next dev`) | No |

### Phase 3 — Configuration

Review and adjust install paths, database credentials, admin credentials, and the HTTP port. Defaults are safe; the only required input in interactive mode is a database password and an admin password.

> 📸 **Screenshot needed:** `/images/installer/installer-configuration.png`
> **Page to capture:** `infrawatch-installer install` — Configuration phase
> **What to show:** The configuration form with labels for DB host, DB port, DB password, admin username, admin password, and HTTP port.

### Phase 4 — Preflight

The installer validates your system before touching anything — OS version, available RAM and disk, required ports, `sudo` access, and (for online mode) outbound network connectivity.

> 📸 **Screenshot needed:** `/images/installer/installer-preflight.png`
> **Page to capture:** `infrawatch-installer install` — Preflight phase
> **What to show:** The preflight checklist with green checkmarks for each passed check and an "All checks passed" summary.

All checks must pass to continue. If a check fails, the installer prints a remediation hint and exits cleanly — nothing has been installed yet.

### Phase 5 — Installation Progress

The installer provisions each component in sequence and streams live logs. For a Full install on Ubuntu, the sequence is:

1. Install dependencies (PostgreSQL, Bun runtime)
2. Create the database user, database, and grants
3. Clone and build InfraWatch
4. Generate `/opt/infrawatch/.env`
5. Install and start the `infrawatch.service` unit
6. Verify the service is listening on the configured HTTP port

> 📸 **Screenshot needed:** `/images/installer/installer-progress.png`
> **Page to capture:** `infrawatch-installer install` — Installation phase
> **What to show:** The progress view with per-step spinners, completed steps checked off, and the live log tail at the bottom.

### Phase 6 — Verification

Once all steps finish, the installer runs a final round of health checks: HTTP reachability on the configured port, database connection, and the systemd service state.

> 📸 **Screenshot needed:** `/images/installer/installer-verification.png`
> **Page to capture:** `infrawatch-installer install` — Verification phase
> **What to show:** The verification panel with "HTTP OK", "Database OK", and "Service active" rows.

### Phase 7 — Complete

Installation is done. The installer shows your access URL, the admin username, and a reminder to change the password on first login.

> 📸 **Screenshot needed:** `/images/installer/installer-complete.png`
> **Page to capture:** `infrawatch-installer install` — Complete phase
> **What to show:** The completion screen showing `http://<host>:3001`, the admin username, and the next-step links.

---

## Option 2 — Direct Binary Download

If you want to inspect the installer before running it, skip the one-liner and download the static musl binary directly.

```bash
# Download the static binary (works on any Linux x86_64)
curl -fsSL -o infrawatch-installer \
  https://github.com/NexusQuantum/InfraWatch/releases/latest/download/infrawatch-installer-x86_64-linux-musl
chmod +x infrawatch-installer

# Interactive TUI install (recommended)
sudo ./infrawatch-installer install
```

### Non-Interactive Mode (Online)

For CI pipelines and scripted installs, pass `--non-interactive` with the required flags:

```bash
sudo ./infrawatch-installer install \
  --non-interactive \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password" \
  --http-port 3001
```

Run `infrawatch-installer install --help` for the full flag reference.

---

## Option 3 — Airgap / Offline Install

For environments without internet access, download the self-extracting `.run` bundle from the [Releases](https://github.com/NexusQuantum/InfraWatch/releases) page on a connected machine, then transfer it to the target host.

**Step 1 — Download the bundle on a connected machine:**

```bash
curl -fsSL -o nqrust-infrawatch-airgap-v0.1.0.run \
  https://github.com/NexusQuantum/InfraWatch/releases/download/v0.1.0/nqrust-infrawatch-airgap-v0.1.0.run
```

**Step 2 — Transfer to the target host** (USB, SCP, etc.):

```bash
scp nqrust-infrawatch-airgap-v0.1.0.run user@target-host:/tmp/
```

**Step 3 — Run on the target host:**

```bash
chmod +x nqrust-infrawatch-airgap-v0.1.0.run
sudo ./nqrust-infrawatch-airgap-v0.1.0.run
```

The `.run` file self-extracts to a temporary directory and launches the installer with `--airgap` automatically. The installer operates fully offline — no downloads occur during the installation itself.

The airgap bundle includes:

- Pre-built InfraWatch application (source + `node_modules` + `.next` build)
- Bun runtime binary
- PostgreSQL `.deb` packages (Ubuntu/Debian)
- Static `infrawatch-installer` binary

### Manual Airgap Extraction

If you want to inspect the bundle contents before running the installer (for example, to review the `.deb` packages your security team needs to audit), extract without executing:

```bash
# Extract to a directory without running
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle

# Then invoke the installer manually against the extracted bundle
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap \
  --bundle-path /opt/infrawatch-bundle
```

### Non-Interactive Mode (Airgap)

```bash
sudo ./infrawatch-installer install \
  --non-interactive \
  --airgap \
  --bundle-path /opt/infrawatch-bundle \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password"
```

---

## Option 4 — Build from Source

If you need to customize InfraWatch or track `main`, clone and build directly:

```bash
# 1. Clone
git clone https://github.com/NexusQuantum/InfraWatch.git
cd InfraWatch

# 2. Install dependencies
bun install

# 3. Configure
cp .env.example .env
# Edit .env with your DATABASE_URL, admin credentials, and license settings

# 4. Build
bun --bun next build

# 5. Start
bun --bun next start --port 3001
```

You will still need to provision PostgreSQL and create a systemd unit yourself; the installer does that for you in `Full` mode.

---

## Option 5 — Build the Installer from Source

The installer itself is a Rust binary in the `installer/` directory of the repo. Build it if you want to modify the installer's behavior or produce a custom release:

```bash
cd InfraWatch/installer
cargo build --release
sudo ./target/release/infrawatch-installer install
```

The resulting binary is a fully static `x86_64-unknown-linux-musl` build when compiled with the release profile from the repo — drop it anywhere on your `PATH`.

---

## What Gets Installed

After a successful `Full` install:

| Path | Contents |
|---|---|
| `/opt/infrawatch/` | Cloned repository, `.next/` build output, `node_modules/` |
| `/opt/infrawatch/.env` | Environment configuration (DB URL, admin creds, license settings) |
| `/usr/local/bin/infrawatch-installer` | The installer binary itself (for later `uninstall`/`reinstall`) |
| `/etc/systemd/system/infrawatch.service` | systemd unit |
| PostgreSQL data directory | Default distro path (e.g. `/var/lib/postgresql/16/main` on Ubuntu) |
| `journalctl -u infrawatch` | Service logs |

InfraWatch auto-creates all required PostgreSQL tables on first startup: `license`, `admin_user`, `sessions`, `login_attempts`, `connectors`, `connector_health`, `alert_rules`, `alerts`, and `audit_log`.

---

## Services

The service is managed by systemd:

```bash
# Check status
sudo systemctl status infrawatch

# Start / stop / restart
sudo systemctl start infrawatch
sudo systemctl stop infrawatch
sudo systemctl restart infrawatch

# Follow logs
sudo journalctl -u infrawatch -f

# Enable on boot (installer does this for you in Full mode)
sudo systemctl enable infrawatch
```

The default URL is `http://<host>:3001`. The port can be changed at install time with `--http-port` or later by editing `PORT=` in `/opt/infrawatch/.env` and running `sudo systemctl restart infrawatch`.

---

## Uninstall

The installer ships with an `uninstall` subcommand that removes the systemd unit, the install directory, and optionally the database:

```bash
# Full uninstall (removes service, files, and database)
sudo infrawatch-installer uninstall --force

# Keep application data on disk
sudo infrawatch-installer uninstall --force --keep-data

# Keep the database (useful when you plan to reinstall)
sudo infrawatch-installer uninstall --force --keep-database
```

---

## Troubleshooting

### Database connection failed

InfraWatch won't start if it cannot reach PostgreSQL. First check the service itself:

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test the connection string from the host
psql -h localhost -p 5432 -U infrawatch -d infrawatch
```

If PostgreSQL is running but the connection still fails, verify that `postgresql.conf` has `listen_addresses` set correctly (the installer configures this in `Full` mode) and that `pg_hba.conf` allows the `infrawatch` user.

### Service not starting

Look at the service logs first:

```bash
sudo journalctl -u infrawatch -n 100 --no-pager
```

Common causes:

- `DATABASE_URL` in `/opt/infrawatch/.env` is unreachable — see above.
- `CONNECTOR_ENCRYPTION_KEY` is missing or too short. It must be 32+ random characters.
- The configured `PORT` is already in use. Change it in `.env` and restart.

### Reinstalling

To reinstall cleanly after a failed attempt:

```bash
sudo infrawatch-installer uninstall --force
sudo infrawatch-installer install
```

If you need to preserve your data between reinstalls, pass `--keep-data --keep-database` to `uninstall` and then run `install` again with the same database credentials.

---

## After Installation

Open the web UI in your browser at the URL shown on the installer's completion screen:

| Setting | Default |
|---|---|
| **Web UI** | `http://<host>:3001` |
| **Admin username** | `admin` (or whatever you set via `--admin-username`) |
| **Admin password** | `admin` (or whatever you set via `--admin-password`) |

{{% alert icon="⚠️" context="warning" %}}
Change the default admin password immediately after first login via **Settings → Account**. Also set a strong `CONNECTOR_ENCRYPTION_KEY` (32+ random characters) in `/opt/infrawatch/.env` before adding any connectors.
{{% /alert %}}

Proceed to the [Quick Start](../quick-start/) to accept the EULA, activate your license, and add your first connector.
