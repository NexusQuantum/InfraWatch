use ratatui::prelude::*;
use ratatui::widgets::Paragraph;

use crate::app::App;
use crate::theme::{self, styles};

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
    let status_line = Line::from(vec![
        Span::styled(format!(" {} ", theme::PRODUCT_NAME), styles::primary_bold()),
        Span::styled("│", styles::border()),
        Span::styled(format!(" {} ", app.screen_name()), styles::text()),
        Span::styled("│", styles::border()),
        Span::styled(format!(" Step {}/7 ", app.step_number()), styles::muted()),
        Span::styled("│", styles::border()),
        Span::styled(format!(" v{} ", theme::VERSION), styles::muted()),
    ]);

    frame.render_widget(Paragraph::new(status_line), area);
}
