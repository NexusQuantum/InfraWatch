use ratatui::style::{Color, Modifier, Style};

// ── Brand Colors ─────────────────────────────────────────────────────────────

pub const PRIMARY: Color = Color::Rgb(255, 80, 1); // NQR Orange #FF5001
pub const SUCCESS: Color = Color::Rgb(34, 197, 94); // Green #22C55E
pub const WARNING: Color = Color::Rgb(234, 179, 8); // Yellow #EAB308
pub const ERROR: Color = Color::Rgb(239, 68, 68); // Red #EF4444
pub const INFO: Color = Color::Rgb(59, 130, 246); // Blue #3B82F6
#[allow(dead_code)]
pub const BACKGROUND: Color = Color::Rgb(26, 26, 26); // Dark #1A1A1A
pub const FOREGROUND: Color = Color::Rgb(252, 252, 252); // Light #FCFCFC
#[allow(dead_code)]
pub const CARD: Color = Color::Rgb(53, 53, 53); // Dark Gray #353535
pub const BORDER: Color = Color::Rgb(74, 74, 74); // Medium Gray #4A4A4A
pub const MUTED: Color = Color::Rgb(107, 114, 128); // Dimmed #6B7280
pub const SECONDARY: Color = Color::Rgb(156, 163, 175); // Light Gray #9CA3AF
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
  ███╗   ██╗ ██████╗ ██████╗ ██╗   ██╗███████╗████████╗
  ████╗  ██║██╔═══██╗██╔══██╗██║   ██║██╔════╝╚══██╔══╝
  ██╔██╗ ██║██║   ██║██████╔╝██║   ██║███████╗   ██║
  ██║╚██╗██║██║▄▄ ██║██╔══██╗██║   ██║╚════██║   ██║
  ██║ ╚████║╚██████╔╝██║  ██║╚██████╔╝███████║   ██║
  ╚═╝  ╚═══╝ ╚══▀▀═╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝
        ██╗███╗   ██╗███████╗██████╗  █████╗ ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
        ██║████╗  ██║██╔════╝██╔══██╗██╔══██╗██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
        ██║██╔██╗ ██║█████╗  ██████╔╝███████║██║ █╗ ██║███████║   ██║   ██║     ███████║
        ██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
        ██║██║ ╚████║██║     ██║  ██║██║  ██║╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
        ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
"#;

#[allow(dead_code)]
pub const LOGO_COMPACT: &str = "━━━ NQRust-InfraWatch ━━━";

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const PRODUCT_NAME: &str = "NQRust-InfraWatch";
pub const PRODUCT_DESCRIPTION: &str = "Infrastructure Observability Dashboard";
pub const COMPANY_NAME: &str = "Nexus Quantum Tech";

// ── Embedded License Configuration (baked in at build time via GitHub Secrets) ──

pub const LICENSE_SERVER_URL: &str = match option_env!("LICENSE_SERVER_URL") {
    Some(v) => v,
    None => "https://billing.nexusquantum.id",
};

pub const LICENSE_API_KEY: &str = match option_env!("LICENSE_API_KEY") {
    Some(v) => v,
    None => "pk_live_RiTXxEttxQWgH3usHAVZjAMD0JBJb2P5KxS81qUk",
};

pub const LICENSE_GRACE_PERIOD_DAYS: &str = match option_env!("LICENSE_GRACE_PERIOD_DAYS") {
    Some(v) => v,
    None => "7",
};

pub const LICENSE_PUBLIC_KEY: &str = match option_env!("LICENSE_PUBLIC_KEY") {
    Some(v) => v,
    None => "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAupcIIOQicInO2h3mlI7Kx8LYp0b8y3UKm0pca00Gzc4=\n-----END PUBLIC KEY-----",
};
