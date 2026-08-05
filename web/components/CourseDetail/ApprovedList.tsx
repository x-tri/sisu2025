'use client';

import { useEffect, useState } from 'react';
import styles from './ApprovedList.module.css';

interface ApprovedStudent {
    year: number;
    modality_code: number;
    rank: number;
    name: string;
    score: number;
    bonus: number;
    call_number: number;
}

interface ApprovedListResponse {
    available: boolean;
    reason?: string;
    message?: string;
    error?: string;
    students?: ApprovedStudent[];
    count?: number | null;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    year?: number | null;
}

interface ApprovedListProps {
    courseCode: number;
    cutScore: number;
    vacancies: number;
    year: number;
}

type ListStatus = 'loading' | 'available' | 'unavailable' | 'error';

export function ApprovedList({ courseCode, cutScore, year }: ApprovedListProps) {
    const [page, setPage] = useState(1);
    const [students, setStudents] = useState<ApprovedStudent[]>([]);
    const [status, setStatus] = useState<ListStatus>('loading');
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');
    const [actualYear, setActualYear] = useState<number | null>(null);
    const [count, setCount] = useState<number | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        setPage(1);
    }, [courseCode]);

    useEffect(() => {
        if (!courseCode) return;

        const controller = new AbortController();
        const fetchStudents = async () => {
            setStatus('loading');
            setError('');
            setStudents([]);
            setHasMore(false);

            try {
                const response = await fetch(
                    `/api/courses/${courseCode}/students?page=${page}&limit=25`,
                    { cache: 'no-store', signal: controller.signal },
                );
                const data = await response.json() as ApprovedListResponse;

                if (data.available === false && data.reason === 'nominal_list_disabled') {
                    setStatus('unavailable');
                    setActualYear(null);
                    setCount(null);
                    return;
                }
                if (!response.ok || data.available !== true) {
                    throw new Error(data.error || 'Não foi possível carregar a lista nominal.');
                }

                setStudents(Array.isArray(data.students) ? data.students : []);
                setHasMore(Boolean(data.hasMore));
                setActualYear(data.year ?? null);
                setCount(typeof data.count === 'number' ? data.count : null);
                setStatus('available');
            } catch (requestError) {
                if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
                console.error(requestError);
                setStudents([]);
                setHasMore(false);
                setStatus('error');
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : 'Não foi possível carregar a lista nominal.',
                );
            }
        };

        void fetchStudents();
        return () => controller.abort();
    }, [courseCode, page, reloadKey]);

    const displayYear = actualYear ?? year;
    const formattedCutScore = cutScore > 0
        ? cutScore.toFixed(2).replace('.', ',')
        : 'Não informada';

    if (status === 'unavailable') {
        return (
            <section className={styles.container} aria-labelledby="nominal-list-title">
                <div className={styles.header}>
                    <h3 id="nominal-list-title" className={styles.title}>Lista nominal indisponível</h3>
                </div>
                <div className={styles.unavailableState} role="status">
                    <strong>A consulta por nome está desativada.</strong>
                    <p>
                        Para proteger dados pessoais, esta instalação não publica a relação nominal de
                        candidatos. As notas de corte e estatísticas do curso continuam disponíveis.
                    </p>
                </div>
            </section>
        );
    }

    if (status === 'error') {
        return (
            <section className={styles.container} aria-labelledby="nominal-list-title">
                <div className={styles.header}>
                    <h3 id="nominal-list-title" className={styles.title}>Lista nominal</h3>
                </div>
                <div className={styles.error} role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                        Tentar novamente
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.container} aria-labelledby="nominal-list-title" aria-busy={status === 'loading'}>
            <div className={styles.header}>
                <h3 id="nominal-list-title" className={styles.title}>
                    Relação nominal ({displayYear})
                    <span className={styles.badgeReference}>Base importada</span>
                </h3>
            </div>

            <div className={styles.summary}>
                <p>Nota de corte de referência: <strong>{formattedCutScore}</strong></p>
                {count !== null && <p>{count} registros na edição consultada</p>}
            </div>

            {status === 'loading' ? (
                <div className={styles.loadingState} role="status" aria-live="polite">
                    Carregando registros nominais...
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <caption className={styles.srOnly}>
                                Relação nominal importada para o curso na edição {displayYear}
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">Posição</th>
                                    <th scope="col">Modalidade</th>
                                    <th scope="col">Nome</th>
                                    <th scope="col">Nota</th>
                                    <th scope="col">Chamada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr
                                        key={`${student.call_number}-${student.modality_code}-${student.rank}`}
                                        className={student.rank % 2 === 0 ? styles.evenRow : styles.oddRow}
                                    >
                                        <td className={styles.rank}>{student.rank}º</td>
                                        <td className={styles.option}>{student.modality_code}</td>
                                        <td className={styles.name}>{student.name}</td>
                                        <td className={styles.scoreRow}>
                                            {student.score.toFixed(2).replace('.', ',')}
                                            {student.bonus > 0 && (
                                                <span className={styles.bonus}> (+{student.bonus}%)</span>
                                            )}
                                        </td>
                                        <td className={styles.rank}>{student.call_number}ª</td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className={styles.emptyCell}>
                                            Nenhum registro nominal disponível nesta edição.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <nav className={styles.pagination} aria-label="Paginação da lista nominal">
                        <button
                            type="button"
                            className={styles.pageBtn}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            disabled={page === 1}
                            aria-label="Página anterior"
                        >
                            &lt;
                        </button>
                        <span className={`${styles.pageBtn} ${styles.active}`} aria-current="page">
                            {page}
                        </span>
                        <button
                            type="button"
                            className={styles.pageBtn}
                            onClick={() => setPage((value) => value + 1)}
                            disabled={!hasMore || page >= 100}
                            aria-label="Próxima página"
                        >
                            &gt;
                        </button>
                    </nav>

                    <div className={styles.footer}>
                        Relação reproduzida de uma base importada. Confirme o resultado nos canais da
                        instituição responsável.
                    </div>
                </>
            )}
        </section>
    );
}
