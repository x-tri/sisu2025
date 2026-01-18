
import { useState, useEffect } from 'react';
import styles from './ApprovedList.module.css';

interface ApprovedStudent {
    id: number;
    course_id: number;
    year: number;
    modality_code: number;
    rank: number;
    name: string;
    score: number;
    bonus: number;
    call_number: number;
    status: string;
}

interface ApprovedListProps {
    courseCode: number;
    cutScore: number;
    vacancies: number;
    year: number;
}

export function ApprovedList({ courseCode, cutScore, vacancies, year }: ApprovedListProps) {
    const [page, setPage] = useState(1);
    const [students, setStudents] = useState<ApprovedStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');
    const [actualYear, setActualYear] = useState<number | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/courses/${courseCode}/students?page=${page}&limit=50`);
                if (!res.ok) throw new Error('Failed to fetch students');
                const data = await res.json();
                setStudents(data.students);
                setHasMore(data.hasMore);
                // Use the year from the API response
                if (data.year) {
                    setActualYear(data.year);
                }
            } catch (err) {
                console.error(err);
                setError('Erro ao carregar lista de aprovados');
            } finally {
                setLoading(false);
            }
        };

        if (courseCode) {
            fetchStudents();
        }
    }, [courseCode, page]);

    const handleNextPage = () => setPage(p => p + 1);
    const handlePrevPage = () => setPage(p => Math.max(1, p - 1));

    if (error) return <div className={styles.error}>{error}</div>;

    // Use actual year from data, or fallback to prop
    const displayYear = actualYear || year;
    const isReference = displayYear < 2025;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    Primeira chamada regular ({displayYear})
                    {isReference ? (
                        <span className={styles.badgeReference}>Referência 2024</span>
                    ) : (
                        <span className={styles.badgeOfficial}>Atual 2025</span>
                    )}
                </h3>
            </div>

            <div className={styles.summary}>
                <p>Nota de corte da chamada: <strong>{cutScore.toFixed(2).replace('.', ',')}</strong></p>
                {/* Only show 'Nenhum inscrito' if we actually have NO students and it's 2025 */}
                {students.length === 0 && !loading && displayYear === 2025 && (
                    <p className={styles.classification}>Aguardando dados oficiais...</p>
                )}
                {students.length > 0 && (
                    <p className={styles.classification}>Classificação Oficial</p>
                )}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>Nº</th>
                            <th style={{ width: '80px' }}>Opção</th>
                            <th>Nome</th>
                            <th>Nota</th>
                            <th style={{ width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody style={{ opacity: loading ? 0.5 : 1 }}>
                        {students.map((c) => (
                            <tr key={c.rank} className={c.rank % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                <td className={styles.rank}>{c.rank}º</td>
                                <td className={styles.option}>{c.modality_code}</td>
                                <td className={styles.name}>{c.name}</td>
                                <td className={styles.scoreRow}>
                                    {c.score.toFixed(2).replace('.', ',')}
                                    {c.bonus > 0 && <span className={styles.bonus}> (+{c.bonus}%)</span>}
                                </td>
                                <td className={styles.check}>
                                    {/* Only show check if confirmed/registered? For now assume 'convocado' has check */}
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </td>
                            </tr>
                        ))}
                        {!loading && students.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                                    Nenhum aluno encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className={styles.pagination}>
                <button
                    className={styles.pageBtn}
                    onClick={handlePrevPage}
                    disabled={page === 1 || loading}
                >
                    &lt;
                </button>
                <button className={`${styles.pageBtn} ${styles.active}`}>{page}</button>
                <button
                    className={styles.pageBtn}
                    onClick={handleNextPage}
                    disabled={!hasMore || loading}
                >
                    &gt;
                </button>
            </div>

            <div className={styles.footer}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Candidato convocado nessa chamada</span>
            </div>
        </div>
    );
}
