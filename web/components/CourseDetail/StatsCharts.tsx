'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import styles from './CourseDetail.module.css';

interface Score {
    year: number;
    modality_name: string;
    cut_score: number;
}

interface StatsProps {
    scores: Score[];
}

export default function StatsCharts({ scores }: StatsProps) {
    if (!scores || scores.length === 0) return null;

    // Filter for Ampla Concorrência for the main chart
    const amplaScores = scores
        .filter(s => s.modality_name.toLowerCase().includes('ampla') || s.modality_name === 'AMPLA')
        .sort((a, b) => a.year - b.year);

    return (
        <div>
            <h3 className={styles.sectionTitle}>Evolução da Nota de Corte (Ampla)</h3>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={amplaScores}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="cut_score" name="Nota de Corte" stroke="#2563eb" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Add more charts as needed */}
        </div>
    );
}
