'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import styles from './CourseDetail.module.css';
import CourseHeader from './Header';
import WeightsTable from './WeightsTable';
import DataTrustPanel from '../DataTrustPanel';
import { useScores } from '../../context/ScoreContext';
import { useModality } from '../../context/ModalityContext';
import { calculateWeightedScore, type CourseWeights } from '../../lib/score-core';
import type { CourseReference, ReferenceType, VerificationStatus } from '../../types/course';

interface CourseDetailViewProps {
    course: {
        id: number;
        code: number;
        name: string;
        university: string;
        campus: string;
        city: string;
        state: string;
        degree: string;
        schedule: string;
        weights: Array<Record<string, number | null>>;
        cut_scores: Array<Record<string, unknown>>;
    };
}

interface DetailWeights extends CourseWeights {
    year: number;
    peso_red: number | null;
    peso_ling: number | null;
    peso_mat: number | null;
    peso_ch: number | null;
    peso_cn: number | null;
    min_red: number | null;
    min_ling: number | null;
    min_mat: number | null;
    min_ch: number | null;
    min_cn: number | null;
    min_enem: number | null;
}

interface DetailPartialScore {
    day: string | number;
    score: number;
}

interface DetailCutScore {
    year: number;
    modalityCode: string;
    modalityName: string;
    cutoff: number | null;
    applicants: number | null;
    vacancies: number | null;
    partialScores: DetailPartialScore[];
    verification: VerificationStatus;
    reference: CourseReference | null;
}

type DetailTab = 'years' | 'statistics' | 'trust';

const TAB_ORDER: DetailTab[] = ['years', 'statistics', 'trust'];

const TAB_LABELS: Record<DetailTab, string> = {
    years: 'Informações por ano',
    statistics: 'Estatísticas',
    trust: 'Confiabilidade',
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
    verified: 'Verificada',
    unverified: 'Na base XTRI',
    stale: 'Histórica',
    conflict: 'Divergente',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validScore(value: unknown): number | null {
    return typeof value === 'number'
        && Number.isFinite(value)
        && value >= 0
        && value <= 1000
        ? value
        : null;
}

function nonNegativeNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function verificationStatus(value: unknown): VerificationStatus {
    return value === 'verified'
        || value === 'unverified'
        || value === 'stale'
        || value === 'conflict'
        ? value
        : 'stale';
}

function normalizeWeights(records: Array<Record<string, number | null>>): DetailWeights[] {
    return records.flatMap(record => {
        const year = record.year;
        if (typeof year !== 'number' || !Number.isInteger(year)) return [];

        return [{
            year,
            peso_red: record.peso_red ?? null,
            peso_ling: record.peso_ling ?? null,
            peso_mat: record.peso_mat ?? null,
            peso_ch: record.peso_ch ?? null,
            peso_cn: record.peso_cn ?? null,
            min_red: record.min_red ?? null,
            min_ling: record.min_ling ?? null,
            min_mat: record.min_mat ?? null,
            min_ch: record.min_ch ?? null,
            min_cn: record.min_cn ?? null,
            min_enem: record.min_enem ?? null,
        }];
    });
}

function normalizePartialScores(value: unknown): DetailPartialScore[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap(item => {
        if (!isRecord(item)) return [];
        const score = validScore(item.score);
        const day = item.day;
        if (score === null || (typeof day !== 'string' && typeof day !== 'number')) return [];
        return [{ day, score }];
    }).sort((left, right) => Number(left.day) - Number(right.day));
}

function normalizeReference(value: unknown): CourseReference | null {
    if (!isRecord(value)) return null;
    if (
        typeof value.edition !== 'number'
        || typeof value.modalityId !== 'string'
        || typeof value.modalityOfficialName !== 'string'
        || typeof value.sourceUrl !== 'string'
        || !isRecord(value.verification)
    ) return null;

    return value as unknown as CourseReference;
}

function normalizeCutScores(records: Array<Record<string, unknown>>): DetailCutScore[] {
    return records.flatMap(record => {
        const year = record.year;
        const modalityCode = record.modality_code;
        if (
            typeof year !== 'number'
            || !Number.isInteger(year)
            || (typeof modalityCode !== 'number' && typeof modalityCode !== 'string')
        ) return [];

        const reference = normalizeReference(record.reference);
        return [{
            year,
            modalityCode: String(modalityCode),
            modalityName: typeof record.modality_name === 'string'
                ? record.modality_name
                : reference?.modalityOfficialName || 'Modalidade não informada',
            cutoff: validScore(record.cut_score),
            applicants: nonNegativeNumber(record.applicants),
            vacancies: nonNegativeNumber(record.vacancies),
            partialScores: normalizePartialScores(record.partial_scores),
            verification: verificationStatus(record.verification),
            reference,
        }];
    });
}

function formatScore(value: number | null): string {
    return value === null ? 'Não informada' : value.toFixed(2).replace('.', ',');
}

function formatCount(value: number | null): string {
    return value === null ? 'Não informado' : value.toLocaleString('pt-BR');
}

function formatDate(value?: string | null): string {
    if (!value) return 'Não informada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Fortaleza',
    }).format(date);
}

