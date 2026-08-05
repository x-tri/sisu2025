'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ApprovalRadar.module.css';
import { useScores } from '../../context/ScoreContext';
import { useModality } from '../../context/ModalityContext';

type CutScoreType = 'final' | 'partial';

interface RadarResult {
    courseId: number;
    courseCode: number;
    name: string;
    university: string | null;
    campus: string | null;
    city: string | null;
    state: string | null;
    degree: string | null;
    schedule: string | null;
    userScore: number;
    cutScore: number;
    cutScoreYear: number;
    cutScoreType: CutScoreType;
    partialDay: number | null;
    capturedAt: string | null;
    margin: number;
    difference: number;
    modalityName: string;
    vacancies?: number;
    distance?: number | null;
    verification: 'verified';
    sourceUrl: string;
    intermediary: string;
}

interface RadarReference {
    courseId: number;
    courseName: string;
    year: number;
    modalityCode: string;
    modalityName: string;
    cutScoreType: CutScoreType;
    partialDay: number | null;
    capturedAt: string | null;
    verification: 'verified';
    sourceUrl: string;
    intermediary: string;
}

interface RadarResponse {
    results?: RadarResult[];
    reference?: RadarReference;
    error?: string;
}

interface ApprovalRadarProps {
    isOpen: boolean;
    onClose: () => void;
    baseCourseName: string;
    referenceCourseId?: number;
    referenceCity?: string;
    referenceState?: string;
    modalityName?: string;
}

function formatDifference(diff: number): string {
    const formatted = Math.abs(diff).toFixed(2).replace('.', ',');
    return `${diff >= 0 ? '+' : '-'}${formatted}`;
}

function formatScoreType(type: CutScoreType, partialDay: number | null): string {
    if (type === 'partial') {
        return partialDay ? `Parcial do ${partialDay}º dia` : 'Parcial';
    }
    return 'Corte final';
}

