export const CHART_COLORS = {
    reference: '#071a52',
    highlight: '#fd5430',
    green: '#1e9e55',
    purple: '#7a62b3',
    pink: '#e91e63',
    gray: '#69727d',
    grid: '#e0d3c6',
    panel: '#fbf6f1',
    text: '#1d1d1f',
    textMuted: '#5c544d',
} as const;

export const SERIES_COLORS = [
    CHART_COLORS.reference,
    CHART_COLORS.highlight,
    CHART_COLORS.green,
    CHART_COLORS.purple,
    CHART_COLORS.pink,
    CHART_COLORS.gray,
];