function referenceTypeLabel(value?: ReferenceType): string {
    if (value === 'final') return 'Final';
    if (value === 'partial') return 'Parcial';
    if (value === 'historical') return 'Histórica';
    return 'Não identificada';
}

function effectiveCutoff(score: DetailCutScore | undefined): number | null {
    if (!score) return null;
    if (score.cutoff !== null) return score.cutoff;
    return score.partialScores[score.partialScores.length - 1]?.score ?? null;
}

export default function CourseDetailView({ course }: CourseDetailViewProps) {
    const { scores, hasScores } = useScores();
    const { selectedModality } = useModality();
    const [activeTab, setActiveTab] = useState<DetailTab>('years');
    const tabId = useId().replace(/:/g, '');

    const weightsHistory = useMemo(() => normalizeWeights(course.weights), [course.weights]);
    const modalityScores = useMemo(() => (
        normalizeCutScores(course.cut_scores)
            .filter(score => selectedModality && score.modalityCode === selectedModality)
            .sort((left, right) => right.year - left.year)
    ), [course.cut_scores, selectedModality]);

    const latestCutScore = modalityScores[0];
    const latestWeights = latestCutScore
        && latestCutScore.reference?.weightsEdition === latestCutScore.year
        ? weightsHistory.find(weights => weights.year === latestCutScore.year) ?? null
        : null;
    const referenceValue = effectiveCutoff(latestCutScore);
    const scoreResult = calculateWeightedScore(scores, latestWeights);
    const userAverage = hasScores ? scoreResult.average : null;
    const comparisonAllowed = latestCutScore?.verification !== 'conflict'
        && userAverage !== null
        && referenceValue !== null
        && scoreResult.minimums.status !== 'failed'
        && scoreResult.minimums.status !== 'not_evaluated';
    const margin = comparisonAllowed && userAverage !== null && referenceValue !== null
        ? userAverage - referenceValue
        : null;
    const reference = latestCutScore?.reference ?? null;
    const availableEditions = modalityScores.filter(score => effectiveCutoff(score) !== null).length;
    const latestDailyVariation = latestCutScore && latestCutScore.partialScores.length >= 2
        ? latestCutScore.partialScores[latestCutScore.partialScores.length - 1].score
            - latestCutScore.partialScores[latestCutScore.partialScores.length - 2].score
        : null;

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const currentIndex = TAB_ORDER.indexOf(activeTab);
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? TAB_ORDER.length - 1
                : event.key === 'ArrowRight'
                    ? (currentIndex + 1) % TAB_ORDER.length
                    : (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
        const nextTab = TAB_ORDER[nextIndex];
        setActiveTab(nextTab);
        window.requestAnimationFrame(() => {
            document.getElementById(`${tabId}-tab-${nextTab}`)?.focus();
        });
    };

    if (!selectedModality) {
        return (
            <div className={styles.detailRoot}>
                <CourseHeader course={course} />
                <div className={styles.detailContainer}>
                    <div className={styles.emptyState} role="status">
                        Confirme uma modalidade oficial para consultar os detalhes desta oferta.
                    </div>
                </div>
            </div>
        );
    }

    if (!latestCutScore) {
        return (
            <div className={styles.detailRoot}>
                <CourseHeader course={course} />
                <div className={styles.detailContainer}>
                    <div className={styles.emptyState} role="status">
                        Não há referência para a modalidade oficial selecionada. Nenhum valor de outra
                        modalidade foi utilizado.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.detailRoot}>
            <CourseHeader course={course} />

            <div className={styles.detailContainer}>
                <section className={styles.simulationCard} aria-labelledby={`${tabId}-simulation-title`}>
                    <div className={styles.simulationHeading}>
                        <div>
                            <span className={styles.eyebrow}>Simulação da oferta</span>
                            <h3 id={`${tabId}-simulation-title`}>Sua comparação</h3>
                        </div>
                        <span className={`${styles.verificationPill} ${styles[latestCutScore.verification]}`}>
                            {VERIFICATION_LABELS[latestCutScore.verification]}
                        </span>
                    </div>

                    <p className={styles.modalityName}>{latestCutScore.modalityName}</p>

                    <div className={styles.scoreGrid}>
                        <div className={styles.scoreMetric}>
                            <span>Sua nota ponderada</span>
                            <strong className={styles.primaryScore}>
                                {userAverage === null ? 'Indisponível' : formatScore(userAverage)}
                            </strong>
                            <small>
                                {latestWeights
                                    ? `Pesos da edição ${latestWeights.year}`
                                    : 'Pesos da mesma edição indisponíveis'}
                            </small>
                        </div>
                        <div className={styles.scoreMetric}>
                            <span>Última referência</span>
                            <strong>{formatScore(referenceValue)}</strong>
                            <small>
                                {referenceTypeLabel(reference?.referenceType)} · edição {latestCutScore.year}
                            </small>
                        </div>
                        <div className={styles.scoreMetric}>
                            <span>Diferença para a referência</span>
                            <strong className={margin === null ? styles.suspendedScore : styles.marginScore}>
                                {margin === null
                                    ? 'Indisponível'
                                    : `${margin > 0 ? '+' : ''}${formatScore(margin)}`}
                            </strong>
                            <small>
                                {margin === null
                                    ? 'Informe notas válidas e use dados completos da mesma edição'
                                    : margin >= 0
                                        ? 'pontos acima da última referência'
                                        : 'pontos abaixo da última referência'}
                            </small>
                        </div>
                    </div>

                    {!comparisonAllowed && (
                        <p className={styles.comparisonNotice}>
                            A nota de corte continua disponível. A diferença só é calculada com notas válidas,
                            pesos e mínimos da mesma edição e sem divergência de dados.
                        </p>
                    )}

                    <dl className={styles.offerFacts}>
                        <div>
                            <dt>Vagas</dt>
                            <dd>{formatCount(latestCutScore.vacancies)}</dd>
                        </div>
                        <div>
                            <dt>Inscritos</dt>
                            <dd>{formatCount(latestCutScore.applicants)}</dd>
                        </div>
                        <div>
                            <dt>Modalidade</dt>
                            <dd>Código {latestCutScore.modalityCode}</dd>
                        </div>
                        <div>
                            <dt>Atualização</dt>
                            <dd>{formatDate(reference?.capturedAt)}</dd>
                        </div>
                    </dl>
                </section>

                <div className={styles.tabs} role="tablist" aria-label="Detalhes da oferta">
                    {TAB_ORDER.map(tab => (
                        <button
                            key={tab}
                            id={`${tabId}-tab-${tab}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            aria-controls={`${tabId}-panel-${tab}`}
                            tabIndex={activeTab === tab ? 0 : -1}
                            onKeyDown={handleTabKeyDown}
                            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>

                {activeTab === 'years' && (
                    <section
                        id={`${tabId}-panel-years`}
                        role="tabpanel"
                        aria-labelledby={`${tabId}-tab-years`}
                        className={styles.tabPanel}
                    >
                        <div className={styles.sectionHeading}>
                            <div>
                                <span className={styles.eyebrow}>Histórico compatível</span>
                                <h3>Informações por edição</h3>
                            </div>
                            <p>Somente a modalidade oficial selecionada é exibida.</p>
                        </div>

                        <div className={styles.yearGrid}>
                            {modalityScores.map(score => {
                                const cutoff = effectiveCutoff(score);
                                return (
                                    <article className={styles.yearCard} key={`${score.year}-${score.modalityCode}`}>
                                        <div className={styles.yearCardHeader}>
                                            <strong>{score.year}</strong>
                                            <span className={`${styles.statusDotLabel} ${styles[score.verification]}`}>
                                                {VERIFICATION_LABELS[score.verification]}
                                            </span>
                                        </div>
                                        <dl className={styles.yearFacts}>
                                            <div>
                                                <dt>Referência</dt>
                                                <dd>{formatScore(cutoff)}</dd>
                                            </div>
                                            <div>
                                                <dt>Tipo</dt>
                                                <dd>{referenceTypeLabel(score.reference?.referenceType)}</dd>
                                            </div>
                                            <div>
                                                <dt>Vagas</dt>
                                                <dd>{formatCount(score.vacancies)}</dd>
                                            </div>
                                            <div>
                                                <dt>Parciais</dt>
                                                <dd>{score.partialScores.length}</dd>
                                            </div>
                                        </dl>
                                    </article>
                                );
                            })}
                        </div>

                        <WeightsTable weights={latestWeights} />
                    </section>
                )}

                {activeTab === 'statistics' && (
                    <section
                        id={`${tabId}-panel-statistics`}
                        role="tabpanel"
                        aria-labelledby={`${tabId}-tab-statistics`}
                        className={styles.tabPanel}
                    >
                        <div className={styles.sectionHeading}>
                            <div>
                                <span className={styles.eyebrow}>Leitura descritiva</span>
                                <h3>Estatísticas da modalidade</h3>
                            </div>
                            <p>Os números abaixo não representam probabilidade de seleção.</p>
                        </div>

                        <dl className={styles.statisticsGrid}>
                            <div>
                                <dt>Edições disponíveis</dt>
                                <dd>{modalityScores.length}</dd>
                            </div>
                            <div>
                                <dt>Edições com referência</dt>
                                <dd>{availableEditions}</dd>
                            </div>
                            <div>
                                <dt>Parciais nesta edição</dt>
                                <dd>{latestCutScore.partialScores.length}</dd>
                            </div>
                            <div>
                                <dt>Última variação diária</dt>
                                <dd>
                                    {latestDailyVariation === null
                                        ? 'Indisponível'
                                        : `${latestDailyVariation > 0 ? '+' : ''}${formatScore(latestDailyVariation)} pts`}
                                </dd>
                            </div>
                        </dl>

                        <div className={styles.partialSection}>
                            <h4>Parciais da edição {latestCutScore.year}</h4>
                            {latestCutScore.partialScores.length > 0 ? (
                                <div className={styles.partialGrid}>
                                    {latestCutScore.partialScores.map((partial, index) => {
                                        const previous = latestCutScore.partialScores[index - 1];
                                        const variation = previous ? partial.score - previous.score : null;
                                        return (
                                            <div className={styles.partialCard} key={`${partial.day}-${index}`}>
                                                <span>Dia {partial.day}</span>
                                                <strong>{formatScore(partial.score)}</strong>
                                                <small>
                                                    {variation === null
                                                        ? 'Primeira parcial disponível'
                                                        : `${variation > 0 ? '+' : ''}${formatScore(variation)} pts desde a parcial anterior`}
                                                </small>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className={styles.panelEmpty}>Não há sequência de parciais nesta edição.</p>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'trust' && (
                    <section
                        id={`${tabId}-panel-trust`}
                        role="tabpanel"
                        aria-labelledby={`${tabId}-tab-trust`}
                        className={styles.tabPanel}
                    >
                        <div className={styles.sectionHeading}>
                            <div>
                                <span className={styles.eyebrow}>Rastreabilidade</span>
                                <h3>Confiabilidade dos dados</h3>
                            </div>
                            <p>Confira edição, modalidade, captura e fonte antes de usar uma referência.</p>
                        </div>

                        {reference ? (
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
                        ) : (
                            <div className={styles.trustUnavailable} role="status">
                                A referência desta edição não possui metadados suficientes de proveniência.
                                O corte permanece visível, mas confira a edição e a modalidade antes de comparar.
                            </div>
                        )}

                        <div className={styles.methodNote}>
                            <h4>Como esta comparação é protegida</h4>
                            <ul>
                                <li>A modalidade é comparada pelo código oficial exato.</li>
                                <li>Pesos, mínimos e referência precisam pertencer à mesma edição.</li>
                                <li>Somente uma divergência explícita suspende a diferença; históricos continuam consultáveis.</li>
                            </ul>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
