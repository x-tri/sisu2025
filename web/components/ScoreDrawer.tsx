'use client';

import { useState, useEffect } from 'react';
import styles from './ScoreDrawer.module.css';
import { useScores } from '../context/ScoreContext';
import { SCORE_SUBJECTS, ScoreSubject } from '../lib/score-core';

export default function ScoreDrawer() {
    const {
        scores,
        setScore,
        clearScores,
        rememberScores,
        setRememberScores,
    } = useScores();
    const [isOpen, setIsOpen] = useState(false);

    // Internal state for masking (string representation)
    // We strictly follow the rule: user types numbers, we divide by 100.
    // e.g. "6" -> 0.06, "60" -> 0.60, "600" -> 6.00, "60000" -> 600.00

    // Helper to format number to mask
    const formatValue = (num: number) => {
        if (!num) return '';
        return num.toFixed(2);
    };

    const [inputs, setInputs] = useState({
        redacao: formatValue(scores.redacao),
        linguagens: formatValue(scores.linguagens),
        humanas: formatValue(scores.humanas),
        natureza: formatValue(scores.natureza),
        matematica: formatValue(scores.matematica),
    });

    // Update inputs if external scores change (e.g. initial load)
    useEffect(() => {
        setInputs({
            redacao: formatValue(scores.redacao),
            linguagens: formatValue(scores.linguagens),
            humanas: formatValue(scores.humanas),
            natureza: formatValue(scores.natureza),
            matematica: formatValue(scores.matematica),
        });
    }, [scores]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (!SCORE_SUBJECTS.includes(name as ScoreSubject)) return;

        // Remove non-digits
        const digits = value.replace(/\D/g, '');

        // Convert to float (division by 100)
        const floatVal = digits ? parseInt(digits, 10) / 100 : 0;

        // Limit to reasonable max (1000.00)
        if (floatVal > 1000) return;

        // Update local state for immediate feedback
        // We actually want to simulate the "typing" effect.
        // If we just set text to float value, it works like a controlled input with mask
        setScore(name as ScoreSubject, floatVal);
    };

    return (
        <>
            <button
                className={styles.toggleButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls="score-drawer"
            >
                <span>📝</span>
                {isOpen ? 'Fechar Notas' : 'Minhas Notas'}
            </button>

            <div
                id="score-drawer"
                className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
                aria-hidden={!isOpen}
            >
                {isOpen && <div className="container">
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="score-linguagens">Linguagens</label>
                            <input
                                id="score-linguagens"
                                name="linguagens"
                                value={inputs.linguagens}
                                onChange={handleInput}
                                className={styles.input}
                                placeholder="000.00"
                                type="text"
                                inputMode="numeric"
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="score-humanas">Humanas</label>
                            <input
                                id="score-humanas"
                                name="humanas"
                                value={inputs.humanas}
                                onChange={handleInput}
                                className={styles.input}
                                placeholder="000.00"
                                type="text"
                                inputMode="numeric"
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="score-natureza">Natureza</label>
                            <input
                                id="score-natureza"
                                name="natureza"
                                value={inputs.natureza}
                                onChange={handleInput}
                                className={styles.input}
                                placeholder="000.00"
                                type="text"
                                inputMode="numeric"
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="score-matematica">Matemática</label>
                            <input
                                id="score-matematica"
                                name="matematica"
                                value={inputs.matematica}
                                onChange={handleInput}
                                className={styles.input}
                                placeholder="000.00"
                                type="text"
                                inputMode="numeric"
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="score-redacao">Redação</label>
                            <input
                                id="score-redacao"
                                name="redacao"
                                value={inputs.redacao}
                                onChange={handleInput}
                                className={styles.input}
                                placeholder="000.00"
                                type="text"
                                inputMode="numeric"
                            />
                        </div>
                    </div>
                    <label className={styles.rememberOption}>
                        <input
                            type="checkbox"
                            checked={rememberScores}
                            onChange={event => setRememberScores(event.target.checked)}
                        />
                        <span>Lembrar minhas notas neste dispositivo por até 30 dias</span>
                    </label>
                    <div className={styles.actions}>
                        <button className={styles.clearButton} onClick={clearScores} type="button">
                            Limpar notas
                        </button>
                        <button className={styles.saveButton} onClick={() => setIsOpen(false)}>
                            Salvar Notas
                        </button>
                    </div>
                </div>}
            </div>
        </>
    );
}
