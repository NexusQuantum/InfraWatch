use ratatui::prelude::*;
use ratatui::widgets::{
    Block, BorderType, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Wrap,
};

use crate::app::{LogEntry, LogLevel};
use crate::theme::styles;

pub fn render(frame: &mut Frame, logs: &[LogEntry], scroll: usize, area: Rect) {
    let log_lines: Vec<Line> = logs
        .iter()
        .map(|entry| {
            let (level_str, level_style) = match entry.level {
                LogLevel::Debug => ("DBG", styles::muted()),
                LogLevel::Info => ("INF", styles::info()),
                LogLevel::Success => ("OK ", styles::success()),
                LogLevel::Warning => ("WRN", styles::warning()),
                LogLevel::Error => ("ERR", styles::error()),
            };
            let timestamp = entry.timestamp.format("%H:%M:%S").to_string();

            Line::from(vec![
                Span::styled(format!("{} ", timestamp), styles::muted()),
                Span::styled(format!("[{}] ", level_str), level_style),
                Span::styled(&entry.message, styles::text()),
            ])
        })
        .collect();

    let visible_height = area.height.saturating_sub(2) as usize;
    let max_scroll = logs.len().saturating_sub(visible_height);
    let scroll = scroll.min(max_scroll);

    let log_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(styles::border())
        .title(" Logs ")
        .title_style(styles::secondary());

    let log_para = Paragraph::new(log_lines)
        .block(log_block)
        .wrap(Wrap { trim: false })
        .scroll((scroll as u16, 0));
    frame.render_widget(log_para, area);

    // Scrollbar
    if logs.len() > visible_height {
        let mut scrollbar_state = ScrollbarState::new(logs.len())
            .position(scroll)
            .viewport_content_length(visible_height);

        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .begin_symbol(Some("▲"))
            .end_symbol(Some("▼"))
            .track_symbol(Some("│"))
            .thumb_symbol("█");

        frame.render_stateful_widget(
            scrollbar,
            area.inner(ratatui::layout::Margin {
                vertical: 1,
                horizontal: 0,
            }),
            &mut scrollbar_state,
        );
    }
}
