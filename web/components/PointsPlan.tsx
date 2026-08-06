'use client';

import {
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  ExternalLink,
  FlaskConical,
  MessageSquareText,
  PenLine,
  Scale,
  ShieldCheck,
  Sigma,
  SlidersHorizontal,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CourseWeights, Scores } from '../context/ScoreContext';
import type { CourseReference, VerificationStatus } from '../types/course';
import styles from './PointsPlan.module.css';

type MinimumStatus = 'passed' | 'failed' | 'not_evaluated' | 'not_applicable';

interface PointsPlanProps {
  courseName: string;
  modalityName: string;
  edition: number;
  scores: Scores;
  hasScores: boolean;
  weights: CourseWeights | null;
  userAverage: number | null;
  cutoff: number;
  margin: number | null;
  comparisonAllowed: boolean;
  minimumStatus: MinimumStatus;
  reference: CourseReference;
  detailsOpen: boolean;
  onEditScores: () => void;
  onOpenRadar: () => void;
  onOpenShare: () => void;
  onToggleDetails: () => void;
}

type ScoreKey = keyof Scores;
type WeightKey = keyof CourseWeights;

interface SubjectDefinition {
  key: ScoreKey;
  weightKey: WeightKey;
  name: string;
  description: string;
  icon: LucideIcon;
  tone: 'blue' | 'violet' | 'cyan' | 'green' | 'orange';
}

const SUBJECTS: SubjectDefinition[] = [
  {
    key: 'linguagens',
    weightKey: 'peso_ling',
    name: 'Linguagens',
    description: 'Língua Portuguesa e Literaturas',
    icon: MessageSquareText,
    tone: 'blue',
  },
  {
    key: 'humanas',
    weightKey: 'peso_ch',
    name: 'Humanas',
    description: 'História, Geografia, Filosofia e Sociologia',
    icon: Users,
    tone: 'violet',
  },
  {
    key: 'natureza',
    weightKey: 'peso_cn',
    name: 'Natureza',
    description: 'Biologia, Física e Química',
    icon: FlaskConical,
    tone: 'cyan',
  },
  {
    key: 'matematica',
    weightKey: 'peso_mat',
    name: 'Matemática',
    description: 'Matemática e suas Tecnologias',
    icon: Sigma,
    tone: 'green',
  },
  {
    key: 'redacao',
    weightKey: 'peso_red',
    name: 'Redação',
    description: 'Texto dissertativo-argumentativo',
    icon: PenLine,
    tone: 'orange',
  },
];

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: 'Dados conferidos',
  unverified: 'Disponível na base XTRI',
  stale: 'Referência histórica',
  conflict: 'Divergência detectada',
};

function formatScore(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return 'Indisponível';
  return value.toFixed(digits).replace('.', ',');
}

function formatDate(value?: string | null): string {
  if (!value) return 'Não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(date);
}

function referenceTypeLabel(reference: CourseReference): string {
  if (reference.referenceType === 'partial') return 'Referência parcial';
  if (reference.referenceType === 'final') return 'Corte final';
  return 'Referência histórica';
}

