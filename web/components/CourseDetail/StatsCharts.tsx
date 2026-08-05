'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './CourseDetail.module.css';
import { useModality } from '../../context/ModalityContext';

interface Score {
    year: number;
    modality_code: number | null;
    modality_name: string;
    cut_score: number | null;
}

interface StatsProps {
    scores: Score[];
}

export default function StatsCharts({ scores }: StatsProps) {
    const { selectedModality, getModalityLabel } = useModality();

    if (!scores || scores.length === 0) {
        return <p>Não há histórico de notas para esta oferta.</p>;
    }

    // Filter for Selected Modality and Deduplicate by Year
    const filteredScores = scores.filter(score => (
        selectedModality && String(score.modality_code ?? '') === selectedModality
    ));

    // Deduplicate
    const uniqueMap = new Map<number, Score>();

    filteredScores.forEach(score => {
        const existing = uniqueMap.get(score.year);
        // If no existing record for this year, or existing has no score but this one does
        if (!existing || (existing.cut_score === 0 || existing.cut_score === null) && ((score.cut_score ?? 0) > 0)) {
            uniqueMap.set(score.year, score);
        }
        else if ((score.cut_score ?? 0) > (existing.cut_score ?? 0)) {
            uniqueMap.set(score.year, score);
        }
    });

    const finalScores = Array.from(uniqueMap.values()).sort((a, b) => a.year - b.year);

    if (finalScores.length === 0) {
        return <p>Não há histórico para a modalidade oficial selecionada.</p>;
    }



    return (
        <div>
            <h3 className={styles.sectionTitle}>Evolução da Nota de Corte ({getModalityLabel()})</h3>
            <div className={styles.chartContainer} role="img" aria-label={`Evolução da nota de referência em ${finalScores.length} edições`}>
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
                        <Line type="monotone" dataKey="cut_score" name="Nota de referência" stroke="#2563eb" strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <ul>
                {finalScores.map(score => (
                    <li key={score.year}>
                        {score.year}: {score.cut_score === null ? 'não informada' : score.cut_score.toFixed(2).replace('.', ',')}
                    </li>
                ))}
            </ul>
        </div>
    );
}
