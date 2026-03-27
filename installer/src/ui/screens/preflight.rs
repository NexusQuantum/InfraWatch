use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::app::{App, Status};
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active())
        .title(" Preflight Checks ")
        .title_alignment(Alignment::Center)
        .title_style(styles::title());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Header
            Constraint::Min(8),    // Checklist
            Constraint::Length(3), // Summary
            Constraint::Length(3), // Key hints
        ])
        .split(inner);

    // Header
    let header_text = if app.preflight_checks.is_empty() {
        format!(" {} Running checks...", app.spinner())
    } else {
        " System requirement checks:".to_string()
    };
    let header = Paragraph::new(Line::from(Span::styled(header_text, styles::secondary())));
    frame.render_widget(header, chunks[0]);

    // Checklist
    super::super::widgets::checklist::render(frame, &app.preflight_checks, chunks[1]);

    // Summary
    if !app.preflight_checks.is_empty() {
        let passed = app
            .preflight_checks
            .iter()
            .filter(|c| c.status == Status::Success)
            .count();
        let warnings = app
            .preflight_checks
            .iter()
            .filter(|c| c.status == Status::Warning)
            .count();
        let errors = app
            .preflight_checks
            .iter()
            .filter(|c| c.status == Status::Error)
            .count();

        let summary = Paragraph::new(vec![Line::from(vec![
            Span::styled("  ", styles::text()),
            Span::styled(format!("{} passed", passed), styles::success()),
            Span::styled("  │  ", styles::border()),
            Span::styled(format!("{} warnings", warnings), styles::warning()),
            Span::styled("  │  ", styles::border()),
            Span::styled(format!("{} errors", errors), styles::error()),
        ])])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(styles::border())
                .title(" Summary ")
                .title_style(styles::secondary()),
        );
        frame.render_widget(summary, chunks[2]);
    }

    // Key hints
    let has_errors = app
        .preflight_checks
        .iter()
        .any(|c| c.status == Status::Error);
    let checks_done = !app.preflight_checks.is_empty();

    let hints = if checks_done && !has_errors {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("Enter", styles::key_hint()),
            Span::styled(" Continue  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("r", styles::key_hint()),
            Span::styled(" Re-run  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Esc", styles::key_hint()),
            Span::styled(" Back", styles::muted()),
        ])])
    } else if checks_done && has_errors {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("r", styles::key_hint()),
            Span::styled(" Re-run  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Esc", styles::key_hint()),
            Span::styled(" Back  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Fix errors to continue", styles::error()),
        ])])
    } else {
        Paragraph::new(vec![Line::from(Span::styled(
            "Please wait...",
            styles::muted(),
        ))])
    };
    frame.render_widget(hints.alignment(Alignment::Center), chunks[3]);
}
