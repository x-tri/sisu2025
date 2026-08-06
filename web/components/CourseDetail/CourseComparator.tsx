'use client';

import { useState, useEffect } from 'react';
import styles from './CourseComparator.module.css';
import { useModality } from '../../context/ModalityContext';
import { getEffectiveCutoff } from '../../lib/course-selection';
import type { CourseReference, VerificationStatus } from '../../types/course';

interface CourseComparatorProps {
    baseCourse: any; // CoursePreview
    userScore: number;
    isOpen: boolean;
    onClose: () => void;
}

interface FullCourseDetails {
    name: string;
    university: string;
    campus: string;
    city: string;
    state: string;
    degree: string;
    schedule: string;
    cut_score: number | null;
    cut_score_year: number | null;
    verification: VerificationStatus;
}

export default function CourseComparator({ baseCourse, userScore, isOpen, onClose }: CourseComparatorProps) {
    const { selectedModality } = useModality(); // Get selected modality
    const [baseDetails, setBaseDetails] = useState<FullCourseDetails | null>(null);
    const [compDetails, setCompDetails] = useState<FullCourseDetails | null>(null);
    const [loading, setLoading] = useState(false);

    // Filter states for comparison selection
    const [compState, setCompState] = useState('');
    const [compCity, setCompCity] = useState('');
    const [compUni, setCompUni] = useState('');
    const [compCourseId, setCompCourseId] = useState('');
    const [options, setOptions] = useState({ state: [], uni: [], course: [], cities: [] });

    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Fetch Base Course Full Details on Open
    useEffect(() => {
        if (!isOpen || !baseCourse?.code) return;

        const fetchBaseDetails = async () => {
            try {
                const res = await fetch(`/api/courses/${baseCourse.code}`);
                const data = await res.json();

                const targetYear = baseCourse.cut_score_year;
                const reference = (data.references as CourseReference[]).find(item => (
                    item.edition === targetYear && item.modalityId === selectedModality
                ));
                const cutScore = reference ? getEffectiveCutoff(reference) : null;

                setBaseDetails({
                    name: data.course.name,
                    university: data.course.university,
                    campus: data.course.campus,
                    city: data.course.city,
                    state: data.course.state,
                    degree: data.course.degree,
                    schedule: data.course.schedule,
                    cut_score: cutScore,
                    cut_score_year: reference?.edition ?? null,
                    verification: reference?.verification.status ?? 'unverified',
                });
            } catch (err) {
                console.error("Error fetching base details:", err);
            }
        };

        fetchBaseDetails();
    }, [isOpen, baseCourse, selectedModality]);


    // Load States
    useEffect(() => {
        if (!isOpen) return;
        fetch('/api/filters?type=states')
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, state: data })));
    }, [isOpen]);

    // Load Cities
    useEffect(() => {
        if (!compState) return;
        setCompCity(''); setCompUni(''); setCompCourseId('');
        fetch(`/api/filters?type=cities&state=${compState}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, cities: data })));
    }, [compState]);

    // Load Unis
    useEffect(() => {
        if (!compCity) return;
        setCompUni(''); setCompCourseId('');
        fetch(`/api/filters?type=universities&state=${compState}&city=${compCity}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, uni: data })));
    }, [compCity]);

    // Load Courses
    useEffect(() => {
        if (!compUni) return;
        setCompCourseId('');
        fetch(`/api/filters?type=courses&state=${compState}&city=${compCity}&university=${compUni}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, course: data })));
    }, [compUni]);


    const handleCompare = async () => {
        if (!compCourseId) return;
        setLoading(true);
        const courseRef = (options.course as any[]).find((c: any) => String(c.id) === compCourseId);

        try {
            const res = await fetch(`/api/courses/${courseRef.code}`);
            const data = await res.json();

            const reference = (data.references as CourseReference[]).find(item => (
                item.edition === baseDetails?.cut_score_year && item.modalityId === selectedModality
            ));
            const cutScore = reference ? getEffectiveCutoff(reference) : null;


            setCompDetails({
                name: data.course.name,
                university: data.course.university,
                campus: data.course.campus,
                city: data.course.city,
                state: data.course.state,
                degree: data.course.degree,
                schedule: data.course.schedule,
                cut_score: cutScore,
                cut_score_year: reference?.edition ?? null,
                verification: reference?.verification.status ?? 'unverified',
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    // Helper to calculate difference
    const getDiff = (target: number, base: number) => {
        const diff = target - base;
        return diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    };

    return (
        <div className={styles.overlay} onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
        }}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="course-comparator-title">
                <div className={styles.header}>
                    <div className={styles.title} id="course-comparator-title">⚖️ Comparador de Cursos</div>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Fechar comparador">✕</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.comparisonGrid}>
                        {/* LEFT: Base Course */}
                        <div className={styles.courseCard}>
                            <div className={styles.cardLabel}>Curso Atual</div>
                            {baseDetails ? (
                                <>
                                    <div className={styles.courseHeader}>
                                        <div className={styles.courseName}>{baseDetails.name}</div>
                                        <div className={styles.courseUni}>{baseDetails.university}</div>
                                        <div className={styles.courseMeta}>{baseDetails.city} - {baseDetails.state}</div>
                                    </div>

                                    <div className={styles.metricsContainer}>
                                        <div className={styles.metricRow}>
                                            <span className={styles.metricLabel}>Nota de Corte ({baseDetails.cut_score_year})</span>
                                            <span className={styles.metricValue}>
                                                {baseDetails.cut_score === null ? 'Sem referência' : baseDetails.cut_score.toFixed(2)}
                                            </span>
                                        </div>

                                        {userScore > 0 && baseDetails.cut_score !== null && baseDetails.verification !== 'conflict' && (
                                            <div className={`${styles.metricRow} ${styles.userScoreRow}`}>
                                                <span className={styles.metricLabel}>Margem para a referência</span>
                                                <span className={`${styles.metricValue} ${userScore >= baseDetails.cut_score ? styles.passing : styles.failing}`}>
                                                    {getDiff(userScore, baseDetails.cut_score)} pontos
                                                </span>
                                            </div>
                                        )}

                                        <div className={styles.metricRow}>
                                            <span className={styles.metricLabel}>Turno</span>
                                            <span className={styles.metricValueSm}>{baseDetails.schedule}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.loading}>Carregando dados...</div>
                            )}
                        </div>

                        {/* RIGHT: Comparison Course */}
                        <div className={`${styles.courseCard} ${styles.compCard}`}>
                            <div className={styles.cardLabel}>Comparar com</div>
                            {compDetails ? (
                                <>
                                    <div className={styles.courseHeader}>
                                        <div className={styles.courseName}>{compDetails.name}</div>
                                        <div className={styles.courseUni}>{compDetails.university}</div>
                                        <div className={styles.courseMeta}>{compDetails.city} - {compDetails.state}</div>
                                    </div>

                                    <div className={styles.metricsContainer}>
                                        <div className={styles.metricRow}>
                                            <span className={styles.metricLabel}>Nota de Corte ({compDetails.cut_score_year})</span>
                                            <span className={`${styles.metricValue} ${
                                                compDetails.cut_score !== null
                                                && baseDetails?.cut_score !== null
                                                && baseDetails?.cut_score !== undefined
                                                && compDetails.cut_score < baseDetails.cut_score
                                                    ? styles.better
                                                    : ''
                                            }`}>
                                                {compDetails.cut_score === null ? 'Sem referência' : compDetails.cut_score.toFixed(2)}
                                                {baseDetails && baseDetails.cut_score !== null && compDetails.cut_score !== null && (
                                                    <small className={styles.diffValue}>
                                                        ({getDiff(compDetails.cut_score, baseDetails.cut_score)})
                                                    </small>
                                                )}
                                            </span>
                                        </div>

                                        {userScore > 0 && compDetails.cut_score !== null && compDetails.verification !== 'conflict' && (
                                            <div className={`${styles.metricRow} ${styles.userScoreRow}`}>
                                                <span className={styles.metricLabel}>Margem para a referência</span>
                                                <span className={`${styles.metricValue} ${userScore >= compDetails.cut_score ? styles.passing : styles.failing}`}>
                                                    {getDiff(userScore, compDetails.cut_score)} pontos
                                                </span>
                                            </div>
                                        )}

                                        <div className={styles.metricRow}>
                                            <span className={styles.metricLabel}>Turno</span>
                                            <span className={styles.metricValueSm}>{compDetails.schedule}</span>
                                        </div>
                                    </div>

                                    <button className={styles.changeButton} onClick={() => setCompDetails(null)}>
                                        🔄 Comparar outro
                                    </button>
                                </>
                            ) : (
                                <div className={styles.selectorContainer}>
                                    <p>Selecione um curso para comparar:</p>
                                    <div className={styles.selectGroup}>
                                        <select aria-label="Estado" value={compState} onChange={e => setCompState(e.target.value)}>
                                            <option value="">Estado</option>
                                            {(options.state as string[]).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select aria-label="Cidade" value={compCity} onChange={e => setCompCity(e.target.value)} disabled={!compState}>
                                            <option value="">Cidade</option>
                                            {(options.cities as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select aria-label="Universidade" value={compUni} onChange={e => setCompUni(e.target.value)} disabled={!compCity}>
                                            <option value="">Universidade</option>
                                            {(options.uni as string[]).map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                        <select aria-label="Curso" value={compCourseId} onChange={e => setCompCourseId(e.target.value)} disabled={!compUni}>
                                            <option value="">Curso</option>
                                            {(options.course as any[]).map(c => <option key={c.id} value={c.id}>{c.name} - {c.degree}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        className={styles.compareBtn}
                                        disabled={!compCourseId || loading}
                                        onClick={handleCompare}
                                    >
                                        {loading ? 'Carregando...' : 'Comparar Agora'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
