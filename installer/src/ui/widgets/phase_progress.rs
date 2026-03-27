use ratatui::prelude::*;
use ratatui::widgets::{Block, BorderType, Borders, Gauge, List, ListItem};

use crate::app::{Phase, Status};
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, phases: &[(Phase, Status)], current: Option<Phase>, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Gauge bar
            Constraint::Min(5),    // Phase list
        ])
        .split(area);

    // Overall progress gauge
    let completed = phases.iter().filter(|(_, s)| s.is_complete()).count();
    let total = phases.len();
    let ratio = if total > 0 {
        completed as f64 / total as f64
    } else {
        0.0
    };
    let pct = (ratio * 100.0) as u16;

    let gauge = Gauge::default()
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(styles::border())
                .title(" Progress ")
                .title_style(styles::secondary()),
        )
        .gauge_style(styles::primary())
        .ratio(ratio)
        .label(format!("{}% ({}/{})", pct, completed, total));
    frame.render_widget(gauge, chunks[0]);

    // Phase checklist
    let items: Vec<ListItem> = phases
        .iter()
        .map(|(phase, status)| {
            let is_current = current == Some(*phase);

            let (symbol, sym_style) = match status {
                Status::Pending => (theme::symbols::PENDING, styles::muted()),
                Status::InProgress => (theme::symbols::IN_PROGRESS, styles::primary()),
                Status::Success => (theme::symbols::CHECK, styles::success()),
                Status::Warning => (theme::symbols::WARNING, styles::warning()),
                Status::Error => (theme::symbols::CROSS, styles::error()),
                Status::Skipped => (theme::symbols::SKIPPED, styles::muted()),
            };

            let name_style = if is_current {
                styles::primary_bold()
            } else if status.is_complete() {
                styles::text()
            } else {
                styles::muted()
            };

            ListItem::new(Line::from(vec![
                Span::styled(format!(" {} ", symbol), sym_style),
                Span::styled(format!("{:2}. ", phase.number()), styles::muted()),
                Span::styled(phase.name(), name_style),
            ]))
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(styles::border())
            .title(" Phases ")
            .title_style(styles::secondary()),
    );
    frame.render_widget(list, chunks[1]);
}
