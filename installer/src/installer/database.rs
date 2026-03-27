use anyhow::Result;

use crate::app::{InstallConfig, LogEntry};

pub fn setup_database(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    // Initialize PostgreSQL if needed (RHEL/Fedora)
    if super::command_exists("postgresql-setup") {
        logs.push(LogEntry::info(
            "Initializing PostgreSQL database cluster...",
        ));
        let _ = super::run_sudo("postgresql-setup", &["--initdb"]);
    }

    // Start and enable PostgreSQL
    logs.push(LogEntry::info("Starting PostgreSQL service..."));
    let output = super::run_sudo("systemctl", &["start", "postgresql"])?;
    if !output.status.success() {
        return Err(anyhow::anyhow!("Failed to start PostgreSQL"));
    }
    super::run_sudo("systemctl", &["enable", "postgresql"])?;
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
