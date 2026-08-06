'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import styles from './CourseStatisticsPanel.module.css';

interface AvailableModality {
    id: string;
    name: string;
}

interface PartialSeries {
    edition: number;
    semester: number | null;
    points: Array<{ day: number; score: number }>;
}

interface CutoffHistoryItem {
    edition: number;
    semester: number | null;
    cutoff: number | null;
    effectiveCutoff: number | null;
    referenceType: 'final' | 'partial' | null;
    partialDay: number | null;
    applicants: number | null;
    vacancies: number | null;
    capturedAt: string | null;
    modalityName: string;
}

interface ApprovedScoreSummary {
    edition: number;
    semester: number | null;
    admissionCall: 1;
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
}

interface StatisticsResponse {
    modality: {
        id: string;
        name: string;
        family: string | null;
    };
    partialSeries: PartialSeries[];
    cutoffHistory: CutoffHistoryItem[];
    approvedScoreSummary: ApprovedScoreSummary[];
    generatedAt: string;
    error?: string;
}

interface CourseStatisticsPanelProps {
    courseCode: number;
    selectedModality: string;
    availableModalities: AvailableModality[];
    onModalityChange: (modalityId: string) => void;
}

interface PartialChartRow {
    day: number;
    [seriesKey: string]: number | null;
}

const SERIES_COLORS = ['#435eff', '#f97316', '#7c3aed', '#ec4899', '#a16207'];

function formatScore(value: number): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatEdition(edition: number, semester: number | null): string {
    return semester ? `${edition}-${semester}` : String(edition);
}

