'use client';

import { BookOpen, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './XtriHeader.module.css';

interface XtriHeaderProps {
  onOpenScores: () => void;
}

export default function XtriHeader({ onOpenScores }: XtriHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegação principal">
        <a className={styles.brand} href="#top" aria-label="XTRI SISU — início" onClick={closeMenu}>
          <img src="/xtri-logo.png" alt="" />
          <span>XTRI SISU</span>
        </a>

        <div className={styles.desktopLinks}>
          <a className={styles.activeLink} href="#top">Início</a>
          <a href="#results">SISU 2026</a>
          <a href="#about">Sobre</a>
          <a href="mailto:contato@xtri.online">Contato</a>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.scoresButton} onClick={onOpenScores}>
            <BookOpen size={18} aria-hidden="true" />
            Minhas Notas
          </button>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(value => !value)}
          >
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-navigation"
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <a className={styles.mobileActive} href="#top" onClick={closeMenu}>Início</a>
        <a href="#results" onClick={closeMenu}>SISU 2026</a>
        <a href="#about" onClick={closeMenu}>Sobre</a>
        <a href="mailto:contato@xtri.online" onClick={closeMenu}>Contato</a>
      </div>
    </header>
  );
}
