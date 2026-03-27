use std::path::PathBuf;
use std::sync::mpsc::Receiver;

use crate::installer::executor::InstallMessage;
use crate::theme;

// ── Screen Flow ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    Welcome,
    ModeSelect,
    Config,
    Preflight,
    Progress,
    Verify,
    Complete,
    Error,
}

// ── Install Modes ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum InstallMode {
    #[default]
    Full,
    Minimal,
    Development,
}

impl InstallMode {
    pub const ALL: [InstallMode; 3] = [
        InstallMode::Full,
        InstallMode::Minimal,
        InstallMode::Development,
    ];

    pub fn name(&self) -> &'static str {
        match self {
            InstallMode::Full => "Full",
            InstallMode::Minimal => "Minimal",
            InstallMode::Development => "Development",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            InstallMode::Full => "PostgreSQL + InfraWatch + systemd service (recommended)",
            InstallMode::Minimal => "InfraWatch only — assumes external PostgreSQL",
            InstallMode::Development => "Build from source, dev mode, no systemd service",
        }
    }

    pub fn includes_database(&self) -> bool {
        matches!(self, InstallMode::Full)
    }

    pub fn includes_services(&self) -> bool {
        matches!(self, InstallMode::Full)
    }

    pub fn is_development(&self) -> bool {
        matches!(self, InstallMode::Development)
    }
}

// ── Installation Phases ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Phase {
    Preflight,
    Dependencies,
    Database,
    AppSetup,
    Configuration,
    Services,
    Verification,
}

impl Phase {
    pub const ALL: [Phase; 7] = [
        Phase::Preflight,
        Phase::Dependencies,
        Phase::Database,
        Phase::AppSetup,
        Phase::Configuration,
        Phase::Services,
        Phase::Verification,
    ];

    pub fn name(&self) -> &'static str {
        match self {
            Phase::Preflight => "Preflight Checks",
            Phase::Dependencies => "Dependencies",
            Phase::Database => "Database Setup",
            Phase::AppSetup => "Application Setup",
            Phase::Configuration => "Configuration",
            Phase::Services => "System Services",
            Phase::Verification => "Verification",
        }
    }

    pub fn number(&self) -> usize {
        match self {
            Phase::Preflight => 1,
            Phase::Dependencies => 2,
            Phase::Database => 3,
            Phase::AppSetup => 4,
            Phase::Configuration => 5,
            Phase::Services => 6,
            Phase::Verification => 7,
        }
    }
}

// ── Status ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Pending,
    InProgress,
    Success,
    Warning,
    Error,
    Skipped,
}

impl Status {
    pub fn is_complete(&self) -> bool {
        matches!(
            self,
            Status::Success | Status::Warning | Status::Error | Status::Skipped
        )
    }
}

// ── Logging ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LogLevel {
    Debug,
    Info,
    Success,
    Warning,
    Error,
}

#[derive(Debug, Clone)]
pub struct LogEntry {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub level: LogLevel,
    pub message: String,
}

impl LogEntry {
    pub fn info(msg: impl Into<String>) -> Self {
        Self {
            timestamp: chrono::Utc::now(),
            level: LogLevel::Info,
            message: msg.into(),
        }
    }

    pub fn success(msg: impl Into<String>) -> Self {
        Self {
            timestamp: chrono::Utc::now(),
            level: LogLevel::Success,
            message: msg.into(),
        }
    }

    pub fn warning(msg: impl Into<String>) -> Self {
        Self {
            timestamp: chrono::Utc::now(),
            level: LogLevel::Warning,
            message: msg.into(),
        }
    }

    pub fn error(msg: impl Into<String>) -> Self {
        Self {
            timestamp: chrono::Utc::now(),
            level: LogLevel::Error,
            message: msg.into(),
        }
    }

    #[allow(dead_code)]
    pub fn debug(msg: impl Into<String>) -> Self {
        Self {
            timestamp: chrono::Utc::now(),
            level: LogLevel::Debug,
            message: msg.into(),
        }
    }
}

// ── Check Item ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct CheckItem {
    pub name: String,
    #[allow(dead_code)]
    pub description: String,
    pub status: Status,
    pub message: Option<String>,
}

impl CheckItem {
    pub fn success(name: impl Into<String>, msg: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            description: String::new(),
            status: Status::Success,
            message: Some(msg.into()),
        }
    }

    pub fn warning(name: impl Into<String>, msg: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            description: String::new(),
            status: Status::Warning,
            message: Some(msg.into()),
        }
    }

    pub fn error(name: impl Into<String>, msg: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            description: String::new(),
            status: Status::Error,
            message: Some(msg.into()),
        }
    }
}

// ── Install Config ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum InstallSource {
    #[default]
    Online,
    Airgap,
}

