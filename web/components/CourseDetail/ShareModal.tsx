'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ShareModal.module.css';
import {
    buildScoreShareText,
    formatScore,
    formatSignedScore,
    getScoreMargin,
} from '../../lib/score-core';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: {
        name: string;
        university: string;
        cut_score: number;
    };
    userScore: number;
}

export default function ShareModal({ isOpen, onClose, course, userScore }: ShareModalProps) {
    const [activeTab, setActiveTab] = useState<'text' | 'story'>('text');
    const [copied, setCopied] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !modalRef.current) return;
            const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])',
            ));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const margin = getScoreMargin(userScore, course.cut_score);
    const shareText = buildScoreShareText(course, userScore);
    const relationClass = margin.relation === 'above'
        ? styles.above
        : margin.relation === 'below'
            ? styles.below
            : styles.equal;
    const relationLabel = margin.relation === 'above'
        ? 'ACIMA DO CORTE DE REFERÊNCIA'
        : margin.relation === 'below'
            ? 'ABAIXO DO CORTE DE REFERÊNCIA'
            : margin.relation === 'equal'
                ? 'NA NOTA DE CORTE DE REFERÊNCIA'
                : 'SEM CORTE DE REFERÊNCIA';

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.overlay} role="presentation" onClick={onClose}>
            <div
                ref={modalRef}
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-modal-title"
                onClick={e => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <div className={styles.title} id="share-modal-title">Compartilhar comparação</div>
                    <button ref={closeRef} className={styles.closeButton} onClick={onClose} aria-label="Fechar">✕</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.tabs} role="tablist" aria-label="Formato de compartilhamento">
                        <button
                            role="tab"
                            aria-selected={activeTab === 'text'}
                            className={`${styles.tab} ${activeTab === 'text' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('text')}
                        >
                            WhatsApp / Texto
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'story'}
                            className={`${styles.tab} ${activeTab === 'story' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('story')}
                        >
                            Story / Instagram
                        </button>
                    </div>

                    {activeTab === 'text' ? (
                        <div className={styles.textPanel}>
                            <textarea
                                className={styles.textArea}
                                value={shareText}
                                readOnly
                                aria-label="Texto da comparação para compartilhar"
                            />
                            <button className={styles.copyButton} onClick={handleCopy}>
                                {copied ? 'Copiado! ✅' : 'Copiar Texto'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.storyWrapper}>
                            <div className={`${styles.storyCard} ${relationClass}`}>
                                <div className={styles.cardLogo}>XTRI SISU</div>
                                <div className={styles.cardStatus}>
                                    {relationLabel}
                                </div>
                                <div className={styles.cardScore}>
                                    {formatScore(userScore)}
                                </div>
                                <div className={styles.cardLabel}>
                                    Sua média ponderada
                                </div>
                                {margin.points !== null && (
                                    <div className={styles.cardMargin}>
                                        Margem: {formatSignedScore(margin.points)} pontos
                                    </div>
                                )}
                                <div className={styles.cardCourse}>
                                    {course.name}
                                </div>
                                <div className={styles.cardUni}>
                                    {course.university}
                                </div>
                                <div className={styles.cardFooter}>
                                    xtrisisu.com
                                </div>
                            </div>
                            <p className={styles.screenshotHint}>📸 Tire um print dessa tela para postar!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
