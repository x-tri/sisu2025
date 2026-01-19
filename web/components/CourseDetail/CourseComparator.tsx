'use client';

import { useState, useEffect } from 'react';
import styles from './CourseComparator.module.css';
import { useModality, matchModality } from '../../context/ModalityContext';

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
    cut_score: number;
    cut_score_year: number;
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

    // Fetch Base Course Full Details on Open
    useEffect(() => {
        if (!isOpen || !baseCourse?.code) return;

        const fetchBaseDetails = async () => {
            try {
                const res = await fetch(`/api/courses/${baseCourse.code}`);
                const data = await res.json();

                // Find latest cut score (Ampla Concorrencia)
                let cutScore = 0;
                let year = 0;

                // Try to find the same year as the preview if possible, or latest
                const targetYear = baseCourse.cut_score_year || 2025;
                const yearGroup = data.cut_scores.find((y: any) => y.year === targetYear) || data.cut_scores[0];

                if (yearGroup) {
                    // Match selected modality or fallback
                    const matched = matchModality(selectedModality, yearGroup.modalities.map((m: any) => ({
                        ...m,
                        modality_name: m.name
                    })) as { modality_name: string; cut_score: number;[key: string]: any }[]);

                    if (matched) {
                        cutScore = matched.cut_score;
                        year = yearGroup.year;
                    }
                }

                setBaseDetails({
                    name: data.course.name,
                    university: data.course.university,
                    campus: data.course.campus,
                    city: data.course.city,
                    state: data.course.state,
                    degree: data.course.degree,
                    schedule: data.course.schedule,
                    cut_score: cutScore,
                    cut_score_year: year
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

            let cutScore = 0;
            let year = 0;
            // Get latest available
            const latest = data.cut_scores[0];
            if (latest) {
                // Match selected modality for the comparison course too
                const matched = matchModality(selectedModality, latest.modalities?.map((m: any) => ({
                    ...m,
                    modality_name: m.name
                })) as { modality_name: string; cut_score: number;[key: string]: any }[] || []);

                if (matched) {
                    cutScore = matched.cut_score;
                    year = latest.year;
                }
            }


            setCompDetails({
                name: data.course.name,
                university: data.course.university,
                campus: data.course.campus,
                city: data.course.city,
                state: data.course.state,
                degree: data.course.degree,
                schedule: data.course.schedule,
                cut_score: cutScore,
                cut_score_year: year
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
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.title}>⚖️ Comparador de Cursos</div>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
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
                                            <span className={styles.metricValue}>{(baseDetails.cut_score || 0).toFixed(2)}</span>
                                        </div>

                                        {userScore > 0 && (
                                            <div className={`${styles.metricRow} ${styles.userScoreRow}`}>
                                                <span className={styles.metricLabel}>Sua Chance</span>
                                                <span className={`${styles.metricValue} ${userScore >= baseDetails.cut_score ? styles.passing : styles.failing}`}>
                                                    {userScore >= baseDetails.cut_score ? 'APROVA' : 'REPROVA'}
                                                    <small>({getDiff(userScore, baseDetails.cut_score)})</small>
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
                                            <span className={`${styles.metricValue} ${compDetails.cut_score < (baseDetails?.cut_score || 0) ? styles.better : ''}`}>
                                                {(compDetails.cut_score || 0).toFixed(2)}
                                                {baseDetails && (
                                                    <small className={styles.diffValue}>
                                                        ({getDiff(compDetails.cut_score, baseDetails.cut_score)})
                                                    </small>
                                                )}
                                            </span>
                                        </div>

                                        {userScore > 0 && (
                                            <div className={`${styles.metricRow} ${styles.userScoreRow}`}>
                                                <span className={styles.metricLabel}>Sua Chance</span>
                                                <span className={`${styles.metricValue} ${userScore >= compDetails.cut_score ? styles.passing : styles.failing}`}>
                                                    {userScore >= compDetails.cut_score ? 'APROVA' : 'REPROVA'}
                                                    <small>({getDiff(userScore, compDetails.cut_score)})</small>
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
                                        <select value={compState} onChange={e => setCompState(e.target.value)}>
                                            <option value="">Estado</option>
                                            {(options.state as string[]).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={compCity} onChange={e => setCompCity(e.target.value)} disabled={!compState}>
                                            <option value="">Cidade</option>
                                            {(options.cities as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select value={compUni} onChange={e => setCompUni(e.target.value)} disabled={!compCity}>
                                            <option value="">Universidade</option>
                                            {(options.uni as string[]).map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                        <select value={compCourseId} onChange={e => setCompCourseId(e.target.value)} disabled={!compUni}>
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
