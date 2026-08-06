'use client';

import { useId } from 'react';
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
        label: 'Disponível na base XTRI',
        description: 'Esta referência foi importada e armazenada pela XTRI com a edição e a modalidade indicadas. O corte pode ser consultado e comparado com os pesos da mesma edição.',
    },
    stale: {
        label: 'Histórico na base XTRI',
        description: 'Esta captura não pertence à janela ativa do SISU. O valor continua disponível como histórico da edição indicada.',
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
    const titleId = useId();
    const copy = STATUS_COPY[status];
    const referenceLabel = referenceType === 'final'
        ? 'Final'
        : referenceType === 'historical'
            ? 'Histórica'
            : 'Parcial';

    return (
        <section className={`${styles.panel} ${styles[status]}`} aria-labelledby={titleId}>
            <div className={styles.headingRow}>
                <h5 id={titleId}>Origem desta referência</h5>
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
                    <dt>Metadados gerados em</dt>
                    <dd>{formatDate(checkedAt)}</dd>
                </div>
                <div>
                    <dt>Fonte para conferência</dt>
                    <dd>
                        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                            SISU/MEC
                        </a>
                        {intermediary ? ` · processado pela ${intermediary}` : ''}
                    </dd>
                </div>
            </dl>

            <p className={styles.notice}>
                A nota parcial é uma referência temporária e não garante seleção. Confirme sua situação no portal oficial.
            </p>
        </section>
    );
}
