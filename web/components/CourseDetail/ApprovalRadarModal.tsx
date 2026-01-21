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
    difference: number;
    modalityName: string;
    vacancies?: number;
    distance?: number | null;
}

interface ApprovalRadarProps {
    isOpen: boolean;
    onClose: () => void;
    baseCourseName: string;
    referenceCourseId?: number;
    referenceCity?: string;
    referenceState?: string;
}

export default function ApprovalRadarModal({
    isOpen,
    onClose,
    baseCourseName,
    referenceCourseId,
    referenceCity,
    referenceState
}: ApprovalRadarProps) {
    const { scores } = useScores();
    const { selectedModality, getModalityLabel } = useModality();
    const [results, setResults] = useState<RadarResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterState, setFilterState] = useState('');

    useEffect(() => {
        if (isOpen && baseCourseName) {
            fetchResults();
        }
    }, [isOpen, baseCourseName, selectedModality, referenceCourseId]);

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
            const cleanName = baseCourseName.split(' - ')[0];

            const response = await fetch('/api/simulate/radar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courseName: cleanName,
                    modalityCode: selectedModality,
                    grades: scores,
                    referenceCourseId: referenceCourseId
                })
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();

            if (Array.isArray(data)) {
                setResults(data);
            } else if (data.results && Array.isArray(data.results)) {
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

    if (!isOpen) return null;

    // Filter by state if selected
    const filteredResults = filterState
        ? results.filter(r => r.state === filterState)
        : results;

    // Show all results (already sorted by difference from backend)
    const displayResults = filteredResults.slice(0, 100); // Limit display
    const uniqueStates = Array.from(new Set(results.map(r => r.state))).sort();
    const passingCount = filteredResults.filter(r => r.difference >= 0).length;

    // Format difference for display
    const formatDifference = (diff: number) => {
        const formatted = Math.abs(diff).toFixed(2).replace('.', ',');
        if (diff >= 0) {
            return `+${formatted}`;
        }
        return `-${formatted}`;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2>🔍 Radar de Aprovação - {baseCourseName}</h2>
                        <p>
                            Cursos similares
                            {referenceCity && referenceState && (
                                <> nas proximidades de <strong>{referenceCity}, {referenceState}</strong></>
                            )}
                            {' '}• <strong>{getModalityLabel()}</strong>
                        </p>
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
                            {/* Filters */}
                            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <select
                                    className="p-2 rounded bg-neutral-800 text-white border border-neutral-700"
                                    value={filterState}
                                    onChange={e => setFilterState(e.target.value)}
                                >
                                    <option value="">Todos os Estados</option>
                                    {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>

                                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                    {results.length} cursos encontrados • {passingCount} aprovações
                                </span>
                            </div>

                            {displayResults.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>Nenhum curso encontrado com os critérios atuais.</p>
                                    <p>Tente outro nome de curso.</p>
                                </div>
                            ) : (
                                <div className={styles.resultsGrid}>
                                    {displayResults.map((result, idx) => {
                                        const isPassing = result.difference >= 0;
                                        return (
                                            <div key={idx} className={styles.resultCard}>
                                                {/* Distance badge at top */}
                                                {result.distance !== null && result.distance !== undefined && (
                                                    <div className={styles.distanceBadge}>
                                                        Distância relativa: ~{result.distance}km
                                                    </div>
                                                )}

                                                <div className={styles.cardHeader}>
                                                    <div>
                                                        <div className={styles.courseName}>{result.name}</div>
                                                        <div className={styles.courseDetails}>
                                                            {result.degree} - {result.schedule}
                                                        </div>
                                                        <div className={styles.universityName}>🏛️ {result.university}</div>
                                                        <div className={styles.universityLocation}>📍 {result.city}, {result.state}</div>
                                                    </div>
                                                </div>

                                                <div className={styles.cutScoreHighlight}>
                                                    <span>Último corte {getModalityLabel().toUpperCase()}:</span>
                                                    <strong>{result.cutScore.toFixed(2).replace('.', ',')}</strong>
                                                </div>

                                                <div className={styles.differenceRow}>
                                                    <span>Diferença:</span>
                                                    <span className={isPassing ? styles.diffPositive : styles.diffNegative}>
                                                        {formatDifference(result.difference)}
                                                    </span>
                                                </div>

                                                {result.vacancies && result.vacancies > 0 && (
                                                    <div className={styles.vacanciesInfo}>
                                                        {result.vacancies} vagas
                                                    </div>
                                                )}
                                            </div>
                                        );
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
