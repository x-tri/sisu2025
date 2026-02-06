'use client';

import styles from './Loading.module.css';

interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  circle?: boolean;
}

export function Skeleton({ className, height, width, circle }: SkeletonProps) {
  const style: React.CSSProperties = {
    height: height,
    width: width,
    borderRadius: circle ? '50%' : undefined,
  };

  return (
    <div 
      className={`${styles.skeleton} ${className || ''}`} 
      style={style}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={styles.skeletonText}
          style={{ width: `${100 - (i % 3) * 20}%` }}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={`${styles.skeletonCard} ${className || ''}`}>
      <Skeleton height={24} width="60%" className={styles.skeletonTitle} />
      <SkeletonText lines={3} />
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  return (
    <div 
      className={`${styles.spinner} ${className || ''}`}
      style={{ width: sizeMap[size], height: sizeMap[size] }}
      aria-label="Carregando..."
    />
  );
}

interface LoadingOverlayProps {
  children?: React.ReactNode;
  message?: string;
}

export function LoadingOverlay({ children, message = 'Carregando...' }: LoadingOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayContent}>
        <LoadingSpinner size="lg" />
        {message && <p className={styles.overlayMessage}>{message}</p>}
        {children}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '🔍', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>{icon}</div>
      <h3 className={styles.emptyStateTitle}>{title}</h3>
      {description && <p className={styles.emptyStateText}>{description}</p>}
      {action && <div className={styles.emptyStateAction}>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Erro ao carregar dados', 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorStateIcon}>⚠️</div>
      <h3 className={styles.errorStateTitle}>{title}</h3>
      <p className={styles.errorStateText}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className={styles.retryButton}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
