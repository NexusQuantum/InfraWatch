use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, List, ListItem, Paragraph};

use crate::app::{App, InstallMode};
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active())
        .title(" Installation Mode ")
        .title_alignment(Alignment::Center)
        .title_style(styles::title());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Header
            Constraint::Length(1), // Spacing
            Constraint::Min(8),    // Mode list
            Constraint::Length(5), // Description box
            Constraint::Length(3), // Key hints
        ])
        .split(inner);

    // Header
    let header = Paragraph::new(Line::from(Span::styled(
        " Select an installation mode:",
        styles::secondary(),
    )));
    frame.render_widget(header, chunks[0]);

    // Mode list
    let items: Vec<ListItem> = InstallMode::ALL
        .iter()
        .enumerate()
        .map(|(i, mode)| {
            let selected = i == app.mode_selection;
            let prefix = if selected {
                format!(" {} ", theme::symbols::ARROW_RIGHT)
            } else {
                "   ".to_string()
            };

            let style = if selected {
                styles::primary_bold()
            } else {
                styles::text()
            };

            ListItem::new(Line::from(vec![
                Span::styled(prefix, style),
                Span::styled(mode.name(), style),
            ]))
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Modes ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(list, chunks[2]);

    // Description of selected mode
    let selected_mode = InstallMode::ALL[app.mode_selection];
    let desc = Paragraph::new(vec![
        Line::from(Span::styled(
            format!(" {}", selected_mode.name()),
            styles::primary_bold(),
        )),
        Line::from(Span::styled(
            format!(" {}", selected_mode.description()),
            styles::secondary(),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  Database: ", styles::muted()),
            Span::styled(
                if selected_mode.includes_database() {
                    "Yes"
                } else {
                    "No (external)"
                },
                if selected_mode.includes_database() {
                    styles::success()
                } else {
                    styles::muted()
                },
            ),
            Span::styled("  │  Service: ", styles::muted()),
            Span::styled(
                if selected_mode.includes_services() {
                    "Yes"
                } else {
                    "No"
                },
                if selected_mode.includes_services() {
                    styles::success()
                } else {
                    styles::muted()
                },
            ),
        ]),
    ])
    .block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Details ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(desc, chunks[3]);

    // Key hints
    let hints = Paragraph::new(vec![Line::from(vec![
        Span::styled("↑/↓", styles::key_hint()),
        Span::styled(" Navigate  ", styles::muted()),
        Span::styled(theme::symbols::BULLET, styles::muted()),
        Span::styled("  ", styles::muted()),
        Span::styled("Enter", styles::key_hint()),
        Span::styled(" Select  ", styles::muted()),
        Span::styled(theme::symbols::BULLET, styles::muted()),
        Span::styled("  ", styles::muted()),
        Span::styled("Esc", styles::key_hint()),
        Span::styled(" Back  ", styles::muted()),
        Span::styled(theme::symbols::BULLET, styles::muted()),
        Span::styled("  ", styles::muted()),
        Span::styled("q", styles::key_hint()),
        Span::styled(" Quit", styles::muted()),
    ])])
    .alignment(Alignment::Center);
    frame.render_widget(hints, chunks[4]);
}
