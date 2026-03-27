pub mod app_setup;
pub mod config;
pub mod database;
pub mod deps;
pub mod executor;
pub mod preflight;
pub mod services;
pub mod verify;

use anyhow::Result;
use std::process::{Command, Output};

pub fn run_command(cmd: &str, args: &[&str]) -> Result<Output> {
    Ok(Command::new(cmd).args(args).output()?)
}

pub fn run_sudo(cmd: &str, args: &[&str]) -> Result<Output> {
    let mut sudo_args = vec![cmd];
    sudo_args.extend_from_slice(args);
    Ok(Command::new("sudo").args(&sudo_args).output()?)
}

pub fn command_exists(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn is_root() -> bool {
    nix::unistd::geteuid().is_root()
}

pub fn output_to_string(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

pub fn output_stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).trim().to_string()
}
