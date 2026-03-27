use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, List, ListItem, Paragraph};

use crate::app::{App, CONFIG_FIELDS};
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border_active())
        .title(" Configuration ")
        .title_alignment(Alignment::Center)
        .title_style(styles::title());

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Header
            Constraint::Min(10),   // Fields list
            Constraint::Length(3), // Edit box (when editing)
            Constraint::Length(3), // Key hints
        ])
        .split(inner);

    // Header
    let header = Paragraph::new(Line::from(Span::styled(
        format!(" Configure {} installation:", app.config.mode.name()),
        styles::secondary(),
    )));
    frame.render_widget(header, chunks[0]);

    // Config fields
    let items: Vec<ListItem> = CONFIG_FIELDS
        .iter()
        .enumerate()
        .map(|(i, field_name)| {
            let selected = i == app.config_field;
            let value = app.config.get_field(i);

            let prefix = if selected && !app.editing {
                format!(" {} ", theme::symbols::ARROW_RIGHT)
            } else {
                "   ".to_string()
            };

            let name_style = if selected {
                styles::primary_bold()
            } else {
                styles::secondary()
            };

            let value_style = if value.starts_with("(auto") {
                styles::muted()
            } else {
                styles::text()
            };

            ListItem::new(Line::from(vec![
                Span::styled(prefix, name_style),
                Span::styled(format!("{:<22}", field_name), name_style),
                Span::styled(value, value_style),
            ]))
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Settings ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(list, chunks[1]);

    // Edit box
    if app.editing {
        let field_name = CONFIG_FIELDS[app.config_field];
        let edit_text = Paragraph::new(Line::from(vec![
            Span::styled(format!(" {}: ", field_name), styles::primary()),
            Span::styled(&app.input_buffer, styles::text()),
            Span::styled("█", styles::primary()), // cursor
        ]))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(styles::primary())
                .title(" Editing ")
                .title_style(styles::primary()),
        );
        frame.render_widget(edit_text, chunks[2]);
    } else {
        let hint = Paragraph::new(Line::from(Span::styled(
            " Press 'e' or Space to edit selected field",
            styles::muted(),
        )));
        frame.render_widget(hint, chunks[2]);
    }

    // Key hints
    let hints = if app.editing {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("Enter", styles::key_hint()),
            Span::styled(" Save  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Esc", styles::key_hint()),
            Span::styled(" Cancel", styles::muted()),
        ])])
    } else {
        Paragraph::new(vec![Line::from(vec![
            Span::styled("↑/↓", styles::key_hint()),
            Span::styled(" Navigate  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("e/Space", styles::key_hint()),
            Span::styled(" Edit  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Enter", styles::key_hint()),
            Span::styled(" Continue  ", styles::muted()),
            Span::styled(theme::symbols::BULLET, styles::muted()),
            Span::styled("  ", styles::muted()),
            Span::styled("Esc", styles::key_hint()),
            Span::styled(" Back", styles::muted()),
        ])])
    };
    frame.render_widget(hints.alignment(Alignment::Center), chunks[3]);
}
