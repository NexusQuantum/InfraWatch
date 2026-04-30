+++
title = "Getting Started"
description = "Install InfraWatch and get your first fleet visible in under 15 minutes"
weight = 20
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# Getting Started

InfraWatch ships with a **Rust TUI installer** (`infrawatch-installer`) that takes a fresh Linux host to a running observability dashboard in a few minutes. It handles preflight checks, PostgreSQL, the Bun runtime, the Next.js build, and the `infrawatch` systemd service — online or fully air-gapped.

---

## What You'll Need

**Hardware (Minimum — up to 10 connectors, ~500 hosts)**

- 2 CPU cores
- 2 GB RAM
- 10 GB free disk

**Hardware (Recommended — 10–50 connectors, ~2,000 hosts)**

- 4 CPU cores
- 4 GB RAM
- 20 GB SSD

**Software**

- Ubuntu 22.04+, Debian 12+, RHEL 9+, or Rocky 9+
- `sudo` access on the target host
- PostgreSQL 14+ (the installer can provision this for you in `full` mode)
- Bun 1.3+ or Node.js 20+ (the installer downloads Bun automatically in online mode)
- Outbound HTTPS to your NQRust Hypervisor instances and to `https://billing.nexusquantum.id` for license verification (not required for air-gapped installs)

See the [Installation](installation/) guide for the full scaling matrix, including the large-scale (50–200 connectors, ~10,000 hosts) profile.

---

## Installation Options

### [Installation](installation/)

Run the guided TUI installer, the one-liner bootstrap, or the self-extracting `.run` airgap bundle. Covers the four supported methods: online, direct binary, airgap, and build-from-source.

**Time required:** ~10 minutes

### [Quick Start](quick-start/)

Log in to your freshly installed InfraWatch, accept the EULA, activate your license, and add your first NQRust Hypervisor connector.

**Time required:** ~5 minutes (after installation)

### [License Activation](license/)

Activate InfraWatch using an online license key or an offline `.lic` file. Covers `LICENSE_*` environment variables, the `/setup/license` page, the `/api/license/*` endpoints, and grace-period behavior.

**Time required:** ~2 minutes

### [EULA](eula/)

Read and accept the End User License Agreement required on first login. Available in English and Bahasa Indonesia.

**Time required:** ~3 minutes

---

## Next Steps

Once the installer finishes and you have logged in, head to the [Connectors](../connectors/) section to wire InfraWatch to your NQRust Hypervisor instances.
