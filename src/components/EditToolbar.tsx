import type { AnnotationKind } from '../types';
import styles from './EditToolbar.module.css';

type Props = {
  currentTool: AnnotationKind | null;
  onToolChange: (tool: AnnotationKind | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  onRotate: () => void;
  onSignatureClick?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
};

const TOOLS: { value: AnnotationKind; label: string }[] = [
  { value: 'highlight', label: 'Highlight' },
  { value: 'pen', label: 'Pen' },
  { value: 'text', label: 'Text' },
  { value: 'redaction', label: 'Redaction' },
  { value: 'eraser', label: 'Eraser' },
];

export function EditToolbar({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  onRotate,
  onSignatureClick,
  canUndo,
  canRedo,
  disabled,
}: Props) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Edit tools">
      <div className={styles.toolGroup}>
        {TOOLS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`${styles.toolBtn} ${currentTool === value ? styles.toolBtnActive : ''}`}
            onClick={() => onToolChange(currentTool === value ? null : value)}
            disabled={disabled}
            title={label}
            aria-pressed={currentTool === value}
          >
            {label}
          </button>
        ))}
      </div>
      {onSignatureClick && (
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={onSignatureClick}
            disabled={disabled}
            title="Add signature"
          >
            Signature
          </button>
        </div>
      )}
      <div className={styles.toolGroup}>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={onUndo}
          disabled={disabled || !canUndo}
          title="Undo annotation"
        >
          Undo
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={onRedo}
          disabled={disabled || !canRedo}
          title="Redo annotation"
        >
          Redo
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={onRotate}
          disabled={disabled}
          title="Rotate page 90°"
        >
          Rotate
        </button>
      </div>
    </div>
  );
}
