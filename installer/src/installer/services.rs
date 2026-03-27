use anyhow::Result;

use crate::app::{InstallConfig, LogEntry};

pub fn install_services(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    // Create system user (idempotent)
    logs.push(LogEntry::info("Creating infrawatch system user..."));
    let user_check = super::run_command("id", &["infrawatch"]);
    if user_check.map(|o| o.status.success()).unwrap_or(false) {
        logs.push(LogEntry::info("System user 'infrawatch' already exists"));
    } else {
        let output = super::run_sudo(
            "useradd",
            &[
                "--system",
                "--no-create-home",
                "--shell",
                "/usr/sbin/nologin",
                "--home-dir",
                &config.install_dir.to_string_lossy(),
                "infrawatch",
            ],
        )?;
        if output.status.success() {
            logs.push(LogEntry::success("Created system user 'infrawatch'"));
        } else {
            logs.push(LogEntry::warning(
                "Could not create system user — service may run as current user",
            ));
        }
    }

    // Set ownership
    let _ = super::run_sudo(
        "chown",
        &[
            "-R",
            "infrawatch:infrawatch",
            &config.install_dir.to_string_lossy(),
        ],
    );
    let _ = super::run_sudo(
        "chown",
        &[
            "-R",
            "infrawatch:infrawatch",
            &config.data_dir.to_string_lossy(),
        ],
    );

    // Find bun path
    let bun_path = find_bun_path();
    logs.push(LogEntry::info(format!("Using Bun at: {}", bun_path)));

    // Create systemd service unit
    let unit = format!(
        r#"[Unit]
Description=InfraWatch Observability Dashboard
Documentation=https://github.com/NexusQuantum/InfraWatch
After=postgresql.service network.target
Wants=postgresql.service

[Service]
Type=simple
User=infrawatch
Group=infrawatch
WorkingDirectory={install_dir}
EnvironmentFile={install_dir}/.env
ExecStart={bun} --bun next start --port {port}
Restart=on-failure
RestartSec=5s
StartLimitBurst=5
StartLimitIntervalSec=60

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={install_dir} {data_dir}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
"#,
        install_dir = config.install_dir.display(),
        data_dir = config.data_dir.display(),
        bun = bun_path,
        port = config.http_port,
    );

    let service_path = "/etc/systemd/system/infrawatch.service";
    logs.push(LogEntry::info("Installing systemd service..."));

    // Write service file via sudo
    let tmp_path = "/tmp/infrawatch.service";
    std::fs::write(tmp_path, &unit)?;
    let output = super::run_sudo("cp", &[tmp_path, service_path])?;
    std::fs::remove_file(tmp_path).ok();

    if !output.status.success() {
        return Err(anyhow::anyhow!("Failed to install service unit"));
    }
    logs.push(LogEntry::success("Installed infrawatch.service"));

    // Reload systemd
    super::run_sudo("systemctl", &["daemon-reload"])?;
    logs.push(LogEntry::info("Reloaded systemd daemon"));

    // Enable service
    let output = super::run_sudo("systemctl", &["enable", "infrawatch"])?;
    if output.status.success() {
        logs.push(LogEntry::success("Enabled infrawatch service"));
    }

    // Start service
    logs.push(LogEntry::info("Starting InfraWatch service..."));
    let output = super::run_sudo("systemctl", &["start", "infrawatch"])?;
    if output.status.success() {
        logs.push(LogEntry::success("InfraWatch service started"));
    } else {
        let stderr = super::output_stderr(&output);
        logs.push(LogEntry::warning(format!(
            "Service may not have started cleanly: {}",
            stderr
        )));
    }

    Ok(logs)
}

fn find_bun_path() -> String {
    let candidates = ["/usr/local/bin/bun", "/usr/bin/bun"];

    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return path.to_string();
        }
    }

    if let Ok(home) = std::env::var("HOME") {
        let p = format!("{}/.bun/bin/bun", home);
        if std::path::Path::new(&p).exists() {
            return p;
        }
    }

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

    "bun".to_string()
}
