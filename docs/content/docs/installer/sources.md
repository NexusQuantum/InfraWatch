+++
title = "Install Sources"
description = "Online install versus --airgap bundle, bundle structure, and manual extraction"
weight = 92
date = 2026-04-23

[extra]
toc = true
+++

The installer can fetch what it needs from the internet (the default) or consume everything from a pre-staged bundle on disk (`--airgap`). The phase sequence and final result are identical — only the acquisition step for dependencies and the InfraWatch source differs.

---

## Source Matrix

| Flag | Description |
|------|-------------|
| *(default)* | **Online** — clones the repo from GitHub, downloads Bun, installs packages via `apt`/`dnf` |
| `--airgap` | **Offline** — uses a pre-built bundle from `--bundle-path` (no internet required) |

---

## Online (Default)

With no source flag, the installer:

- Clones the InfraWatch repository from `https://github.com/NexusQuantum/InfraWatch.git` into `/opt/infrawatch/`.
- Downloads the Bun runtime (1.3+) from `https://bun.sh/`.
- Installs PostgreSQL and any base packages (`curl`, `git`, build tooling) through the detected package manager — `apt-get` on Debian/Ubuntu, `dnf` on RHEL/Rocky 9+, `yum` as a fallback.

The online path requires outbound HTTPS from the target host to GitHub, `bun.sh`, and your distribution's package mirrors.

### One-Liner

The quickest path is the release bootstrap script, which downloads the static installer binary and runs it:

```bash
curl -fsSL https://github.com/NexusQuantum/InfraWatch/releases/latest/download/install.sh | bash
```

### Direct Binary

Or download the static `x86_64-unknown-linux-musl` binary and run it yourself:

```bash
curl -fsSL -o infrawatch-installer \
  https://github.com/NexusQuantum/InfraWatch/releases/latest/download/infrawatch-installer-x86_64-linux-musl
chmod +x infrawatch-installer
sudo ./infrawatch-installer install
```

---

## Airgap (`--airgap`)

Use `--airgap` when the target host has no internet access. The installer reads every artifact from `--bundle-path` instead of fetching them at runtime, and no network calls occur during installation.

The bundle is distributed as a **self-extracting `.run` archive**. On a machine that does have internet, download the archive from the [Releases page](https://github.com/NexusQuantum/InfraWatch/releases) and transfer it to the target host (USB, SCP, internal artifact server, physical media, etc.):

```bash
curl -fsSL -o nqrust-infrawatch-airgap-v0.1.0.run \
  https://github.com/NexusQuantum/InfraWatch/releases/download/v0.1.0/nqrust-infrawatch-airgap-v0.1.0.run
```

On the target host, make it executable and run it:

```bash
chmod +x nqrust-infrawatch-airgap-v0.1.0.run
sudo ./nqrust-infrawatch-airgap-v0.1.0.run
```

The `.run` file self-extracts to a temporary directory and launches `infrawatch-installer install --airgap --bundle-path <extracted-path>` automatically.

---

## Bundle Structure

The airgap bundle contains everything the installer would otherwise download:

- **Pre-built InfraWatch application** — source tree plus `node_modules/` and the compiled `.next/` production build, so no `bun install` or `bun --bun next build` is needed on the airgap host.
- **Bun runtime binary** — the statically linked Bun executable for `x86_64-linux`.
- **PostgreSQL `.deb` packages** — for Debian/Ubuntu targets, the PostgreSQL 14+ packages are shipped inside the bundle and installed via `dpkg -i`.
- **Static installer binary** — `infrawatch-installer` itself, so you can re-run or uninstall later without external dependencies.

---

## Manual Airgap Extraction

If you need to inspect the bundle before running it — for example, so your security team can audit the bundled `.deb` packages — extract without executing:

```bash
# Extract without running
./nqrust-infrawatch-airgap-v0.1.0.run --noexec --target /opt/infrawatch-bundle
```

This unpacks the entire bundle into `/opt/infrawatch-bundle/` and exits immediately without running the installer. Review the files, then invoke the installer manually when you are ready:

```bash
# Run the installer manually
sudo /opt/infrawatch-bundle/infrawatch-installer install \
  --airgap --bundle-path /opt/infrawatch-bundle
```

{{% alert icon="⚡" context="info" %}}
`--bundle-path` must point to the **extracted** directory, not to the `.run` archive. If the installer fails with a bundle-not-found error, run the extract step first and verify the path contains `infrawatch-installer`, the Bun binary, the PostgreSQL `.deb` files, and the pre-built app.
{{% /alert %}}

For scripted airgap installs, see [Non-Interactive Installs](../non-interactive/).
