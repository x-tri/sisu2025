import styles from './CourseDetail.module.css';

interface WeightsProps {
    weights?: {
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
}

export default function WeightsTable({ weights }: WeightsProps) {
    if (!weights) return <div className={styles.tableContainer}><p style={{ padding: '1rem' }}>Pesos não informados.</p></div>;

    const areas = [
        { key: 'red', label: 'Redação', peso: weights.peso_red, min: weights.min_red },
        { key: 'ling', label: 'Linguagens', peso: weights.peso_ling, min: weights.min_ling },
        { key: 'mat', label: 'Matemática', peso: weights.peso_mat, min: weights.min_mat },
        { key: 'ch', label: 'Ciências Humanas', peso: weights.peso_ch, min: weights.min_ch },
        { key: 'cn', label: 'Ciências da Natureza', peso: weights.peso_cn, min: weights.min_cn },
    ];

    return (
        <div>
            <h3 className={styles.sectionTitle}>Pesos e Notas Mínimas</h3>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col">Área de Conhecimento</th>
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
                            <td><strong>Média Mínima Geral</strong></td>
                            <td>-</td>
                            <td className={styles.scoreValue}>{weights.min_enem ?? 'Não exigida'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
