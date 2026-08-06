'use client';

import { Building2, CircleHelp, Map } from 'lucide-react';
import type { CourseSearchItem } from '../types/course';
import styles from './CourseResultCard.module.css';

interface CourseResultCardProps {
  course: CourseSearchItem;
  onSelect: (course: CourseSearchItem) => void;
}

function formatScore(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function referenceValue(course: CourseSearchItem): number | null {
  const reference = course.reference;
  if (!reference) return null;
  if (typeof reference.cutoff === 'number') return reference.cutoff;
  const partials = [...reference.partialScores]
    .filter(partial => Number.isFinite(Number(partial.day)))
    .sort((left, right) => Number(left.day) - Number(right.day));
  return partials[partials.length - 1]?.score ?? null;
}

const STATUS_LABEL = {
  verified: 'verificado',
  unverified: 'disponível na base XTRI',
  stale: 'histórico',
  conflict: 'divergente',
} as const;

export default function CourseResultCard({ course, onSelect }: CourseResultCardProps) {
  const reference = course.reference || null;
  const cutoff = referenceValue(course);
  const institution = course.university || 'Instituição não informada';
  const location = course.campus || [course.city, course.state].filter(Boolean).join(', ') || 'Campus não informado';

  return (
    <a
      className={styles.card}
      href={`/?courseCode=${course.code}`}
      onClick={event => {
        event.preventDefault();
        onSelect(course);
      }}
    >
      <span className={styles.heading}>
        <strong>{course.name}</strong>
        <span>{[course.schedule, course.degree].filter(Boolean).join(' - ') || 'Oferta de graduação'}</span>
      </span>

      <span className={styles.details}>
        <span>
          <Building2 size={18} aria-hidden="true" />
          <span><b>{course.universityAcronym || institution}</b>{course.universityAcronym ? ` | ${institution}` : ''}</span>
        </span>
        <span>
          <Map size={18} aria-hidden="true" />
          <span>{location}</span>
        </span>
        <span>
          <CircleHelp size={18} aria-hidden="true" />
          <span>{course.weightSummary || 'Pesos da oferta disponíveis no detalhe'}</span>
        </span>
      </span>

      {reference && cutoff !== null ? (
        <span className={styles.referenceBlock}>
          <span className={styles.referenceValue}>
            Referência para {reference.modalityOfficialName} ({reference.edition}): {formatScore(cutoff)}
          </span>
          <small>
            {reference.referenceType === 'historical' ? 'Histórica' : reference.referenceType === 'final' ? 'Final' : 'Parcial'}
            {' · '}{STATUS_LABEL[reference.verification.status]}
            {' · '}fonte SISU/MEC{reference.intermediary ? ` · processado pela ${reference.intermediary}` : ''}
          </small>
        </span>
      ) : (
        <span className={styles.referenceBlock}>
          <span className={styles.referenceValue}>Abrir oferta para consultar a referência</span>
          <small>Nenhuma modalidade foi substituída automaticamente.</small>
        </span>
      )}
    </a>
  );
}
