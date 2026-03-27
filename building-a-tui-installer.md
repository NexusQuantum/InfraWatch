# Building a Production-Grade TUI App Installer with Rust + Ratatui

A comprehensive tutorial based on the NQR-MicroVM installer — a real-world, production TUI installer that handles system dependency installation, database setup, network configuration, KVM virtualization, systemd services, and post-install verification, all through a beautiful terminal UI.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Setup](#2-project-setup)
3. [The State Machine (app.rs)](#3-the-state-machine-apprs)
4. [Theming System (theme.rs)](#4-theming-system-themers)
5. [Terminal Setup and Main Loop (main.rs)](#5-terminal-setup-and-main-loop-mainrs)
6. [Screen System (ui/)](#6-screen-system-ui)
7. [Custom Widgets](#7-custom-widgets)
8. [Background Installation with Message Passing](#8-background-installation-with-message-passing)
9. [Installer Modules](#9-installer-modules)
10. [CLI Interface with Clap](#10-cli-interface-with-clap)
11. [Shell Bootstrap Script](#11-shell-bootstrap-script)
12. [Patterns and Lessons Learned](#12-patterns-and-lessons-learned)

---

## 1. Architecture Overview

The installer follows a clean separation of concerns:

```
apps/installer/
├── Cargo.toml
└── src/
    ├── main.rs              # Entry point, CLI, terminal setup, input handling
    ├── app.rs               # State machine — all enums, config, app state
    ├── theme.rs             # Colors, styles, symbols, branding
    ├── ui/
    │   ├── mod.rs           # Main renderer dispatch
    │   ├── screens/         # One file per screen (welcome, config, progress, etc.)
    │   └── widgets/         # Reusable widgets (log viewer, phase progress, status bar)
    └── installer/
        ├── mod.rs           # Shared command utilities
        ├── executor.rs      # Orchestration — runs phases in order via message passing
        ├── preflight.rs     # System requirement checks
        ├── deps.rs          # Package manager detection and dependency installation
        ├── database.rs      # PostgreSQL setup
        ├── network.rs       # Network bridge configuration
        ├── kvm.rs           # KVM/virtualization setup
        ├── build.rs         # Binary downloads and image management
        ├── config.rs        # Generate .env and config files
        ├── services.rs      # Systemd service creation and management
        └── verify.rs        # Post-install health checks
```

**Key design decisions:**
- **State machine navigation** — screens flow in a defined sequence, with `next_screen()` / `prev_screen()`
- **Message passing** — installation runs in a background thread, sends `InstallMessage` via `mpsc` channel
- **Dual-path logic** — online (download) and air-gapped (local bundle) modes share the same phase sequence
- **Idempotent operations** — every setup function checks "already done?" before acting
- **Logging everywhere** — every operation returns `Vec<LogEntry>`, displayed in real-time

---

## 2. Project Setup

### Cargo.toml

```toml
[package]
name = "my-installer"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "my-installer"
path = "src/main.rs"

[dependencies]
# TUI framework
ratatui = "0.29"
crossterm = "0.28"

# CLI parsing
clap = { version = "4", features = ["derive"] }

# Async (for reqwest downloads, optional)
tokio = { version = "1", features = ["full"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"

# Error handling
anyhow = "1"
thiserror = "1"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
rand = "0.8"

# Downloads and checksums (optional, for online install)
reqwest = { version = "0.12", features = ["blocking"] }
sha2 = "0.10"

# System info
sysinfo = "0.32"
nix = { version = "0.29", features = ["user", "fs", "process"] }
```

**Why these crates:**
- `ratatui` + `crossterm` — the modern Rust TUI stack. Ratatui handles layout/widgets, crossterm handles terminal I/O
- `clap` with derive — zero-boilerplate CLI parsing with `--long-flag` support
- `sysinfo` — cross-platform system information (CPU, memory, disk)
- `nix` — Unix-specific operations (checking root, file permissions)
- `anyhow` — ergonomic error handling with `.context()` chains

---

## 3. The State Machine (app.rs)

The heart of the installer. Every piece of mutable state lives in one `App` struct, and navigation is controlled by enums.

### Screen Flow

```
Welcome → ModeSelect → NetworkConfig → Config → Preflight → Progress → Verify → Complete
                                                                              ↘ Error
```

For disk installations (ISO mode):
```
Welcome → InstallTypeSelect → DiskSelect → DiskConfig → DiskProgress → Complete
```

### Core Enums

```rust
/// Which screen is currently displayed
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    Welcome,
    ModeSelect,
    NetworkConfig,
    Config,
    Preflight,
    Progress,
    Verify,
    Complete,
    Error,
}

/// What kind of installation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum InstallMode {
    #[default]
    Production,
    Development,
    ManagerOnly,
    AgentOnly,
    Minimal,
}

/// Each mode carries metadata via methods
impl InstallMode {
    pub const ALL: [InstallMode; 5] = [
        InstallMode::Production,
        InstallMode::Development,
        InstallMode::ManagerOnly,
        InstallMode::AgentOnly,
        InstallMode::Minimal,
    ];

    pub fn name(&self) -> &'static str {
        match self {
            InstallMode::Production => "Production",
            InstallMode::Development => "Development",
            InstallMode::ManagerOnly => "Manager Only",
            InstallMode::AgentOnly => "Agent Only",
            InstallMode::Minimal => "Minimal",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            InstallMode::Production => "Full installation with Manager, Agent, and Web UI",
            InstallMode::Development => "Build from source for development and testing",
            // ...
        }
    }

    /// Helper to check what components this mode includes
    pub fn includes_manager(&self) -> bool {
        matches!(self, InstallMode::Production | InstallMode::Development
            | InstallMode::ManagerOnly | InstallMode::Minimal)
    }
}
```

### Installation Phases

```rust
/// Ordered installation phases
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Phase {
    Preflight,
    Dependencies,
    Kvm,
    Network,
    Database,
    Binaries,
    Install,
    Images,
    Configuration,
    Sudo,
    Services,
    Verification,
}

impl Phase {
    pub fn name(&self) -> &'static str { /* ... */ }
    pub fn number(&self) -> usize { /* 1-based index */ }
}

/// Status of each phase or check
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
        matches!(self, Status::Success | Status::Warning | Status::Error | Status::Skipped)
    }
}
```

### Logging

```rust
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
        Self { timestamp: chrono::Utc::now(), level: LogLevel::Info, message: msg.into() }
    }
    pub fn success(msg: impl Into<String>) -> Self {
        Self { timestamp: chrono::Utc::now(), level: LogLevel::Success, message: msg.into() }
    }
    pub fn error(msg: impl Into<String>) -> Self {
        Self { timestamp: chrono::Utc::now(), level: LogLevel::Error, message: msg.into() }
    }
    // warning(), debug() ...
}
```

### The App Struct

```rust
pub struct App {
    // --- Navigation ---
    pub screen: Screen,
    pub should_quit: bool,

    // --- Configuration ---
    pub config: InstallConfig,

    // --- UI selection state ---
    pub mode_selection: usize,          // Index into InstallMode::ALL
    pub network_mode_selection: usize,  // Index into NetworkMode::ALL
    pub config_field: usize,            // Which config field is selected
    pub editing: bool,                  // In edit mode for a field?
    pub input_buffer: String,           // Text being typed

    // --- Installation state ---
    pub phases: Vec<(Phase, Status)>,
    pub current_phase: Option<Phase>,
    pub preflight_checks: Vec<CheckItem>,
    pub logs: Vec<LogEntry>,
    pub log_scroll: usize,
    pub error_message: Option<String>,

    // --- Message channel from background thread ---
    pub install_rx: Option<std::sync::mpsc::Receiver<InstallMessage>>,

    // --- Terminal ---
    pub terminal_cols: u16,
    pub terminal_rows: u16,
    pub terminal_too_small: bool,
    pub spinner_frame: usize,

    // --- Network detection ---
    pub detected_interface: Option<String>,
    pub detected_ip: Option<String>,
    pub detected_gateway: Option<String>,
}
```

### Screen Navigation

```rust
impl App {
    pub fn next_screen(&mut self) {
        self.screen = match self.screen {
            Screen::Welcome => Screen::ModeSelect,
            Screen::ModeSelect => Screen::NetworkConfig,
            Screen::NetworkConfig => Screen::Config,
            Screen::Config => Screen::Preflight,
            Screen::Preflight => Screen::Progress,
            Screen::Progress => Screen::Verify,
            Screen::Verify => Screen::Complete,
            Screen::Complete => Screen::Complete,  // Terminal state
            Screen::Error => Screen::Error,
        };
    }

    pub fn prev_screen(&mut self) {
        self.screen = match self.screen {
            Screen::Welcome => Screen::Welcome,
            Screen::ModeSelect => Screen::Welcome,
            Screen::NetworkConfig => Screen::ModeSelect,
            Screen::Config => Screen::NetworkConfig,
            Screen::Preflight => Screen::Config,
            // Can't go back from Progress/Verify/Complete
            _ => self.screen,
        };
    }

    pub fn tick_spinner(&mut self) {
        self.spinner_frame = (self.spinner_frame + 1) % 10;
    }

    pub fn spinner(&self) -> &'static str {
        theme::symbols::SPINNER[self.spinner_frame]
    }

    pub fn update_terminal_size(&mut self, cols: u16, rows: u16) {
        self.terminal_cols = cols;
        self.terminal_rows = rows;
        self.terminal_too_small = cols < 80 || rows < 24;
    }
}
```

**Key pattern:** The `App` struct is the single source of truth. Every input handler mutates `App`, every renderer reads `App`. No other mutable state exists.

---

## 4. Theming System (theme.rs)

A centralized theme keeps the UI consistent and makes rebranding trivial.

```rust
use ratatui::style::{Color, Modifier, Style};

// --- Brand Colors ---
pub const PRIMARY: Color = Color::Rgb(255, 80, 1);     // Your brand color
pub const SUCCESS: Color = Color::Rgb(34, 197, 94);
pub const WARNING: Color = Color::Rgb(234, 179, 8);
pub const ERROR: Color = Color::Rgb(239, 68, 68);
pub const INFO: Color = Color::Rgb(59, 130, 246);
pub const BACKGROUND: Color = Color::Rgb(26, 26, 26);
pub const FOREGROUND: Color = Color::Rgb(252, 252, 252);
pub const CARD: Color = Color::Rgb(53, 53, 53);
pub const BORDER: Color = Color::Rgb(74, 74, 74);
pub const MUTED: Color = Color::Rgb(107, 114, 128);
pub const SECONDARY: Color = Color::Rgb(156, 163, 175);

// --- Status Symbols ---
pub mod symbols {
    pub const CHECK: &str = "✓";
    pub const CROSS: &str = "✗";
    pub const PENDING: &str = "○";
    pub const IN_PROGRESS: &str = "◐";
    pub const SPINNER: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
}

// --- Pre-built Composable Styles ---
pub mod styles {
    use super::*;

    pub fn text() -> Style { Style::default().fg(FOREGROUND) }
    pub fn primary() -> Style { Style::default().fg(PRIMARY) }
    pub fn primary_bold() -> Style { Style::default().fg(PRIMARY).add_modifier(Modifier::BOLD) }
    pub fn success() -> Style { Style::default().fg(SUCCESS) }
    pub fn warning() -> Style { Style::default().fg(WARNING) }
    pub fn error() -> Style { Style::default().fg(ERROR) }
    pub fn info() -> Style { Style::default().fg(INFO) }
    pub fn muted() -> Style { Style::default().fg(MUTED) }
    pub fn secondary() -> Style { Style::default().fg(SECONDARY) }
    pub fn title() -> Style { Style::default().fg(PRIMARY).add_modifier(Modifier::BOLD) }
    pub fn header() -> Style { Style::default().fg(FOREGROUND).add_modifier(Modifier::BOLD) }
    pub fn key_hint() -> Style { Style::default().fg(INFO) }
    pub fn border() -> Style { Style::default().fg(BORDER) }
    pub fn border_active() -> Style { Style::default().fg(PRIMARY) }
    pub fn highlight() -> Style {
        Style::default().fg(FOREGROUND).bg(PRIMARY).add_modifier(Modifier::BOLD)
    }
}

// --- Branding ---
pub const LOGO: &str = r#"
  ███╗   ██╗ ██████╗ ██████╗
  ████╗  ██║██╔═══██╗██╔══██╗
  ██╔██╗ ██║██║   ██║██████╔╝
  ██║╚██╗██║██║▄▄ ██║██╔══██╗
  ██║ ╚████║╚██████╔╝██║  ██║
  ╚═╝  ╚═══╝ ╚══▀▀═╝ ╚═╝  ╚═╝
"#;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const PRODUCT_NAME: &str = "My App";
```

**Why this matters:** Every style call in the entire codebase goes through `styles::*`. Changing `PRIMARY` from orange to blue rebrands the entire installer. The 10-frame braille spinner (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) gives smooth animation at the 100ms poll interval.

---

## 5. Terminal Setup and Main Loop (main.rs)

### Terminal Lifecycle

```rust
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{self, disable_raw_mode, enable_raw_mode, Clear, ClearType,
               EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};

fn run_tui(config: InstallConfig) -> Result<()> {
    // 1. Enter raw mode (no line buffering, capture all keys)
    enable_raw_mode()?;
    let mut stdout = io::stdout();

    // 2. Switch to alternate screen (preserves user's terminal content)
    execute!(stdout, EnterAlternateScreen, Clear(ClearType::All), EnableMouseCapture)?;

    // 3. Create ratatui terminal
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.clear()?;

    // 4. Create app state
    let mut app = App::new().with_config(config);
    if let Ok((cols, rows)) = terminal::size() {
        app.update_terminal_size(cols, rows);
    }

    // 5. Run main loop
    let result = run_app(&mut terminal, &mut app);

    // 6. ALWAYS restore terminal (even on panic — consider using a Drop guard)
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture)?;
    terminal.show_cursor()?;

    result
}
```

### The Main Loop

The main loop does three things on every iteration:
1. **Draw** the UI
2. **Poll** for input (with 100ms timeout for spinner animation)
3. **Drain** messages from the background installation thread

```rust
fn run_app<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    app: &mut App,
) -> Result<()> {
    loop {
        // 1. DRAW
        terminal.draw(|f| ui::render(f, app))?;

        // 2. INPUT (100ms timeout = ~10fps for spinner)
        if event::poll(Duration::from_millis(100))? {
            match event::read()? {
                Event::Resize(cols, rows) => {
                    app.update_terminal_size(cols, rows);
                }
                Event::Key(key) => {
                    // Global: Ctrl+C always quits
                    if key.code == KeyCode::Char('c')
                        && key.modifiers.contains(KeyModifiers::CONTROL)
                    {
                        app.should_quit = true;
                    }

                    // Skip input when terminal too small
                    if !app.terminal_too_small {
                        // Dispatch to screen-specific handler
                        match app.screen {
                            Screen::Welcome => handle_welcome_input(app, key.code),
                            Screen::ModeSelect => handle_mode_select_input(app, key.code),
                            Screen::Config => handle_config_input(app, key.code),
                            Screen::Progress => handle_progress_input(app, key.code),
                            // ... one handler per screen
                        }
                    }
                }
                _ => {}
            }
        } else {
            // No input — tick spinner animation
            app.tick_spinner();
        }

        // 3. DRAIN messages from installation thread
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
                }
                InstallMessage::PhaseProgress(_phase, message) => {
                    app.log(LogEntry::info(message));
                }
                InstallMessage::PhaseComplete(phase, status) => {
                    app.set_phase_status(phase, status);
                    app.current_phase = None;
                }
                InstallMessage::Log(entry) => {
                    app.log(entry);
                }
                InstallMessage::Error(msg) => {
                    app.error_message = Some(msg);
                    app.screen = Screen::Error;
                }
            }
        }

        if app.should_quit {
            break;
        }
    }
    Ok(())
}
```

### Input Handlers

Each screen gets its own handler function. This keeps logic clean and easy to reason about:

```rust
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

/// Config screen supports inline editing
fn handle_config_input(app: &mut App, key: KeyCode) {
    if app.editing {
        // Text input mode
        match key {
            KeyCode::Enter => {
                apply_config_field(app);  // Save buffer to config
                app.editing = false;
                app.input_buffer.clear();
            }
            KeyCode::Esc => {
                app.editing = false;      // Cancel edit
                app.input_buffer.clear();
            }
            KeyCode::Backspace => { app.input_buffer.pop(); }
            KeyCode::Char(c) => { app.input_buffer.push(c); }
            _ => {}
        }
    } else {
        // Navigation mode
        match key {
            KeyCode::Up | KeyCode::Char('k') => { /* move selection up */ }
            KeyCode::Down | KeyCode::Char('j') => { /* move selection down */ }
            KeyCode::Char('e') | KeyCode::Char(' ') => {
                app.editing = true;
                app.input_buffer = get_current_field_value(app);
            }
            KeyCode::Enter => {
                run_preflight_checks(app);
                app.next_screen();
            }
            KeyCode::Esc => app.prev_screen(),
            _ => {}
        }
    }
}
```

**Pattern:** Always support both arrow keys AND vim keys (`j`/`k`). Support `Esc` for back navigation. Show key hints on every screen.

---

## 6. Screen System (ui/)

### Main Renderer Dispatch

```rust
// ui/mod.rs
pub fn render(frame: &mut Frame, app: &App) {
    // Guard: terminal too small
    if app.terminal_too_small {
        render_resize_prompt(frame, app);
        return;
    }

    // Layout: main content + status bar
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(3),    // Main content
            Constraint::Length(1), // Status bar
        ])
        .split(frame.area());

    // Dispatch to current screen's renderer
    match app.screen {
        Screen::Welcome => screens::welcome::render(frame, app, chunks[0]),
        Screen::ModeSelect => screens::mode_select::render(frame, app, chunks[0]),
        Screen::Config => screens::config::render(frame, app, chunks[0]),
        Screen::Progress => screens::progress::render(frame, app, chunks[0]),
        Screen::Complete => screens::complete::render(frame, app, chunks[0]),
        Screen::Error => screens::error::render(frame, app, chunks[0]),
        // ...
    }

    // Status bar always visible
    widgets::status_bar::render(frame, app, chunks[1]);
}
```

### Welcome Screen Example

```rust
// ui/screens/welcome.rs
pub fn render(frame: &mut Frame, _app: &App, area: Rect) {
    // Outer border
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Vertical layout with spacing
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Top padding
            Constraint::Length(8), // Logo
            Constraint::Length(2), // Spacing
            Constraint::Length(3), // Title + description
            Constraint::Min(1),   // Flexible spacer
            Constraint::Length(3), // Version
            Constraint::Length(3), // Key hints
            Constraint::Length(1), // Bottom padding
        ])
        .split(inner);

    // ASCII logo in brand color
    let logo_lines: Vec<Line> = LOGO.lines()
        .filter(|l| !l.is_empty())
        .map(|line| Line::from(Span::styled(line, styles::primary())))
        .collect();
    frame.render_widget(
        Paragraph::new(logo_lines).alignment(Alignment::Center),
        chunks[1],
    );

    // Title with mixed styles
    let title = Paragraph::new(vec![
        Line::from(vec![
            Span::styled(PRODUCT_NAME, styles::title()),
            Span::styled(" Installer", styles::header()),
        ]),
        Line::from(Span::styled(PRODUCT_DESCRIPTION, styles::secondary())),
        Line::from(Span::styled(format!("by {}", COMPANY_NAME), styles::muted())),
    ]).alignment(Alignment::Center);
    frame.render_widget(title, chunks[3]);

    // Key hints — always tell the user what they can do
    let hints = Paragraph::new(vec![Line::from(vec![
        Span::styled("Press ", styles::muted()),
        Span::styled("Enter", styles::key_hint()),
        Span::styled(" to continue  •  ", styles::muted()),
        Span::styled("q", styles::key_hint()),
        Span::styled(" to quit", styles::muted()),
    ])]).alignment(Alignment::Center);
    frame.render_widget(hints, chunks[6]);
}
```

### Progress Screen Example

The most complex screen — shows current phase, overall progress, and scrollable logs simultaneously:

```rust
// ui/screens/progress.rs
pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active())
        .title(" Installation Progress ")
        .title_alignment(Alignment::Center)
        .title_style(styles::title());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Current phase header
            Constraint::Length(15), // Phase progress list
            Constraint::Min(10),   // Log viewer (fills remaining space)
            Constraint::Length(3),  // Key hints
        ])
        .split(inner);

    // Header: spinner + phase name + description
    let spinner = if app.phase_status(phase) == Status::InProgress {
        format!("{} ", app.spinner())
    } else {
        String::new()
    };
    // ... render header paragraph

    // Delegate to reusable widgets
    phase_progress::render(frame, &app.phases, app.current_phase, chunks[1]);
    log_viewer::render(frame, &app.logs, app.log_scroll, chunks[2]);

    // Dynamic hints based on state
    let all_complete = app.phases.iter().all(|(_, s)| s.is_complete());
    let hints = if all_complete {
        // Show "Enter to continue"
    } else {
        // Show "↑/↓ Scroll logs   Ctrl+C Abort"
    };
    frame.render_widget(hints, chunks[3]);
}
```

---

## 7. Custom Widgets

### Phase Progress Widget

Shows a progress bar and a checklist of phases with status symbols:

```rust
// ui/widgets/phase_progress.rs
pub fn render(
    frame: &mut Frame,
    phases: &[(Phase, Status)],
    current: Option<Phase>,
    area: Rect,
) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Gauge bar
            Constraint::Min(5),   // Phase list
        ])
        .split(area);

    // Overall progress gauge
    let completed = phases.iter().filter(|(_, s)| s.is_complete()).count();
    let total = phases.len();
    let progress = (completed as f64 / total as f64 * 100.0) as u16;

    let gauge = Gauge::default()
        .block(Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Progress ")
            .title_style(styles::secondary()))
        .gauge_style(styles::primary())
        .percent(progress)
        .label(format!("{}% ({}/{})", progress, completed, total));
    frame.render_widget(gauge, chunks[0]);

    // Phase checklist with status symbols
    let items: Vec<ListItem> = phases.iter().map(|(phase, status)| {
        let is_current = current == Some(*phase);

        let (symbol, style) = match status {
            Status::Pending    => ("○", styles::muted()),
            Status::InProgress => ("◐", styles::primary()),
            Status::Success    => ("✓", styles::success()),
            Status::Warning    => ("⚠", styles::warning()),
            Status::Error      => ("✗", styles::error()),
            Status::Skipped    => ("⊘", styles::muted()),
        };

        let name_style = if is_current { styles::primary_bold() }
            else if status.is_complete() { styles::text() }
            else { styles::muted() };

        ListItem::new(Line::from(vec![
            Span::styled(format!(" {} ", symbol), style),
            Span::styled(format!("{:2}. ", phase.number()), styles::muted()),
            Span::styled(phase.name(), name_style),
        ]))
    }).collect();

    let list = List::new(items).block(Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border())
        .title(" Phases ")
        .title_style(styles::secondary()));
    frame.render_widget(list, chunks[1]);
}
```

### Log Viewer Widget

Scrollable log display with timestamps, color-coded levels, and a scrollbar:

```rust
// ui/widgets/log_viewer.rs
pub fn render(frame: &mut Frame, logs: &[LogEntry], scroll: usize, area: Rect) {
    let log_lines: Vec<Line> = logs.iter().map(|entry| {
        let (level_str, level_style) = match entry.level {
            LogLevel::Debug   => ("DBG", styles::muted()),
            LogLevel::Info    => ("INF", styles::info()),
            LogLevel::Success => ("OK ", styles::success()),
            LogLevel::Warning => ("WRN", styles::warning()),
            LogLevel::Error   => ("ERR", styles::error()),
        };
        let timestamp = entry.timestamp.format("%H:%M:%S").to_string();

        Line::from(vec![
            Span::styled(format!("{} ", timestamp), styles::muted()),
            Span::styled(format!("[{}] ", level_str), level_style),
            Span::styled(&entry.message, styles::text()),
        ])
    }).collect();

    let visible_height = area.height.saturating_sub(2) as usize;
    let max_scroll = logs.len().saturating_sub(visible_height);
    let scroll = scroll.min(max_scroll);

    let log_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border())
        .title(" Logs ")
        .title_style(styles::secondary());

    let log_para = Paragraph::new(log_lines)
        .block(log_block)
        .wrap(Wrap { trim: false })
        .scroll((scroll as u16, 0));
    frame.render_widget(log_para, area);

    // Scrollbar (only when content overflows)
    if logs.len() > visible_height {
        let mut scrollbar_state = ScrollbarState::new(logs.len())
            .position(scroll)
            .viewport_content_length(visible_height);

        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .begin_symbol(Some("▲"))
            .end_symbol(Some("▼"))
            .track_symbol(Some("│"))
            .thumb_symbol("█");

        frame.render_stateful_widget(
            scrollbar,
            area.inner(ratatui::layout::Margin { vertical: 1, horizontal: 0 }),
            &mut scrollbar_state,
        );
    }
}
```

### Status Bar Widget

A persistent footer showing product name, current screen, step counter, and version:

```rust
// ui/widgets/status_bar.rs
pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let screen_name = match app.screen {
        Screen::Welcome => "Welcome",
        Screen::Config => "Configuration",
        Screen::Progress => "Installation",
        Screen::Complete => "Complete",
        // ...
    };

    let step_num = match app.screen {
        Screen::Welcome => 1,
        Screen::ModeSelect => 2,
        Screen::NetworkConfig => 3,
        Screen::Config => 4,
        Screen::Preflight => 5,
        Screen::Progress => 6,
        Screen::Verify => 7,
        Screen::Complete => 8,
        Screen::Error => 0,
    };

    let status_line = Line::from(vec![
        Span::styled(format!(" {} ", PRODUCT_NAME), styles::primary()),
        Span::styled("│", styles::border()),
        Span::styled(format!(" {} ", screen_name), styles::text()),
        Span::styled("│", styles::border()),
        Span::styled(format!(" Step {}/{} ", step_num, 8), styles::muted()),
        Span::styled("│", styles::border()),
        Span::styled(format!(" v{} ", VERSION), styles::muted()),
    ]);

    frame.render_widget(Paragraph::new(status_line), area);
}
```

---

## 8. Background Installation with Message Passing

This is the critical architecture that keeps the UI responsive during long-running operations.

### Message Protocol

```rust
// installer/executor.rs
#[derive(Debug, Clone)]
pub enum InstallMessage {
    PhaseStart(Phase),
    PhaseProgress(Phase, String),
    PhaseComplete(Phase, Status),
    Log(LogEntry),
    PreflightResult(Vec<CheckItem>),
    Error(String),
}
```

### Spawning the Installation Thread

When the user presses Enter on the Preflight screen:

```rust
fn handle_preflight_input(app: &mut App, key: KeyCode) {
    match key {
        KeyCode::Enter if can_continue => {
            // Create channel
            let (tx, rx) = std::sync::mpsc::channel();
            app.install_rx = Some(rx);

            // Clone config for the thread (App can't be shared)
            let config = app.config.clone();

            // Spawn background thread
            std::thread::spawn(move || {
                if let Err(e) = executor::run_installation(config, tx.clone()) {
                    let _ = tx.send(InstallMessage::Error(format!("Failed: {}", e)));
                }
            });

            app.next_screen();  // Go to Progress screen immediately
        }
        // ...
    }
}
```

### The Executor (Orchestration)

The executor runs phases in sequence, sending messages to the UI thread:

```rust
// installer/executor.rs
pub fn run_installation(config: InstallConfig, tx: Sender<InstallMessage>) -> Result<()> {
    // Phase 1: Preflight
    tx.send(InstallMessage::PhaseStart(Phase::Preflight))?;
    tx.send(InstallMessage::Log(LogEntry::info("Running preflight checks...")))?;

    let checks = preflight::run_preflight_checks();
    let has_errors = checks.iter().any(|c| c.status == Status::Error);

    tx.send(InstallMessage::PreflightResult(checks))?;

    if has_errors {
        tx.send(InstallMessage::PhaseComplete(Phase::Preflight, Status::Error))?;
        tx.send(InstallMessage::Error("Preflight checks failed.".to_string()))?;
        return Ok(());
    }

    tx.send(InstallMessage::PhaseComplete(Phase::Preflight, Status::Success))?;

    // Phase 2: Dependencies
    tx.send(InstallMessage::PhaseStart(Phase::Dependencies))?;
    tx.send(InstallMessage::Log(LogEntry::info("Installing dependencies...")))?;

    let pm = deps::PackageManager::detect()
        .ok_or_else(|| anyhow::anyhow!("No supported package manager found"))?;

    let dep_logs = pm.install_base_packages()?;
    for log in dep_logs {
        tx.send(InstallMessage::Log(log))?;
    }

    tx.send(InstallMessage::PhaseComplete(Phase::Dependencies, Status::Success))?;

    // Phase 3: KVM setup
    // Phase 4: Network bridge
    // Phase 5: Database
    // Phase 6: Download/copy binaries
    // Phase 7: Install binaries
    // Phase 8: Download/copy images
    // Phase 9: Generate config files
    // Phase 10: Setup sudoers
    // Phase 11: Create and start systemd services
    // Phase 12: Verification health checks

    // ... each phase follows the same pattern:
    //   PhaseStart → Log progress → PhaseComplete(Success|Error)

    Ok(())
}
```

**Pattern:** Each installer module function (e.g., `deps::install_firecracker()`, `database::setup_database()`) returns `Vec<LogEntry>`. The executor forwards these to the UI thread. This decouples the installation logic from the UI completely.

---

## 9. Installer Modules

### Command Utilities (installer/mod.rs)

```rust
use std::process::{Command, Output};
use anyhow::Result;

pub fn run_command(cmd: &str, args: &[&str]) -> Result<Output> {
    Ok(Command::new(cmd).args(args).output()?)
}

pub fn run_sudo(cmd: &str, args: &[&str]) -> Result<Output> {
    let mut sudo_args = vec![cmd];
    sudo_args.extend_from_slice(args);
    Ok(Command::new("sudo").args(&sudo_args).output()?)
}

pub fn command_exists(cmd: &str) -> bool {
    Command::new("which").arg(cmd).output()
        .map(|o| o.status.success()).unwrap_or(false)
}

pub fn is_root() -> bool {
    nix::unistd::geteuid().is_root()
}
```

### Preflight Checks (installer/preflight.rs)

```rust
pub fn run_preflight_checks() -> Vec<CheckItem> {
    let mut checks = Vec::new();

    // Architecture
    checks.push(check_architecture());

    // OS version
    checks.push(check_os_version());

    // Kernel version (4.14+ for Firecracker)
    checks.push(check_kernel_version());

    // KVM support (CPU flags vmx/svm, /dev/kvm, module loaded)
    checks.push(check_kvm_support());

    // Memory (2GB minimum)
    checks.push(check_memory());

    // Disk space (20GB minimum)
    checks.push(check_disk_space());

    // Required commands
    checks.push(check_required_commands());

    // Port availability
    checks.push(check_ports());

    checks
}

fn check_kvm_support() -> CheckItem {
    // Read /proc/cpuinfo for vmx (Intel) or svm (AMD) flags
    let cpuinfo = std::fs::read_to_string("/proc/cpuinfo").unwrap_or_default();
    let has_vmx = cpuinfo.contains("vmx");
    let has_svm = cpuinfo.contains("svm");
    let has_kvm = std::path::Path::new("/dev/kvm").exists();

    if (has_vmx || has_svm) && has_kvm {
        CheckItem { name: "KVM Support".into(), status: Status::Success,
                     message: "KVM is available".into() }
    } else if has_vmx || has_svm {
        CheckItem { name: "KVM Support".into(), status: Status::Warning,
                     message: "/dev/kvm not found — KVM module may need loading".into() }
    } else {
        CheckItem { name: "KVM Support".into(), status: Status::Error,
                     message: "CPU does not support hardware virtualization".into() }
    }
}
```

### Package Manager Detection (installer/deps.rs)

```rust
pub enum PackageManager { Apt, Dnf, Yum }

impl PackageManager {
    pub fn detect() -> Option<Self> {
        if command_exists("apt-get") { Some(PackageManager::Apt) }
        else if command_exists("dnf") { Some(PackageManager::Dnf) }
        else if command_exists("yum") { Some(PackageManager::Yum) }
        else { None }
    }

    pub fn install_base_packages(&self) -> Result<Vec<LogEntry>> {
        let mut logs = Vec::new();
        let packages = match self {
            PackageManager::Apt => vec!["curl", "git", "build-essential", "pkg-config",
                                        "libssl-dev", "screen", "dnsmasq", "iptables"],
            PackageManager::Dnf | PackageManager::Yum =>
                vec!["curl", "git", "gcc", "openssl-devel", "screen", "dnsmasq", "iptables"],
        };

        logs.push(LogEntry::info(format!("Installing: {}", packages.join(", "))));

        let cmd = match self {
            PackageManager::Apt => "apt-get",
            PackageManager::Dnf => "dnf",
            PackageManager::Yum => "yum",
        };

        let output = run_sudo(cmd, &[&["install", "-y"], packages.as_slice()].concat())?;

        if output.status.success() {
            logs.push(LogEntry::success("Base packages installed"));
        } else {
            logs.push(LogEntry::error("Failed to install base packages"));
        }

        Ok(logs)
    }
}
```

### Database Setup (installer/database.rs)

```rust
pub fn setup_database(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();

    // Start PostgreSQL
    run_sudo("systemctl", &["start", "postgresql"])?;
    run_sudo("systemctl", &["enable", "postgresql"])?;
    logs.push(LogEntry::success("PostgreSQL started and enabled"));

    // Generate password if not provided
    let password = if config.db_password.is_empty() {
        generate_password(24)
    } else {
        config.db_password.clone()
    };

    // Create user (idempotent)
    let user_check = run_sudo("sudo", &["-u", "postgres", "psql", "-tAc",
        &format!("SELECT 1 FROM pg_roles WHERE rolname='{}'", config.db_user)])?;

    if String::from_utf8_lossy(&user_check.stdout).trim() != "1" {
        run_sudo("sudo", &["-u", "postgres", "psql", "-c",
            &format!("CREATE USER {} WITH ENCRYPTED PASSWORD '{}'", config.db_user, password)])?;
        logs.push(LogEntry::success(format!("Created database user '{}'", config.db_user)));
    } else {
        // Update password for existing user
        run_sudo("sudo", &["-u", "postgres", "psql", "-c",
            &format!("ALTER USER {} WITH ENCRYPTED PASSWORD '{}'", config.db_user, password)])?;
        logs.push(LogEntry::info("Database user already exists, updated password"));
    }

    // Create database (idempotent)
    // ... similar pattern

    Ok(logs)
}

fn generate_password(length: usize) -> String {
    use rand::Rng;
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        .chars().collect();
    let mut rng = rand::thread_rng();
    (0..length).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}
```

### Config Generation (installer/config.rs)

```rust
pub fn generate_config(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let config_dir = &config.config_dir;
    std::fs::create_dir_all(config_dir)?;

    // manager.env
    let manager_env = format!(r#"DATABASE_URL=postgresql://{user}:{pass}@{host}:{port}/{db}
MANAGER_BIND=0.0.0.0:18080
MANAGER_IMAGE_ROOT=/srv/images
MANAGER_STORAGE_ROOT={data}/vms
MANAGER_BRIDGE={bridge}
RUST_LOG={log_level}
"#,
        user = config.db_user, pass = config.db_password,
        host = config.db_host, port = config.db_port, db = config.db_name,
        data = config.data_dir.display(), bridge = config.bridge_name,
        log_level = if config.mode == InstallMode::Development { "debug" } else { "info" },
    );

    std::fs::write(config_dir.join("manager.env"), &manager_env)?;
    logs.push(LogEntry::success("Generated manager.env"));

    // agent.env, ui.env, config.yaml ...

    Ok(logs)
}
```

### Systemd Services (installer/services.rs)

```rust
pub fn install_services(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    let config_dir = &config.config_dir;

    // Manager service
    if config.mode.includes_manager() {
        let unit = format!(r#"[Unit]
Description=NQRust-MicroVM Manager
After=postgresql.service network.target
Requires=postgresql.service

[Service]
Type=simple
User=nqrust
EnvironmentFile={config}/manager.env
ExecStart={install}/bin/manager
Restart=on-failure
RestartSec=5s
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
"#, config = config_dir.display(), install = config.install_dir.display());

        std::fs::write("/etc/systemd/system/nqrust-manager.service", &unit)?;
        logs.push(LogEntry::success("Installed nqrust-manager.service"));
    }

    // Agent service (User=root for KVM access)
    // UI service ...

    // Reload and start
    run_sudo("systemctl", &["daemon-reload"])?;
    // ... enable and start each service

    Ok(logs)
}
```

### Verification (installer/verify.rs)

```rust
pub fn run_verification(config: &InstallConfig) -> Vec<CheckItem> {
    let mut checks = Vec::new();

    // Check binaries exist
    let bins = [("manager", "bin/manager"), ("agent", "bin/agent")];
    for (name, path) in &bins {
        let full = config.install_dir.join(path);
        checks.push(if full.exists() {
            CheckItem::success(name, "Binary found")
        } else {
            CheckItem::error(name, format!("{} not found", full.display()))
        });
    }

    // Check services are active
    for svc in &["nqrust-manager", "nqrust-agent"] {
        let output = run_sudo("systemctl", &["is-active", svc]);
        let active = output.map(|o| String::from_utf8_lossy(&o.stdout)
            .trim() == "active").unwrap_or(false);
        checks.push(if active {
            CheckItem::success(svc, "Service is active")
        } else {
            CheckItem::error(svc, "Service is not running")
        });
    }

    // Health endpoint checks with retry
    for (name, url) in &[("Manager API", "http://localhost:18080/health"),
                          ("Agent API", "http://localhost:9090/health")] {
        let mut healthy = false;
        for attempt in 1..=10 {
            let output = Command::new("curl")
                .args(["-sf", "--max-time", "2", url])
                .output();
            if output.map(|o| o.status.success()).unwrap_or(false) {
                healthy = true;
                break;
            }
            std::thread::sleep(Duration::from_secs(2));
        }
        checks.push(if healthy {
            CheckItem::success(name, "Health check passed")
        } else {
            CheckItem::error(name, "Health check failed after 10 attempts")
        });
    }

    checks
}
```

---

## 10. CLI Interface with Clap

Support both interactive TUI and non-interactive (scriptable) modes:

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "my-installer", version, about = "My App Installer")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Install the application
    Install {
        #[arg(long, value_enum, default_value = "production")]
        mode: CliInstallMode,

        #[arg(long, default_value = "/opt/myapp")]
        install_dir: PathBuf,

        #[arg(long, default_value = "/srv/myapp")]
        data_dir: PathBuf,

        #[arg(long, default_value = "nat")]
        network_mode: CliNetworkMode,

        #[arg(long)]
        db_password: Option<String>,

        /// Non-interactive mode (use defaults, no TUI)
        #[arg(long)]
        non_interactive: bool,

        /// Air-gapped: use bundled files, no downloads
        #[arg(long, alias = "iso-mode")]
        airgap: bool,

        #[arg(long, default_value = "/opt/myapp-bundle")]
        bundle_path: PathBuf,
    },
    /// Uninstall the application
    Uninstall {
        #[arg(long)] keep_data: bool,
        #[arg(long)] keep_database: bool,
        #[arg(long)] force: bool,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Some(Commands::Install { non_interactive, .. }) => {
            let config = /* build InstallConfig from CLI args */;
            if non_interactive {
                run_non_interactive(config)
            } else {
                run_tui(config)
            }
        }
        Some(Commands::Uninstall { .. }) => { /* ... */ }
        None => run_tui(InstallConfig::default()),  // Default: launch TUI
    }
}
```

This gives you:
```bash
# Interactive TUI (default)
sudo ./my-installer install

# Fully scripted
sudo ./my-installer install --non-interactive --mode production --db-password secret

# Air-gapped from ISO
sudo ./my-installer install --airgap --bundle-path /mnt/bundle
```

---

## 11. Shell Bootstrap Script

A one-liner install experience. The shell script downloads the binary and runs it:

```bash
#!/usr/bin/env bash
# Quick installer — downloads and runs the Rust TUI installer
set -e

REPO="YourOrg/YourApp"
INSTALLER_URL="https://github.com/${REPO}/releases/latest/download/my-installer-x86_64-linux-musl"

echo "╔════════════════════════════════════════╗"
echo "║  My App Installer                       ║"
echo "║  Powered by Rust + Ratatui TUI          ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Downloading installer..."

if ! curl -fsSL "${INSTALLER_URL}" -o /tmp/my-installer 2>/tmp/my-installer-err; then
    echo "Error: Failed to download installer"
    echo ""
    echo "To build from source:"
    echo "  git clone https://github.com/${REPO}.git && cd YourApp"
    echo "  cargo build --release -p my-installer"
    echo "  sudo ./target/release/my-installer install"
    exit 1
fi

[ ! -s /tmp/my-installer ] && echo "Error: Downloaded file is empty" && exit 1

chmod +x /tmp/my-installer
echo "Starting installer..."
exec sudo /tmp/my-installer install "$@"
```

Users install with:
```bash
curl -fsSL https://your-domain.com/install.sh | bash
```

**Build for distribution** with static linking (no glibc dependency):
```bash
cargo build --release --target x86_64-unknown-linux-musl -p my-installer
```

---

## 12. Patterns and Lessons Learned

### Pattern 1: Single Source of Truth

All mutable state lives in `App`. Input handlers mutate it. Renderers read it. No other mutable state. This eliminates an entire class of bugs.

### Pattern 2: Screen = (Render Function, Input Handler)

Every screen is exactly two things: `render(frame, app, area)` and `handle_*_input(app, keycode)`. Adding a new screen is mechanical — add the enum variant, add the render function, add the input handler, register both in the dispatch.

### Pattern 3: Every Operation Returns Logs

```rust
fn setup_database(config: &InstallConfig) -> Result<Vec<LogEntry>> {
    let mut logs = Vec::new();
    // ... do work, push logs ...
    Ok(logs)
}
```

This decouples operations from the UI. The executor forwards logs to the channel. The UI renders them. Operations don't know about the UI at all.

### Pattern 4: Idempotent Everything

```rust
// BAD: crashes on second run
run_sudo("createuser", &[&config.db_user])?;

// GOOD: check first, skip if exists
let exists = check_user_exists(&config.db_user)?;
if exists {
    logs.push(LogEntry::info("User already exists, updating password"));
    update_user_password(&config.db_user, &password)?;
} else {
    create_user(&config.db_user, &password)?;
}
```

Installers get interrupted and re-run. Every operation must be safe to repeat.

### Pattern 5: Dual-Path (Online/Offline)

```rust
pub enum InstallSource {
    Download,                  // Fetch from internet
    BuildFromSource,           // cargo build
    LocalBundle(PathBuf),      // Air-gapped ISO
}
```

Online and offline paths diverge at dependency installation and binary acquisition, but converge for everything after (config generation, service creation, verification). This avoids duplicating the installation logic.

### Pattern 6: Minimum Terminal Size Guard

```rust
pub fn update_terminal_size(&mut self, cols: u16, rows: u16) {
    self.terminal_cols = cols;
    self.terminal_rows = rows;
    self.terminal_too_small = cols < 80 || rows < 24;
}
```

When `terminal_too_small` is true, the UI renders a resize prompt instead of the actual content. Input is blocked except Ctrl+C. This prevents rendering artifacts on tiny terminals.

### Pattern 7: Key Hints on Every Screen

Always show the user what keys do something. Use a consistent style:

```rust
Line::from(vec![
    Span::styled("Enter", styles::key_hint()),   // Blue = actionable key
    Span::styled(" Continue  •  ", styles::muted()),
    Span::styled("Esc", styles::key_hint()),
    Span::styled(" Back  •  ", styles::muted()),
    Span::styled("q", styles::key_hint()),
    Span::styled(" Quit", styles::muted()),
])
```

### Pattern 8: Verification with Retry

Health endpoints need time to start. Don't check once and fail — retry with backoff:

```rust
for attempt in 1..=10 {
    if curl_health_check(url).is_ok() {
        return CheckItem::success(name, "Healthy");
    }
    std::thread::sleep(Duration::from_secs(2));
}
return CheckItem::error(name, "Failed after 10 attempts");
```

### The 100ms Poll Interval

```rust
if event::poll(Duration::from_millis(100))? {
    // handle input
} else {
    app.tick_spinner();  // ~10fps animation
}
```

This is the sweet spot: responsive enough for typing, slow enough to not waste CPU, and exactly right for smooth braille spinner animation.

---

## Quick Reference: File Checklist for a New Installer

```
□ Cargo.toml          — dependencies (ratatui, crossterm, clap, anyhow, sysinfo, nix)
□ src/main.rs         — CLI parsing, terminal setup, main loop, input handlers
□ src/app.rs          — Screen/Phase/Status/Mode enums, App struct, InstallConfig
□ src/theme.rs        — colors, styles, symbols, logo, branding constants
□ src/ui/mod.rs       — main render dispatch + resize guard
□ src/ui/screens/     — one file per screen (welcome, config, progress, complete, error)
□ src/ui/widgets/     — reusable widgets (phase_progress, log_viewer, status_bar)
□ src/installer/mod.rs     — command utilities (run_command, run_sudo, command_exists)
□ src/installer/executor.rs — InstallMessage enum, phase orchestration
□ src/installer/preflight.rs — system requirement checks
□ src/installer/deps.rs      — package manager detection, dependency installation
□ src/installer/*.rs          — one module per installation concern
□ scripts/install.sh   — shell bootstrap that downloads and runs the binary
```

---

*Based on the NQR-MicroVM installer by Nexus — a production Rust TUI installer for a Firecracker microVM platform.*
