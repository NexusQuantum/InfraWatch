use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::app::App;
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(crate::theme::SUCCESS))
        .title(" Installation Complete ")
        .title_alignment(Alignment::Center)
        .title_style(styles::success());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Top padding
            Constraint::Length(5), // Success message
            Constraint::Length(6), // Access info
            Constraint::Length(8), // Next steps
            Constraint::Min(1),    // Spacer
            Constraint::Length(3), // Key hints
        ])
        .split(inner);

    // Success message
    let success = Paragraph::new(vec![
        Line::from(Span::styled(
            format!(
                "  {}  InfraWatch has been installed successfully!",
                theme::symbols::CHECK
            ),
            styles::success(),
        )),
        Line::from(""),
        Line::from(Span::styled(
            format!("  Mode: {}", app.config.mode.name()),
            styles::secondary(),
        )),
        Line::from(Span::styled(
            format!("  Directory: {}", app.config.install_dir.display()),
            styles::secondary(),
        )),
    ]);
    frame.render_widget(success, chunks[1]);

    // Access info
    let url = format!("http://localhost:{}", app.config.http_port);
    let access = Paragraph::new(vec![
        Line::from(Span::styled("  Access InfraWatch:", styles::header())),
        Line::from(""),
        Line::from(vec![
            Span::styled("    Web UI:  ", styles::muted()),
            Span::styled(&url, styles::primary_bold()),
        ]),
        Line::from(vec![
            Span::styled("    Admin:   ", styles::muted()),
            Span::styled(&app.config.admin_username, styles::text()),
        ]),
    ])
    .block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Access ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(access, chunks[2]);

    // Next steps
    let steps = Paragraph::new(vec![
        Line::from(Span::styled("  Next steps:", styles::header())),
        Line::from(""),
        Line::from(vec![
            Span::styled("    1. ", styles::muted()),
            Span::styled(format!("Open {} in your browser", url), styles::text()),
        ]),
        Line::from(vec![
            Span::styled("    2. ", styles::muted()),
            Span::styled("Complete the setup wizard (license + EULA)", styles::text()),
        ]),
        Line::from(vec![
            Span::styled("    3. ", styles::muted()),
            Span::styled("Add your first Prometheus connector", styles::text()),
        ]),
        Line::from(vec![
            Span::styled("    4. ", styles::muted()),
            Span::styled("Check service status: ", styles::text()),
            Span::styled("systemctl status infrawatch", styles::info()),
        ]),
    ]);
    frame.render_widget(steps, chunks[3]);

    // Key hints
    let hints = Paragraph::new(vec![Line::from(vec![
        Span::styled("q", styles::key_hint()),
        Span::styled(" or ", styles::muted()),
        Span::styled("Enter", styles::key_hint()),
        Span::styled(" to exit", styles::muted()),
    ])])
    .alignment(Alignment::Center);
    frame.render_widget(hints, chunks[5]);
}