function formatDate(value: string | null): string {
    if (!value) return 'Não informada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

function scoreTooltip(value: unknown): string {
    return typeof value === 'number' ? formatScore(value) : 'Não informado';
}

export default function CourseStatisticsPanel({
    courseCode,
    selectedModality,
    availableModalities,
    onModalityChange,
}: CourseStatisticsPanelProps) {
    const [data, setData] = useState<StatisticsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const loadStatistics = useCallback(async (signal: AbortSignal) => {
        setLoading(true);
        setError('');
        setData(null);

        const timeoutController = new AbortController();
        const forwardAbort = () => timeoutController.abort();
        signal.addEventListener('abort', forwardAbort, { once: true });
        const timeout = window.setTimeout(() => timeoutController.abort(), 12_000);

        try {
            const query = new URLSearchParams({ modalityId: selectedModality });
            const response = await fetch(`/api/courses/${courseCode}/statistics?${query}`, {
                cache: 'no-store',
                signal: timeoutController.signal,
            });
            const payload = await response.json().catch(() => ({})) as StatisticsResponse;
            if (!response.ok) {
                throw new Error(payload.error || 'Não foi possível carregar as estatísticas.');
            }
            if (!Array.isArray(payload.partialSeries) || !Array.isArray(payload.cutoffHistory)) {
                throw new Error('A consulta de estatísticas retornou dados incompletos.');
            }
            if (!signal.aborted) setData(payload);
        } catch (requestError) {
            if (signal.aborted) return;
            if (requestError instanceof DOMException && requestError.name === 'AbortError') {
                setError('A consulta excedeu o tempo limite. Tente novamente.');
            } else {
                setError(requestError instanceof Error
                    ? requestError.message
                    : 'Não foi possível carregar as estatísticas.');
            }
        } finally {
            window.clearTimeout(timeout);
            signal.removeEventListener('abort', forwardAbort);
            if (!signal.aborted) setLoading(false);
        }
    }, [courseCode, selectedModality]);

    useEffect(() => {
        if (!courseCode || !selectedModality) {
            setData(null);
            setError('');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        void loadStatistics(controller.signal);
        return () => controller.abort();
    }, [courseCode, loadStatistics, reloadKey, selectedModality]);

    const partialSeries = useMemo(() => (
        [...(data?.partialSeries ?? [])]
            .filter(series => series.points.length > 0)
            .sort((left, right) => (
                right.edition - left.edition
                || (right.semester ?? 0) - (left.semester ?? 0)
            ))
            .slice(0, 2)
    ), [data]);

    const partialChartData = useMemo(() => {
        const rows = new Map<number, PartialChartRow>();
        for (const series of partialSeries) {
            const key = formatEdition(series.edition, series.semester);
            for (const point of series.points) {
                const row = rows.get(point.day) ?? { day: point.day };
                row[key] = point.score;
                rows.set(point.day, row);
            }
        }
        return Array.from(rows.values()).sort((left, right) => left.day - right.day);
    }, [partialSeries]);

    const approvedChartData = useMemo(() => (
        [...(data?.approvedScoreSummary ?? [])]
            .sort((left, right) => (
                left.edition - right.edition
                || (left.semester ?? 0) - (right.semester ?? 0)
            ))
            .map(item => ({
                edition: formatEdition(item.edition, item.semester),
                menor: item.min,
                media: item.mean,
                mediana: item.median,
                maior: item.max,
                count: item.count,
            }))
    ), [data]);

    const cutoffChartData = useMemo(() => (
        [...(data?.cutoffHistory ?? [])]
            .filter(item => item.effectiveCutoff !== null)
            .sort((left, right) => (
                left.edition - right.edition
                || (left.semester ?? 0) - (right.semester ?? 0)
            ))
            .map(item => ({
                edition: formatEdition(item.edition, item.semester),
                cutoff: item.effectiveCutoff,
            }))
    ), [data]);

    const latestReference = useMemo(() => (
        [...(data?.cutoffHistory ?? [])]
            .filter(item => item.effectiveCutoff !== null)
            .sort((left, right) => (
                right.edition - left.edition
                || (right.semester ?? 0) - (left.semester ?? 0)
            ))[0] ?? null
    ), [data]);

    const cutoffValues = cutoffChartData
        .map(item => item.cutoff)
        .filter((value): value is number => typeof value === 'number');
    const lowestCutoff = cutoffValues.length > 0 ? Math.min(...cutoffValues) : null;
    const highestCutoff = cutoffValues.length > 0 ? Math.max(...cutoffValues) : null;

    return (
        <div className={styles.panel}>
            <div className={styles.modalityControl}>
                <label htmlFor="statistics-modality">Ver dados para a modalidade:</label>
                <div>
                    <select
                        id="statistics-modality"
                        value={selectedModality}
                        onChange={event => onModalityChange(event.target.value)}
                    >
                        <option value="">Modalidade</option>
                        {availableModalities.map(modality => (
                            <option key={modality.id} value={modality.id}>{modality.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && (
                <div className={styles.loadingState} role="status" aria-live="polite">
                    <span className={styles.spinner} aria-hidden="true" />
                    Carregando gráficos e histórico da modalidade…
                </div>
            )}

            {!selectedModality && (
                <div className={styles.emptySelection} role="status">
                    Selecione uma modalidade para ver os gráficos, os cortes do SISU e o resumo histórico.
                </div>
            )}

            {error && (
                <div className={styles.errorState} role="alert">
                    <div>
                        <h3>Não foi possível carregar as estatísticas</h3>
                        <p>{error}</p>
                    </div>
                    <button type="button" onClick={() => setReloadKey(value => value + 1)}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    <section className={styles.chartCard} aria-labelledby="partial-comparison-title">
                        <h3 id="partial-comparison-title">
                            Comparativo das notas parciais para {data.modality.name} da edição atual com outros anos
                        </h3>
                        {partialChartData.length > 0 ? (
                            <>
                                <div
                                    className={styles.chartViewport}
                                    role="img"
                                    aria-label={`Evolução das notas parciais de ${partialSeries.map(series => formatEdition(series.edition, series.semester)).join(', ')}`}
                                >
                                    <div className={styles.partialChart}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={partialChartData} margin={{ top: 12, right: 18, left: 2, bottom: 0 }}>
                                                <CartesianGrid stroke="#eceef2" vertical={false} />
                                                <XAxis dataKey="day" tickFormatter={day => `${day}º dia`} tick={{ fontSize: 11 }} />
                                                <YAxis
                                                    domain={['dataMin - 8', 'dataMax + 8']}
                                                    tick={{ fontSize: 11 }}
                                                    tickFormatter={value => String(Math.round(Number(value)))}
                                                    width={46}
                                                />
                                                <Tooltip formatter={scoreTooltip} labelFormatter={day => `${day}º dia`} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                {partialSeries.map((series, index) => {
                                                    const key = formatEdition(series.edition, series.semester);
                                                    return (
                                                        <Line
                                                            key={key}
                                                            type="monotone"
                                                            dataKey={key}
                                                            name={key}
                                                            connectNulls
                                                            stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                                                            strokeWidth={2}
                                                            dot={{ r: 3 }}
                                                            activeDot={{ r: 5 }}
                                                            isAnimationActive={false}
                                                        >
                                                            <LabelList
                                                                dataKey={key}
                                                                position={index === 0 ? 'top' : 'bottom'}
                                                                formatter={scoreTooltip}
                                                                style={{ fill: SERIES_COLORS[index % SERIES_COLORS.length], fontSize: 10 }}
                                                            />
                                                        </Line>
                                                    );
                                                })}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className={styles.srOnly}>
                                    {partialSeries.map(series => (
                                        <p key={formatEdition(series.edition, series.semester)}>
                                            {formatEdition(series.edition, series.semester)}:{' '}
                                            {series.points.map(point => `${point.day}º dia ${formatScore(point.score)}`).join('; ')}.
                                        </p>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className={styles.emptyChart}>Não há parciais armazenadas para esta modalidade.</p>
                        )}
                    </section>

                    <section className={styles.chartCard} aria-labelledby="approved-summary-title">
                        <h3 id="approved-summary-title">
                            Notas dos aprovados na primeira chamada disponíveis na base para {data.modality.name} por edição
                        </h3>
                        {approvedChartData.length > 0 ? (
                            <>
                                <div className={styles.chartScroll}>
                                    <div
                                        className={styles.wideChart}
                                        style={{ minWidth: Math.max(720, approvedChartData.length * 260) }}
                                        role="img"
                                        aria-label="Menor nota, média, mediana e maior nota dos registros de aprovados disponíveis por edição"
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={approvedChartData} margin={{ top: 12, right: 20, left: 4, bottom: 0 }}>
                                                <CartesianGrid stroke="#eceef2" vertical={false} />
                                                <XAxis dataKey="edition" tick={{ fontSize: 11 }} />
                                                <YAxis
                                                    domain={['dataMin - 10', 'dataMax + 10']}
                                                    tick={{ fontSize: 11 }}
                                                    tickFormatter={value => String(Math.round(Number(value)))}
                                                    width={48}
                                                />
                                                <Tooltip formatter={scoreTooltip} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar dataKey="menor" name="Menor nota" fill="#a78bfa" isAnimationActive={false} />
                                                <Bar dataKey="media" name="Média" fill="#435eff" isAnimationActive={false} />
                                                <Bar dataKey="mediana" name="Mediana" fill="#f97316" isAnimationActive={false} />
                                                <Bar dataKey="maior" name="Maior nota" fill="#ec4899" isAnimationActive={false} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className={styles.srOnly}>
                                    {approvedChartData.map(item => (
                                        <p key={item.edition}>
                                            {item.edition}: {item.count} aprovados; menor {formatScore(item.menor)};
                                            média {formatScore(item.media)}; mediana {formatScore(item.mediana)};
                                            maior {formatScore(item.maior)}.
                                        </p>
                                    ))}
                                </div>
                                <p className={styles.chartNote}>
                                    O resumo usa somente os registros de aprovados armazenados na XTRI e pode não
                                    representar a lista completa da edição. Não há notas separadas por área do ENEM
                                    neste conjunto; por isso, nenhuma média por disciplina foi inferida.
                                </p>
                            </>
                        ) : (
                            <p className={styles.emptyChart}>
                                Não há notas agregadas de aprovados para esta modalidade.
                            </p>
                        )}
                    </section>

                    <section className={styles.chartCard} aria-labelledby="cutoff-history-title">
                        <h3 id="cutoff-history-title">
                            Notas de corte do SISU para {data.modality.name} por edição
                        </h3>
                        {cutoffChartData.length > 0 ? (
                            <>
                                <div className={styles.chartScroll}>
                                    <div
                                        className={styles.cutoffChart}
                                        role="img"
                                        aria-label={`Histórico de notas de corte em ${cutoffChartData.length} edições`}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={cutoffChartData} margin={{ top: 12, right: 20, left: 4, bottom: 0 }}>
                                                <CartesianGrid stroke="#eceef2" vertical={false} />
                                                <XAxis dataKey="edition" tick={{ fontSize: 11 }} />
                                                <YAxis
                                                    domain={['dataMin - 10', 'dataMax + 10']}
                                                    tick={{ fontSize: 11 }}
                                                    tickFormatter={value => String(Math.round(Number(value)))}
                                                    width={48}
                                                />
                                                <Tooltip formatter={scoreTooltip} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="cutoff"
                                                    name="1ª edição"
                                                    stroke="#435eff"
                                                    strokeWidth={2}
                                                    dot={{ r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                    isAnimationActive={false}
                                                >
                                                    <LabelList
                                                        dataKey="cutoff"
                                                        position="top"
                                                        formatter={scoreTooltip}
                                                        style={{ fill: '#435eff', fontSize: 10 }}
                                                    />
                                                </Line>
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className={styles.srOnly}>
                                    {cutoffChartData.map(item => (
                                        <p key={item.edition}>{item.edition}: {formatScore(item.cutoff as number)}.</p>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className={styles.emptyChart}>Não há cortes armazenados para esta modalidade.</p>
                        )}
                    </section>

                    <section className={styles.summarySection} aria-labelledby="statistics-summary-title">
                        <div className={styles.summaryHeading}>
                            <h3 id="statistics-summary-title">Resumo do curso escolhido</h3>
                            <p>Todos os valores abaixo usam a mesma modalidade, sem substituição por Ampla.</p>
                        </div>
                        <dl className={styles.summaryGrid}>
                            <div>
                                <dt>Edições com corte</dt>
                                <dd>{cutoffChartData.length}</dd>
                            </div>
                            <div>
                                <dt>Menor corte histórico</dt>
                                <dd>{lowestCutoff === null ? 'Não informado' : formatScore(lowestCutoff)}</dd>
                            </div>
                            <div>
                                <dt>Maior corte histórico</dt>
                                <dd>{highestCutoff === null ? 'Não informado' : formatScore(highestCutoff)}</dd>
                            </div>
                            <div>
                                <dt>Última referência</dt>
                                <dd>{latestReference?.effectiveCutoff === null || latestReference?.effectiveCutoff === undefined
                                    ? 'Não informada'
                                    : formatScore(latestReference.effectiveCutoff)}</dd>
                            </div>
                            <div>
                                <dt>Inscritos na última edição</dt>
                                <dd>{latestReference?.applicants?.toLocaleString('pt-BR') ?? 'Não informado'}</dd>
                            </div>
                            <div>
                                <dt>Vagas na última edição</dt>
                                <dd>{latestReference?.vacancies?.toLocaleString('pt-BR') ?? 'Não informado'}</dd>
                            </div>
                        </dl>
                        {latestReference && (
                            <p className={styles.provenance}>
                                Última referência: {formatEdition(latestReference.edition, latestReference.semester)} ·{' '}
                                {latestReference.referenceType === 'partial'
                                    ? `parcial do ${latestReference.partialDay ?? 'último'}º dia`
                                    : latestReference.referenceType === 'final'
                                        ? 'corte final'
                                        : 'tipo não informado'} · captura {formatDate(latestReference.capturedAt)} · fonte SISU/MEC,
                                armazenada e processada pela XTRI.
                            </p>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
