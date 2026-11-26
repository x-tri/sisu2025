'use client';

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import styles from './ScoreEvolutionChart.module.css';
import { CHART_COLORS } from '../../lib/chartPalette';

interface PartialScore {
    day: number;
    score: number;
}

interface YearData {
    year: number;
    cut_score: number; // Final cut score
    cut_score_type: string;
    partial_scores: PartialScore[];
}

interface ScoreEvolutionChartProps {
    data2024?: YearData;
    data2025?: YearData;
    data2026?: YearData;
}

export default function ScoreEvolutionChart({
    data2024,
    data2025,
    data2026
}: ScoreEvolutionChartProps) {
    const chartData = useMemo(() => {
        // 1. Identify all unique days across all available years
        const allDays = new Set<number>();

        [data2024, data2025, data2026].forEach(yearData => {
            yearData?.partial_scores?.forEach(p => {
                if (p.day) allDays.add(p.day);
            });
        });

        if (allDays.size === 0) return [];

        // 2. Build the data array for Recharts
        const daysSorted = Array.from(allDays).sort((a, b) => a - b);

        return daysSorted.map(day => {
            const item: any = { day: `Dia ${day}` }; // X-Axis Label

            // Helper to find score for a specific day
            const getScore = (yearData?: YearData) =>
                yearData?.partial_scores?.find(p => p.day === day)?.score;

            if (data2024) item['2024'] = getScore(data2024);
            if (data2025) item['2025'] = getScore(data2025);
            if (data2026) item['2026'] = getScore(data2026);

            return item;
        });
    }, [data2024, data2025, data2026]);

    if (chartData.length === 0) {
        return (
            <div className={styles.emptyState} role="status">
                Ainda não há histórico diário suficiente para montar o gráfico.
            </div>
        );
    }

    // Custom Tooltip Component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className={styles.customTooltip}>
                    <span className={styles.tooltipLabel}>{label}</span>
                    {payload.map((entry: any) => (
                        <div key={entry.name} className={styles.tooltipItem}>
                            <div
                                className={styles.tooltipDot}
                                style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}: </span>
                            <span className={styles.tooltipValue}>
                                {entry.value?.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div
            className={styles.container}
            role="img"
            aria-label="Gráfico da evolução diária das notas de referência por edição do SISU"
        >
            <div className={styles.title}>Evolução das Notas de Corte</div>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 20,
                        left: 0,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis
                        dataKey="day"
                        stroke={CHART_COLORS.textMuted}
                        tick={{ fill: CHART_COLORS.textMuted, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        stroke={CHART_COLORS.textMuted}
                        tick={{ fill: CHART_COLORS.textMuted, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        label={{ value: 'Nota', angle: -90, position: 'insideLeft', fill: CHART_COLORS.textMuted }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />

                    {/* 2024 - Gray/Reference */}
                    {data2024 && (
                        <Line
                            type="monotone"
                            dataKey="2024"
                            stroke={CHART_COLORS.gray}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3, fill: CHART_COLORS.gray }}
                            activeDot={{ r: 6 }}
                            name="2024 (Ref)"
                            connectNulls
                        />
                    )}

                    {/* 2025 - Navy/Recent */}
                    {data2025 && (
                        <Line
                            type="monotone"
                            dataKey="2025"
                            stroke={CHART_COLORS.reference}
                            strokeWidth={2}
                            dot={{ r: 4, fill: CHART_COLORS.reference }}
                            activeDot={{ r: 6 }}
                            name="2025"
                            connectNulls
                        />
                    )}

                    {/* 2026 - Orange/Live (highlight) */}
                    {data2026 && (
                        <Line
                            type="monotone"
                            dataKey="2026"
                            stroke={CHART_COLORS.highlight}
                            strokeWidth={3}
                            dot={{ r: 5, fill: CHART_COLORS.highlight, strokeWidth: 2, stroke: CHART_COLORS.panel }}
                            activeDot={{ r: 8 }}
                            name="2026 (Atual)"
                            connectNulls
                            isAnimationActive={false}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
            <ul className={styles.srOnly}>
                {chartData.map((entry: Record<string, string | number>) => (
                    <li key={String(entry.day)}>
                        {Object.entries(entry).map(([key, value]) => `${key}: ${value}`).join(', ')}
                    </li>
                ))}
            </ul>
        </div>
    );
}