function getWeight(weights: CourseWeights | null, key: WeightKey): number | null {
  const value = weights?.[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function impactLabel(weight: number | null, totalWeight: number): {
  label: string;
  level: number;
} {
  if (weight === null || totalWeight <= 0) return { label: 'Não informado', level: 0 };
  if (weight === 0) return { label: 'Sem peso nesta oferta', level: 0 };
  const share = weight / totalWeight;
  if (share >= 0.25) return { label: 'Impacto muito alto', level: 4 };
  if (share >= 0.2) return { label: 'Impacto alto', level: 3 };
  if (share >= 0.15) return { label: 'Impacto médio', level: 2 };
  return { label: 'Impacto baixo', level: 1 };
}

export default function PointsPlan({
  courseName,
  modalityName,
  edition,
  scores,
  hasScores,
  weights,
  userAverage,
  cutoff,
  margin,
  comparisonAllowed,
  minimumStatus,
  reference,
  detailsOpen,
  onEditScores,
  onOpenRadar,
  onOpenShare,
  onToggleDetails,
}: PointsPlanProps) {
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [targetScore, setTargetScore] = useState(() => Math.ceil(cutoff * 10) / 10);

  useEffect(() => {
    setTargetScore(Math.ceil(cutoff * 10) / 10);
  }, [cutoff]);

  const totalWeight = useMemo(() => SUBJECTS.reduce((total, subject) => (
    total + (getWeight(weights, subject.weightKey) ?? 0)
  ), 0), [weights]);

  const subjectRows = useMemo(() => SUBJECTS.map(subject => {
    const weight = getWeight(weights, subject.weightKey);
    return {
      ...subject,
      weight,
      impact: impactLabel(weight, totalWeight),
    };
  }), [totalWeight, weights]);

  const weightSummary = useMemo(() => {
    const weightedSubjects = subjectRows.filter(subject => subject.weight !== null && subject.weight > 0);
    if (weightedSubjects.length === 0) {
      return 'Os pesos oficiais desta edição ainda não estão completos.';
    }
    const highestWeight = Math.max(...weightedSubjects.map(subject => subject.weight as number));
    const highest = weightedSubjects.filter(subject => subject.weight === highestWeight);
    if (highest.length === weightedSubjects.length) {
      return 'Todas as áreas têm o mesmo peso nesta oferta.';
    }
    const labels = highest.slice(0, 2).map(subject => subject.name);
    const joined = labels.length === 2 ? `${labels[0]} e ${labels[1]}` : labels[0];
    return `${joined} ${labels.length === 1 ? 'tem' : 'têm'} maior peso nesta oferta.`;
  }, [subjectRows]);

  const targetDifference = userAverage === null ? null : userAverage - targetScore;
  const marginRelation = margin === null ? null : margin >= 0 ? 'above' : 'below';
  const marginValue = margin === null ? null : Math.abs(margin);

  return (
    <section id="plan" className={styles.plan} aria-labelledby="points-plan-title">
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <div className={styles.titleLine}>
            <h2 id="points-plan-title">Seu <span>plano</span> de pontos</h2>
            <button
              type="button"
              className={styles.guideButton}
              aria-expanded={showQuickGuide}
              aria-controls="points-plan-guide"
              onClick={() => setShowQuickGuide(value => !value)}
            >
              <CircleHelp size={17} aria-hidden="true" />
              Entenda em 30 segundos
            </button>
          </div>
          <p className={styles.weightSummary}>
            <Scale size={19} aria-hidden="true" />
            {weightSummary}
          </p>

          <ol className={styles.steps} aria-label="Como ler seu plano">
            <li>
              <span>1</span>
              <div><strong>Onde você está</strong><small>Sua nota com os pesos desta oferta.</small></div>
            </li>
            <li>
              <span>2</span>
              <div><strong>Quanto falta</strong><small>Comparação com a última referência.</small></div>
            </li>
            <li>
              <span>3</span>
              <div><strong>O que mais pesa</strong><small>Áreas com maior peso oficial.</small></div>
            </li>
            <li>
              <span>4</span>
              <div><strong>Ajuste e veja</strong><small>Edite suas notas sem sair da tela.</small></div>
            </li>
          </ol>
        </div>

        <section className={styles.metrics} aria-label="Resumo da comparação">
          <div>
            <span>Sua nota ponderada</span>
            <strong>{hasScores ? formatScore(userAverage) : 'Adicione notas'}</strong>
            <small>A nota ponderada aplica os pesos oficiais às suas cinco notas do ENEM.</small>
          </div>
          <div>
            <span>Última referência</span>
            <strong>{formatScore(cutoff)}</strong>
            <small>{referenceTypeLabel(reference)} · SISU {edition}.</small>
          </div>
          <div className={marginRelation === 'below' ? styles.metricAttention : undefined}>
            <span>Diferença para a referência</span>
            <strong>{formatScore(marginValue)}</strong>
            <small>
              {marginRelation === null
                ? 'Informe notas válidas para comparar.'
                : marginRelation === 'above'
                  ? 'pontos acima da última referência.'
                  : 'pontos abaixo da última referência.'}
            </small>
          </div>
        </section>
      </div>

      {showQuickGuide && (
        <div id="points-plan-guide" className={styles.quickGuide} role="status">
          <strong>Como usar:</strong> leia a diferença como uma referência histórica, veja quais áreas
          recebem mais peso e ajuste suas notas para entender o efeito no cálculo. O plano não prevê seleção.
        </div>
      )}

      <div className={styles.workspace}>
        <div className={styles.subjectTable} role="table" aria-label="Pesos oficiais por área do ENEM">
          <div className={styles.tableHeader} role="row">
            <span role="columnheader">Disciplina</span>
            <span role="columnheader">Sua nota (ENEM)</span>
            <span role="columnheader">Peso oficial</span>
            <span role="columnheader">Impacto na nota ponderada</span>
          </div>

          {subjectRows.map(subject => {
            const Icon = subject.icon;
            return (
              <div
                className={`${styles.subjectRow} ${styles[subject.tone]}`}
                role="row"
                key={subject.key}
              >
                <div className={styles.subjectName} role="cell">
                  <span className={styles.subjectIcon}><Icon size={19} aria-hidden="true" /></span>
                  <span><strong>{subject.name}</strong><small>{subject.description}</small></span>
                </div>
                <div className={styles.scoreCell} role="cell">
                  <strong>{hasScores ? formatScore(scores[subject.key]) : '—'}</strong>
                  <progress max="1000" value={hasScores ? scores[subject.key] : 0}>
                    {hasScores ? scores[subject.key] : 0}
                  </progress>
                </div>
                <div className={styles.weightCell} role="cell">
                  <strong>{subject.weight === null ? '—' : `${formatScore(subject.weight, 1)}×`}</strong>
                </div>
                <div className={styles.impactCell} role="cell">
                  <meter min="0" max="4" value={subject.impact.level} aria-label={subject.impact.label} />
                  <small>{subject.impact.label}</small>
                </div>
              </div>
            );
          })}

          <div className={styles.tableHelp}>
            <CircleHelp size={16} aria-hidden="true" />
            “Impacto” mostra a participação do peso de cada área no cálculo, não uma chance de seleção.
          </div>
        </div>

        <aside className={styles.targetCard} aria-labelledby="target-card-title">
          <div className={styles.targetHeading}>
            <span><Target size={22} aria-hidden="true" /></span>
            <div><strong id="target-card-title">4. Ajuste e veja</strong><small>Simule e acompanhe o cálculo.</small></div>
          </div>

          <label htmlFor="personal-target">Meta pessoal</label>
          <div className={styles.targetInput}>
            <input
              id="personal-target"
              type="number"
              inputMode="decimal"
              min="0"
              max="1000"
              step="0.1"
              value={targetScore}
              onChange={event => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 0 && value <= 1000) setTargetScore(value);
              }}
            />
          </div>
          <p className={styles.targetHelp}>É uma meta escolhida por você, não uma previsão de corte oficial.</p>

          <div className={styles.targetResult} aria-live="polite">
            {targetDifference === null
              ? 'Adicione suas notas para comparar com a meta.'
              : targetDifference >= 0
                ? `Sua nota está ${formatScore(Math.abs(targetDifference))} pontos acima da meta.`
                : <>Faltam <strong>{formatScore(Math.abs(targetDifference))}</strong> pontos para a meta de {formatScore(targetScore, 1)}.</>}
          </div>

          <button type="button" className={styles.editScoresButton} onClick={onEditScores}>
            <SlidersHorizontal size={19} aria-hidden="true" />
            {hasScores ? 'Ajustar minhas notas' : 'Adicionar minhas notas'}
          </button>
          <p className={styles.recalculationNote}>
            Ao salvar, a nota ponderada é recalculada nesta mesma tela.
          </p>
        </aside>
      </div>

      {!comparisonAllowed && (
        <p className={styles.comparisonNotice} role="status">
          {!hasScores
            ? 'Adicione as cinco notas do ENEM para calcular sua nota ponderada e a diferença para esta referência.'
            : minimumStatus === 'failed'
            ? 'Uma ou mais notas estão abaixo do mínimo informado. A referência continua visível, mas a diferença fica suspensa.'
            : 'A referência continua visível. Para calcular a diferença, informe notas válidas e use pesos e mínimos da mesma edição.'}
        </p>
      )}

      <section className={styles.trustStrip} aria-label="Origem desta referência">
        <div className={styles.trustTitle}>
          <ShieldCheck size={24} aria-hidden="true" />
          <div><strong>Dados da oferta</strong><small>{VERIFICATION_LABELS[reference.verification.status]}</small></div>
        </div>
        <dl>
          <div><dt>Modalidade</dt><dd>{modalityName}</dd></div>
          <div><dt>Edição</dt><dd>SISU {edition}</dd></div>
          <div><dt>Pesos</dt><dd>{totalWeight > 0 ? 'Disponíveis' : 'Incompletos'}</dd></div>
          <div><dt>Fonte</dt><dd>SISU/MEC</dd></div>
          <div><dt>Captura</dt><dd>{formatDate(reference.capturedAt)}</dd></div>
          <div><dt>Checagem</dt><dd>{formatDate(reference.verification.checkedAt)}</dd></div>
        </dl>
        <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">
          Ver cálculo e origem <ExternalLink size={16} aria-hidden="true" />
        </a>
      </section>

      <div className={styles.actions} aria-label="Outras ações da oferta">
        <button type="button" disabled={!comparisonAllowed} onClick={onOpenRadar}>
          <Target size={17} aria-hidden="true" /> Radar de ofertas
        </button>
        <button type="button" disabled={!comparisonAllowed} onClick={onOpenShare}>
          <ExternalLink size={17} aria-hidden="true" /> Compartilhar comparação
        </button>
        <button
          type="button"
          aria-label={detailsOpen ? 'Ocultar informações por ano' : 'Ver informações por ano'}
          aria-expanded={detailsOpen}
          onClick={onToggleDetails}
        >
          <Database size={17} aria-hidden="true" />
          {detailsOpen ? 'Ocultar histórico e método' : 'Ver histórico e método'}
          <ChevronDown className={detailsOpen ? styles.chevronOpen : undefined} size={16} aria-hidden="true" />
        </button>
      </div>

      <p className={styles.disclaimer}>
        <Clock3 size={15} aria-hidden="true" />
        Esta comparação usa a última referência disponível de {courseName}. Ela orienta o acompanhamento,
        mas não garante seleção; confirme sempre no portal oficial.
      </p>
    </section>
  );
}
