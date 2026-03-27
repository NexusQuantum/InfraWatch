pub mod screens;
pub mod widgets;

use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Paragraph};

use crate::app::{App, Screen};
use crate::theme::styles;

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
        Screen::Preflight => screens::preflight::render(frame, app, chunks[0]),
        Screen::Progress => screens::progress::render(frame, app, chunks[0]),
        Screen::Verify => screens::verify::render(frame, app, chunks[0]),
        Screen::Complete => screens::complete::render(frame, app, chunks[0]),
        Screen::Error => screens::error::render(frame, app, chunks[0]),
    }

    // Status bar
    widgets::status_bar::render(frame, app, chunks[1]);
}

fn render_resize_prompt(frame: &mut Frame, app: &App) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::warning());

    let text = vec![
        Line::from(""),
        Line::from(Span::styled("Terminal too small", styles::warning())),
        Line::from(""),
        Line::from(Span::styled(
            format!(
                "Current: {}x{}  |  Minimum: 80x24",
                app.terminal_cols, app.terminal_rows
            ),
            styles::muted(),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Please resize your terminal window",
            styles::secondary(),
        )),
    ];

    let paragraph = Paragraph::new(text)
        .block(block)
        .alignment(Alignment::Center);

    frame.render_widget(paragraph, frame.area());
}
