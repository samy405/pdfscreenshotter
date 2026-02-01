import type { ExportProgress } from '../lib/exportUtils';
import styles from './ProgressOverlay.module.css';

type Props = {
  progress: ExportProgress;
  onCancel: () => void;
};

export function ProgressOverlay({ progress, onCancel }: Props) {
  const { current, total, phase, currentPage } = progress;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.label}>
            {phase === 'rendering'
              ? `Rendering page ${current} of ${total}${currentPage != null ? ` (PDF page ${currentPage})` : ''}`
              : 'Creating ZIP…'}
          </span>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          aria-label="Cancel export"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
