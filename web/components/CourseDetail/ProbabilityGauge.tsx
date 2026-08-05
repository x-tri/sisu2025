'use client';

import styles from './ProbabilityGauge.module.css';
import {
    formatScore,
    formatSignedScore,
    getScoreMargin,
} from '../../lib/score-core';

interface ScoreMarginProps {
    userScore: number;
    cutScore: number;
}

/**
 * Descriptive comparison only. The historical/current cut score is not a
 * calibrated probability and must not be presented as an admission result.
 */
export default function ScoreMargin({ userScore, cutScore }: ScoreMarginProps) {
    const margin = getScoreMargin(userScore, cutScore);

    if (margin.relation === 'unavailable' || margin.points === null || userScore <= 0) {
        return (
            <section className={styles.container} aria-labelledby="score-margin-title">
                <h3 id="score-margin-title" className={styles.title}>Margem para a nota de corte</h3>
                <p className={styles.noScore}>
                    Insira suas notas para comparar sua média com a nota de corte de referência.
                </p>
            </section>
        );
    }

    const relationClass = margin.relation === 'above'
        ? styles.above
        : margin.relation === 'below'
            ? styles.below
            : styles.equal;
    const relationText = margin.relation === 'above'
        ? 'acima'
        : margin.relation === 'below'
            ? 'abaixo'
            : 'exatamente na referência';

    return (
        <section className={styles.container} aria-labelledby="score-margin-title">
            <h3 id="score-margin-title" className={styles.title}>Margem para a nota de corte</h3>

            <output className={`${styles.marginValue} ${relationClass}`} aria-live="polite">
                {formatSignedScore(margin.points)} pontos
            </output>

            <p className={styles.explanation}>
                Sua média está {relationText}{margin.relation === 'equal' ? '' : ' da nota de corte usada como referência'}.
            </p>

            <dl className={styles.comparison}>
                <div>
                    <dt>Sua média</dt>
                    <dd>{formatScore(userScore)}</dd>
                </div>
                <div>
                    <dt>Corte de referência</dt>
                    <dd>{formatScore(cutScore)}</dd>
                </div>
            </dl>

            <p className={styles.disclaimer}>
                Comparação descritiva. A nota de corte pode mudar e esta margem não representa resultado oficial.
            </p>
        </section>
    );
}
