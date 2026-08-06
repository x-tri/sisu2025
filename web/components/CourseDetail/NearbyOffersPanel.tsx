'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useModality } from '../../context/ModalityContext';
import { useScores } from '../../context/ScoreContext';
import type { VerificationStatus } from '../../types/course';
import styles from './NearbyOffersPanel.module.css';

type CutScoreType = 'final' | 'partial';

interface RadarResult {
    courseId: number;
    name: string;
    university: string | null;
    campus: string | null;
    city: string | null;
    state: string | null;
    degree: string | null;
    schedule: string | null;
    edition: number;
    modalityId: string;
    modalityName: string;
    comparisonAvailable: boolean;
    cutScore?: number;
    cutScoreYear?: number;
    cutScoreType?: CutScoreType;
    partialDay?: number | null;
    capturedAt?: string | null;
    difference?: number;
    vacancies?: number;
    distance?: number | null;
    verification: VerificationStatus;
    sourceUrl: string;
    intermediary: string;
}

interface RadarReference {
    year: number;
    modalityName: string;
    cutScoreType: CutScoreType;
    partialDay: number | null;
    capturedAt: string | null;
    verification: VerificationStatus;
    sourceUrl: string;
    intermediary: string;
}

interface RadarResponse {
    mode?: 'comparison' | 'discovery';
    comparison?: {
        available: boolean;
        reason?: string;
    };
    results?: RadarResult[];
    reference?: RadarReference;
    error?: string;
}

interface NearbyOffersPanelProps {
    comparisonEnabled: boolean;
    courseName: string;
    referenceCourseId: number;
    modalityName: string;
    referenceCity?: string;
    referenceState?: string;
    onOpenFullRadar: () => void;
}

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
    verified: 'Verificado',
    unverified: 'Disponível na base XTRI',
    stale: 'Captura desatualizada',
    conflict: 'Divergente',
};

function formatScore(value: number): string {
    return value.toFixed(2).replace('.', ',');
}

function formatDifference(value: number): string {
    return `${value >= 0 ? '+' : '-'}${formatScore(Math.abs(value))}`;
}

function formatScoreType(type: CutScoreType, partialDay: number | null): string {
    if (type === 'partial') return partialDay ? `Parcial do ${partialDay}º dia` : 'Parcial';
    return 'Corte final';
}

