'use client';

import { useState, useEffect } from 'react';
import styles from './SearchFilters.module.css';
import { useScores } from '../context/ScoreContext';

interface Course {
    id: number;
    code: number;
    name: string;
    degree: string;
    campus?: string;
    schedule?: string;
}

interface CourseDetails {
    id: number;
    code: number;
    name: string;
    degree: string;
    university: string;
    campus: string;
    city: string;
    state: string;
    schedule: string;
    weights?: any;
    cut_score?: number;
    cut_score_year?: number;
    applicants?: number;
    partial_scores?: any[];
    highest_weight?: string;
}

interface SearchFiltersProps {
    onCourseSelect?: (courseCode: number) => void;
}

export default function SearchFilters({ onCourseSelect }: SearchFiltersProps) {
    const { calculateAverage, scores } = useScores();

    const [filters, setFilters] = useState({
        state: '',
        city: '',
        institution: '',
        course: '',
        modality: 'ampla'
    });

    const [options, setOptions] = useState({
        states: [] as string[],
        cities: [] as string[],
        institutions: [] as string[],
        courses: [] as Course[],
    });

    const [loading, setLoading] = useState({
        cities: false,
        institutions: false,
        courses: false,
        details: false
    });

    // Selected course details for the card
    const [selectedCourseDetails, setSelectedCourseDetails] = useState<CourseDetails | null>(null);

    // Fetch States on mount
    useEffect(() => {
        fetch('/api/filters?type=states')
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, states: data })))
            .catch(console.error);
    }, []);

    // Fetch Cities when State changes
    useEffect(() => {
        if (!filters.state) {
            setOptions(prev => ({ ...prev, cities: [], institutions: [], courses: [] }));
            setSelectedCourseDetails(null);
            return;
        }
        setLoading(prev => ({ ...prev, cities: true }));
        fetch(`/api/filters?type=cities&state=${filters.state}`)
            .then(res => res.json())
            .then(data => {
                setOptions(prev => ({ ...prev, cities: data, institutions: [], courses: [] }));
                setLoading(prev => ({ ...prev, cities: false }));
            });
    }, [filters.state]);

    // Fetch Universities when City changes
    useEffect(() => {
        if (!filters.city) {
            setOptions(prev => ({ ...prev, institutions: [], courses: [] }));
            setSelectedCourseDetails(null);
            return;
        }
        setLoading(prev => ({ ...prev, institutions: true }));
        fetch(`/api/filters?type=universities&state=${filters.state}&city=${filters.city}`)
            .then(res => res.json())
            .then(data => {
                setOptions(prev => ({ ...prev, institutions: data, courses: [] }));
                setLoading(prev => ({ ...prev, institutions: false }));
            });
    }, [filters.city]);

    // Fetch Courses when Institution changes
    useEffect(() => {
        if (!filters.institution) {
            setOptions(prev => ({ ...prev, courses: [] }));
            setSelectedCourseDetails(null);
            return;
        }
        setLoading(prev => ({ ...prev, courses: true }));
        fetch(`/api/filters?type=courses&state=${filters.state}&city=${filters.city}&university=${filters.institution}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setOptions(prev => ({ ...prev, courses: data }));
                } else {
                    console.error("Courses API returned non-array:", data);
                    setOptions(prev => ({ ...prev, courses: [] }));
                }
                setLoading(prev => ({ ...prev, courses: false }));
            })
            .catch(err => {
                console.error(err);
                setOptions(prev => ({ ...prev, courses: [] }));
                setLoading(prev => ({ ...prev, courses: false }));
            });
    }, [filters.institution]);

    // Fetch Course Details when Course is selected
    useEffect(() => {
        if (!filters.course) {
            setSelectedCourseDetails(null);
            return;
        }

        const selectedCourse = options.courses.find(c => String(c.id) === filters.course);
        if (!selectedCourse) return;

        setLoading(prev => ({ ...prev, details: true }));

        // Fetch full course details including weights and cut scores
        fetch(`/api/courses/${selectedCourse.code}`)
            .then(res => res.json())
            .then(data => {
                // API returns: { course: {...}, weights: {...}, cut_scores: [{year, modalities: [...]}], weights_history: [...] }
                const courseData = data.course;
                const weightsData = data.weights;

                // Find highest weight from the weights object
                let highestWeight = '';
                if (weightsData?.pesos) {
                    const weightMap: Record<string, string> = {
                        redacao: 'redação',
                        linguagens: 'linguagens',
                        matematica: 'matemática',
                        humanas: 'ciências humanas',
                        natureza: 'ciências da natureza'
                    };
                    let maxWeight = 0;
                    for (const [key, label] of Object.entries(weightMap)) {
                        const pesoKey = key as keyof typeof weightsData.pesos;
                        if (weightsData.pesos[pesoKey] > maxWeight) {
                            maxWeight = weightsData.pesos[pesoKey];
                            highestWeight = label;
                        }
                    }
                }

                // Find latest cut score for Ampla Concorrência from the grouped structure
                let latestCutScore = null;
                let latestYear = 0;

                if (data.cut_scores && Array.isArray(data.cut_scores)) {
                    // cut_scores is: [{year: 2024, modalities: [{code, name, cut_score, ...}]}]
                    for (const yearData of data.cut_scores) {
                        if (yearData.year >= latestYear && yearData.modalities) {
                            const ampla = yearData.modalities.find((m: any) =>
                                m.name?.toLowerCase().includes('ampla')
                            );
                            if (ampla && ampla.cut_score) {
                                latestCutScore = { ...ampla, year: yearData.year };
                                latestYear = yearData.year;
                            }
                        }
                    }
                }

                // Convert weights for calculateAverage function
                const weightsForCalc = weightsData?.pesos ? {
                    peso_red: weightsData.pesos.redacao || 1,
                    peso_ling: weightsData.pesos.linguagens || 1,
                    peso_mat: weightsData.pesos.matematica || 1,
                    peso_ch: weightsData.pesos.humanas || 1,
                    peso_cn: weightsData.pesos.natureza || 1
                } : null;

                setSelectedCourseDetails({
                    id: courseData?.id || 0,
                    code: courseData?.code || selectedCourse.code,
                    name: courseData?.name || selectedCourse.name,
                    degree: courseData?.degree || 'Bacharelado',
                    university: filters.institution,
                    campus: courseData?.campus || '',
                    city: filters.city,
                    state: filters.state,
                    schedule: courseData?.schedule || 'Integral',
                    weights: weightsForCalc,
                    cut_score: latestCutScore?.cut_score || 0,
                    cut_score_year: latestCutScore?.year || new Date().getFullYear(),
                    applicants: latestCutScore?.applicants,
                    partial_scores: [],
                    highest_weight: highestWeight
                });
                setLoading(prev => ({ ...prev, details: false }));
            })
            .catch(err => {
                console.error('Error fetching course details:', err);
                setLoading(prev => ({ ...prev, details: false }));
            });
    }, [filters.course, options.courses, filters.institution, filters.city, filters.state]);

    const handleSearch = () => {
        if (selectedCourseDetails) {
            if (onCourseSelect) {
                onCourseSelect(selectedCourseDetails.code);
            } else {
                window.location.href = `/courses/${selectedCourseDetails.code}`;
            }
        }
    };

    // Calculate user's weighted average for the selected course
    const userAverage = selectedCourseDetails?.weights
        ? calculateAverage(selectedCourseDetails.weights)
        : 0;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Encontre seu curso</h2>

            <div className={styles.grid}>
                <div className={styles.selectGroup}>
                    <label className={styles.label}>Estado</label>
                    <select
                        className={styles.select}
                        value={filters.state}
                        onChange={(e) => setFilters({ ...filters, state: e.target.value, city: '', institution: '', course: '' })}
                    >
                        <option value="">Selecione o estado</option>
                        {options.states.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.selectGroup}>
                    <label className={styles.label}>Cidade</label>
                    <select
                        className={styles.select}
                        value={filters.city}
                        disabled={!filters.state}
                        onChange={(e) => setFilters({ ...filters, city: e.target.value, institution: '', course: '' })}
                    >
                        <option value="">{loading.cities ? 'Carregando...' : 'Selecione a cidade'}</option>
                        {options.cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.selectGroup}>
                    <label className={styles.label}>Instituição</label>
                    <select
                        className={styles.select}
                        value={filters.institution}
                        disabled={!filters.city}
                        onChange={(e) => setFilters({ ...filters, institution: e.target.value, course: '' })}
                    >
                        <option value="">{loading.institutions ? 'Carregando...' : 'Selecione a universidade'}</option>
                        {options.institutions.map(inst => (
                            <option key={inst} value={inst}>{inst}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.selectGroup}>
                    <label className={styles.label}>Curso</label>
                    <select
                        className={styles.select}
                        value={filters.course}
                        disabled={!filters.institution}
                        onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                    >
                        <option value="">{loading.courses ? 'Carregando...' : 'Selecione o curso'}</option>
                        {options.courses.map(course => (
                            <option key={course.id} value={course.id}>{course.name} - {course.degree}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.modalitySection}>
                <div className={styles.selectGroup} style={{ minWidth: '300px' }}>
                    <label className={styles.label}>Modalidade de Concorrência</label>
                    <select
                        className={styles.select}
                        value={filters.modality}
                        onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
                    >
                        <option value="ampla">Ampla Concorrência</option>
                        <option value="cota_ep">Escola Pública (L1/L2...)</option>
                        <option value="cota_ppi">Pretos, Pardos e Indígenas</option>
                        <option value="cota_pcd">Pessoas com Deficiência</option>
                    </select>
                </div>
            </div>

            {/* Course Preview Card - MeuSISU Style */}
            {selectedCourseDetails && !loading.details && (
                <div className={styles.coursePreview}>
                    <div className={styles.previewHeader}>
                        <h3 className={styles.previewCourseName}>
                            {selectedCourseDetails.name}
                            <span className={styles.previewDegree}>{selectedCourseDetails.degree}</span>
                        </h3>
                    </div>

                    <div className={styles.previewDetails}>
                        <div className={styles.previewRow}>
                            <span className={styles.previewIcon}>🏛️</span>
                            <span>{selectedCourseDetails.university}</span>
                        </div>
                        {selectedCourseDetails.campus && (
                            <div className={styles.previewRow}>
                                <span className={styles.previewIcon}>📍</span>
                                <span>{selectedCourseDetails.campus}</span>
                            </div>
                        )}
                        <div className={styles.previewRow}>
                            <span className={styles.previewIcon}>⏰</span>
                            <span>{selectedCourseDetails.schedule}</span>
                        </div>
                        {selectedCourseDetails.highest_weight && (
                            <div className={styles.previewRow}>
                                <span className={styles.previewIcon}>⚖️</span>
                                <span>Maior peso para {selectedCourseDetails.highest_weight}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.previewScores}>
                        <div className={styles.cutScoreRow}>
                            <span className={styles.cutScoreIcon}>⭐</span>
                            <span className={styles.cutScoreText}>
                                Nota de corte ({selectedCourseDetails.cut_score_year}/1 - AMPLA):{' '}
                                <strong>{selectedCourseDetails.cut_score?.toFixed(2).replace('.', ',') || '0,00'}</strong>
                            </span>
                        </div>
                        <div className={styles.userScoreRow}>
                            <span className={styles.userScoreIcon}>📊</span>
                            <span className={styles.userScoreText}>
                                Sua nota ponderada nesse curso seria:{' '}
                                <strong style={{ color: userAverage >= (selectedCourseDetails.cut_score || 0) ? '#16a34a' : '#dc2626' }}>
                                    {userAverage.toFixed(2).replace('.', ',')}
                                </strong>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {loading.details && filters.course && (
                <div className={styles.loadingPreview}>
                    Carregando informações do curso...
                </div>
            )}

            <button className={styles.searchButton} onClick={handleSearch} disabled={!filters.course}>
                Visualizar Detalhes
            </button>
        </div>
    );
}