function formatCapturedAt(value: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

export default function ApprovalRadarModal({
    isOpen,
    onClose,
    baseCourseName,
    referenceCourseId,
    referenceCity,
    referenceState,
    modalityName,
}: ApprovalRadarProps) {
    const { scores } = useScores();
    const { selectedModality, getModalityLabel } = useModality();
    const [results, setResults] = useState<RadarResult[]>([]);
    const [reference, setReference] = useState<RadarReference | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterState, setFilterState] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const fetchResults = useCallback(async (signal: AbortSignal) => {
        setLoading(true);
        setError(null);
        setResults([]);
        setReference(null);
        setFilterState('');

        try {
            const response = await fetch('/api/simulate/radar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                signal,
                body: JSON.stringify({
                    courseName: baseCourseName,
                    modalityCode: selectedModality,
                    grades: scores,
                    referenceCourseId,
                }),
            });
            const data = await response.json() as RadarResponse;

            if (!response.ok) {
                throw new Error(data.error || 'Não foi possível consultar as ofertas.');
            }
            if (!Array.isArray(data.results) || !data.reference) {
                throw new Error('O Radar recebeu uma resposta incompleta.');
            }

            if (!signal.aborted) {
                setResults(data.results);
                setReference(data.reference);
            }
        } catch (requestError) {
            if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
            console.error(requestError);
            if (!signal.aborted) {
                setResults([]);
                setReference(null);
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : 'Não foi possível consultar as ofertas.',
                );
            }
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [baseCourseName, referenceCourseId, scores, selectedModality]);

    useEffect(() => {
        if (!isOpen || !baseCourseName || !referenceCourseId) {
            setResults([]);
            setReference(null);
            setError(null);
            setFilterState('');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        void fetchResults(controller.signal);
        return () => controller.abort();
    }, [fetchResults, isOpen, baseCourseName, referenceCourseId, reloadKey]);

    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !modalRef.current) return;

            const focusable = Array.from(
                modalRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((element) => !element.hasAttribute('hidden'));
            if (focusable.length === 0) {
                event.preventDefault();
                modalRef.current.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredResults = filterState
        ? results.filter((result) => result.state === filterState)
        : results;
    const displayResults = filteredResults.slice(0, 100);
    const uniqueStates = Array.from(
        new Set(results.map((result) => result.state).filter((state): state is string => Boolean(state))),
    ).sort();
    const aboveReferenceCount = filteredResults.filter((result) => result.difference >= 0).length;
    const referenceCapturedAt = reference ? formatCapturedAt(reference.capturedAt) : null;

    return (
        <div
            className={styles.overlay}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={modalRef}
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="approval-radar-title"
                aria-describedby="approval-radar-description"
                aria-busy={loading}
                tabIndex={-1}
            >
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 id="approval-radar-title">🔍 Radar de ofertas — {baseCourseName}</h2>
                        <p id="approval-radar-description">
                            Mesmo curso e mesma modalidade
                            {referenceCity && referenceState && (
                                <> a partir de <strong>{referenceCity}, {referenceState}</strong></>
                            )}
                            {' '}• <strong>{modalityName || getModalityLabel()}</strong>
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Fechar Radar de ofertas"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading} role="status" aria-live="polite">
                            <div className={styles.spinner} aria-hidden="true" />
                            <p>Comparando ofertas da mesma edição e modalidade...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState} role="alert">
                            <p>{error}</p>
                            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                                Tentar novamente
                            </button>
                        </div>
                    ) : (
                        <>
                            {reference && (
                                <div className={styles.referenceMetadata} aria-label="Metadados da referência">
                                    <span>Edição {reference.year}</span>
                                    <span>{formatScoreType(reference.cutScoreType, reference.partialDay)}</span>
                                    <span>{modalityName || getModalityLabel()}</span>
                                    <span>Verificado</span>
                                    <span>
                                        {referenceCapturedAt ? (
                                            <>
                                                Captura{' '}
                                                <time dateTime={reference.capturedAt || undefined}>
                                                    {referenceCapturedAt}
                                                </time>
                                            </>
                                        ) : 'Captura não informada'}
                                    </span>
                                    <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">
                                        SISU/MEC via {reference.intermediary}
                                    </a>
                                </div>
                            )}

                            <div className={styles.filters}>
                                <label htmlFor="radar-state-filter">Filtrar por estado</label>
                                <select
                                    id="radar-state-filter"
                                    className={styles.filterSelect}
                                    value={filterState}
                                    onChange={(event) => setFilterState(event.target.value)}
                                >
                                    <option value="">Todos os estados</option>
                                    {uniqueStates.map((state) => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>

                                <span className={styles.resultsSummary} aria-live="polite">
                                    {filteredResults.length} ofertas encontradas •{' '}
                                    {aboveReferenceCount} ofertas acima da referência
                                </span>
                            </div>

                            {displayResults.length === 0 ? (
                                <div className={styles.emptyState} role="status">
                                    <p>Nenhuma outra oferta foi encontrada para a mesma edição e modalidade.</p>
                                    <p>Altere o estado ou consulte outra modalidade.</p>
                                </div>
                            ) : (
                                <div className={styles.resultsGrid}>
                                    {displayResults.map((result) => {
                                        const isAboveReference = result.difference >= 0;
                                        const capturedAt = formatCapturedAt(result.capturedAt);
                                        return (
                                            <article key={result.courseId} className={styles.resultCard}>
                                                {result.distance !== null && result.distance !== undefined && (
                                                    <div className={styles.distanceBadge}>
                                                        Distância aproximada: {result.distance} km
                                                    </div>
                                                )}

                                                <div className={styles.cardHeader}>
                                                    <div>
                                                        <div className={styles.courseName}>{result.name}</div>
                                                        <div className={styles.courseDetails}>
                                                            {[result.degree, result.schedule].filter(Boolean).join(' — ')}
                                                        </div>
                                                        <div className={styles.universityName}>🏛️ {result.university}</div>
                                                        <div className={styles.universityLocation}>
                                                            📍 {[result.city, result.state].filter(Boolean).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={styles.cutScoreHighlight}>
                                                    <span>Referência de corte:</span>
                                                    <strong>{result.cutScore.toFixed(2).replace('.', ',')}</strong>
                                                </div>

                                                <div className={styles.cardMetadata}>
                                                    <span>Edição {result.cutScoreYear}</span>
                                                    <span>{formatScoreType(result.cutScoreType, result.partialDay)}</span>
                                                    <span>
                                                        {capturedAt ? (
                                                            <>
                                                                Captura{' '}
                                                                <time dateTime={result.capturedAt || undefined}>
                                                                    {capturedAt}
                                                                </time>
                                                            </>
                                                        ) : 'Captura não informada'}
                                                    </span>
                                                    <span>Verificado</span>
                                                    <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">
                                                        SISU/MEC via {result.intermediary}
                                                    </a>
                                                </div>

                                                <div className={styles.differenceRow}>
                                                    <span>Diferença para a referência:</span>
                                                    <span className={isAboveReference ? styles.diffPositive : styles.diffNegative}>
                                                        {formatDifference(result.difference)}
                                                    </span>
                                                </div>

                                                {Boolean(result.vacancies && result.vacancies > 0) && (
                                                    <div className={styles.vacanciesInfo}>
                                                        {result.vacancies} vagas informadas
                                                    </div>
                                                )}
                                            </article>
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
