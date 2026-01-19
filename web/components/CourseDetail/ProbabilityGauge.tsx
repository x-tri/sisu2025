'use client';

import { useMemo } from 'react';
import styles from './ProbabilityGauge.module.css';

interface ProbabilityGaugeProps {
    userScore: number;
    cutScore: number;
}

export default function ProbabilityGauge({ userScore, cutScore }: ProbabilityGaugeProps) {
    const { percent, status, color, rotation } = useMemo(() => {
        if (!userScore || !cutScore) {
            return { percent: 0, status: 'Sem Nota', color: '#666', rotation: 0 };
        }

        const diff = userScore - cutScore;

        // Calculate "probability" logic
        // diff >= 20 => 99%
        // diff = 0 => 50%
        // diff <= -20 => 1%

        // Sigmoid-ish mapping for nicer feel
        let p = 50;
        if (diff > 0) {
            // 0 to 20 maps to 50 to 99
            p = 50 + (Math.min(diff, 20) / 20) * 49;
        } else {
            // -20 to 0 maps to 1 to 50
            p = 50 - (Math.min(Math.abs(diff), 20) / 20) * 49;
        }

        let statusLabel = '';
        let statusColor = '';

        if (p >= 90) {
            statusLabel = 'Aprovação Muito Provável';
            statusColor = '#10b981'; // Emerald 500
        } else if (p >= 60) {
            statusLabel = 'Boas Chances';
            statusColor = '#34d399'; // Emerald 400
        } else if (p >= 40) {
            statusLabel = 'Na Margem';
            statusColor = '#eab308'; // Yellow 500
        } else if (p >= 20) {
            statusLabel = 'Arriscado';
            statusColor = '#f97316'; // Orange 500
        } else {
            statusLabel = 'Muito Difícil';
            statusColor = '#ef4444'; // Red 500
        }

        // Convert percentage to 180 degree rotation (0% = -180deg (hidden?), wait. SVG arc logic)
        // We will use stroke-dasharray.
        // Length of semi-circle arc with r=90 is PI * 90 ~= 282.7

        return { percent: p, status: statusLabel, color: statusColor, rotation: 0 };

    }, [userScore, cutScore]);

    // SVG Arc Calc
    const radius = 80;
    const circumference = Math.PI * radius; // Semi-circle
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    if (!userScore) {
        return (
            <div className={styles.container}>
                <div className={styles.title}>Simulador de Chances</div>
                <div className={styles.noScore}>
                    <p style={{ color: '#999', fontSize: '0.9rem' }}>Insira suas notas para calcular suas chances.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.title}>Suas Chances</div>

            <div className={styles.gaugeWrapper}>
                <svg viewBox="0 0 200 100" width="200" height="100">
                    {/* Background Track */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        className={styles.gaugeBackground}
                    />
                    {/* Active Fill */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        className={styles.gaugeFill}
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: strokeDashoffset,
                            stroke: color
                        }}
                    />
                </svg>

                <div className={styles.scoreText}>
                    <span className={styles.percentage} style={{ color }}>
                        {Math.round(percent)}%
                    </span>
                </div>
            </div>

            <div className={styles.statusText} style={{ color }}>
                {status}
            </div>

            <div className={styles.diffRaw}>
                Diferença: {userScore > cutScore ? '+' : ''}{(userScore - cutScore).toFixed(2)} pontos
            </div>
        </div>
    );
}
