use ratatui::style::{Color, Modifier, Style};

// ── Brand Colors ─────────────────────────────────────────────────────────────

pub const PRIMARY: Color = Color::Rgb(6, 182, 212); // Cyan #06B6D4
pub const SUCCESS: Color = Color::Rgb(34, 197, 94); // Green #22C55E
pub const WARNING: Color = Color::Rgb(234, 179, 8); // Yellow #EAB308
pub const ERROR: Color = Color::Rgb(239, 68, 68); // Red #EF4444
pub const INFO: Color = Color::Rgb(59, 130, 246); // Blue #3B82F6
#[allow(dead_code)]
pub const BACKGROUND: Color = Color::Rgb(15, 23, 42); // Slate #0F172A
pub const FOREGROUND: Color = Color::Rgb(248, 250, 252); // Light #F8FAFC
#[allow(dead_code)]
pub const CARD: Color = Color::Rgb(30, 41, 59); // Slate-800 #1E293B
pub const BORDER: Color = Color::Rgb(51, 65, 85); // Slate-700 #334155
pub const MUTED: Color = Color::Rgb(100, 116, 139); // Slate-500 #64748B
pub const SECONDARY: Color = Color::Rgb(148, 163, 184); // Slate-400 #94A3B8
#[allow(dead_code)]
pub const PURPLE: Color = Color::Rgb(168, 85, 247); // Purple #A855F7

// ── Status Symbols ───────────────────────────────────────────────────────────

pub mod symbols {
    pub const CHECK: &str = "✓";
    pub const CROSS: &str = "✗";
    pub const PENDING: &str = "○";
    pub const IN_PROGRESS: &str = "◐";
    pub const WARNING: &str = "⚠";
    pub const SKIPPED: &str = "⊘";
    pub const ARROW_RIGHT: &str = "▶";
    pub const BULLET: &str = "•";
    pub const SPINNER: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
}

// ── Pre-built Styles ─────────────────────────────────────────────────────────

pub mod styles {
    use super::*;

    pub fn text() -> Style {
        Style::default().fg(FOREGROUND)
    }
    pub fn primary() -> Style {
        Style::default().fg(PRIMARY)
    }
    pub fn primary_bold() -> Style {
        Style::default().fg(PRIMARY).add_modifier(Modifier::BOLD)
    }
    pub fn success() -> Style {
        Style::default().fg(SUCCESS)
    }
    pub fn warning() -> Style {
        Style::default().fg(WARNING)
    }
    pub fn error() -> Style {
        Style::default().fg(ERROR)
    }
    pub fn info() -> Style {
        Style::default().fg(INFO)
    }
    pub fn muted() -> Style {
        Style::default().fg(MUTED)
    }
    pub fn secondary() -> Style {
        Style::default().fg(SECONDARY)
    }
    pub fn title() -> Style {
        Style::default().fg(PRIMARY).add_modifier(Modifier::BOLD)
    }
    pub fn header() -> Style {
        Style::default().fg(FOREGROUND).add_modifier(Modifier::BOLD)
    }
    pub fn key_hint() -> Style {
        Style::default().fg(INFO)
    }
    pub fn border() -> Style {
        Style::default().fg(BORDER)
    }
    pub fn border_active() -> Style {
        Style::default().fg(PRIMARY)
    }
    #[allow(dead_code)]
    pub fn highlight() -> Style {
        Style::default()
            .fg(FOREGROUND)
            .bg(PRIMARY)
            .add_modifier(Modifier::BOLD)
    }
    #[allow(dead_code)]
    pub fn card() -> Style {
        Style::default().bg(CARD)
    }
}

// ── Branding ─────────────────────────────────────────────────────────────────

pub const LOGO: &str = r#"
  ██╗███╗   ██╗███████╗██████╗  █████╗ ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
  ██║████╗  ██║██╔════╝██╔══██╗██╔══██╗██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  ██║██╔██╗ ██║█████╗  ██████╔╝███████║██║ █╗ ██║███████║   ██║   ██║     ███████║
  ██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
  ██║██║ ╚████║██║     ██║  ██║██║  ██║╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
"#;

#[allow(dead_code)]
pub const LOGO_COMPACT: &str = "━━━ InfraWatch ━━━";

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const PRODUCT_NAME: &str = "InfraWatch";
pub const PRODUCT_DESCRIPTION: &str = "Infrastructure Observability Dashboard";
pub const COMPANY_NAME: &str = "Nexus Quantum Tech";
