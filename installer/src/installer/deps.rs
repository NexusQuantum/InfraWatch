use anyhow::Result;

use crate::app::{InstallConfig, LogEntry};

#[derive(Debug)]
pub enum PackageManager {
    Apt,
    Dnf,
    Yum,
}

impl PackageManager {
    pub fn detect() -> Option<Self> {
        if super::command_exists("apt-get") {
            Some(PackageManager::Apt)
        } else if super::command_exists("dnf") {
            Some(PackageManager::Dnf)
        } else if super::command_exists("yum") {
            Some(PackageManager::Yum)
        } else {
            None
        }
    }

    fn install_cmd(&self) -> &str {
        match self {
            PackageManager::Apt => "apt-get",
            PackageManager::Dnf => "dnf",
            PackageManager::Yum => "yum",
        }
    }

    fn base_packages(&self, include_postgres: bool) -> Vec<&str> {
        let mut pkgs = vec!["curl", "git", "unzip", "ca-certificates"];
        if include_postgres {
            match self {
                PackageManager::Apt => pkgs.push("postgresql"),
                PackageManager::Dnf | PackageManager::Yum => {
                    pkgs.push("postgresql-server");
                    pkgs.push("postgresql");
                }
            }
        }
        pkgs
    }
}

pub fn install_dependencies(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    if config.is_airgap() {
        install_dependencies_airgap(config)
    } else {
        install_dependencies_online(config)
    }
}

// ── Online Install ───────────────────────────────────────────────────────────

fn install_dependencies_online(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    // Detect package manager
    let pm = PackageManager::detect()
        .ok_or_else(|| anyhow::anyhow!("No supported package manager found (apt/dnf/yum)"))?;
    logs.push(LogEntry::info(format!(
        "Detected package manager: {:?}",
        pm
    )));

    // Update package lists
    logs.push(LogEntry::info("Updating package lists..."));
    if matches!(pm, PackageManager::Apt) {
        let output = super::run_sudo("apt-get", &["update", "-y"])?;
        if !output.status.success() {
            logs.push(LogEntry::warning("apt-get update had warnings"));
        }
    }

    // Install base packages
    let packages = pm.base_packages(config.mode.includes_database());
    logs.push(LogEntry::info(format!(
        "Installing: {}",
        packages.join(", ")
    )));

    let mut args = vec!["install", "-y"];
    args.extend_from_slice(&packages);
    let output = super::run_sudo(pm.install_cmd(), &args)?;

    if output.status.success() {
        logs.push(LogEntry::success("System packages installed"));
    } else {
        let stderr = super::output_stderr(&output);
        return Err(anyhow::anyhow!("Failed to install packages: {}", stderr));
    }

    // Install Bun
    logs.append(&mut install_bun_online()?);

    Ok(logs)
}

fn install_bun_online() -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    if !super::command_exists("bun") {
        logs.push(LogEntry::info("Installing Bun runtime..."));
        let output =
            super::run_command("bash", &["-c", "curl -fsSL https://bun.sh/install | bash"])?;
        if output.status.success() {
            logs.push(LogEntry::success("Bun runtime installed"));
        } else {
            let output =
                super::run_sudo("bash", &["-c", "curl -fsSL https://bun.sh/install | bash"])?;
            if output.status.success() {
                logs.push(LogEntry::success("Bun runtime installed (via sudo)"));
            } else {
                return Err(anyhow::anyhow!("Failed to install Bun runtime"));
            }
        }
    } else {
        logs.push(LogEntry::info("Bun runtime already installed"));
    }

    if let Ok(output) = super::run_command("bun", &["--version"]) {
        let version = super::output_to_string(&output);
        logs.push(LogEntry::success(format!("Bun v{} verified", version)));
    }

    Ok(logs)
}

// ── Airgap (Offline) Install ─────────────────────────────────────────────────

fn install_dependencies_airgap(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let bundle = &config.bundle_path;

    logs.push(LogEntry::info(format!(
        "Airgap mode: using bundle at {}",
        bundle.display()
    )));

    if !bundle.exists() {
        return Err(anyhow::anyhow!(
            "Bundle directory not found: {}",
            bundle.display()
        ));
    }

    // Install .deb/.rpm packages from bundle if present
    let debs_dir = bundle.join("debs");
    let rpms_dir = bundle.join("rpms");

    if debs_dir.exists() {
        logs.push(LogEntry::info("Installing bundled .deb packages..."));
        let output = super::run_sudo(
            "bash",
            &[
                "-c",
                &format!(
                    "dpkg -i {}/*.deb 2>/dev/null; apt-get install -f -y",
                    debs_dir.display()
                ),
            ],
        )?;
        if output.status.success() {
            logs.push(LogEntry::success("Bundled .deb packages installed"));
        } else {
            logs.push(LogEntry::warning(
                "Some .deb packages may have failed — continuing",
            ));
        }
    } else if rpms_dir.exists() {
        logs.push(LogEntry::info("Installing bundled .rpm packages..."));
        let rpm_cmd = if super::command_exists("dnf") {
            "dnf"
        } else {
            "yum"
        };
        let output = super::run_sudo(
            rpm_cmd,
            &[
                "localinstall",
                "-y",
                &format!("{}/*.rpm", rpms_dir.display()),
            ],
        )?;
        if output.status.success() {
            logs.push(LogEntry::success("Bundled .rpm packages installed"));
        } else {
            logs.push(LogEntry::warning(
                "Some .rpm packages may have failed — continuing",
            ));
        }
    } else {
        logs.push(LogEntry::info(
            "No bundled OS packages found — assuming dependencies are pre-installed",
        ));
    }

    // Install Bun from bundle
    let bun_binary = bundle.join("bun");
    if bun_binary.exists() && !super::command_exists("bun") {
        logs.push(LogEntry::info("Installing Bun from bundle..."));
        let output = super::run_sudo("cp", &[&bun_binary.to_string_lossy(), "/usr/local/bin/bun"])?;
        if output.status.success() {
            let _ = super::run_sudo("chmod", &["+x", "/usr/local/bin/bun"]);
            logs.push(LogEntry::success("Bun runtime installed from bundle"));
        } else {
            return Err(anyhow::anyhow!("Failed to install Bun from bundle"));
        }
    } else if super::command_exists("bun") {
        logs.push(LogEntry::info("Bun runtime already installed"));
    } else {
        return Err(anyhow::anyhow!(
            "Bun binary not found in bundle at {} and not installed on system",
            bun_binary.display()
        ));
    }

    if let Ok(output) = super::run_command("bun", &["--version"]) {
        let version = super::output_to_string(&output);
        logs.push(LogEntry::success(format!("Bun v{} verified", version)));
    }

    Ok(logs)
}
