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
    if !super::command_exists("bun") {
        logs.push(LogEntry::info("Installing Bun runtime..."));
        let output =
            super::run_command("bash", &["-c", "curl -fsSL https://bun.sh/install | bash"])?;
        if output.status.success() {
            logs.push(LogEntry::success("Bun runtime installed"));
        } else {
            // Try with sudo
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

    // Verify bun is accessible
    if let Ok(output) = super::run_command("bun", &["--version"]) {
        let version = super::output_to_string(&output);
        logs.push(LogEntry::success(format!("Bun v{} verified", version)));
    }

    Ok(logs)
}
