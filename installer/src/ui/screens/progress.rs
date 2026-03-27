use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::app::App;
use crate::theme::{self, styles};

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
            Constraint::Length(13), // Phase progress list
            Constraint::Min(8),     // Log viewer
            Constraint::Length(3),  // Key hints
        ])
        .split(inner);

    // Header: current phase with spinner
    let header_text = if let Some(phase) = app.current_phase {
        vec![Line::from(vec![
            Span::styled(format!(" {} ", app.spinner()), styles::primary()),
            Span::styled(phase.name(), styles::primary_bold()),
            Span::styled(format!("  (Phase {}/7)", phase.number()), styles::muted()),
        ])]
    } else if app.install_complete {
        vec![Line::from(vec![
            Span::styled(format!(" {} ", theme::symbols::CHECK), styles::success()),
            Span::styled("Installation complete!", styles::success()),
        ])]
    } else {
        vec![Line::from(Span::styled(
            " Preparing installation...",
            styles::muted(),
        ))]
    };

    let header = Paragraph::new(header_text).block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border()),
    );
    frame.render_widget(header, chunks[0]);

    // Phase progress widget
    super::super::widgets::phase_progress::render(frame, &app.phases, app.current_phase, chunks[1]);

    // Log viewer widget
    super::super::widgets::log_viewer::render(frame, &app.logs, app.log_scroll, chunks[2]);

    // Key hints
    let hints = if app.install_complete {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("Enter", styles::key_hint()),
            Span::styled(" Continue to verification", styles::muted()),
        ])])
    } else {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("↑/↓", styles::key_hint()),
            Span::styled(" Scroll logs  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Ctrl+C", styles::key_hint()),
            Span::styled(" Abort", styles::muted()),
        ])])
    };
    frame.render_widget(hints.alignment(Alignment::Center), chunks[3]);
}
