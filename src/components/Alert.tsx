import styles from './Alert.module.css';

type Props = {
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
};

export function Alert({ message, variant = 'error', onDismiss }: Props) {
  return (
    <div
      className={`${styles.alert} ${styles[variant]}`}
      role="alert"
    >
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
