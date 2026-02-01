import { useCallback, useRef, useState } from 'react';
import type { PDFDocument } from './lib/pdfUtils';
import type { ExportResult } from './lib/exportUtils';
import { ThemeProvider } from './context/ThemeContext';
import { ExportSettingsProvider } from './context/ExportSettingsContext';
import { AppShell } from './components/AppShell';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ExportControls } from './components/ExportControls';
import { PasswordModal } from './components/PasswordModal';
import { Toast } from './components/Toast';
import { Alert } from './components/Alert';
import styles from './App.module.css';

function AppContent() {
  const [pdf, setPdf] = useState<PDFDocument | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [passwordFile, setPasswordFile] = useState<File | null>(null);
  const [successResult, setSuccessResult] = useState<ExportResult | null>(null);
  const exportAbortRef = useRef<(() => void) | null>(null);

  const handlePdfLoaded = useCallback((loadedPdf: PDFDocument, loadedFile: File) => {
    setPdf(loadedPdf);
    setFile(loadedFile);
    setError('');
    setPasswordFile(null);
  }, []);

  const handlePasswordRequired = useCallback((f: File) => {
    setPasswordFile(f);
    setError('This PDF is encrypted. Enter the password to open it.');
  }, []);

  const handlePasswordSuccess = useCallback((loadedPdf: PDFDocument, loadedFile: File) => {
    setPdf(loadedPdf);
    setFile(loadedFile);
    setError('');
    setPasswordFile(null);
  }, []);

  const handlePasswordCancel = useCallback(() => {
    setPasswordFile(null);
    setError('');
  }, []);

  const handleClear = useCallback(() => {
    exportAbortRef.current?.();
    setPdf(null);
    setFile(null);
    setError('');
    setPasswordFile(null);
    setSuccessResult(null);
  }, []);

  const handleSuccess = useCallback((result: ExportResult) => {
    setSuccessResult(result);
    setError('');
  }, []);

  const dismissSuccess = useCallback(() => setSuccessResult(null), []);
  const dismissError = useCallback(() => setError(''), []);

  return (
    <AppShell>
      <UploadPanel
        onPdfLoaded={handlePdfLoaded}
        onError={setError}
        onPasswordRequired={handlePasswordRequired}
      />

      {error && (
        <Alert message={error} onDismiss={dismissError} />
      )}

      {pdf && file && (
        <>
          <PreviewPanel pdf={pdf} file={file} />
          <ExportControls
            pdf={pdf}
            file={file}
            onError={setError}
            onSuccess={handleSuccess}
            abortRef={exportAbortRef}
          />
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
          >
            Clear / Upload another PDF
          </button>
        </>
      )}

      {passwordFile && (
        <PasswordModal
          file={passwordFile}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
          onError={setError}
        />
      )}

      {successResult && (
        <Toast result={successResult} onDismiss={dismissSuccess} />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ExportSettingsProvider>
        <AppContent />
      </ExportSettingsProvider>
    </ThemeProvider>
  );
}
