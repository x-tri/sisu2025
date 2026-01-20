'use client';

import { useState, useEffect } from 'react';
import styles from './ApprovalRadar.module.css';
import { useScores } from '../../context/ScoreContext';
import { useModality } from '../../context/ModalityContext';

interface RadarResult {
    courseId: number;
    courseCode: string;
    name: string;
    university: string;
    campus: string;
    city: string;
    state: string;
    degree: string;
    schedule: string;
    userScore: number;
    cutScore: number;
    cutScoreYear: number;
    margin: number;
    modalityName: string;
    vacancies?: number;
    applicants?: number;
}

interface ApprovalRadarProps {
    isOpen: boolean;
    onClose: () => void;
    baseCourseName: string; // e.g. "Medicina"
}

export default function ApprovalRadarModal({ isOpen, onClose, baseCourseName }: ApprovalRadarProps) {
    const { scores } = useScores();
    const { selectedModality, getModalityLabel } = useModality();
    const [results, setResults] = useState<RadarResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterState, setFilterState] = useState('');

    useEffect(() => {
        if (isOpen && baseCourseName) {
            fetchResults();
        }
    }, [isOpen, baseCourseName, selectedModality]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            // Remove specific degree/campus types from name to search broadly
            // e.g. "Medicina - Bacharelado" -> "Medicina"
            const cleanName = baseCourseName.split(' - ')[0];

            const response = await fetch('/api/simulate/radar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courseName: cleanName,
                    modalityCode: selectedModality,
                    grades: scores
                })
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();

            if (Array.isArray(data)) {
                setResults(data);
            } else if (data.results && Array.isArray(data.results)) {
                if (data.debug) {
                    console.log('Radar Debug Info:', data.debug);
                }
                setResults(data.results);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (margin: number, vacancies: number = 0) => {
        if (margin >= 0) return { label: '✅ Aprovado', class: '' };

        // "Chance Real" logic: if many vacancies, tolerances are higher
        const highVacancy = vacancies >= 20;
        const medVacancy = vacancies >= 5;

        // If high vacancy, accept up to -10 points as "Chance"
        if (highVacancy && margin > -10) return { label: '🟠 Chance Real', class: styles.statusChance };
        // If med vacancy, accept up to -5 points
        if (medVacancy && margin > -5) return { label: '🟠 Chance Real', class: styles.statusChance };

        // Default "Quase lá" for other close calls
        if (margin > -10) return { label: '⚠️ Quase lá', class: styles.statusNear };

        // Far away
        return { label: '❌ Difícil', class: styles.statusHard };
    };

    if (!isOpen) return null;

    // Filter results locally if needed
    const filteredResults = filterState
        ? results.filter(r => r.state === filterState)
        : results;

    // Separate passing and reasonable near-passing for display
    // We show everything that is passing OR within -30 points just to be safe
    const displayResults = filteredResults.filter(r => r.margin > -30);
    const uniqueStates = Array.from(new Set(results.map(r => r.state))).sort();
    const passingCount = filteredResults.filter(r => r.margin >= 0).length;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2>🔍 Radar de Aprovação - {baseCourseName}</h2>
                        <p>Simulação automática para <strong>{getModalityLabel()}</strong> em todas as universidades</p>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Analisando todas as universidades...</p>
                        </div>
                    ) : (
                        <>
                            {/* Simple Filters */}
                            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <select
                                    className="p-2 rounded bg-neutral-800 text-white border border-neutral-700"
                                    value={filterState}
                                    onChange={e => setFilterState(e.target.value)}
                                >
                                    <option value="">Todos os Estados</option>
                                    {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>

                                <span style={{ color: '#666', fontSize: '0.9rem', alignSelf: 'center' }}>
                                    {passingCount} aprovações prováveis
                                </span>
                            </div>

                            {displayResults.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>Nenhuma aprovação encontrada com os critérios atuais.</p>
                                    <p>Tente melhorar suas notas ou buscar outro curso.</p>
                                </div>
                            ) : (
                                <div className={styles.resultsGrid}>
                                    {displayResults.map((result, idx) => {
                                        const status = getStatusInfo(result.margin, result.vacancies);
                                        return (
                                            <div key={idx} className={styles.resultCard}>
                                                <div className={styles.cardHeader}>
                                                    <div>
                                                        <div className={styles.universityName}>{result.university}</div>
                                                        <div className={styles.universityLocation}>{result.campus} • {result.city}-{result.state}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '4px' }}>
                                                        <span className={`${styles.shiftBadge} ${result.schedule === 'Integral' ? styles.shiftIntegral :
                                                            result.schedule === 'Noturno' ? styles.shiftNoturno :
                                                                styles.shiftMatutino
                                                            }`}>
                                                            {result.schedule}
                                                        </span>
                                                        {result.vacancies ? (
                                                            <span style={{ fontSize: '0.7rem', color: '#888' }}>
                                                                {result.vacancies} vagas
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className={styles.cardBody}>
                                                    <div className={styles.scoreRow}>
                                                        <span className={styles.scoreLabel}>Sua Média Ponderada</span>
                                                        <span className={styles.scoreValue}>{result.userScore.toFixed(2)}</span>
                                                    </div>
                                                    <div className={styles.scoreRow}>
                                                        <span className={styles.scoreLabel}>Corte {result.cutScoreYear}</span>
                                                        <span className={styles.cutScoreValue}>{result.cutScore.toFixed(2)}</span>
                                                    </div>

                                                    <div className={styles.marginRow}>
                                                        <span className={styles.scoreLabel} style={{ color: '#fff' }}>Margem</span>
                                                        <span className={`${styles.marginValue} ${result.margin >= 0 ? styles.marginPassing : styles.marginFailing}`}>
                                                            {result.margin > 0 ? '+' : ''}{result.margin.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className={`${styles.statusBadge} ${status.class}`}>
                                                    {status.label}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
