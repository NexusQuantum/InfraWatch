use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::app::App;
use crate::theme::{self, styles, COMPANY_NAME, LOGO, PRODUCT_DESCRIPTION, PRODUCT_NAME};

pub fn render(frame: &mut Frame, _app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Top padding
            Constraint::Length(8), // Logo
            Constraint::Length(2), // Spacing
            Constraint::Length(4), // Title + description
            Constraint::Min(1),    // Flexible spacer
            Constraint::Length(3), // Version info
            Constraint::Length(3), // Key hints
            Constraint::Length(1), // Bottom padding
        ])
        .split(inner);

    // ASCII logo
    let logo_lines: Vec<Line> = LOGO
        .lines()
        .filter(|l| !l.is_empty())
        .map(|line| Line::from(Span::styled(line, styles::primary())))
        .collect();
    frame.render_widget(
        Paragraph::new(logo_lines).alignment(Alignment::Center),
        chunks[1],
    );

    // Title
    let title = Paragraph::new(vec![
        Line::from(vec![
            Span::styled(PRODUCT_NAME, styles::title()),
            Span::styled(" Installer", styles::header()),
        ]),
        Line::from(""),
        Line::from(Span::styled(PRODUCT_DESCRIPTION, styles::secondary())),
        Line::from(Span::styled(
            format!("by {}", COMPANY_NAME),
            styles::muted(),
        )),
    ])
    .alignment(Alignment::Center);
    frame.render_widget(title, chunks[3]);

    // Version
    let version = Paragraph::new(vec![Line::from(Span::styled(
        format!("v{}", theme::VERSION),
        styles::muted(),
    ))])
    .alignment(Alignment::Center);
    frame.render_widget(version, chunks[5]);

    // Key hints
    let hints = Paragraph::new(vec![Line::from(vec![
        Span::styled("Press ", styles::muted()),
        Span::styled("Enter", styles::key_hint()),
        Span::styled(" to continue  ", styles::muted()),
        Span::styled(theme::symbols::BULLET, styles::muted()),
        Span::styled("  ", styles::muted()),
        Span::styled("q", styles::key_hint()),
        Span::styled(" to quit", styles::muted()),
    ])])
    .alignment(Alignment::Center);
    frame.render_widget(hints, chunks[6]);
}
