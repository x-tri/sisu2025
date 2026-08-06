'use client';

import { useEffect, useRef, type ChangeEvent } from 'react';
import styles from './ScoreModal.module.css';

export interface ScoreDraft {
  redacao: string;
  linguagens: string;
  matematica: string;
  humanas: string;
  natureza: string;
}

interface ScoreModalProps {
  isOpen: boolean;
  edition: number | null;
  values: ScoreDraft;
  error: string;
  rememberScores: boolean;
  onChange: (values: ScoreDraft) => void;
  onRememberChange: (remember: boolean) => void;
  onClear: () => void;
  onClose: () => void;
  onSave: () => void;
}

const FIELDS: Array<{ key: keyof ScoreDraft; label: string; shortLabel: string }> = [
  { key: 'linguagens', label: 'Linguagens e Códigos', shortLabel: 'Linguagens' },
  { key: 'humanas', label: 'Ciências Humanas', shortLabel: 'Ciências Humanas' },
  { key: 'natureza', label: 'Ciências da Natureza', shortLabel: 'Ciências da Natureza' },
  { key: 'matematica', label: 'Matemática', shortLabel: 'Matemática' },
  { key: 'redacao', label: 'Redação', shortLabel: 'Redação' },
];

export default function ScoreModal({
  isOpen,
  edition,
  values,
  error,
  rememberScores,
  onChange,
  onRememberChange,
  onClear,
  onClose,
  onSave,
}: ScoreModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) || []);
    const focusTimer = window.setTimeout(() => {
      dialog?.querySelector<HTMLInputElement>('input[type="number"]:not([disabled])')?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentEdition = edition || new Date().getFullYear();
  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof ScoreDraft;
    onChange({ ...values, [key]: event.target.value });
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-modal-title"
      >
        <div className={styles.modalHeader}>
          <span>ENEM {currentEdition}</span>
          <h2 id="score-modal-title">Minhas notas</h2>
          <p>Preencha as cinco áreas. A XTRI recalcula seu plano assim que você salvar.</p>
        </div>

        <div className={styles.fields}>
          {FIELDS.map(field => (
            <div className={styles.field} key={field.key}>
              <label htmlFor={`modal-score-${field.key}`}>{field.label}</label>
              <input
                id={`modal-score-${field.key}`}
                aria-label={field.shortLabel}
                name={field.key}
                type="number"
                inputMode="decimal"
                min="0"
                max="1000"
                step="0.01"
                value={values[field.key]}
                onChange={updateField}
                placeholder="000.0"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'score-modal-error' : undefined}
              />
            </div>
          ))}
        </div>

        {error && <p id="score-modal-error" className={styles.error} role="alert">{error}</p>}

        <label className={styles.remember}>
          <input
            type="checkbox"
            checked={rememberScores}
            onChange={event => onRememberChange(event.target.checked)}
          />
          <span>Lembrar neste dispositivo por 30 dias</span>
        </label>
        <p className={styles.privacy}>Sem esta opção, as notas ficam apenas na memória desta aba.</p>

        <div className={styles.secondaryAction}>
          <button type="button" onClick={onClear}>Limpar minhas notas</button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>Cancelar</button>
          <button type="button" className={styles.save} onClick={onSave}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
