+++
title = "Uninstall"
description = "Remove InfraWatch with infrawatch-installer uninstall, with options to preserve data and the database"
weight = 94
date = 2026-04-23

[extra]
toc = true
+++

The same binary that installs InfraWatch also uninstalls it. The `uninstall` subcommand reverses what the installer did: it stops and removes the `infrawatch.service` systemd unit, deletes the installed binary and install directory, and (by default) drops the database.

{{% alert icon="⚠️" context="warning" %}}
`sudo infrawatch-installer uninstall --force` is **destructive by default**: it drops the `infrawatch` PostgreSQL database and removes the application's data directories. If you want to preserve anything across the uninstall, pass `--keep-data` and/or `--keep-database`.
{{% /alert %}}

---

## Basic Uninstall

```bash
sudo infrawatch-installer uninstall --force
```

This performs a full teardown. The `--force` flag suppresses the interactive confirmation prompt, which is required when running from scripts and strongly recommended when running interactively so you have to acknowledge the action explicitly.

### Preserving Options

```bash
# Keep your data: --keep-data
# Keep database:  --keep-database
```

Combine the flags as needed:

```bash
# Keep application data on disk
sudo infrawatch-installer uninstall --force --keep-data

# Keep the database (useful when you plan to reinstall)
sudo infrawatch-installer uninstall --force --keep-database

# Keep both — common when rolling back a failed upgrade
sudo infrawatch-installer uninstall --force --keep-data --keep-database
```

---

## What Gets Removed

A default `sudo infrawatch-installer uninstall --force` removes:

- The **`infrawatch.service`** systemd unit — stopped, disabled, and deleted from `/etc/systemd/system/`. `systemctl daemon-reload` is invoked afterwards.
- The **installer binary** at `/usr/local/bin/infrawatch-installer`.
- The **install directory** at `/opt/infrawatch/` (the cloned repo, `node_modules/`, and the `.next` production build).
- The **default data directories** created by the installer — application state and caches.
- The **`infrawatch` PostgreSQL database** and the `infrawatch` role — the installer issues `DROP DATABASE infrawatch` and `DROP ROLE infrawatch` against the local PostgreSQL.

PostgreSQL itself is **not removed** — the installer only drops the objects it created, not the PostgreSQL server, its data directory, or other databases.

---

## What `--keep-data` Preserves

With `--keep-data` the installer skips the deletion of InfraWatch's data directories. The `.env` file at `/opt/infrawatch/.env` and any local state InfraWatch has written are left on disk so you can copy or inspect them before they are cleaned up manually.

The systemd unit and the binary are still removed.

---

## What `--keep-database` Preserves

With `--keep-database` the installer does **not** drop the `infrawatch` database or the `infrawatch` role. PostgreSQL is left running and the database stays intact, so a subsequent `sudo infrawatch-installer install` using the same `--db-password` can reattach to the existing database without losing alerts, connectors, or license state.

This is the recommended flag combination for planned re-installs:

```bash
sudo infrawatch-installer uninstall --force --keep-database
# ... prepare the new install (copy config, adjust systemd unit template, etc.) ...
sudo infrawatch-installer install --mode full --db-password "<same-password>"
```

---

## Recovering from a Failed Install

If an install fails partway through, it is safe to run `uninstall --force` to clear the partial state and start over:

```bash
sudo infrawatch-installer uninstall --force
sudo infrawatch-installer install
```

Because every installer operation is idempotent you can also simply re-run `install` without uninstalling first — existing users, databases, and services are detected and left intact. Reach for `uninstall` when you want a guaranteed clean slate.
