import { useCallback, useState } from 'react';
import type { PDFDocument } from '../lib/pdfUtils';
import { loadPdf } from '../lib/pdfUtils';
import styles from './UploadPanel.module.css';

type Props = {
  onPdfLoaded: (pdf: PDFDocument, file: File) => void;
  onError: (message: string) => void;
  onPasswordRequired: (file: File) => void;
};

export function UploadPanel({ onPdfLoaded, onError, onPasswordRequired }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tryLoadPdf = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        onError('Please select a PDF file.');
        return;
      }

      setIsLoading(true);
      onError('');

      try {
        const pdf = await loadPdf(file);
        onPdfLoaded(pdf, file);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('Password') || message.includes('password')) {
          onPasswordRequired(file);
          onError('This PDF is encrypted. Enter the password to open it.');
        } else {
          onError(`Failed to load PDF: ${message}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onPdfLoaded, onError, onPasswordRequired]
  );

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      tryLoadPdf(file);
    },
    [tryLoadPdf]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      handleFile(file ?? null);
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <section className={styles.container} aria-label="Upload PDF">
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${isLoading ? styles.loading : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          disabled={isLoading}
          className={styles.input}
          aria-label="Choose PDF file"
        />
        {isLoading ? (
          <p className={styles.hint}>Loading PDF…</p>
        ) : (
          <p className={styles.hint}>Drop a PDF here or click to browse</p>
        )}
      </div>
      <p className={styles.note}>
        Optimized for PDFs up to ~50 pages. Higher scale = larger ZIP.
      </p>
    </section>
  );
}
