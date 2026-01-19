'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import styles from './CourseDetail.module.css';
import { useModality, matchModality } from '../../context/ModalityContext';

interface Score {
    year: number;
    modality_name: string;
    cut_score: number;
}

interface StatsProps {
    scores: Score[];
}

export default function StatsCharts({ scores }: StatsProps) {
    const { selectedModality, getModalityLabel } = useModality();

    if (!scores || scores.length === 0) return null;

    // Filter for Selected Modality and Deduplicate by Year
    const filteredScores = scores.filter(s => {
        // Use matchModality to correctly identify if this score belongs to the selected modality
        // We construct a temporary object to match the interface expected by matchModality
        const match = matchModality(selectedModality, [{ modality_name: s.modality_name, modality_code: '' }]);
        return match !== null;
    });

    // Fallback: If no scores found for selected modality (e.g. data missing), maybe show Ampla or nothing?
    // For the chart, showing nothing is better than showing misleading data.
    // However, if we want to mimic the behavior of 'defaulting to Ampla', we could do that.
    // Let's stick to showing only what's selected to be accurate.

    // Deduplicate
    const uniqueMap = new Map<number, Score>();

    filteredScores.forEach(score => {
        const existing = uniqueMap.get(score.year);
        // If no existing record for this year, or existing has no score but this one does
        if (!existing || (existing.cut_score === 0 || existing.cut_score === null) && (score.cut_score > 0)) {
            uniqueMap.set(score.year, score);
        }
        else if (score.cut_score > (existing.cut_score || 0)) {
            uniqueMap.set(score.year, score);
        }
    });

    const finalScores = Array.from(uniqueMap.values()).sort((a, b) => a.year - b.year);



    return (
        <div>
            <h3 className={styles.sectionTitle}>Evolução da Nota de Corte ({getModalityLabel()})</h3>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={finalScores}
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
