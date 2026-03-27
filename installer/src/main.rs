mod app;
mod installer;
mod theme;
mod ui;

use std::io;
use std::path::PathBuf;
use std::time::Duration;

use anyhow::Result;
use clap::{Parser, Subcommand, ValueEnum};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{
        self, disable_raw_mode, enable_raw_mode, Clear, ClearType, EnterAlternateScreen,
        LeaveAlternateScreen,
    },
};
use ratatui::{backend::CrosstermBackend, Terminal};

use app::{App, InstallConfig, InstallMode, Screen, Status};
use installer::executor::InstallMessage;

// ── CLI ──────────────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(
    name = "infrawatch-installer",
    version,
    about = "NQRust-InfraWatch — Infrastructure Observability Dashboard Installer"
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Install InfraWatch
    Install {
        #[arg(long, value_enum, default_value = "full")]
        mode: CliInstallMode,

        #[arg(long, default_value = "/opt/infrawatch")]
        install_dir: PathBuf,

        #[arg(long, default_value = "/var/lib/infrawatch")]
        data_dir: PathBuf,

        #[arg(long, default_value = "localhost")]
        db_host: String,

        #[arg(long, default_value = "5432")]
        db_port: u16,

        #[arg(long, default_value = "infrawatch")]
        db_name: String,

        #[arg(long, default_value = "infrawatch")]
        db_user: String,

        #[arg(long)]
        db_password: Option<String>,

        #[arg(long, default_value = "admin")]
        admin_username: String,

        #[arg(long)]
        admin_password: Option<String>,

        #[arg(long, default_value = "3001")]
        http_port: u16,

        /// Non-interactive mode (use defaults, no TUI)
        #[arg(long)]
        non_interactive: bool,
    },
    /// Uninstall InfraWatch
    Uninstall {
        #[arg(long)]
        keep_data: bool,

        #[arg(long)]
        keep_database: bool,

        #[arg(long)]
        force: bool,
    },
}

#[derive(Debug, Clone, Copy, ValueEnum)]
enum CliInstallMode {
    Full,
    Minimal,
    Development,
}

impl From<CliInstallMode> for InstallMode {
    fn from(mode: CliInstallMode) -> Self {
        match mode {
            CliInstallMode::Full => InstallMode::Full,
            CliInstallMode::Minimal => InstallMode::Minimal,
            CliInstallMode::Development => InstallMode::Development,
        }
    }
}

// ── Entry Point ──────────────────────────────────────────────────────────────

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Install {
            mode,
            install_dir,
            data_dir,
            db_host,
            db_port,
            db_name,
            db_user,
            db_password,
            admin_username,
            admin_password,
            http_port,
            non_interactive,
        }) => {
            let config = InstallConfig {
                mode: mode.into(),
                install_dir,
                data_dir,
                db_host,
                db_port,
                db_name,
                db_user,
                db_password: db_password.unwrap_or_default(),
                admin_username,
                admin_password: admin_password.unwrap_or_default(),
                http_port,
                non_interactive,
                ..InstallConfig::default()
            };

            if non_interactive {
                run_non_interactive(config)
            } else {
                run_tui(config)
            }
        }
        Some(Commands::Uninstall {
            keep_data,
            keep_database,
            force,
        }) => run_uninstall(keep_data, keep_database, force),
        None => run_tui(InstallConfig::default()),
    }
}

// ── TUI Mode ─────────────────────────────────────────────────────────────────

fn run_tui(config: InstallConfig) -> Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(
        stdout,
        EnterAlternateScreen,
        Clear(ClearType::All),
        EnableMouseCapture
    )?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.clear()?;

    let mut app = App::new().with_config(config);
    if let Ok((cols, rows)) = terminal::size() {
        app.update_terminal_size(cols, rows);
    }

    let result = run_app(&mut terminal, &mut app);

    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    result
}

