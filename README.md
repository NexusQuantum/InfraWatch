# InfraWatch

<p align="center">
  <img src="public/logo/nq-logo.png" alt="InfraWatch" width="280" />
</p>

<p align="center">
  <strong>Infrastructure Observability Dashboard</strong> by <a href="https://nexusquantum.id">Nexus Quantum Tech</a>
</p>

A production-grade monitoring dashboard focused on NQRust Hypervisor telemetry across datacenters.

![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![React 19](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791)
![License](https://img.shields.io/badge/License-Proprietary-red)

---

## Features

- **NQRust Hypervisor Focus** — purpose-built for `nqrust_hypervisor` sources
- **Fleet Overview** — real-time health summary across all clusters, hosts, storage, and applications
- **Host Monitoring** — per-server CPU, memory, disk, network, load averages, disk I/O, and uptime
- **Cluster Views** — compute and storage cluster drill-down
- **VM Monitoring** — NQRust virtual machine inventory and resource allocation per host
- **Alerting** — threshold-based alert rules with batched evaluation and automatic resolution
- **Time-Series Charts** — historical CPU, memory, network with configurable time ranges
- **Connector Health** — latency tracking, auth support (none/basic/bearer), TLS options
- **License Management** — activation, verification, grace period, offline mode
- **Single Admin Auth** — session-based with scrypt hashing, CSRF protection, rate limiting
- **TUI Installer** — production-grade Rust terminal installer with interactive and non-interactive modes

---

## System Requirements

### Minimum (up to 10 connectors, ~500 hosts)

| Resource   | Specification                     |
|------------|-----------------------------------|
| CPU        | 2 cores                           |
| RAM        | 2 GB                              |
| Disk       | 10 GB                             |
| OS         | Ubuntu 22.04+, Debian 12+, RHEL 9+, Rocky 9+ |
| Runtime    | Bun 1.3+ or Node.js 20+          |
| Database   | PostgreSQL 14+                    |
| Network    | Outbound HTTPS to Prometheus endpoints and license server |

### Recommended (10–50 connectors, ~2,000 hosts)

| Resource   | Specification                     |
|------------|-----------------------------------|
| CPU        | 4 cores                           |
| RAM        | 4 GB                              |
| Disk       | 20 GB SSD                         |
| Database   | PostgreSQL 16 on dedicated host or managed service |

### Large Scale (50–200 connectors, ~10,000 hosts)

| Resource   | Specification                     |
|------------|-----------------------------------|
| CPU        | 8+ cores                          |
| RAM        | 8–16 GB                           |
| Disk       | 50 GB SSD                         |
| Database   | PostgreSQL 16 with connection pooling (PgBouncer) |
| Notes      | Consider running multiple InfraWatch instances behind a load balancer. Prometheus instances should have query caching (Thanos/Cortex query-frontend) to reduce load. |

### Scaling Notes

- **Prometheus concurrency** — InfraWatch limits concurrent Prometheus queries to 20 globally. If your Prometheus instances support more concurrency, this can be tuned via source.
- **Alert evaluation** — runs at most once per 60 seconds regardless of client polling. Resolved alerts older than 30 days are automatically purged.
- **Cache** — server-side cache is LRU-limited to 500 entries with TTL-based expiration. No unbounded memory growth.
- **Database** — compound indexes on alert tables ensure sub-millisecond lookups even at millions of rows. Batch operations keep write amplification constant regardless of entity count.

---

## Installation

### Option 1: Quick Install (Online)

One-liner that downloads the TUI installer and runs it:

```bash
curl -fsSL https://github.com/NexusQuantum/InfraWatch/releases/latest/download/install.sh | bash
```

Or download the installer binary directly:

```bash
# Download the static binary (works on any Linux x86_64)
curl -fsSL -o infrawatch-installer \
  https://github.com/NexusQuantum/InfraWatch/releases/latest/download/infrawatch-installer-x86_64-linux-musl
chmod +x infrawatch-installer

# Interactive TUI install (recommended)
sudo ./infrawatch-installer install

# Non-interactive (for scripted/automated installs)
sudo ./infrawatch-installer install --non-interactive --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password"
```

The installer will:
1. Run preflight checks (OS, RAM, disk, ports)
2. Install dependencies (PostgreSQL, Bun runtime)
3. Set up the database (create user, database, grant privileges)
4. Clone and build InfraWatch
5. Generate `.env` configuration
6. Create and start the `infrawatch` systemd service
7. Verify everything is running

### Option 2: Offline / Air-Gapped Install

For environments without internet access, download the self-extracting airgap bundle from the [Releases](https://github.com/NexusQuantum/InfraWatch/releases) page:

```bash
# On a machine with internet, download the bundle:
curl -fsSL -o nqrust-infrawatch-airgap-v0.1.0.run \
  https://github.com/NexusQuantum/InfraWatch/releases/download/v0.1.0/nqrust-infrawatch-airgap-v0.1.0.run

# Transfer the .run file to the target machine (USB, SCP, etc.)

# On the target machine:
chmod +x nqrust-infrawatch-airgap-v0.1.0.run
sudo ./nqrust-infrawatch-airgap-v0.1.0.run
```

The airgap bundle includes:
- Pre-built InfraWatch application (source + node_modules + .next build)
- Bun runtime binary
- PostgreSQL .deb packages (Ubuntu/Debian)
- Static installer binary

**Manual airgap extraction** (if you need to inspect the bundle first):

```bash
# Extract without running
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle

# Run the installer manually
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap --bundle-path /opt/infrawatch-bundle
```

### Option 3: Build from Source

```bash
# 1. Clone
git clone https://github.com/NexusQuantum/InfraWatch.git
cd InfraWatch

# 2. Install dependencies
bun install

# 3. Configure
cp .env.example .env
# Edit .env with your database URL, admin credentials, etc.

# 4. Build
bun --bun next build

# 5. Start
bun --bun next start --port 3001
```

### Option 4: Build the Installer from Source

```bash
cd InfraWatch/installer
cargo build --release
sudo ./target/release/infrawatch-installer install
```

### Uninstalling

```bash
sudo infrawatch-installer uninstall --force
# Keep your data: --keep-data
# Keep database:  --keep-database
```

---

## Configuration

### Environment Variables

| Variable                    | Required | Default                              | Description                                      |
|-----------------------------|----------|--------------------------------------|--------------------------------------------------|
| `DATABASE_URL`              | Yes      | —                                    | PostgreSQL connection string                     |
| `CONNECTOR_ENCRYPTION_KEY`  | Yes      | —                                    | AES key for encrypting connector credentials     |
| `ADMIN_USERNAME`            | No       | `admin`                              | Admin login username                             |
| `ADMIN_PASSWORD`            | No       | `admin`                              | Admin login password (change immediately)        |
| `LICENSE_SERVER_URL`        | No       | `https://billing.nexusquantum.id`    | License verification server                      |
| `LICENSE_API_KEY`           | No       | —                                    | License API key                                  |
| `LICENSE_GRACE_PERIOD_DAYS` | No       | `7`                                  | Days to operate without license verification     |
| `LICENSE_PUBLIC_KEY`        | No       | —                                    | Ed25519 public key for offline license validation|
| `DATABASE_SSL`              | No       | `false`                              | Enable SSL for PostgreSQL connection             |
| `PORT`                      | No       | `3001`                               | HTTP port                                        |

### Database

InfraWatch auto-creates all required tables on first startup:

- `license` — license key and activation state
- `admin_user` — admin credentials (scrypt-hashed)
- `sessions` — session tokens (30-day expiry)
- `login_attempts` — rate limiting (5 failed/15 min)
- `connectors` — NQRust Hypervisor data sources
- `connector_health` — health check history
- `alert_rules` — alert rule definitions
- `alerts` — fired alerts with auto-retention (30 days)
- `audit_log` — admin action audit trail

### Connector Types

| Type                  | Description                           | Metrics                                         |
|-----------------------|---------------------------------------|--------------------------------------------------|
| `nqrust_hypervisor`   | NQRust MicroVM Hypervisor             | Host + VM metrics via embedded Prometheus        |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React 19)                       │
│  SWR polling (30s) → /api/live/* endpoints                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js 16 App Router                      │
│                                                              │
│  Route Handlers (/api/*)     Server Components (app/*)       │
│       │                              │                       │
│  ┌────▼────────────┐  ┌─────────────▼──────────────────┐   │
│  │ Domain Layer     │  │  UI Components (Radix + Tailwind)│   │
│  │ (lib/server/     │  │  Charts (Recharts)              │   │
│  │  domains/)       │  │  Command Palette (cmdk)         │   │
│  │                  │  └────────────────────────────────┘   │
│  │  Cache (LRU)     │                                        │
│  │  Alert Evaluator │                                        │
│  │  (batched, 60s)  │                                        │
│  └────┬─────────────┘                                        │
│       │                                                      │
│  ┌────▼──────────────────────────────────────────────────┐  │
│  │  Prometheus Client (concurrency-limited, 20 max)       │  │
│  └────┬──────────────────────────────────────────────────┘  │
└───────┼──────────────────────────────────────────────────────┘
        │
┌───────▼──────────┐  ┌──────────────┐  ┌──────────────────┐
│  Prometheus #1   │  │ Prometheus #2 │  │  Prometheus #N   │
│  (datacenter-a)  │  │ (datacenter-b)│  │  (datacenter-n)  │
└──────────────────┘  └──────────────┘  └──────────────────┘
```

---

## Development

```bash
# Start dev server with hot reload
bun --bun next dev --port 3001

# Lint
bun --bun eslint .

# Type check
npx tsc --noEmit
```

### Project Structure

```
app/                    # Next.js App Router pages and API routes
  api/                  # REST API endpoints
    auth/               # Login, logout, session management
    connectors/         # Connector CRUD and testing
    alerts/             # Alert rules and alerts
    live/               # Real-time data (hosts, clusters, overview)
    prometheus/         # Query forwarding
    license/            # License activation and status
  (pages)/              # UI pages (dashboard, hosts, clusters, etc.)
components/             # React components
  ui/                   # Radix UI + Tailwind primitives
  charts/               # Recharts wrappers
  layout/               # App shell, sidebar, command bar
  alerts/               # Alert management UI
lib/                    # Shared libraries
  server/               # Server-only modules
    domains/            # Domain data aggregation (hosts, clusters, etc.)
    cache.ts            # LRU cache with TTL
    db.ts               # PostgreSQL connection pool
    alerts-store.ts     # Alert storage with batch operations
    alert-evaluator.ts  # Throttled, batched alert evaluation
  prometheus/           # Prometheus HTTP client with concurrency limiter
  api/                  # Client-side SWR hooks
  types/                # TypeScript type definitions
installer/              # Rust TUI installer (Ratatui + Crossterm)
scripts/                # Shell bootstrap installer
.github/workflows/      # CI, release, and test workflows
```

---

## TUI Installer

The `installer/` directory contains a standalone Rust binary that automates the full installation:

```
Welcome → Mode Select → Configuration → Preflight → Installation → Verification → Complete
```

### Install Modes

| Mode          | PostgreSQL | Build     | Systemd Service |
|---------------|-----------|-----------|-----------------|
| **Full**      | Installed | Production| Yes             |
| **Minimal**   | External  | Production| No              |
| **Development**| External | Dev mode  | No              |

### Install Sources

| Flag | Description |
|------|-------------|
| *(default)* | **Online** — clones repo from GitHub, downloads Bun, installs packages via apt/dnf |
| `--airgap` | **Offline** — uses pre-built bundle from `--bundle-path` (no internet required) |

### Non-Interactive Mode

```bash
# Online
sudo ./infrawatch-installer install \
  --non-interactive \
  --mode full \
  --db-password "your-secure-password" \
  --admin-password "your-admin-password" \
  --http-port 3001

# Offline / air-gapped
sudo ./infrawatch-installer install \
  --non-interactive \
  --airgap \
  --bundle-path /opt/infrawatch-bundle \
  --mode full
```

Run `infrawatch-installer install --help` for all options.

---

## Production Deployment Checklist

- [ ] Change default admin password immediately after first login
- [ ] Set a strong `CONNECTOR_ENCRYPTION_KEY` (32+ random characters)
- [ ] Use a dedicated PostgreSQL instance (not localhost) for production
- [ ] Enable `DATABASE_SSL=true` if PostgreSQL is on a remote host
- [ ] Configure a reverse proxy (nginx/Caddy) with TLS termination in front of port 3001
- [ ] Set up PostgreSQL backups (pg_dump or WAL archiving)
- [ ] Monitor the InfraWatch service: `systemctl status infrawatch`
- [ ] Review logs: `journalctl -u infrawatch -f`
- [ ] Activate your license at `/setup` after first launch

---

## License

InfraWatch is proprietary software by Nexus Quantum Tech. See [EULA.md](EULA.md) for terms.

---

Built by [Nexus Quantum Tech](https://nexusquantum.id)
