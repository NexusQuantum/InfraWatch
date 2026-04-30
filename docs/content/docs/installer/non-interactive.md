+++
title = "Non-Interactive Installs"
description = "Run infrawatch-installer from CI, configuration management, or shell scripts"
weight = 93
date = 2026-04-23

[extra]
toc = true
+++

For CI pipelines, configuration management (Ansible, Chef, Puppet), and scripted provisioning, `infrawatch-installer` supports a fully non-interactive mode. Pass `--non-interactive` with the required flags and the installer runs straight through every phase without a TUI.

In non-interactive mode the installer still performs the same seven phases (Welcome → Mode Select → Configuration → Preflight → Installation → Verification → Complete) — it just consumes answers from flags instead of prompts and streams plain-text progress to stdout instead of the Ratatui UI.

---

## Online Non-Interactive

For a standard online install on a host with internet access:

```bash
# Online
sudo ./infrawatch-installer install \
  --non-interactive \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password" \
  --http-port 3001
```

This install will:

- Run preflight checks.
- Install PostgreSQL and Bun via the detected package manager.
- Create the `infrawatch` database user with the password from `--db-password`.
- Clone and build InfraWatch, set the admin password to `--admin-password`, and configure the app to listen on port `3001`.
- Install and start `infrawatch.service`.

---

## Airgap Non-Interactive

For offline / air-gapped hosts, extract the bundle first (see [Install Sources](../sources/)) and then run the installer against the extracted directory:

```bash
# Offline / air-gapped
sudo ./infrawatch-installer install \
  --non-interactive \
  --airgap \
  --bundle-path /opt/infrawatch-bundle \
  --mode full
```

You can add `--db-password` and `--admin-password` here too; if you omit them the installer generates strong random values and prints them on completion.

---

## Flag Reference

Every flag documented below is accepted by `infrawatch-installer install`. Only `--non-interactive` is required for scripted use; the rest have safe defaults or are only relevant to specific modes.

| Flag | Purpose |
|------|---------|
| `--non-interactive` | Skip the TUI. The installer runs straight through with the supplied flags and built-in defaults. Required for scripted installs. |
| `--mode <mode>` | Install mode: `full`, `minimal`, or `development`. Default is `full`. See [Modes](../modes/) for the semantics of each. |
| `--db-password <pw>` | Password for the PostgreSQL `infrawatch` user. In `full` mode the installer sets this password on the new user it creates; in `minimal`/`development` mode it is written into `DATABASE_URL` inside `/opt/infrawatch/.env`. If omitted in non-interactive mode, a strong random password is generated. |
| `--admin-password <pw>` | Password for the default admin user (username `admin`). Stored scrypt-hashed in the `admin_user` table on first startup. Change after first login. |
| `--http-port <port>` | Port that the InfraWatch HTTP server listens on. Default is `3001`. Sets `PORT=` in `/opt/infrawatch/.env`. |
| `--airgap` | Use a pre-staged bundle on disk instead of fetching packages, Bun, and the InfraWatch source from the internet. Requires `--bundle-path`. |
| `--bundle-path <path>` | Absolute path to the extracted airgap bundle directory. Only meaningful together with `--airgap`. Default: `/opt/infrawatch-bundle`. |

{{% alert icon="⚡" context="info" %}}
Run `infrawatch-installer install --help` for all options, including less common flags around install directories, TLS, and package manager overrides.
{{% /alert %}}

---

## Tips for CI and Configuration Management

- Always pass `--db-password` and `--admin-password` explicitly so the generated values are deterministic across runs.
- Capture the installer's exit code: a non-zero exit means a phase failed and no systemd service has been started.
- Follow `journalctl -u infrawatch` after the installer finishes to confirm the service reached a healthy state. See [Logs](../../troubleshooting/logs/).
- On re-runs, `infrawatch-installer install` is idempotent — existing users, databases, and services are detected and left intact. To start from a clean slate, run [`uninstall`](../uninstall/) first.