fn run_app<B: ratatui::backend::Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    loop {
        // 1. DRAW
        terminal.draw(|f| ui::render(f, app))?;

        // 2. INPUT (100ms timeout for spinner animation)
        if event::poll(Duration::from_millis(100))? {
            match event::read()? {
                Event::Resize(cols, rows) => {
                    app.update_terminal_size(cols, rows);
                }
                Event::Key(key) => {
                    if key.code == KeyCode::Char('c')
                        && key.modifiers.contains(KeyModifiers::CONTROL)
                    {
                        app.should_quit = true;
                    }

                    if !app.terminal_too_small {
                        match app.screen {
                            Screen::Welcome => handle_welcome_input(app, key.code),
                            Screen::ModeSelect => handle_mode_select_input(app, key.code),
                            Screen::Config => handle_config_input(app, key.code),
                            Screen::Preflight => handle_preflight_input(app, key.code),
                            Screen::Progress => handle_progress_input(app, key.code),
                            Screen::Verify => handle_verify_input(app, key.code),
                            Screen::Complete => handle_complete_input(app, key.code),
                            Screen::Error => handle_error_input(app, key.code),
                        }
                    }
                }
                _ => {}
            }
        } else {
            app.tick_spinner();
        }

        // 3. DRAIN messages from background installation thread
        let mut messages = Vec::new();
        if let Some(rx) = &app.install_rx {
            while let Ok(msg) = rx.try_recv() {
                messages.push(msg);
            }
        }
        for msg in messages {
            match msg {
                InstallMessage::PhaseStart(phase) => {
                    app.current_phase = Some(phase);
                    app.set_phase_status(phase, Status::InProgress);
                    app.log(app::LogEntry::info(format!("Starting: {}", phase.name())));
                }
                InstallMessage::PhaseProgress(_phase, message) => {
                    app.log(app::LogEntry::info(message));
                }
                InstallMessage::PhaseComplete(phase, status) => {
                    app.set_phase_status(phase, status);
                    app.current_phase = None;
                    let level = match status {
                        Status::Success => "completed",
                        Status::Warning => "completed with warnings",
                        Status::Skipped => "skipped",
                        _ => "failed",
                    };
                    app.log(app::LogEntry::info(format!("{}: {}", phase.name(), level)));
                }
                InstallMessage::Log(entry) => {
                    app.log(entry);
                }
                InstallMessage::PreflightResult(checks) => {
                    app.preflight_checks = checks;
                }
                InstallMessage::VerifyResult(checks) => {
                    app.verify_checks = checks;
                }
                InstallMessage::Error(msg) => {
                    app.error_message = Some(msg);
                    app.screen = Screen::Error;
                }
                InstallMessage::InstallComplete => {
                    app.install_complete = true;
                    app.next_screen(); // Progress → Verify
                }
            }
        }

        if app.should_quit {
            break;
        }
    }
    Ok(())
}

// ── Input Handlers ───────────────────────────────────────────────────────────

fn handle_welcome_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Enter => app.next_screen(),
        KeyCode::Char('q') => app.should_quit = true,
        _ => {}
    }
}

fn handle_mode_select_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Up | KeyCode::Char('k') => {
            if app.mode_selection > 0 {
                app.mode_selection -= 1;
            }
        }
        KeyCode::Down | KeyCode::Char('j') => {
            if app.mode_selection < InstallMode::ALL.len() - 1 {
                app.mode_selection += 1;
            }
        }
        KeyCode::Enter => {
            app.config.mode = InstallMode::ALL[app.mode_selection];
            app.next_screen();
        }
        KeyCode::Esc => app.prev_screen(),
        KeyCode::Char('q') => app.should_quit = true,
        _ => {}
    }
}

fn handle_config_input(app: &mut App, key: KeyCode) {
    if app.editing {
        match key {
            KeyCode::Enter => {
                let value = app.input_buffer.clone();
                app.config.set_field(app.config_field, value);
                app.editing = false;
                app.input_buffer.clear();
            }
            KeyCode::Esc => {
                app.editing = false;
                app.input_buffer.clear();
            }
            KeyCode::Backspace => {
                app.input_buffer.pop();
            }
            KeyCode::Char(c) => {
                app.input_buffer.push(c);
            }
            _ => {}
        }
    } else {
        match key {
            KeyCode::Up | KeyCode::Char('k') => {
                if app.config_field > 0 {
                    app.config_field -= 1;
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if app.config_field < app::CONFIG_FIELDS.len() - 1 {
                    app.config_field += 1;
                }
            }
            KeyCode::Char('e') | KeyCode::Char(' ') => {
                app.editing = true;
                app.input_buffer = app.config.get_field_raw(app.config_field);
            }
            KeyCode::Enter => {
                app.next_screen();
                // Run preflight checks when entering preflight screen
                run_preflight(app);
            }
            KeyCode::Esc => app.prev_screen(),
            KeyCode::Char('q') => app.should_quit = true,
            _ => {}
        }
    }
}

fn handle_preflight_input(app: &mut App, key: KeyCode) {
    let has_errors = app
        .preflight_checks
        .iter()
        .any(|c| c.status == Status::Error);
    let checks_done = !app.preflight_checks.is_empty();

    match key {
        KeyCode::Enter if checks_done && !has_errors => {
            start_installation(app);
            app.next_screen();
        }
        KeyCode::Char('r') => {
            run_preflight(app);
        }
        KeyCode::Esc => app.prev_screen(),
        KeyCode::Char('q') => app.should_quit = true,
        _ => {}
    }
}

fn handle_progress_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Up | KeyCode::Char('k') => {
            app.auto_scroll = false;
            if app.log_scroll > 0 {
                app.log_scroll -= 1;
            }
        }
        KeyCode::Down | KeyCode::Char('j') => {
            app.log_scroll += 1;
            let visible = app.terminal_rows.saturating_sub(15) as usize;
            if app.log_scroll >= app.logs.len().saturating_sub(visible) {
                app.auto_scroll = true;
            }
        }
        KeyCode::Enter if app.install_complete => {
            app.next_screen();
        }
        KeyCode::Char('q') => app.should_quit = true,
        _ => {}
    }
}

fn handle_verify_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Enter if !app.verify_checks.is_empty() => {
            app.next_screen();
        }
        KeyCode::Char('q') => app.should_quit = true,
        _ => {}
    }
}

