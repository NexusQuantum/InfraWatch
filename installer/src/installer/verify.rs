use std::time::Duration;

use crate::app::{CheckItem, InstallConfig};

pub fn run_verification(config: &InstallConfig) -> Vec<CheckItem> {
    let mut checks = Vec::new();

    // Check .env exists
    let env_path = config.install_dir.join(".env");
    checks.push(if env_path.exists() {
        CheckItem::success("Configuration", ".env file exists")
    } else {
        CheckItem::error("Configuration", ".env file not found")
    });

    // Check node_modules exists
    let node_modules = config.install_dir.join("node_modules");
    checks.push(if node_modules.exists() {
        CheckItem::success("Dependencies", "node_modules directory exists")
    } else {
        CheckItem::error("Dependencies", "node_modules not found — run bun install")
    });

    // Check .next build exists (production only)
    if !config.mode.is_development() {
        let next_dir = config.install_dir.join(".next");
        checks.push(if next_dir.exists() {
            CheckItem::success("Build", ".next build directory exists")
        } else {
            CheckItem::error("Build", ".next build not found — run bun next build")
        });
    }

    // Check service status (Full mode only)
    if config.mode.includes_services() {
        let output = super::run_command("systemctl", &["is-active", "infrawatch"]);
        let active = output
            .map(|o| super::output_to_string(&o) == "active")
            .unwrap_or(false);

        checks.push(if active {
            CheckItem::success("Service", "infrawatch.service is active")
        } else {
            CheckItem::warning(
                "Service",
                "infrawatch.service is not active — check: journalctl -u infrawatch",
            )
        });
    }

    // Check health endpoint (with retry)
    if config.mode.includes_services() {
        let url = format!("http://localhost:{}", config.http_port);
        let mut healthy = false;

        for _attempt in 1..=10 {
            let output = super::run_command("curl", &["-sf", "--max-time", "2", &url]);
            if output.map(|o| o.status.success()).unwrap_or(false) {
                healthy = true;
                break;
            }
            std::thread::sleep(Duration::from_secs(2));
        }

        checks.push(if healthy {
            CheckItem::success("Web UI", format!("Accessible at {}", url))
        } else {
            CheckItem::warning(
                "Web UI",
                format!(
                    "Not yet responding at {} — may need more time to start",
                    url
                ),
            )
        });
    }

    // Check database connectivity
    if config.mode.includes_database() {
        let db_check = super::run_command(
            "sudo",
            &[
                "-u",
                "postgres",
                "psql",
                "-d",
                &config.db_name,
                "-c",
                "SELECT 1",
            ],
        );
        let db_ok = db_check.map(|o| o.status.success()).unwrap_or(false);

        checks.push(if db_ok {
            CheckItem::success("Database", format!("'{}' is accessible", config.db_name))
        } else {
            CheckItem::warning("Database", "Could not verify database connectivity")
        });
    }

    checks
}
