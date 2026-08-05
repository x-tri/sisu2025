'use client';

import { useState, type KeyboardEvent } from 'react';
import styles from './CourseDetail.module.css';
import CourseHeader from './Header';
import WeightsTable from './WeightsTable';
import { ApprovedList } from './ApprovedList';
import DataTrustPanel from '../DataTrustPanel';
import { useScores } from '../../context/ScoreContext';
import { useModality } from '../../context/ModalityContext';
import { calculateWeightedScore } from '../../lib/score-core';

interface CourseDetailViewProps {
    course: any;
}

export default function CourseDetailView({ course }: CourseDetailViewProps) {
    const { scores } = useScores();
    const { selectedModality, getModalityLabel } = useModality();
    const [activeTab, setActiveTab] = useState('info');
    const tabOrder = ['info', 'list'];
    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const currentIndex = tabOrder.indexOf(activeTab);
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? tabOrder.length - 1
                : event.key === 'ArrowRight'
                    ? (currentIndex + 1) % tabOrder.length
                    : (currentIndex - 1 + tabOrder.length) % tabOrder.length;
        const nextTab = tabOrder[nextIndex];
        setActiveTab(nextTab);
        window.requestAnimationFrame(() => document.getElementById('course-tab-' + nextTab)?.focus());
    };

    // Extract latest weights (e.g., 2025 or latest available)
    const orderedScores = [...course.cut_scores].sort((a: any, b: any) => b.year - a.year);

    // Get latest cut score for comparison based on SELECTED MODALITY
    // We treat 'course.cut_scores' as a flat list logic or year-grouped logic?
    // Based on previous file content, 'course.cut_scores' seems to be the array of year data?
    // Wait, the previous code was: course.cut_scores.filter(cs => cs.modality_name...includes('ampla'))
    // This implies 'course.cut_scores' IS NOT grouped by year, but flat?
    // Let's re-read the audit or previous code. 
    // In page.tsx: data.cut_scores is [{year, modalities: [...]}]
    // In CourseDetailView, checking line 28: course.cut_scores.filter(...).sort(...).
    // If it filters by modality name directly, then course.cut_scores must be flat OR the previous code was wrong/different.
    // Let's assume the passed 'course' prop has the structure from 'page.tsx' transformation?
    // In page.tsx, we transform it: transformed.cut_scores.push({ year, modality_name, ... })
    // So 'course.cut_scores' IS FLATTENED in page.tsx! Yes.

    const latestCutScore = orderedScores.find((cs: any) => (
        selectedModality && String(cs.modality_code ?? '') === selectedModality
    ));
    const latestWeights = latestCutScore
        ? course.weights.find((weights: any) => weights.year === latestCutScore.year)
        : null;
    const scoreResult = calculateWeightedScore(scores, latestWeights);
    const userAverage = scoreResult.average;

    // If cut_score is null but we have partial scores, use the LAST partial score
    // This happens when SISU is still in progress (2025)
    const partialScores = [...(latestCutScore?.partial_scores || [])]
        .sort((left: any, right: any) => Number(left.day) - Number(right.day));
    let cutScoreValue = typeof latestCutScore?.cut_score === 'number'
        ? latestCutScore.cut_score
        : null;

    if (cutScoreValue === null && partialScores.length > 0) {
        const lastPartial = partialScores[partialScores.length - 1];
        cutScoreValue = typeof lastPartial?.score === 'number' ? lastPartial.score : null;
    }

    const comparisonAllowed = latestCutScore?.verification === 'verified'
        && userAverage !== null
        && cutScoreValue !== null
        && scoreResult.minimums.status !== 'failed'
        && scoreResult.minimums.status !== 'not_evaluated';
    const diff = comparisonAllowed ? userAverage - cutScoreValue : null;

    // Vacancies, applicants from the cut score data
    const vacancies = latestCutScore?.vacancies ?? null;
    const applicants = latestCutScore?.applicants ?? null;
    const reference = latestCutScore?.reference ?? null;

    return (
        <div style={{ paddingBottom: '4rem' }}>
            <CourseHeader course={course} />

            <div className="container">
                {/* Score Simulation Banner - MeuSISU Style */}
                <div style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem' }}>
                        Sua Simulação
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                Sua média ponderada
                            </span>
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
                                {userAverage === null ? 'Indisponível' : userAverage.toFixed(2).replace('.', ',')}
                            </span>
                        </div>

                        {latestCutScore && cutScoreValue !== null && cutScoreValue > 0 && (
                            <div>
                                <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    Nota de corte ({latestCutScore.year} - {getModalityLabel()})
                                </span>
                                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
                                    {cutScoreValue.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        )}

                        {comparisonAllowed && diff !== null && (
                        <div>
                            <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                Margem para a referência
                            </span>
                            <span style={{
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                color: diff >= 0 ? '#047857' : '#b45309',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {diff >= 0 ? 'Acima' : 'Abaixo'} por {Math.abs(diff).toFixed(2).replace('.', ',')} pontos
                            </span>
                        </div>
                        )}
                        {latestCutScore && !comparisonAllowed && (
                            <div>
                                <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    Margem para a referência
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#92400e' }}>
                                    Suspensa até verificação oficial e validação dos pesos e mínimos
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Informações da Modalidade - MeuSISU Style */}
                    {latestCutScore && (
                        <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid #e5e7eb',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: '1rem'
                        }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>Vagas</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151' }}>
                                    {vacancies ?? 'Não informado'}
                                </span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>Inscritos</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151' }}>
                                    {applicants ?? 'Não informado'}
                                </span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>Bônus</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151' }}>Não informado</span>
                            </div>
                        </div>
                    )}

                    {/* Notas Parciais - MeuSISU Style */}
                    {partialScores.length > 0 && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
                                Notas parciais:
                            </h4>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {partialScores.map((ps: any, idx: number) => (
                                    <div key={idx} style={{
                                        background: '#f3f4f6',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        textAlign: 'center',
                                        minWidth: '80px'
                                    }}>
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>
                                            {ps.day}º dia
                                        </span>
                                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                                            {ps.score > 0 ? ps.score.toFixed(2).replace('.', ',') : '-'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {reference && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <DataTrustPanel
                                status={reference.verification.status}
                                edition={reference.edition}
                                modalityName={reference.modalityOfficialName}
                                referenceType={reference.referenceType}
                                capturedAt={reference.capturedAt}
                                checkedAt={reference.verification.checkedAt}
                                sourceUrl={reference.sourceUrl}
                                intermediary={reference.intermediary}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.tabs} role="tablist" aria-label="Detalhes do curso">
                    <button
                        id="course-tab-info"
                        role="tab"
                        aria-selected={activeTab === 'info'}
                        aria-controls="course-panel-info"
                        tabIndex={activeTab === 'info' ? 0 : -1}
                        onKeyDown={handleTabKeyDown}
                        className={`${styles.tab} ${activeTab === 'info' ? styles.active : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Informações
                    </button>
                    <button
                        id="course-tab-list"
                        role="tab"
                        aria-selected={activeTab === 'list'}
                        aria-controls="course-panel-list"
                        tabIndex={activeTab === 'list' ? 0 : -1}
                        onKeyDown={handleTabKeyDown}
                        className={`${styles.tab} ${activeTab === 'list' ? styles.active : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        Lista da chamada
                    </button>
                </div>

                {activeTab === 'info' && (
                    <div id="course-panel-info" role="tabpanel" aria-labelledby="course-tab-info" className="animate-in fade-in">
                        <WeightsTable weights={latestWeights} />
                    </div>
                )}

                {activeTab === 'list' && (
                    <div id="course-panel-list" role="tabpanel" aria-labelledby="course-tab-list" className="animate-in fade-in">
                        <ApprovedList
                            courseCode={course.code}
                            cutScore={cutScoreValue ?? 0}
                            vacancies={vacancies}
                            year={latestCutScore?.year ?? new Date().getFullYear()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