function formatCapturedAt(value: string | null): string {
    if (!value) return 'captura não informada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'captura não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

export default function NearbyOffersPanel({
    comparisonEnabled,
    courseName,
    referenceCourseId,
    modalityName,
    referenceCity,
    referenceState,
    onOpenFullRadar,
}: NearbyOffersPanelProps) {
    const { scores } = useScores();
    const { selectedModality } = useModality();
    const [results, setResults] = useState<RadarResult[]>([]);
    const [reference, setReference] = useState<RadarReference | null>(null);
    const [mode, setMode] = useState<'comparison' | 'discovery' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterState, setFilterState] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const hasEnteredScores = useMemo(
        () => Object.values(scores).some(score => score > 0),
        [scores],
    );

    const fetchOffers = useCallback(async (signal: AbortSignal) => {
        setLoading(true);
        setError('');
        setResults([]);
        setReference(null);
        setMode(null);

        const timeoutController = new AbortController();
        const forwardAbort = () => timeoutController.abort();
        signal.addEventListener('abort', forwardAbort, { once: true });
        const timeout = window.setTimeout(() => timeoutController.abort(), 12_000);

        try {
            const response = await fetch('/api/simulate/radar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                signal: timeoutController.signal,
                body: JSON.stringify({
                    courseName,
                    modalityCode: selectedModality,
                    grades: hasEnteredScores ? scores : null,
                    referenceCourseId,
                    discoveryOnly: !comparisonEnabled || !hasEnteredScores,
                }),
            });
            const data = await response.json().catch(() => ({})) as RadarResponse;
            if (!response.ok) {
                throw new Error(data.error || 'Não foi possível consultar as ofertas comparáveis.');
            }
            if (!Array.isArray(data.results) || !data.reference || !data.mode) {
                throw new Error('A consulta retornou dados incompletos.');
            }

            if (!signal.aborted) {
                setResults(data.results);
                setReference(data.reference);
                setMode(data.mode);
            }
        } catch (requestError) {
            if (signal.aborted) return;
            if (requestError instanceof DOMException && requestError.name === 'AbortError') {
                setError('A consulta excedeu o tempo limite. Tente novamente.');
            } else {
                setError(requestError instanceof Error
                    ? requestError.message
                    : 'Não foi possível consultar as ofertas comparáveis.');
            }
        } finally {
            window.clearTimeout(timeout);
            signal.removeEventListener('abort', forwardAbort);
            if (!signal.aborted) setLoading(false);
        }
    }, [comparisonEnabled, courseName, hasEnteredScores, referenceCourseId, scores, selectedModality]);

    useEffect(() => {
        if (!selectedModality || !referenceCourseId) {
            setResults([]);
            setReference(null);
            setMode(null);
            setError('');
            setLoading(false);
            setFilterState('');
            return;
        }

        const controller = new AbortController();
        void fetchOffers(controller.signal);
        return () => controller.abort();
    }, [fetchOffers, referenceCourseId, reloadKey, selectedModality]);

    const states = useMemo(() => Array.from(new Set(
        results.map(result => result.state).filter((state): state is string => Boolean(state)),
    )).sort(), [results]);
    const filteredResults = filterState
        ? results.filter(result => result.state === filterState)
        : results;
    const aboveReferenceCount = filteredResults.filter(result => (
        result.comparisonAvailable
        && typeof result.difference === 'number'
        && result.difference >= 0
    )).length;

    if (loading) {
        return (
            <div className={styles.loadingState} role="status" aria-live="polite">
                <span className={styles.spinner} aria-hidden="true" />
                <div>
                    <strong>Buscando outras ofertas do mesmo curso…</strong>
                    <p>Mesma edição e modalidade oficial, sem aproximação por nome.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorState} role="alert">
                <div>
                    <h3>Não foi possível carregar as ofertas</h3>
                    <p>{error}</p>
                </div>
                <button type="button" onClick={() => setReloadKey(value => value + 1)}>
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <section className={styles.panel} aria-labelledby="nearby-offers-title">
            <div className={styles.heading}>
                <div>
                    <span className={styles.eyebrow}>
                        {mode === 'comparison' ? 'Comparação por edição' : 'Explorar instituições'}
                    </span>
                    <h3 id="nearby-offers-title">Outras ofertas de {courseName}</h3>
                    <p>
                        Mesma modalidade oficial{reference ? ` · edição ${reference.year}` : ''}
                        {referenceCity && referenceState ? ` · origem ${referenceCity}, ${referenceState}` : ''}.
                    </p>
                </div>
                {mode === 'comparison' && results.length > 0 && (
                    <button type="button" className={styles.fullRadarButton} onClick={onOpenFullRadar}>
                        Abrir Radar completo
                    </button>
                )}
            </div>

            {reference && (
                <div className={styles.referenceMetadata} aria-label="Metadados da comparação">
                    <span>Edição {reference.year}</span>
                    <span>{formatScoreType(reference.cutScoreType, reference.partialDay)}</span>
                    <span>{modalityName || reference.modalityName}</span>
                    <span>{VERIFICATION_LABELS[reference.verification]}</span>
                    {mode === 'comparison' && <span>Captura {formatCapturedAt(reference.capturedAt)}</span>}
                    <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Fonte SISU/MEC · processado pela {reference.intermediary}
                    </a>
                </div>
            )}

            {mode === 'discovery' && (
                <div className={styles.discoveryNotice} role="status">
                    <div>
                        <h4>Cortes disponíveis na base XTRI</h4>
                        <p>
                            As referências da mesma edição e modalidade aparecem abaixo. A margem personalizada
                            é exibida somente quando as cinco notas válidas e os pesos da edição estão disponíveis.
                        </p>
                    </div>
                    <a href="https://sisu.mec.gov.br/vagas" target="_blank" rel="noopener noreferrer">
                        Conferir no SISU/MEC
                    </a>
                </div>
            )}

            {results.length > 0 && (
                <div className={styles.filters}>
                    <div>
                        <label htmlFor="nearby-state-filter">Estado</label>
                        <select
                            id="nearby-state-filter"
                            value={filterState}
                            onChange={event => setFilterState(event.target.value)}
                        >
                            <option value="">Todos</option>
                            {states.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                    </div>
                    {mode === 'comparison' ? (
                        <p aria-live="polite">
                            <strong>{filteredResults.length}</strong> ofertas comparáveis ·{' '}
                            <strong>{aboveReferenceCount}</strong> ofertas acima da última referência
                        </p>
                    ) : (
                        <p aria-live="polite">
                            <strong>{filteredResults.length}</strong> outras ofertas do mesmo curso
                        </p>
                    )}
                </div>
            )}

            {filteredResults.length === 0 ? (
                <div className={styles.emptyState} role="status">
                    <h4>Nenhuma outra oferta comparável foi encontrada</h4>
                    <p>
                        A busca considerou somente o mesmo curso, edição e modalidade oficial. Nenhum curso
                        de nome parecido foi incluído.
                    </p>
                </div>
            ) : (
                <div className={styles.resultsGrid}>
                    {filteredResults.slice(0, 12).map(result => (
                        <article key={result.courseId} className={styles.resultCard}>
                            <div className={styles.cardHeading}>
                                <div>
                                    <h4>{result.name}</h4>
                                    <p>{[result.degree, result.schedule].filter(Boolean).join(' · ')}</p>
                                </div>
                                {result.distance !== null && result.distance !== undefined && (
                                    <span>{result.distance} km</span>
                                )}
                            </div>
                            <p className={styles.institution}>{result.university || 'Instituição não informada'}</p>
                            <p className={styles.location}>{[result.city, result.state].filter(Boolean).join(', ')}</p>
                            {typeof result.cutScore === 'number' && (
                                <dl className={styles.scoreGrid}>
                                    <div>
                                        <dt>Referência da oferta</dt>
                                        <dd>{formatScore(result.cutScore)}</dd>
                                    </div>
                                    {typeof result.difference === 'number' && (
                                        <div>
                                            <dt>Sua margem nesta oferta</dt>
                                            <dd className={result.difference >= 0 ? styles.positive : styles.negative}>
                                                {formatDifference(result.difference)} pts
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            )}
                            <div className={styles.cardMetadata}>
                                <span>Edição {result.edition}</span>
                                <span>{result.modalityName}</span>
                                <span>{VERIFICATION_LABELS[result.verification]}</span>
                                {result.cutScoreType && (
                                    <span>{formatScoreType(result.cutScoreType, result.partialDay ?? null)}</span>
                                )}
                                {result.capturedAt !== undefined && (
                                    <span>Captura {formatCapturedAt(result.capturedAt ?? null)}</span>
                                )}
                                {Boolean(result.vacancies && result.vacancies > 0) && (
                                    <span>{result.vacancies} vagas</span>
                                )}
                                <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">
                                    Fonte SISU/MEC · processado pela {result.intermediary}
                                </a>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
