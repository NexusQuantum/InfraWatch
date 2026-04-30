+++
title = "InfraWatch"
description = "Infrastructure observability dashboard for NQRust Hypervisor fleets"
template = "index.html"
+++

# InfraWatch
### The Unified Observability Dashboard

Aggregate metrics from **NQRust Hypervisors** across every datacenter into a single, real-time UI — with alerts, drill-down, and a production-grade Rust TUI installer.

+++

## Why InfraWatch?

**InfraWatch** is a monitoring dashboard by [Nexus Quantum Tech](https://nexusquantum.id), focused on NQRust Hypervisor operations. Designed for home labs and private clouds, it gives you one pane of glass over hosts, clusters, VMs, and storage pools from your hypervisor fleet.

### Key Highlights

- **Hypervisor-Focused Aggregation**: connect InfraWatch to your NQRust Hypervisor fleet and view everything in one place
- **Fleet Overview**: real-time health summary across all clusters, hosts, storage, and applications
- **Host & VM Drill-Down**: per-server CPU, memory, disk, network, load, and uptime — plus NQRust VM inventory
- **Threshold Alerting**: batched evaluation every 60 seconds with automatic resolution and 30-day retention
- **Historical Charts**: time-series CPU, memory, and network with configurable time ranges via Prometheus range queries
- **Connector Health**: latency tracking, TLS options, and flexible auth — none, basic, or bearer — credentials encrypted at rest
- **Secure by Default**: scrypt-hashed admin, CSRF protection, rate-limited login, optional SAML/OAuth SSO, full audit log
- **Modern UI**: Next.js 16 + React 19 frontend with Tailwind v4 and SWR polling
- **Production Ready**: PostgreSQL backend, license activation with grace period, multi-host deployable behind a load balancer

+++

## Quick Start

Get up and running in minutes with our comprehensive guides:

- [**Installation Guide**](/docs/getting-started/installation/) - Step-by-step setup instructions
- [**Quick Start**](/docs/getting-started/quick-start/) - Add your first connector in 5 minutes
- [**Introduction**](/docs/introduction/) - Full product overview and architecture

+++

## Architecture

The system is a single Next.js deployable that fans out to any number of remote metric sources:

- **Next.js 16 App Router** (React 19 + Tailwind v4): Server Components by default, SWR polling every 30 seconds for live views
- **Route Handlers** (`/api/*`): auth, connectors, alerts, live data, Prometheus query forwarding, license endpoints
- **Domain Layer** (`lib/server/domains/`): cache, alert evaluator, and concurrency-limited Prometheus client
- **PostgreSQL 14+**: stores connectors, alerts, sessions, audit log, and license state

See the [Introduction](/docs/introduction/) for the full architecture diagram.

+++

## Features

Explore what InfraWatch covers out of the box:

- [**Connectors**](/docs/connectors/) - NQRust Hypervisor connector setup and operations
- [**Fleet & Monitoring**](/docs/fleet/) - Hosts, clusters, VMs, storage, and apps in one view
- [**Alerts**](/docs/alerts/) - Threshold rules with batched evaluation and auto-resolution
- [**Settings & Admin**](/docs/settings/) - Admin user, SSO, license activation, audit log
- [**Architecture**](/docs/architecture/) - How the aggregation layer, cache, and alert evaluator fit together
- [**TUI Installer**](/docs/installer/) - Online, airgap, interactive, and non-interactive install modes

+++

## Getting Help

- [Documentation](/docs/introduction/) - Comprehensive guides and tutorials
- [GitHub Issues](https://github.com/NexusQuantum/InfraWatch/issues) - Report bugs or request features
- [API Reference](/docs/api-reference/) - Every route handler documented

+++

## License

InfraWatch is proprietary software by **Nexus Quantum Tech**. See the [EULA](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md) for terms.

Built by the Nexus Quantum team. Powered by Rust & ☕.
