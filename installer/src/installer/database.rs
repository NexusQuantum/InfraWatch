use anyhow::Result;

use crate::app::{InstallConfig, LogEntry};

pub fn setup_database(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    // Initialize PostgreSQL cluster if needed
    // On RHEL/Fedora: postgresql-setup --initdb
    if super::command_exists("postgresql-setup") {
        logs.push(LogEntry::info("Initializing PostgreSQL cluster (RHEL)..."));
        let _ = super::run_sudo("postgresql-setup", &["--initdb"]);
    }

    // On Debian/Ubuntu: pg_createcluster if no cluster exists yet
    // This is needed after fresh .deb install (including airgap)
    if super::command_exists("pg_lsclusters") {
        let output = super::run_command("pg_lsclusters", &["--no-header"])?;
        let clusters = super::output_to_string(&output);
        if clusters.trim().is_empty() {
            logs.push(LogEntry::info(
                "No PostgreSQL cluster found, creating one...",
            ));
            // Detect installed PG version
            let ver_output = super::run_command("ls", &["/usr/lib/postgresql/"])?;
            let ver_str = super::output_to_string(&ver_output);
            let version = ver_str
                .lines()
                .rfind(|l| !l.is_empty())
                .unwrap_or("16")
                .trim()
                .to_string();
            logs.push(LogEntry::info(format!(
                "Detected PostgreSQL version: {}",
                version
            )));
            let output = super::run_sudo("pg_createcluster", &[&version, "main", "--start"])?;
            if output.status.success() {
                logs.push(LogEntry::success("PostgreSQL cluster created and started"));
            } else {
                logs.push(LogEntry::warning(
                    "pg_createcluster had issues, trying to start anyway",
                ));
            }
        } else {
            logs.push(LogEntry::info(format!(
                "Existing cluster(s): {}",
                clusters.trim()
            )));
        }
    }

    // Start and enable PostgreSQL
    logs.push(LogEntry::info("Starting PostgreSQL service..."));
    let output = super::run_sudo("systemctl", &["start", "postgresql"])?;
    if !output.status.success() {
        // Try starting with specific version (Debian pattern: postgresql@16-main)
        let stderr = super::output_stderr(&output);
        logs.push(LogEntry::warning(format!(
            "systemctl start postgresql failed: {}",
            stderr
        )));
        logs.push(LogEntry::info("Trying alternative service names..."));

        // Try postgresql@*-main
        let _ = super::run_sudo("systemctl", &["start", "postgresql@*-main"]);
        // Check if it's actually running now
        let check = super::run_command("pg_isready", &[]);
        if check.map(|o| o.status.success()).unwrap_or(false) {
            logs.push(LogEntry::success("PostgreSQL is running"));
        } else {
            return Err(anyhow::anyhow!(
                "Failed to start PostgreSQL. Try: sudo systemctl start postgresql"
            ));
        }
    }
    let _ = super::run_sudo("systemctl", &["enable", "postgresql"]);
    logs.push(LogEntry::success("PostgreSQL started and enabled"));

    // Generate password if not provided
    let password = if config.db_password.is_empty() {
        generate_password(24)
    } else {
        config.db_password.clone()
    };

    // Create database user (idempotent)
    logs.push(LogEntry::info(format!(
        "Setting up database user '{}'...",
        config.db_user
    )));

    let user_check = super::run_command(
        "sudo",
        &[
            "-u",
            "postgres",
            "psql",
            "-tAc",
            &format!("SELECT 1 FROM pg_roles WHERE rolname='{}'", config.db_user),
        ],
    )?;

    let user_exists = super::output_to_string(&user_check) == "1";

    if !user_exists {
        let create_result = super::run_command(
            "sudo",
            &[
                "-u",
                "postgres",
                "psql",
                "-c",
                &format!(
                    "CREATE USER {} WITH ENCRYPTED PASSWORD '{}'",
                    config.db_user, password
                ),
            ],
        )?;
        if !create_result.status.success() {
            return Err(anyhow::anyhow!("Failed to create database user"));
        }
        logs.push(LogEntry::success(format!(
            "Created database user '{}'",
            config.db_user
        )));
    } else {
        // Update password for existing user
        let _ = super::run_command(
            "sudo",
            &[
                "-u",
                "postgres",
                "psql",
                "-c",
                &format!(
                    "ALTER USER {} WITH ENCRYPTED PASSWORD '{}'",
                    config.db_user, password
                ),
            ],
        )?;
        logs.push(LogEntry::info(format!(
            "Database user '{}' already exists, password updated",
            config.db_user
        )));
    }

    // Create database (idempotent)
    logs.push(LogEntry::info(format!(
        "Setting up database '{}'...",
        config.db_name
    )));

    let db_check = super::run_command(
        "sudo",
        &[
            "-u",
            "postgres",
            "psql",
            "-tAc",
            &format!(
                "SELECT 1 FROM pg_database WHERE datname='{}'",
                config.db_name
            ),
        ],
    )?;

    let db_exists = super::output_to_string(&db_check) == "1";

    if !db_exists {
        let create_result = super::run_command(
            "sudo",
            &[
                "-u",
                "postgres",
                "psql",
                "-c",
                &format!(
                    "CREATE DATABASE {} OWNER {}",
                    config.db_name, config.db_user
                ),
            ],
        )?;
        if !create_result.status.success() {
            return Err(anyhow::anyhow!("Failed to create database"));
        }
        logs.push(LogEntry::success(format!(
            "Created database '{}'",
            config.db_name
        )));
    } else {
        logs.push(LogEntry::info(format!(
            "Database '{}' already exists",
            config.db_name
        )));
    }

    // Grant privileges
    let _ = super::run_command(
        "sudo",
        &[
            "-u",
            "postgres",
            "psql",
            "-c",
            &format!(
                "GRANT ALL PRIVILEGES ON DATABASE {} TO {}",
                config.db_name, config.db_user
            ),
        ],
    )?;
    logs.push(LogEntry::success("Database privileges configured"));

    // Test connection
    logs.push(LogEntry::info("Testing database connection..."));
    let test = super::run_command(
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
    )?;
    if test.status.success() {
        logs.push(LogEntry::success("Database connection verified"));
    } else {
        logs.push(LogEntry::warning(
            "Could not verify database connection — may need manual pg_hba.conf configuration",
        ));
    }

    Ok(logs)
}

fn generate_password(length: usize) -> String {
    use rand::Rng;
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        .chars()
        .collect();
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect()
}