#[derive(Debug, Clone)]
pub struct InstallConfig {
    pub mode: InstallMode,
    pub source: InstallSource,
    pub bundle_path: PathBuf,
    pub install_dir: PathBuf,
    pub data_dir: PathBuf,
    pub db_host: String,
    pub db_port: u16,
    pub db_name: String,
    pub db_user: String,
    pub db_password: String,
    pub admin_username: String,
    pub admin_password: String,
    pub http_port: u16,
    pub license_server_url: String,
    pub connector_encryption_key: String,
    #[allow(dead_code)]
    pub non_interactive: bool,
}

impl InstallConfig {
    pub fn is_airgap(&self) -> bool {
        self.source == InstallSource::Airgap
    }
}

impl Default for InstallConfig {
    fn default() -> Self {
        Self {
            mode: InstallMode::Full,
            source: InstallSource::Online,
            bundle_path: PathBuf::from("/opt/infrawatch-bundle"),
            install_dir: PathBuf::from("/opt/infrawatch"),
            data_dir: PathBuf::from("/var/lib/infrawatch"),
            db_host: "localhost".to_string(),
            db_port: 5432,
            db_name: "infrawatch".to_string(),
            db_user: "infrawatch".to_string(),
            db_password: String::new(),
            admin_username: "admin".to_string(),
            admin_password: String::new(),
            http_port: 3001,
            license_server_url: "https://billing.nexusquantum.id".to_string(),
            connector_encryption_key: String::new(),
            non_interactive: false,
        }
    }
}

// ── Config Field Names ───────────────────────────────────────────────────────

pub const CONFIG_FIELDS: [&str; 12] = [
    "Install Directory",
    "Data Directory",
    "DB Host",
    "DB Port",
    "DB Name",
    "DB User",
    "DB Password",
    "Admin Username",
    "Admin Password",
    "HTTP Port",
    "License Server URL",
    "Encryption Key",
];

impl InstallConfig {
    pub fn get_field(&self, index: usize) -> String {
        match index {
            0 => self.install_dir.display().to_string(),
            1 => self.data_dir.display().to_string(),
            2 => self.db_host.clone(),
            3 => self.db_port.to_string(),
            4 => self.db_name.clone(),
            5 => self.db_user.clone(),
            6 => {
                if self.db_password.is_empty() {
                    "(auto-generate)".to_string()
                } else {
                    "*".repeat(self.db_password.len())
                }
            }
            7 => self.admin_username.clone(),
            8 => {
                if self.admin_password.is_empty() {
                    "(auto-generate)".to_string()
                } else {
                    "*".repeat(self.admin_password.len())
                }
            }
            9 => self.http_port.to_string(),
            10 => self.license_server_url.clone(),
            11 => {
                if self.connector_encryption_key.is_empty() {
                    "(auto-generate)".to_string()
                } else {
                    format!(
                        "{}...",
                        &self.connector_encryption_key
                            [..8.min(self.connector_encryption_key.len())]
                    )
                }
            }
            _ => String::new(),
        }
    }

    pub fn get_field_raw(&self, index: usize) -> String {
        match index {
            0 => self.install_dir.display().to_string(),
            1 => self.data_dir.display().to_string(),
            2 => self.db_host.clone(),
            3 => self.db_port.to_string(),
            4 => self.db_name.clone(),
            5 => self.db_user.clone(),
            6 => self.db_password.clone(),
            7 => self.admin_username.clone(),
            8 => self.admin_password.clone(),
            9 => self.http_port.to_string(),
            10 => self.license_server_url.clone(),
            11 => self.connector_encryption_key.clone(),
            _ => String::new(),
        }
    }

    pub fn set_field(&mut self, index: usize, value: String) {
        match index {
            0 => self.install_dir = PathBuf::from(&value),
            1 => self.data_dir = PathBuf::from(&value),
            2 => self.db_host = value,
            3 => {
                if let Ok(port) = value.parse() {
                    self.db_port = port;
                }
            }
            4 => self.db_name = value,
            5 => self.db_user = value,
            6 => self.db_password = value,
            7 => self.admin_username = value,
            8 => self.admin_password = value,
            9 => {
                if let Ok(port) = value.parse() {
                    self.http_port = port;
                }
            }
            10 => self.license_server_url = value,
            11 => self.connector_encryption_key = value,
            _ => {}
        }
    }
}

// ── App Struct ───────────────────────────────────────────────────────────────

pub struct App {
    // Navigation
    pub screen: Screen,
    pub should_quit: bool,

    // Configuration
    pub config: InstallConfig,

    // UI selection state
    pub mode_selection: usize,
    pub config_field: usize,
    pub editing: bool,
    pub input_buffer: String,

