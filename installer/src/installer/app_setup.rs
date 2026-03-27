use std::sync::mpsc::Sender;

use anyhow::Result;

use crate::app::{InstallConfig, LogEntry};
use crate::installer::executor::InstallMessage;

pub fn setup_application(
    config: &InstallConfig,
    tx: &Sender<InstallMessage>,
) -> Result<Vec<LogEntry>> {
    if config.is_airgap() {
        setup_application_airgap(config, tx)
    } else {
        setup_application_online(config, tx)
    }
}

// ── Online Setup ─────────────────────────────────────────────────────────────

fn setup_application_online(
    config: &InstallConfig,
    tx: &Sender<InstallMessage>,
) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let install_dir = &config.install_dir;

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
        if config.mode.is_development() {
            logs.push(LogEntry::info("Pulling latest changes..."));
            let _ = super::run_command("git", &["-C", &install_dir.to_string_lossy(), "pull"]);
        }
    }

    // Install dependencies + build
    logs.append(&mut install_and_build(config, tx)?);

    Ok(logs)
}

// ── Airgap (Offline) Setup ───────────────────────────────────────────────────

fn setup_application_airgap(
    config: &InstallConfig,
    tx: &Sender<InstallMessage>,
) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let install_dir = &config.install_dir;
    let bundle = &config.bundle_path;

    // The airgap bundle should contain a pre-built app directory
    let bundle_app = bundle.join("app");
    let bundle_app_alt = bundle.join("infrawatch");

    let source = if bundle_app.join("package.json").exists() {
        &bundle_app
    } else if bundle_app_alt.join("package.json").exists() {
        &bundle_app_alt
    } else {
        return Err(anyhow::anyhow!(
            "No InfraWatch app found in bundle at {} — expected {}/app/ or {}/infrawatch/ with package.json",
            bundle.display(),
            bundle.display(),
            bundle.display()
        ));
    };

    // Check what the bundle has before copying
    let bundle_has_modules = source.join("node_modules").exists();
    let bundle_has_build = source.join(".next").exists();
    logs.push(LogEntry::info(format!(
        "Airgap bundle: node_modules={}, .next={}",
        if bundle_has_modules { "yes" } else { "no" },
        if bundle_has_build { "yes" } else { "no" },
    )));

    tx.send(InstallMessage::PhaseProgress(
        crate::app::Phase::AppSetup,
        "Copying application from bundle...".to_string(),
    ))?;

    // Copy app to install dir
    if !install_dir.join("package.json").exists() {
        if !install_dir.exists() {
            std::fs::create_dir_all(install_dir)?;
        }

        // Use rsync for reliable recursive copy (handles symlinks in node_modules)
        let copy_result = if super::command_exists("rsync") {
            logs.push(LogEntry::info("Copying with rsync..."));
            super::run_command(
                "rsync",
                &[
                    "-a",
                    &format!("{}/", source.display()),
                    &format!("{}/", install_dir.display()),
                ],
            )
        } else {
            logs.push(LogEntry::info("Copying with cp..."));
            super::run_command(
                "cp",
                &[
                    "-a",
                    "-T",
                    &source.to_string_lossy(),
                    &install_dir.to_string_lossy(),
                ],
            )
        };

        match copy_result {
            Ok(output) if output.status.success() => {
                logs.push(LogEntry::success("Application copied from bundle"));
            }
            Ok(output) => {
                // Try with sudo
                let stderr = super::output_stderr(&output);
                logs.push(LogEntry::warning(format!(
                    "Copy failed ({}), retrying with sudo...",
                    stderr
                )));
                let output = super::run_sudo(
                    "cp",
                    &[
                        "-a",
                        "-T",
                        &source.to_string_lossy(),
                        &install_dir.to_string_lossy(),
                    ],
                )?;
                if !output.status.success() {
                    return Err(anyhow::anyhow!(
                        "Failed to copy app from bundle: {}",
                        super::output_stderr(&output)
                    ));
                }
                logs.push(LogEntry::success(
                    "Application copied from bundle (via sudo)",
                ));
            }
            Err(e) => return Err(anyhow::anyhow!("Failed to copy app: {}", e)),
        }
    } else {
        logs.push(LogEntry::info("InfraWatch already present at install dir"));
    }

    // Verify what was actually copied
    let has_node_modules = install_dir.join("node_modules").exists();
    let has_next_build = install_dir.join(".next").exists();
    logs.push(LogEntry::info(format!(
        "After copy: node_modules={}, .next={}",
        if has_node_modules { "yes" } else { "no" },
        if has_next_build { "yes" } else { "no" },
    )));

    if has_node_modules && (has_next_build || config.mode.is_development()) {
        logs.push(LogEntry::success(
            "Bundle includes pre-built app — skipping bun install and build",
        ));
    } else if has_node_modules {
        logs.push(LogEntry::info(
            "node_modules present but no .next build, building...",
        ));
        logs.append(&mut build_only(config, tx)?);
    } else {
        // This shouldn't happen with a proper airgap bundle, but handle it
        logs.push(LogEntry::warning(
            "Bundle missing node_modules — attempting bun install (requires network or cached packages)",
        ));
        logs.append(&mut install_and_build(config, tx)?);
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

// ── Shared: install deps + build ─────────────────────────────────────────────

fn install_and_build(config: &InstallConfig, tx: &Sender<InstallMessage>) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let install_dir = &config.install_dir;
    let bun_path = find_bun();

    // Verify bun exists before trying
    logs.push(LogEntry::info(format!("Using bun at: {}", bun_path)));
    let bun_check = super::run_command(&bun_path, &["--version"]);
    match bun_check {
        Ok(output) if output.status.success() => {
            logs.push(LogEntry::info(format!(
                "Bun version: {}",
                super::output_to_string(&output)
            )));
        }
        _ => {
            return Err(anyhow::anyhow!(
                "Bun not found at '{}'. Searched: /usr/local/bin/bun, /usr/bin/bun, ~/.bun/bin/bun, $SUDO_USER home. \
                 Install bun first: curl -fsSL https://bun.sh/install | bash",
                bun_path
            ));
        }
    }

    // bun install
    logs.push(LogEntry::info("Installing Node.js dependencies..."));
    tx.send(InstallMessage::PhaseProgress(
        crate::app::Phase::AppSetup,
        "Running bun install...".to_string(),
    ))?;

    let output = std::process::Command::new(&bun_path)
        .args(["install"])
        .current_dir(install_dir)
        .output()?;

    if output.status.success() {
        logs.push(LogEntry::success("Dependencies installed"));
    } else {
        let stderr = super::output_stderr(&output);
        let stdout = super::output_to_string(&output);
        let detail = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("exit code {}", output.status)
        };
        return Err(anyhow::anyhow!("bun install failed: {}", detail));
    }

    // Build
    logs.append(&mut build_only(config, tx)?);

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

