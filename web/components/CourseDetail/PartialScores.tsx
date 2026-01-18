import { useRef, useEffect } from 'react';
import styles from './PartialScores.module.css';

interface PartialScore {
    day: string;
    score: number;
}

interface PartialScoresProps {
    scores: PartialScore[];
}

export function PartialScores({ scores }: PartialScoresProps) {
    if (!scores || scores.length === 0) return null;

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Notas parciais:</h3>
            <div className={styles.grid}>
                {scores.map((item, index) => (
                    <div key={index} className={styles.item}>
                        <span className={styles.day}>{item.day}</span>
                        <span className={styles.score}>
                            {item.score.toFixed(2).replace('.', ',')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