    // Installation state
    pub phases: Vec<(Phase, Status)>,
    pub current_phase: Option<Phase>,
    pub preflight_checks: Vec<CheckItem>,
    pub verify_checks: Vec<CheckItem>,
    pub logs: Vec<LogEntry>,
    pub log_scroll: usize,
    pub auto_scroll: bool,
    pub error_message: Option<String>,

    // Message channel from background thread
    pub install_rx: Option<Receiver<InstallMessage>>,

    // Installation complete flag
    pub install_complete: bool,

    // Terminal
    pub terminal_cols: u16,
    pub terminal_rows: u16,
    pub terminal_too_small: bool,
    pub spinner_frame: usize,
}

impl App {
    pub fn new() -> Self {
        let phases = Phase::ALL.iter().map(|p| (*p, Status::Pending)).collect();

        Self {
            screen: Screen::Welcome,
            should_quit: false,
            config: InstallConfig::default(),
            mode_selection: 0,
            config_field: 0,
            editing: false,
            input_buffer: String::new(),
            phases,
            current_phase: None,
            preflight_checks: Vec::new(),
            verify_checks: Vec::new(),
            logs: Vec::new(),
            log_scroll: 0,
            auto_scroll: true,
            error_message: None,
            install_rx: None,
            install_complete: false,
            terminal_cols: 80,
            terminal_rows: 24,
            terminal_too_small: false,
            spinner_frame: 0,
        }
    }

    pub fn with_config(mut self, config: InstallConfig) -> Self {
        self.config = config;
        self
    }

    // ── Navigation ───────────────────────────────────────────────────────

    pub fn next_screen(&mut self) {
        self.screen = match self.screen {
            Screen::Welcome => Screen::ModeSelect,
            Screen::ModeSelect => Screen::Config,
            Screen::Config => Screen::Preflight,
            Screen::Preflight => Screen::Progress,
            Screen::Progress => Screen::Verify,
            Screen::Verify => Screen::Complete,
            Screen::Complete => Screen::Complete,
            Screen::Error => Screen::Error,
        };
    }

    pub fn prev_screen(&mut self) {
        self.screen = match self.screen {
            Screen::Welcome => Screen::Welcome,
            Screen::ModeSelect => Screen::Welcome,
            Screen::Config => Screen::ModeSelect,
            Screen::Preflight => Screen::Config,
            _ => self.screen,
        };
    }

    // ── Spinner ──────────────────────────────────────────────────────────

    pub fn tick_spinner(&mut self) {
        self.spinner_frame = (self.spinner_frame + 1) % 10;
    }

    pub fn spinner(&self) -> &'static str {
        theme::symbols::SPINNER[self.spinner_frame]
    }

    // ── Terminal Size ────────────────────────────────────────────────────

    pub fn update_terminal_size(&mut self, cols: u16, rows: u16) {
        self.terminal_cols = cols;
        self.terminal_rows = rows;
        self.terminal_too_small = cols < 80 || rows < 24;
    }

    // ── Phase Management ─────────────────────────────────────────────────

    pub fn set_phase_status(&mut self, phase: Phase, status: Status) {
        if let Some(entry) = self.phases.iter_mut().find(|(p, _)| *p == phase) {
            entry.1 = status;
        }
    }

    #[allow(dead_code)]
    pub fn phase_status(&self, phase: Phase) -> Status {
        self.phases
            .iter()
            .find(|(p, _)| *p == phase)
            .map(|(_, s)| *s)
            .unwrap_or(Status::Pending)
    }

    // ── Logging ──────────────────────────────────────────────────────────

    pub fn log(&mut self, entry: LogEntry) {
        self.logs.push(entry);
        if self.auto_scroll {
            let visible = self.terminal_rows.saturating_sub(15) as usize;
            if self.logs.len() > visible {
                self.log_scroll = self.logs.len().saturating_sub(visible);
            }
        }
    }

    // ── Screen Info ──────────────────────────────────────────────────────

    pub fn screen_name(&self) -> &'static str {
        match self.screen {
            Screen::Welcome => "Welcome",
            Screen::ModeSelect => "Mode Selection",
            Screen::Config => "Configuration",
            Screen::Preflight => "Preflight Checks",
            Screen::Progress => "Installation",
            Screen::Verify => "Verification",
            Screen::Complete => "Complete",
            Screen::Error => "Error",
        }
    }

    pub fn step_number(&self) -> usize {
        match self.screen {
            Screen::Welcome => 1,
            Screen::ModeSelect => 2,
            Screen::Config => 3,
            Screen::Preflight => 4,
            Screen::Progress => 5,
            Screen::Verify => 6,
            Screen::Complete => 7,
            Screen::Error => 0,
        }
    }
}
