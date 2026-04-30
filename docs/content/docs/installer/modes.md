+++
title = "Install Modes"
description = "Full, Minimal, and Development install modes and when to use each"
weight = 91
date = 2026-04-23

[extra]
toc = true
+++

The installer supports three install modes. Pick the one that matches your deployment target — `Full` is the default and the right choice for most single-host production installs.

---

## Mode Matrix

| Mode           | PostgreSQL | Build      | Systemd Service |
|----------------|------------|------------|-----------------|
| **Full**       | Installed  | Production | Yes             |
| **Minimal**    | External   | Production | No              |
| **Development**| External   | Dev mode   | No              |

---

## When to Use Each Mode

### Full

The default. Use `--mode full` when you want a single-host, production-grade deployment with the installer managing everything.

- **PostgreSQL** is installed and configured automatically (including listening on the `--db-port` you choose).
- The InfraWatch application is built in **production** mode (`bun --bun next build`).
- The `infrawatch.service` systemd unit is created, enabled at boot, and started.

This is the recommended mode for:

- Single-datacenter deployments
- Appliance-style VMs or bare-metal hosts dedicated to InfraWatch
- Any environment where you want one command to leave you with a running service at `http://<host>:3001`

### Minimal

Use `--mode minimal` when you already operate PostgreSQL separately (managed service, dedicated DB host, shared cluster) and want the installer to handle only the application build and configuration.

- **PostgreSQL is not installed** — you provide a reachable `DATABASE_URL` and the installer writes it into `/opt/infrawatch/.env`.
- The application is still built in **production** mode.
- **No systemd service is created** — you are expected to run InfraWatch under your own process supervisor (systemd unit you maintain, container orchestrator, Docker, PM2, etc.).

Reach for `Minimal` when:

- You have a dedicated PostgreSQL (e.g. RDS, Cloud SQL, a PgBouncer'd cluster) and do not want the installer touching local postgres packages.
- You run InfraWatch inside a container or on a host whose service supervisor is managed by your own tooling.
- You want an audited, repeatable build output at `/opt/infrawatch/.next` and will wire up systemd yourself.

### Development

Use `--mode development` when you are working on InfraWatch itself and want the installer to prepare the machine but leave the app in dev-server mode.

- **PostgreSQL is not installed** — supply your own `DATABASE_URL`.
- The application runs in **dev mode** (`bun --bun next dev`), not `bun --bun next build`.
- **No systemd service is created** — start the dev server manually with hot reload.

Use this mode only on developer workstations or CI test runners. It is not production-safe: the dev server rebuilds on file change, ships source maps, and has different caching semantics than the production build.

---

## Picking a Mode Interactively

During the TUI's **Mode Select** phase the installer displays the three modes in a list. Use **↑/↓** (or **k**/**j**) to move the selection and **Enter** to confirm. The default selection is **Full**.

## Picking a Mode Non-Interactively

Pass the `--mode` flag on the command line:

```bash
sudo ./infrawatch-installer install --non-interactive --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password"
```

Valid values are `full`, `minimal`, and `development`. See [Non-Interactive Installs](../non-interactive/) for the full flag reference.
