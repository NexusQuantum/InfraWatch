use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::app::App;
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active())
        .title(" Post-Install Verification ")
        .title_alignment(Alignment::Center)
        .title_style(styles::title());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Header
            Constraint::Min(8),    // Checklist
            Constraint::Length(3), // Key hints
        ])
        .split(inner);

    // Header
    let header_text = if app.verify_checks.is_empty() {
        format!(" {} Verifying installation...", app.spinner())
    } else {
        " Verification results:".to_string()
    };
    let header = Paragraph::new(Line::from(Span::styled(header_text, styles::secondary())));
    frame.render_widget(header, chunks[0]);

    // Checklist
    super::super::widgets::checklist::render(frame, &app.verify_checks, chunks[1]);

    // Key hints
    let hints = if !app.verify_checks.is_empty() {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("Enter", styles::key_hint()),
            Span::styled(" Continue  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("q", styles::key_hint()),
            Span::styled(" Quit", styles::muted()),
        ])])
    } else {
        Paragraph::new(vec![Line::from(Span::styled(
            "Please wait...",
            styles::muted(),
        ))])
    };
    frame.render_widget(hints.alignment(Alignment::Center), chunks[2]);
}
