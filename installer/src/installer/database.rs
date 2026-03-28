use std::fs;

use anyhow::{anyhow, Result};
use rand::Rng;

use crate::app::{InstallConfig, LogEntry};
use crate::installer::{command_exists, run_command, run_sudo};

pub fn setup_database(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    // Check if PostgreSQL is installed
    if !command_exists("psql") {
        logs.push(LogEntry::error("PostgreSQL is not installed"));
        return Err(anyhow!("PostgreSQL not found — install postgresql first"));
    }

    logs.push(LogEntry::info("Setting up PostgreSQL database..."));

    // Start and enable PostgreSQL
    logs.push(LogEntry::info("Starting PostgreSQL service..."));
    let _ = run_sudo("systemctl", &["enable", "postgresql"]);
    let output = run_sudo("systemctl", &["start", "postgresql"])?;

    if !output.status.success() {
        // Try to initialize on RHEL-based systems
        logs.push(LogEntry::info("Initializing PostgreSQL (RHEL-based)..."));
        let _ = run_sudo("postgresql-setup", &["--initdb"]);
        let _ = run_sudo("systemctl", &["start", "postgresql"]);
    }

    logs.push(LogEntry::success("PostgreSQL service started"));

    // Generate password if not provided
    let password = if config.db_password.is_empty() {
        generate_password(24)
    } else {
        config.db_password.clone()
    };

    // Check if database already exists
    let check_db = run_command(
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

    let db_exists = String::from_utf8_lossy(&check_db.stdout).trim() == "1";

    if db_exists {
        logs.push(LogEntry::info(format!(
            "Database '{}' already exists",
            config.db_name
        )));

        // Ensure user password is correct
        let alter_sql = format!(
            "ALTER USER {} WITH ENCRYPTED PASSWORD '{}';",
            config.db_user, password
        );
        let _ = run_command("sudo", &["-u", "postgres", "psql", "-c", &alter_sql]);
        logs.push(LogEntry::success(format!(
            "User '{}' password updated",
            config.db_user
        )));
    } else {
        // Create user or update password if exists
        logs.push(LogEntry::info(format!(
            "Creating user '{}'...",
            config.db_user
        )));

        let create_user_sql = format!(
            "CREATE USER {} WITH ENCRYPTED PASSWORD '{}';",
            config.db_user, password
        );
        let output = run_command("sudo", &["-u", "postgres", "psql", "-c", &create_user_sql]);

        if let Ok(out) = output {
            if out.status.success() {
                logs.push(LogEntry::success(format!(
                    "User '{}' created",
                    config.db_user
                )));
            } else if String::from_utf8_lossy(&out.stderr).contains("already exists") {
                logs.push(LogEntry::info(format!(
                    "User '{}' exists, updating password...",
                    config.db_user
                )));
                let alter_sql = format!(
                    "ALTER USER {} WITH ENCRYPTED PASSWORD '{}';",
                    config.db_user, password
                );
                let _ = run_command("sudo", &["-u", "postgres", "psql", "-c", &alter_sql]);
                logs.push(LogEntry::success(format!(
                    "User '{}' password updated",
                    config.db_user
                )));
            }
        }

        // Create database
        logs.push(LogEntry::info(format!(
            "Creating database '{}'...",
            config.db_name
        )));

        let create_db_sql = format!(
            "CREATE DATABASE {} WITH OWNER = {} ENCODING = 'UTF8';",
            config.db_name, config.db_user
        );
        let output = run_command("sudo", &["-u", "postgres", "psql", "-c", &create_db_sql])?;

        if output.status.success() {
            logs.push(LogEntry::success(format!(
                "Database '{}' created",
                config.db_name
            )));
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("already exists") {
                logs.push(LogEntry::info(format!(
                    "Database '{}' already exists",
                    config.db_name
                )));
            } else {
                logs.push(LogEntry::error(format!(
                    "Failed to create database: {}",
                    stderr
                )));
            }
        }

        // Grant permissions
        logs.push(LogEntry::info("Granting database permissions..."));

        let grant_sql = format!(
            "GRANT ALL PRIVILEGES ON DATABASE {} TO {};",
            config.db_name, config.db_user
        );
        let _ = run_command("sudo", &["-u", "postgres", "psql", "-c", &grant_sql]);

        // Grant schema permissions
        let grant_schema_sql = format!("GRANT ALL ON SCHEMA public TO {};", config.db_user);
        let _ = run_command(
            "sudo",
            &[
                "-u",
                "postgres",
                "psql",
                "-d",
                &config.db_name,
                "-c",
                &grant_schema_sql,
            ],
        );

        logs.push(LogEntry::success("Database permissions configured"));
    }

    // Configure pg_hba.conf for password authentication
    logs.push(LogEntry::info("Configuring PostgreSQL authentication..."));
    configure_pg_hba()?;
    logs.push(LogEntry::success("PostgreSQL authentication configured"));

    // Restart PostgreSQL to apply changes
    let _ = run_sudo("systemctl", &["restart", "postgresql"]);

    // Test connection
    logs.push(LogEntry::info("Testing database connection..."));
    let test_ok = test_database_connection(&config.db_name, &config.db_user, &password);

    if test_ok {
        logs.push(LogEntry::success("Database connection successful"));
    } else {
        logs.push(LogEntry::warning(
            "Database connection test failed — may need manual verification",
        ));
    }

    Ok(logs)
}

/// Configure pg_hba.conf for password authentication.
/// Matches NQRust-MicroVM approach: find pg_hba.conf via glob, check if md5/scram
/// already present, if not prepend a local md5 rule.
fn configure_pg_hba() -> Result<()> {
    let possible_paths = [
        "/etc/postgresql/*/main/pg_hba.conf",
        "/var/lib/pgsql/data/pg_hba.conf",
        "/var/lib/postgresql/*/data/pg_hba.conf",
    ];

    for pattern in &possible_paths {
        if let Ok(output) = run_command("sh", &["-c", &format!("ls {}", pattern)]) {
            if output.status.success() {
                let paths = String::from_utf8_lossy(&output.stdout);
                for path in paths.lines() {
                    let path = path.trim();
                    if path.is_empty() {
                        continue;
                    }

                    // Read current config
                    if let Ok(content) = fs::read_to_string(path) {
                        // Check if already configured for md5/scram-sha-256
                        if content.contains("md5") || content.contains("scram-sha-256") {
                            return Ok(());
                        }

                        // Prepend md5 auth for local connections (before other rules)
                        let new_line =
                            "local   all             all                                     md5";

                        // Backup original
                        let backup_cmd = format!("sudo cp {} {}.backup", path, path);
                        let _ = run_command("sh", &["-c", &backup_cmd]);

                        // Prepend the rule
                        let sed_cmd = format!("sudo sed -i '1s/^/{}\\n/' {}", new_line, path);
                        let _ = run_command("sh", &["-c", &sed_cmd]);
                    }
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

/// Test database connection using psql with password
fn test_database_connection(db_name: &str, db_user: &str, db_password: &str) -> bool {
    // Try connection string
    let conn = format!(
        "postgresql://{}:{}@localhost:5432/{}",
        db_user, db_password, db_name
    );
    let output = run_command("psql", &[&conn, "-c", "SELECT 1;"]);
    if let Ok(out) = output {
        if out.status.success() {
            return true;
        }
    }

    // Fallback: PGPASSWORD env var
    let output = run_command(
        "sh",
        &[
            "-c",
            &format!(
                "PGPASSWORD='{}' psql -h localhost -U {} -d {} -c 'SELECT 1;'",
                db_password, db_user, db_name
            ),
        ],
    );

    output.map(|o| o.status.success()).unwrap_or(false)
}

pub fn generate_password(length: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}
