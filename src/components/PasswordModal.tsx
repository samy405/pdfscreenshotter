import { useCallback, useState } from 'react';
import { loadPdfWithPassword } from '../lib/pdfUtils';
import type { PDFDocument } from '../lib/pdfUtils';
import styles from './PasswordModal.module.css';

type Props = {
  file: File;
  onSuccess: (pdf: PDFDocument, file: File) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

export function PasswordModal({ file, onSuccess, onCancel, onError }: Props) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim()) return;

      setIsLoading(true);
      setError(null);

      try {
        const pdf = await loadPdfWithPassword(file, password);
        onSuccess(pdf, file);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('Password') || message.includes('password') || message.includes('Incorrect')) {
          setError('Incorrect password. Please try again.');
        } else {
          onError(`Failed to load PDF: ${message}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [password, file, onSuccess, onError]
  );

  const handleCancel = useCallback(() => {
    setPassword('');
    setError(null);
    onCancel();
  }, [onCancel]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
      <div className={styles.backdrop} onClick={handleCancel} aria-hidden />
      <div className={styles.modal}>
        <h2 id="password-modal-title" className={styles.title}>
          Encrypted PDF
        </h2>
        <p className={styles.subtitle}>
          This PDF is password-protected. Enter the password to continue.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="pdf-password" className={styles.label}>
            Password
          </label>
          <input
            id="pdf-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            autoFocus
            disabled={isLoading}
            className={styles.input}
          />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" onClick={handleCancel} className={styles.cancelBtn} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isLoading || !password.trim()}>
              {isLoading ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
