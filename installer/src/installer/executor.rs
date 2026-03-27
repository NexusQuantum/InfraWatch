use std::sync::mpsc::Sender;

use anyhow::Result;

use crate::app::{CheckItem, InstallConfig, LogEntry, Phase, Status};

#[derive(Debug, Clone)]
pub enum InstallMessage {
    PhaseStart(Phase),
    PhaseProgress(Phase, String),
    PhaseComplete(Phase, Status),
    Log(LogEntry),
    PreflightResult(Vec<CheckItem>),
    VerifyResult(Vec<CheckItem>),
    Error(String),
    InstallComplete,
}

pub fn run_installation(config: InstallConfig, tx: Sender<InstallMessage>) -> Result<()> {
    // Phase 1: Preflight
    tx.send(InstallMessage::PhaseStart(Phase::Preflight))?;
    let checks = super::preflight::run_preflight_checks(&config);
    let has_errors = checks.iter().any(|c| c.status == Status::Error);
    tx.send(InstallMessage::PreflightResult(checks))?;

    if has_errors {
        tx.send(InstallMessage::PhaseComplete(
            Phase::Preflight,
            Status::Error,
        ))?;
        tx.send(InstallMessage::Error(
            "Preflight checks failed. Cannot continue.".to_string(),
        ))?;
        return Ok(());
    }
    tx.send(InstallMessage::PhaseComplete(
        Phase::Preflight,
        Status::Success,
    ))?;

    // Phase 2: Dependencies
    tx.send(InstallMessage::PhaseStart(Phase::Dependencies))?;
    match super::deps::install_dependencies(&config) {
        Ok(logs) => {
            for log in logs {
                tx.send(InstallMessage::Log(log))?;
            }
            tx.send(InstallMessage::PhaseComplete(
                Phase::Dependencies,
                Status::Success,
            ))?;
        }
        Err(e) => {
            tx.send(InstallMessage::Log(LogEntry::error(format!(
                "Dependency installation failed: {}",
                e
            ))))?;
            tx.send(InstallMessage::PhaseComplete(
                Phase::Dependencies,
                Status::Error,
            ))?;
            tx.send(InstallMessage::Error(format!(
                "Failed to install dependencies: {}",
                e
            )))?;
            return Ok(());
        }
    }

    // Phase 3: Database
    if config.mode.includes_database() {
        tx.send(InstallMessage::PhaseStart(Phase::Database))?;
        match super::database::setup_database(&config) {
            Ok(logs) => {
                for log in logs {
                    tx.send(InstallMessage::Log(log))?;
                }
                tx.send(InstallMessage::PhaseComplete(
                    Phase::Database,
                    Status::Success,
                ))?;
            }
            Err(e) => {
                tx.send(InstallMessage::Log(LogEntry::error(format!(
                    "Database setup failed: {}",
                    e
                ))))?;
                tx.send(InstallMessage::PhaseComplete(
                    Phase::Database,
                    Status::Error,
                ))?;
                tx.send(InstallMessage::Error(format!(
                    "Failed to setup database: {}",
                    e
                )))?;
                return Ok(());
            }
        }
    } else {
        tx.send(InstallMessage::PhaseStart(Phase::Database))?;
        tx.send(InstallMessage::Log(LogEntry::info(
            "Skipping database setup (Minimal/Development mode)",
        )))?;
        tx.send(InstallMessage::PhaseComplete(
            Phase::Database,
            Status::Skipped,
        ))?;
    }

    // Phase 4: Application Setup
    tx.send(InstallMessage::PhaseStart(Phase::AppSetup))?;
    match super::app_setup::setup_application(&config, &tx) {
        Ok(logs) => {
            for log in logs {
                tx.send(InstallMessage::Log(log))?;
            }
            tx.send(InstallMessage::PhaseComplete(
                Phase::AppSetup,
                Status::Success,
            ))?;
        }
        Err(e) => {
            tx.send(InstallMessage::Log(LogEntry::error(format!(
                "Application setup failed: {}",
                e
            ))))?;
            tx.send(InstallMessage::PhaseComplete(
                Phase::AppSetup,
                Status::Error,
            ))?;
            tx.send(InstallMessage::Error(format!(
                "Failed to setup application: {}",
                e
            )))?;
            return Ok(());
        }
    }

    // Phase 5: Configuration
    tx.send(InstallMessage::PhaseStart(Phase::Configuration))?;
    match super::config::generate_config(&config) {
        Ok(logs) => {
            for log in logs {
                tx.send(InstallMessage::Log(log))?;
            }
            tx.send(InstallMessage::PhaseComplete(
                Phase::Configuration,
                Status::Success,
            ))?;
        }
        Err(e) => {
            tx.send(InstallMessage::Log(LogEntry::error(format!(
                "Configuration generation failed: {}",
                e
            ))))?;
            tx.send(InstallMessage::PhaseComplete(
                Phase::Configuration,
                Status::Error,
            ))?;
            tx.send(InstallMessage::Error(format!(
                "Failed to generate configuration: {}",
                e
            )))?;
            return Ok(());
        }
    }

    // Phase 6: Services
    if config.mode.includes_services() {
        tx.send(InstallMessage::PhaseStart(Phase::Services))?;
        match super::services::install_services(&config) {
            Ok(logs) => {
                for log in logs {
                    tx.send(InstallMessage::Log(log))?;
                }
                tx.send(InstallMessage::PhaseComplete(
                    Phase::Services,
                    Status::Success,
                ))?;
            }
            Err(e) => {
                tx.send(InstallMessage::Log(LogEntry::error(format!(
                    "Service installation failed: {}",
                    e
                ))))?;
                tx.send(InstallMessage::PhaseComplete(
                    Phase::Services,
                    Status::Error,
                ))?;
                tx.send(InstallMessage::Error(format!(
                    "Failed to install services: {}",
                    e
                )))?;
                return Ok(());
            }
        }
    } else {
        tx.send(InstallMessage::PhaseStart(Phase::Services))?;
        tx.send(InstallMessage::Log(LogEntry::info(
            "Skipping service installation (Minimal/Development mode)",
        )))?;
        tx.send(InstallMessage::PhaseComplete(
            Phase::Services,
            Status::Skipped,
        ))?;
    }

    // Phase 7: Verification
    tx.send(InstallMessage::PhaseStart(Phase::Verification))?;
    let verify_checks = super::verify::run_verification(&config);
    let has_errors = verify_checks.iter().any(|c| c.status == Status::Error);
    tx.send(InstallMessage::VerifyResult(verify_checks))?;

    if has_errors {
        tx.send(InstallMessage::PhaseComplete(
            Phase::Verification,
            Status::Warning,
        ))?;
        tx.send(InstallMessage::Log(LogEntry::warning(
            "Some verification checks failed — review results",
        )))?;
    } else {
        tx.send(InstallMessage::PhaseComplete(
            Phase::Verification,
            Status::Success,
        ))?;
    }

    tx.send(InstallMessage::InstallComplete)?;
    Ok(())
}
