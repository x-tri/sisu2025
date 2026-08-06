import styles from './CourseDetail.module.css';

interface WeightsProps {
    weights?: {
        year?: number;
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
    } | null;
}

export default function WeightsTable({ weights }: WeightsProps) {
    if (!weights) {
        return (
            <section className={styles.weightsSection} aria-labelledby="weights-title">
                <h3 id="weights-title" className={styles.sectionTitle}>Pesos e notas mínimas</h3>
                <div className={styles.tableEmpty} role="status">
                    Pesos da mesma edição não informados. A nota ponderada e a margem ficam indisponíveis.
                </div>
            </section>
        );
    }

    const areas = [
        { key: 'red', label: 'Redação', peso: weights.peso_red, min: weights.min_red },
        { key: 'ling', label: 'Linguagens', peso: weights.peso_ling, min: weights.min_ling },
        { key: 'mat', label: 'Matemática', peso: weights.peso_mat, min: weights.min_mat },
        { key: 'ch', label: 'Ciências Humanas', peso: weights.peso_ch, min: weights.min_ch },
        { key: 'cn', label: 'Ciências da Natureza', peso: weights.peso_cn, min: weights.min_cn },
    ];

    return (
        <section className={styles.weightsSection} aria-labelledby="weights-title">
            <div className={styles.tableHeading}>
                <h3 id="weights-title" className={styles.sectionTitle}>Pesos e notas mínimas</h3>
                {weights.year && <span>Edição {weights.year}</span>}
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <caption className={styles.srOnly}>
                        Pesos e notas mínimas das áreas do ENEM
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">Área de conhecimento</th>
                            <th scope="col">Peso</th>
                            <th scope="col">Nota Mínima</th>
                        </tr>
                    </thead>
                    <tbody>
                        {areas.map(area => (
                            <tr key={area.key}>
                                <td>{area.label}</td>
                                <td className={styles.scoreValue}>{area.peso ?? 'Não informado'}</td>
                                <td className={styles.scoreValue}>{area.min ?? 'Não exigida'}</td>
                            </tr>
                        ))}
                        <tr>
                            <td><strong>Média mínima geral</strong></td>
                            <td aria-label="Não se aplica">—</td>
                            <td className={styles.scoreValue}>{weights.min_enem ?? 'Não exigida'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className={styles.tableNote}>
                Peso zero é mantido como valor válido. Campo ausente não é substituído por peso padrão.
            </p>
        </section>
    );
}