fn build_only(config: &InstallConfig, tx: &Sender<InstallMessage>) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    if !config.mode.is_development() {
        logs.push(LogEntry::info("Building InfraWatch for production..."));
        tx.send(InstallMessage::PhaseProgress(
            crate::app::Phase::AppSetup,
            "Building Next.js application (this may take a few minutes)...".to_string(),
        ))?;

        let bun_path = find_bun();
        let output = std::process::Command::new(&bun_path)
            .args(["--bun", "next", "build"])
            .current_dir(&config.install_dir)
            .output()?;

        if output.status.success() {
            logs.push(LogEntry::success("Production build complete"));
        } else {
            let stderr = super::output_stderr(&output);
            let detail = if !stderr.is_empty() {
                stderr
            } else {
                format!("exit code {}", output.status)
            };
            return Err(anyhow::anyhow!("Production build failed: {}", detail));
        }
    } else {
        logs.push(LogEntry::info(
            "Skipping production build (development mode)",
        ));
    }

    Ok(logs)
}

fn find_bun() -> String {
    let candidates = ["/usr/local/bin/bun", "/usr/bin/bun"];

    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return path.to_string();
        }
    }

    // Check current user's home
    if let Ok(home) = std::env::var("HOME") {
        let p = format!("{}/.bun/bin/bun", home);
        if std::path::Path::new(&p).exists() {
            return p;
        }
    }

    // Check SUDO_USER's home (when running under sudo, HOME is root's)
    if let Ok(sudo_user) = std::env::var("SUDO_USER") {
        if let Ok(output) = super::run_command("getent", &["passwd", &sudo_user]) {
            let line = super::output_to_string(&output);
            if let Some(home) = line.split(':').nth(5) {
                let p = format!("{}/.bun/bin/bun", home);
                if std::path::Path::new(&p).exists() {
                    return p;
                }
            }
        }
    }

    // Last resort: check PATH
    if let Ok(output) = super::run_command("which", &["bun"]) {
        let path = super::output_to_string(&output);
        if !path.is_empty() {
            return path;
        }
    }

    "bun".to_string()
}
