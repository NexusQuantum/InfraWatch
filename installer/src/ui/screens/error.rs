use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph, Wrap};

use crate::app::App;
use crate::theme::styles;

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::error())
        .title(" Error ")
        .title_alignment(Alignment::Center)
        .title_style(styles::error());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Top padding
            Constraint::Length(3), // Error icon + title
            Constraint::Min(5),    // Error message
            Constraint::Length(5), // Help text
            Constraint::Length(3), // Key hints
        ])
        .split(inner);

    // Error title
    let title = Paragraph::new(vec![Line::from(Span::styled(
        "  ✗  Installation Failed",
        styles::error(),
    ))])
    .alignment(Alignment::Center);
    frame.render_widget(title, chunks[1]);

    // Error message
    let message = app
        .error_message
        .as_deref()
        .unwrap_or("An unknown error occurred");

    let error_text = Paragraph::new(vec![
        Line::from(""),
        Line::from(Span::styled(format!("  {}", message), styles::text())),
    ])
    .wrap(Wrap { trim: false })
    .block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Details ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(error_text, chunks[2]);

    // Help
    let help = Paragraph::new(vec![
        Line::from(Span::styled("  Troubleshooting:", styles::header())),
        Line::from(Span::styled(
            "    • Check system logs: journalctl -u infrawatch",
            styles::muted(),
        )),
        Line::from(Span::styled(
            "    • Re-run the installer to retry",
            styles::muted(),
        )),
        Line::from(Span::styled(
            "    • Report issues: https://github.com/NexusQuantum/InfraWatch/issues",
            styles::muted(),
        )),
    ]);
    frame.render_widget(help, chunks[3]);

    // Key hints
    let hints = Paragraph::new(vec![Line::from(vec![
        Span::styled("Esc", styles::key_hint()),
        Span::styled(" or ", styles::muted()),
        Span::styled("q", styles::key_hint()),
        Span::styled(" to exit", styles::muted()),
    ])])
    .alignment(Alignment::Center);
    frame.render_widget(hints, chunks[4]);
}
