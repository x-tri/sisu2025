'use client';

import styles from './DataTrustPanel.module.css';
import type { VerificationStatus } from '../types/course';

export type { VerificationStatus } from '../types/course';

interface DataTrustPanelProps {
    status: VerificationStatus;
    edition: number;
    modalityName: string;
    referenceType: 'partial' | 'final' | 'historical';
    capturedAt?: string | null;
    checkedAt?: string | null;
    sourceUrl: string;
    intermediary?: string | null;
}

const STATUS_COPY: Record<VerificationStatus, { label: string; description: string }> = {
    verified: {
        label: 'Verificado com a fonte oficial',
        description: 'Os identificadores e valores desta referência coincidem com a consulta oficial informada.',
    },
    unverified: {
        label: 'Conferência oficial pendente',
        description: 'A origem foi identificada, mas esta captura ainda não foi reconciliada automaticamente com o SISU/MEC.',
    },
    stale: {
        label: 'Dados possivelmente desatualizados',
        description: 'A última captura ultrapassou a janela de atualização esperada. Use o valor apenas como histórico.',
    },
    conflict: {
        label: 'Divergência detectada',
        description: 'Os dados disponíveis não coincidem. A comparação com a sua nota foi suspensa.',
    },
};

function formatDate(value?: string | null): string {
    if (!value) return 'Não informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informado';
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Fortaleza',
    }).format(date);
}

export default function DataTrustPanel({
    status,
    edition,
    modalityName,
    referenceType,
    capturedAt,
    checkedAt,
    sourceUrl,
    intermediary,
}: DataTrustPanelProps) {
    const copy = STATUS_COPY[status];
    const referenceLabel = referenceType === 'final'
        ? 'Final'
        : referenceType === 'historical'
            ? 'Histórica'
            : 'Parcial';

    return (
        <section className={`${styles.panel} ${styles[status]}`} aria-labelledby="data-trust-title">
            <div className={styles.headingRow}>
                <h5 id="data-trust-title">Confiabilidade desta referência</h5>
                <span className={styles.statusBadge}>{copy.label}</span>
            </div>
            <p className={styles.description}>{copy.description}</p>

            <dl className={styles.metadata}>
                <div>
                    <dt>Edição</dt>
                    <dd>{edition}</dd>
                </div>
                <div>
                    <dt>Modalidade</dt>
                    <dd>{modalityName}</dd>
                </div>
                <div>
                    <dt>Referência</dt>
                    <dd>{referenceLabel}</dd>
                </div>
                <div>
                    <dt>Capturada em</dt>
                    <dd>{formatDate(capturedAt)}</dd>
                </div>
                <div>
                    <dt>Verificada em</dt>
                    <dd>{formatDate(checkedAt)}</dd>
                </div>
                <div>
                    <dt>Origem</dt>
                    <dd>
                        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                            SISU/MEC
                        </a>
                        {intermediary ? ` via ${intermediary}` : ''}
                    </dd>
                </div>
            </dl>

            <p className={styles.notice}>
                A nota parcial é uma referência temporária e não garante seleção. Confirme sua situação no portal oficial.
            </p>
        </section>
    );
}
