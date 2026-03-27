use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, List, ListItem};

use crate::app::{CheckItem, Status};
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, checks: &[CheckItem], area: Rect) {
    let items: Vec<ListItem> = checks
        .iter()
        .map(|check| {
            let (symbol, sym_style) = match check.status {
                Status::Pending => (theme::symbols::PENDING, styles::muted()),
                Status::InProgress => (theme::symbols::IN_PROGRESS, styles::primary()),
                Status::Success => (theme::symbols::CHECK, styles::success()),
                Status::Warning => (theme::symbols::WARNING, styles::warning()),
                Status::Error => (theme::symbols::CROSS, styles::error()),
                Status::Skipped => (theme::symbols::SKIPPED, styles::muted()),
            };

            let name_style = match check.status {
                Status::Success => styles::text(),
                Status::Warning => styles::warning(),
                Status::Error => styles::error(),
                _ => styles::muted(),
            };

            let msg = check
                .message
                .as_deref()
                .map(|m| format!(" — {}", m))
                .unwrap_or_default();

            ListItem::new(Line::from(vec![
                Span::styled(format!("  {} ", symbol), sym_style),
                Span::styled(&check.name, name_style),
                Span::styled(msg, styles::muted()),
            ]))
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Checks ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(list, area);
}
