'use client';

import { BookOpen, Compass, ExternalLink, LineChart, Menu, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './XtriHeader.module.css';

interface XtriHeaderProps {
  onOpenScores: () => void;
  onExplore?: () => void;
  onSearch?: () => void;
  showPlan?: boolean;
}

export default function XtriHeader({
  onOpenScores,
  onExplore,
  onSearch,
  showPlan = false,
}: XtriHeaderProps) {
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
          <span><strong>XTRI</strong> SISU</span>
        </a>

        {onSearch && (
          <button type="button" className={styles.searchTrigger} onClick={onSearch}>
            <Search size={18} aria-hidden="true" />
            <span>Curso, universidade ou cidade</span>
          </button>
        )}

        <div className={styles.desktopLinks}>
          {onExplore ? (
            <button type="button" onClick={onExplore}>
              <Compass size={18} aria-hidden="true" /> Explorar
            </button>
          ) : (
            <a href="#results"><Compass size={18} aria-hidden="true" /> Explorar</a>
          )}
          {showPlan && (
            <a className={styles.activeLink} href="#plan">
              <LineChart size={18} aria-hidden="true" /> Meu plano
            </a>
          )}
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

      {menuOpen && (
        <div id="mobile-navigation" className={styles.mobileMenu}>
          {onSearch && (
            <button type="button" onClick={() => { onSearch(); closeMenu(); }}>
              <Search size={18} aria-hidden="true" /> Buscar outro curso
            </button>
          )}
          {onExplore ? (
            <button type="button" onClick={() => { onExplore(); closeMenu(); }}>
              <Compass size={18} aria-hidden="true" /> Explorar ofertas
            </button>
          ) : (
            <a href="#results" onClick={closeMenu}><Compass size={18} aria-hidden="true" /> Explorar ofertas</a>
          )}
          {showPlan && (
            <a className={styles.mobileActive} href="#plan" onClick={closeMenu}>
              <LineChart size={18} aria-hidden="true" /> Meu plano de pontos
            </a>
          )}
          <a href="https://xtri.online" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
            XTRI <ExternalLink size={16} aria-hidden="true" />
          </a>
          <a href="https://rankingenem.com" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
            Ranking ENEM para escolas <ExternalLink size={16} aria-hidden="true" />
          </a>
          <a href="https://instagram.com/xandaoxtri" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
            Instagram @xandaoxtri <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      )}
    </header>
  );
}
