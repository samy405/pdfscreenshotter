import { useCallback, useState } from 'react';
import { useAutoCapture } from '../context/AutoCaptureContext';
import { useExportSettings } from '../context/ExportSettingsContext';
import { exportCapturedToZip } from '../lib/exportUtils';
import type { ExportResult } from '../lib/exportUtils';
import styles from './CapturedGallery.module.css';

type Props = {
  onSuccess: (result: ExportResult) => void;
  onError: (message: string) => void;
};

export function CapturedGallery({ onSuccess, onError }: Props) {
  const {
    captures,
    capturingSet,
    capturedPageNumbers,
    selectedForExport,
    toggleSelected,
    selectAllCaptured,
    deselectAllCaptured,
    removeSelectedCaptures,
    clearAllCaptures,
    scrollToPage,
  } = useAutoCapture();
  const { format, prefix } = useExportSettings();
  const [isExporting, setIsExporting] = useState(false);

  const selectedCount = capturedPageNumbers.filter(
    (pn) => captures.has(pn) && selectedForExport.has(pn)
  ).length;
  const capturedCount = capturedPageNumbers.length;

  const handleExport = useCallback(async () => {
    const selected = capturedPageNumbers.filter(
      (pn) => captures.has(pn) && selectedForExport.has(pn)
    );
    if (selected.length === 0) {
      onError('No pages selected. Select at least one captured page to export.');
      return;
    }
    if (!prefix.trim()) {
      onError('Please enter an output filename prefix in Export settings.');
      return;
    }
    setIsExporting(true);
    onError('');
    try {
      const result = await exportCapturedToZip(captures, selected, {
        format,
        prefix: prefix.trim(),
      });
      onSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  }, [
    captures,
    capturedPageNumbers,
    selectedForExport,
    format,
    prefix,
    onSuccess,
    onError,
  ]);

  if (capturedCount === 0) {
    return (
      <section className={styles.container} aria-label="Captured Pages">
        <h3 className={styles.title}>Captured Pages</h3>
        <p className={styles.empty}>No pages captured yet. Scroll through the PDF viewer to capture pages automatically.</p>
      </section>
    );
  }

  return (
    <section className={styles.container} aria-label="Captured Pages">
      <h3 className={styles.title}>Captured Pages</h3>
      <p className={styles.summary}>
        Captured: {capturedCount} page{capturedCount !== 1 ? 's' : ''} | Selected: {selectedCount}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={selectAllCaptured}
          disabled={isExporting}
        >
          Select all
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={deselectAllCaptured}
          disabled={isExporting}
        >
          Deselect all
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={removeSelectedCaptures}
          disabled={isExporting || selectedCount === 0}
        >
          Remove selected
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={clearAllCaptures}
          disabled={isExporting}
        >
          Clear all
        </button>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={isExporting || selectedCount === 0}
        >
          {isExporting ? 'Exporting…' : 'Export selected to ZIP'}
        </button>
      </div>
      <div className={styles.grid}>
        {capturedPageNumbers.map((pageNum) => {
          const capture = captures.get(pageNum);
          const isCapturing = capturingSet.has(pageNum);
          const selected = captures.has(pageNum) && selectedForExport.has(pageNum);
          return (
            <div key={pageNum} className={styles.item}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelected(pageNum)}
                  disabled={isExporting || isCapturing}
                />
                <span className={styles.pageNum}>Page {pageNum}</span>
              </label>
              {isCapturing ? (
                <div className={styles.placeholderTile} aria-busy="true">
                  <div className={styles.placeholderShimmer} />
                  <span className={styles.placeholderLabel}>Capturing page {pageNum}…</span>
                </div>
              ) : capture ? (
                <button
                  type="button"
                  className={styles.thumbBtn}
                  onClick={() => scrollToPage?.(pageNum)}
                  title={`Go to page ${pageNum}`}
                >
                  <img src={capture.thumbnailUrl} alt={`Page ${pageNum}`} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