fn handle_complete_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Char('q') | KeyCode::Enter => app.should_quit = true,
        _ => {}
    }
}

fn handle_error_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Char('q') | KeyCode::Esc => app.should_quit = true,
        _ => {}
    }
}

// ── Actions ──────────────────────────────────────────────────────────────────

fn run_preflight(app: &mut App) {
    app.preflight_checks.clear();
    let checks = installer::preflight::run_preflight_checks(&app.config);
    app.preflight_checks = checks;
}

fn start_installation(app: &mut App) {
    let (tx, rx) = std::sync::mpsc::channel();
    app.install_rx = Some(rx);
    app.install_complete = false;

    // Reset phases
    for phase in &mut app.phases {
        phase.1 = Status::Pending;
    }

    let config = app.config.clone();

    std::thread::spawn(move || {
        if let Err(e) = installer::executor::run_installation(config, tx.clone()) {
            let _ = tx.send(InstallMessage::Error(format!("Installation failed: {}", e)));
        }
    });
}

// ── Non-Interactive Mode ─────────────────────────────────────────────────────

fn run_non_interactive(config: InstallConfig) -> Result<()> {
    println!("{} Installer v{}", theme::PRODUCT_NAME, theme::VERSION);
    println!("Mode: {}", config.mode.name());
    println!("Install directory: {}", config.install_dir.display());
    println!();

    // Run preflight
    println!("Running preflight checks...");
    let checks = installer::preflight::run_preflight_checks(&config);
    let mut has_errors = false;
    for check in &checks {
        let symbol = match check.status {
            Status::Success => "✓",
            Status::Warning => "⚠",
            Status::Error => {
                has_errors = true;
                "✗"
            }
            _ => "○",
        };
        println!(
            "  {} {} — {}",
            symbol,
            check.name,
            check.message.as_deref().unwrap_or("")
        );
    }

    if has_errors {
        eprintln!("\nPreflight checks failed. Aborting.");
        std::process::exit(1);
    }

    // Run installation
    let (tx, rx) = std::sync::mpsc::channel();
    let config_clone = config.clone();

    let handle =
        std::thread::spawn(move || installer::executor::run_installation(config_clone, tx));

    // Print messages as they arrive
    loop {
        match rx.recv() {
            Ok(InstallMessage::Log(entry)) => {
                println!("[{}] {}", entry.timestamp.format("%H:%M:%S"), entry.message);
            }
            Ok(InstallMessage::PhaseStart(phase)) => {
                println!("\n── {} ──", phase.name());
            }
            Ok(InstallMessage::PhaseComplete(phase, status)) => {
                let symbol = match status {
                    Status::Success => "✓",
                    Status::Warning => "⚠",
                    Status::Error => "✗",
                    Status::Skipped => "⊘",
                    _ => "○",
                };
                println!("{} {} complete", symbol, phase.name());
            }
            Ok(InstallMessage::Error(msg)) => {
                eprintln!("\nERROR: {}", msg);
                std::process::exit(1);
            }
            Ok(InstallMessage::InstallComplete) => {
                println!("\n✓ Installation complete!");
                println!(
                    "  Access InfraWatch at: http://localhost:{}",
                    config.http_port
                );
                break;
            }
            Ok(_) => {}
            Err(_) => break,
        }
    }

    handle
        .join()
        .map_err(|_| anyhow::anyhow!("Install thread panicked"))??;
    Ok(())
}

// ── Uninstall ────────────────────────────────────────────────────────────────

fn run_uninstall(keep_data: bool, keep_database: bool, force: bool) -> Result<()> {
    if !force {
        println!("This will remove InfraWatch from your system.");
        println!("  --keep-data: {}", if keep_data { "yes" } else { "no" });
        println!(
            "  --keep-database: {}",
            if keep_database { "yes" } else { "no" }
        );
        println!("\nRe-run with --force to confirm.");
        return Ok(());
    }

    println!("Uninstalling InfraWatch...");

    // Stop and disable service
    let _ = installer::run_sudo("systemctl", &["stop", "infrawatch"]);
    let _ = installer::run_sudo("systemctl", &["disable", "infrawatch"]);
    let _ = installer::run_sudo("rm", &["-f", "/etc/systemd/system/infrawatch.service"]);
    let _ = installer::run_sudo("systemctl", &["daemon-reload"]);
    println!("✓ Service removed");

    if !keep_data {
        let _ = installer::run_sudo("rm", &["-rf", "/opt/infrawatch"]);
        let _ = installer::run_sudo("rm", &["-rf", "/var/lib/infrawatch"]);
        println!("✓ Data removed");
    }

    if !keep_database {
        let _ = installer::run_sudo(
            "sudo",
            &["-u", "postgres", "dropdb", "--if-exists", "infrawatch"],
        );
        let _ = installer::run_sudo(
            "sudo",
            &["-u", "postgres", "dropuser", "--if-exists", "infrawatch"],
        );
        println!("✓ Database removed");
    }

    // Remove system user
    let _ = installer::run_sudo("userdel", &["-r", "infrawatch"]);
    println!("✓ System user removed");

    println!("\nInfraWatch has been uninstalled.");
    Ok(())
}
