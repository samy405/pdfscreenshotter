import { useEffect } from 'react';
import type { ExportResult } from '../lib/exportUtils';
import styles from './Toast.module.css';

type Props = {
  result: ExportResult;
  onDismiss: () => void;
};

export function Toast({ result, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={styles.toast} role="status">
      <div className={styles.icon}>✓</div>
      <div className={styles.content}>
        <strong>Export complete</strong>
        <p>
          Saved <strong>{result.zipFilename}</strong>
        </p>
        <p className={styles.meta}>
          {result.pageCount} page{result.pageCount !== 1 ? 's' : ''} · {result.format.toUpperCase()} · {result.scale}× scale
        </p>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
