'use client';

import { useState } from 'react';
import styles from './ShareModal.module.css';

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

    if (!isOpen) return null;

    const isPassing = userScore >= course.cut_score;
    const diff = userScore - course.cut_score;

    const shareText = isPassing
        ? `Tô passando em ${course.name} na ${course.university} com nota ${userScore.toFixed(2)} (+${diff.toFixed(2)})! 🚀\n\nAcompanhe no XTRI SISU: xtrisisu.com`
        : `Minha chance em ${course.name} na ${course.university}: 85%! Nota: ${userScore.toFixed(2)} (${diff.toFixed(2)})\n\nVeja o seu no XTRI SISU: xtrisisu.com`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>📱 Compartilhar Resultado</div>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'text' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('text')}
                        >
                            WhatsApp / Texto
                        </button>
                        <button
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
                            />
                            <button className={styles.copyButton} onClick={handleCopy}>
                                {copied ? 'Copiado! ✅' : 'Copiar Texto'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.storyWrapper}>
                            <div className={`${styles.storyCard} ${isPassing ? styles.passing : styles.failing}`}>
                                <div className={styles.cardLogo}>XTRI SISU</div>
                                <div className={styles.cardStatus}>
                                    {isPassing ? 'NO PÁREO ✅' : 'NA LUTA 💪'}
                                </div>
                                <div className={styles.cardScore}>
                                    {userScore.toFixed(1)}
                                </div>
                                <div className={styles.cardLabel}>
                                    Sua Nota
                                </div>
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
