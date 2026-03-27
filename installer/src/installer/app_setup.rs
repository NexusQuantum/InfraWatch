use std::sync::mpsc::Sender;

use anyhow::Result;

use crate::app::{InstallConfig, LogEntry};
use crate::installer::executor::InstallMessage;

pub fn setup_application(
    config: &InstallConfig,
    tx: &Sender<InstallMessage>,
) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let install_dir = &config.install_dir;

    // Create install directory
    if !install_dir.exists() {
        logs.push(LogEntry::info(format!(
            "Creating install directory: {}",
            install_dir.display()
        )));
        std::fs::create_dir_all(install_dir)?;
    }

    // Clone or verify repository
    let package_json = install_dir.join("package.json");
    if !package_json.exists() {
        logs.push(LogEntry::info("Cloning InfraWatch repository..."));
        tx.send(InstallMessage::PhaseProgress(
            crate::app::Phase::AppSetup,
            "Cloning repository...".to_string(),
        ))?;

        let output = super::run_command(
            "git",
            &[
                "clone",
                "--depth=1",
                "https://github.com/NexusQuantum/InfraWatch.git",
                &install_dir.to_string_lossy(),
            ],
        )?;

        if !output.status.success() {
            // If directory exists but is empty, try again without it
            let _ = std::fs::remove_dir_all(install_dir);
            std::fs::create_dir_all(install_dir)?;

            let output = super::run_command(
                "git",
                &[
                    "clone",
                    "--depth=1",
                    "https://github.com/NexusQuantum/InfraWatch.git",
                    &install_dir.to_string_lossy(),
                ],
            )?;

            if !output.status.success() {
                return Err(anyhow::anyhow!(
                    "Failed to clone repository: {}",
                    super::output_stderr(&output)
                ));
            }
        }
        logs.push(LogEntry::success("Repository cloned"));
    } else {
        logs.push(LogEntry::info("InfraWatch source already present"));

        // Pull latest if in dev mode
        if config.mode.is_development() {
            logs.push(LogEntry::info("Pulling latest changes..."));
            let _ = super::run_command("git", &["-C", &install_dir.to_string_lossy(), "pull"]);
        }
    }

    // Install dependencies
    logs.push(LogEntry::info("Installing Node.js dependencies..."));
    tx.send(InstallMessage::PhaseProgress(
        crate::app::Phase::AppSetup,
        "Running bun install...".to_string(),
    ))?;

    let bun_path = find_bun();
    let output = std::process::Command::new(&bun_path)
        .args(["install"])
        .current_dir(install_dir)
        .output()?;

    if output.status.success() {
        logs.push(LogEntry::success("Dependencies installed"));
    } else {
        let stderr = super::output_stderr(&output);
        return Err(anyhow::anyhow!("bun install failed: {}", stderr));
    }

    // Build for production (skip in dev mode)
    if !config.mode.is_development() {
        logs.push(LogEntry::info("Building InfraWatch for production..."));
        tx.send(InstallMessage::PhaseProgress(
            crate::app::Phase::AppSetup,
            "Building Next.js application (this may take a few minutes)...".to_string(),
        ))?;

        let output = std::process::Command::new(&bun_path)
            .args(["--bun", "next", "build"])
            .current_dir(install_dir)
            .output()?;

        if output.status.success() {
            logs.push(LogEntry::success("Production build complete"));
        } else {
            let stderr = super::output_stderr(&output);
            return Err(anyhow::anyhow!("Production build failed: {}", stderr));
        }
    } else {
        logs.push(LogEntry::info(
            "Skipping production build (development mode)",
        ));
    }

    // Create data directory
    let data_dir = &config.data_dir;
    if !data_dir.exists() {
        std::fs::create_dir_all(data_dir)?;
        logs.push(LogEntry::success(format!(
            "Created data directory: {}",
            data_dir.display()
        )));
    }

    Ok(logs)
}

fn find_bun() -> String {
    // Check common bun locations
    let candidates = ["/usr/local/bin/bun", "/usr/bin/bun"];

    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return path.to_string();
        }
    }

    // Check HOME/.bun/bin/bun
    if let Ok(home) = std::env::var("HOME") {
        let home_bun = format!("{}/.bun/bin/bun", home);
        if std::path::Path::new(&home_bun).exists() {
            return home_bun;
        }
    }

    // Fallback to PATH
    "bun".to_string()
}
