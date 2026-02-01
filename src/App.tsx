import { useCallback, useRef, useState } from 'react';
import type { PDFDocument } from './lib/pdfUtils';
import type { ExportResult } from './lib/exportUtils';
import { ThemeProvider } from './context/ThemeContext';
import { ExportSettingsProvider } from './context/ExportSettingsContext';
import { AutoCaptureProvider } from './context/AutoCaptureContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { UploadPanel } from './components/UploadPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ExportControls } from './components/ExportControls';
import { PdfViewer } from './components/PdfViewer';
import { CapturedGallery } from './components/CapturedGallery';
import { PasswordModal } from './components/PasswordModal';
import { Toast } from './components/Toast';
import { Alert } from './components/Alert';
import { useExportSettings } from './context/ExportSettingsContext';
import styles from './App.module.css';

type AutoCaptureContentProps = {
  pdf: PDFDocument;
  file: File;
  onError: (message: string) => void;
  onSuccess: (result: ExportResult) => void;
  onClear: () => void;
  exportAbortRef: React.MutableRefObject<(() => void) | null>;
};

function AutoCaptureContent({
  pdf,
  file,
  onError,
  onSuccess,
  onClear,
  exportAbortRef,
}: AutoCaptureContentProps) {
  const { mode } = useExportSettings();
  if (mode === 'autoCapture') {
    return (
      <AutoCaptureProvider>
        <ExportControls
          pdf={pdf}
          file={file}
          onError={onError}
          onSuccess={onSuccess}
          abortRef={exportAbortRef}
        />
        <PdfViewer pdf={pdf} file={file} onError={onError} />
        <CapturedGallery onSuccess={onSuccess} onError={onError} />
        <button type="button" className={styles.clearBtn} onClick={onClear}>
          Clear / Upload another PDF
        </button>
      </AutoCaptureProvider>
    );
  }
  return (
    <>
      <ExportControls
        pdf={pdf}
        file={file}
        onError={onError}
        onSuccess={onSuccess}
        abortRef={exportAbortRef}
      />
      <PreviewPanel pdf={pdf} file={file} />
      <button type="button" className={styles.clearBtn} onClick={onClear}>
        Clear / Upload another PDF
      </button>
    </>
  );
}

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
    if (pdf) {
      pdf.destroy().catch(() => {});
    }
    setPdf(null);
    setFile(null);
    setError('');
    setPasswordFile(null);
    setSuccessResult(null);
  }, [pdf]);

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
        <AutoCaptureContent
          pdf={pdf}
          file={file}
          onError={setError}
          onSuccess={handleSuccess}
          onClear={handleClear}
          exportAbortRef={exportAbortRef}
        />
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
    <ErrorBoundary>
      <ThemeProvider>
        <ExportSettingsProvider>
          <AppContent />
        </ExportSettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
