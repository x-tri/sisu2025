import styles from './CourseDetail.module.css';

interface WeightsProps {
    weights?: {
        peso_red: number;
        peso_ling: number;
        peso_mat: number;
        peso_ch: number;
        peso_cn: number;
        min_red: number;
        min_ling: number;
        min_mat: number;
        min_ch: number;
        min_cn: number;
        min_enem: number;
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
                            <th>Área de Conhecimento</th>
                            <th>Peso</th>
                            <th>Nota Mínima</th>
                        </tr>
                    </thead>
                    <tbody>
                        {areas.map(area => (
                            <tr key={area.key}>
                                <td>{area.label}</td>
                                <td className={styles.scoreValue}>{area.peso}</td>
                                <td className={styles.scoreValue}>{area.min}</td>
                            </tr>
                        ))}
                        <tr>
                            <td><strong>Média Mínima Geral</strong></td>
                            <td>-</td>
                            <td className={styles.scoreValue}>{weights.min_enem}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
