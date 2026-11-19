'use client';

import { ArrowUpRight, Building2, CircleHelp, MapPin } from 'lucide-react';
import { calculateWeightedScore, formatScore, getScoreMargin } from '../lib/score-core';
import type { Scores } from '../lib/score-core';
import type { CourseSearchItem } from '../types/course';
import styles from './CourseResultCard.module.css';

interface CourseResultCardProps {
  course: CourseSearchItem;
  scores?: Scores | null;
  onSelect: (course: CourseSearchItem) => void;
}

function referenceValue(course: CourseSearchItem): number | null {
  const reference = course.reference;
  if (!reference) return null;
  if (typeof reference.cutoff === 'number' && reference.cutoff > 0) return reference.cutoff;
  const partials = [...reference.partialScores]
    .filter(partial => Number.isFinite(Number(partial.day)) && Number(partial.score) > 0)
    .sort((left, right) => Number(left.day) - Number(right.day));
  return partials[partials.length - 1]?.score ?? null;
}

export default function CourseResultCard({ course, scores = null, onSelect }: CourseResultCardProps) {
  const reference = course.reference || null;
  const cutoff = referenceValue(course);
  const institution = course.university || 'Instituição não informada';
  const location = course.campus || [course.city, course.state].filter(Boolean).join(', ') || 'Campus não informado';
  const weighted = scores && course.weights
    ? calculateWeightedScore(scores, course.weights).average
    : null;
  const margin = weighted !== null ? getScoreMargin(weighted, cutoff) : null;

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
        <span>{[course.schedule, course.degree].filter(Boolean).join(' · ') || 'Consulte os detalhes da oferta'}</span>
      </span>

      <span className={styles.details}>
        <span>
          <Building2 size={18} aria-hidden="true" />
          <span><b>{course.universityAcronym || institution}</b>{course.universityAcronym ? ` | ${institution}` : ''}</span>
        </span>
        <span>
          <MapPin size={18} aria-hidden="true" />
          <span>{location}</span>
        </span>
        <span>
          <CircleHelp size={18} aria-hidden="true" />
          <span>{course.weightSummary || 'Pesos da oferta disponíveis no detalhe'}</span>
        </span>
      </span>

      {weighted !== null ? (
        <span className={styles.personalScore} data-margin={margin?.relation ?? 'unavailable'}>
          <span className={styles.personalScoreLabel}>Sua nota ponderada</span>
          <strong>{formatScore(weighted)}</strong>
          {margin && margin.points !== null ? (
            <small>
              {margin.relation === 'above'
                ? `${formatScore(margin.points)} acima da referência`
                : margin.relation === 'below'
                  ? `${formatScore(Math.abs(margin.points))} abaixo da referência`
                  : 'Igual à referência'}
            </small>
          ) : (
            <small>Sem referência para comparar</small>
          )}
        </span>
      ) : null}

      {reference && cutoff !== null ? (
        <span className={styles.referenceBlock}>
          <span className={styles.referenceHeader}>
            <span>Nota de referência <small>· SISU {reference.edition}</small></span>
            <strong>{formatScore(cutoff)}</strong>
          </span>
          <span className={styles.referenceModality}>{reference.modalityOfficialName}</span>
          <small className={styles.referenceSource}>
            {reference.referenceType === 'historical' ? 'Histórica' : reference.referenceType === 'final' ? 'Final' : 'Parcial'}
            {' · '}fonte SISU/MEC
          </small>
        </span>
      ) : (
        <span className={styles.referenceBlock}>
          <span className={styles.referenceValue}>Consultar referências desta oferta</span>
        </span>
      )}
      <span className={styles.cardAction}>
        Ver detalhes e montar meu plano <ArrowUpRight size={17} aria-hidden="true" />
      </span>
    </a>
  );
}
