import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocument } from '../lib/pdfUtils';
import {
  exportPagesToZip,
  type ExportOptions,
  type ExportProgress,
  type ExportResult,
} from '../lib/exportUtils';
import {
  expandRangesToPages,
  formatPageListForDisplay,
  validateRanges,
} from '../lib/rangeUtils';
import {
  type ExportFormat,
  type ExportMode,
  SCALE_PRESETS,
} from '../types';
import { useExportSettings } from '../context/ExportSettingsContext';
import { ProgressOverlay } from './ProgressOverlay';
import styles from './ExportControls.module.css';

function getFilenameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

type Props = {
  pdf: PDFDocument;
  file: File;
  onError: (message: string) => void;
  onSuccess: (result: ExportResult) => void;
  abortRef?: React.MutableRefObject<(() => void) | null>;
};

export function ExportControls({ pdf, file, onError, onSuccess, abortRef }: Props) {
  const numPages = pdf.numPages;
  const settings = useExportSettings();

  const {
    mode,
    setMode,
    ranges,
    addRange,
    removeRange,
    updateRange,
    format,
    setFormat,
    jpgQuality,
    setJpgQuality,
    scalePreset,
    setScalePreset,
    prefix,
    setPrefix,
    scale,
  } = settings;

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPrefix(getFilenameWithoutExtension(file.name));
  }, [file.name, setPrefix]);

  useEffect(() => {
    if (abortRef) {
      abortRef.current = () => abortControllerRef.current?.abort();
    }
    return () => {
      if (abortRef) abortRef.current = null;
    };
  }, [abortRef]);

  const validationError = useMemo(
    () => (mode === 'range' ? validateRanges(ranges, numPages) : null),
    [mode, ranges, numPages]
  );

  const expandedPages = useMemo(
    () => (mode === 'range' ? expandRangesToPages(ranges) : []),
    [mode, ranges]
  );

  const canExport = useMemo(() => {
    if (prefix.trim().length === 0) return false;
    if (mode === 'all') return true;
    return !validationError && expandedPages.length > 0;
  }, [mode, prefix, validationError, expandedPages]);

  const resetExportState = useCallback(() => {
    setProgress(null);
    setIsExporting(false);
    abortControllerRef.current = null;
  }, []);

  const handleExport = useCallback(async () => {
    if (validationError) {
      onError(validationError);
      return;
    }
    if (!prefix.trim()) {
      onError('Please enter an output filename prefix.');
      return;
    }

    const pageNumbers = mode === 'all'
      ? Array.from({ length: numPages }, (_, i) => i + 1)
      : expandedPages;

    if (pageNumbers.length === 0) {
      onError('No pages to export.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsExporting(true);
    setProgress({ current: 0, total: pageNumbers.length, phase: 'rendering' });
    onError('');

    try {
      const options: ExportOptions = {
        format,
        scale,
        jpgQuality,
        prefix: prefix.trim(),
        pageNumbers,
      };
      const result = await exportPagesToZip(pdf, options, setProgress, controller.signal);
      setProgress(null);
      setIsExporting(false);
      abortControllerRef.current = null;
      onSuccess(result);
    } catch (err) {
      resetExportState();
      if (err instanceof DOMException && err.name === 'AbortError') {
        onError('Export canceled.');
      } else {
        const message = err instanceof Error ? err.message : String(err);
        onError(`Export failed: ${message}`);
      }
    }
  }, [
    pdf,
    mode,
    numPages,
    expandedPages,
    format,
    scale,
    jpgQuality,
    prefix,
    validationError,
    onError,
    onSuccess,
    resetExportState,
  ]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    resetExportState();
  }, [resetExportState]);

  const handleModeChange = useCallback(
    (m: ExportMode) => {
      setMode(m);
      if (m === 'range' && ranges.length === 0) {
        addRange();
      }
    },
    [setMode, ranges.length, addRange]
  );

  const exportButtonLabel = useMemo(() => {
    if (isExporting) return 'Exporting…';
    if (mode === 'all') return 'Export all pages';
    const n = expandedPages.length;
    return n === 0 ? 'Export pages' : `Export ${n} page${n !== 1 ? 's' : ''}`;
  }, [isExporting, mode, expandedPages.length]);

  return (
    <section className={styles.container} aria-label="Export settings">
      <div className={styles.panel}>
        <div className={styles.field}>
          <label>Mode</label>
          <div className={styles.radioGroup}>
            <label className={styles.radio}>
              <input
                type="radio"
                name="mode"
                checked={mode === 'all'}
                onChange={() => handleModeChange('all')}
                disabled={isExporting}
              />
              All pages
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="mode"
                checked={mode === 'range'}
                onChange={() => handleModeChange('range')}
                disabled={isExporting}
              />
              Range
            </label>
          </div>
        </div>

        {mode === 'range' && (
          <>
            <div className={styles.rangeList}>
              {ranges.map((r) => (
                <div key={r.id} className={styles.rangeRow}>
                  <div className={styles.field}>
                    <label htmlFor={`start-${r.id}`}>Start</label>
                    <input
                      id={`start-${r.id}`}
                      type="number"
                      min={1}
                      max={numPages}
                      value={r.start}
                      onChange={(e) => updateRange(r.id, { start: parseInt(e.target.value, 10) || 1 })}
                      disabled={isExporting}
                    />
                  </div>
                  <span className={styles.rangeSep}>–</span>
                  <div className={styles.field}>
                    <label htmlFor={`end-${r.id}`}>End</label>
                    <input
                      id={`end-${r.id}`}
                      type="number"
                      min={1}
                      max={numPages}
                      value={r.end}
                      onChange={(e) => updateRange(r.id, { end: parseInt(e.target.value, 10) || numPages })}
                      disabled={isExporting}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeRange(r.id)}
                    disabled={isExporting || ranges.length <= 1}
                    aria-label={`Remove range ${r.start}–${r.end}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.addRangeBtn}
              onClick={addRange}
              disabled={isExporting}
            >
              + Add range
            </button>
            {expandedPages.length > 0 && (
              <div className={styles.rangeSummary}>
                <p className={styles.pagesList}>
                  Pages to export: {formatPageListForDisplay(expandedPages)}
                </p>
                <p className={styles.totalPages}>
                  Total pages selected: {expandedPages.length}
                </p>
              </div>
            )}
          </>
        )}

        <div className={styles.field}>
          <label htmlFor="prefix">Output prefix</label>
          <input
            id="prefix"
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Filename without extension"
            disabled={isExporting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="format">Format</label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            disabled={isExporting}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </div>

        {format === 'jpg' && (
          <div className={styles.field}>
            <label htmlFor="quality">
              JPG quality <span className={styles.hint}>{(jpgQuality * 100).toFixed(0)}%</span>
            </label>
            <input
              id="quality"
              type="range"
              min={0.6}
              max={0.95}
              step={0.05}
              value={jpgQuality}
              onChange={(e) => setJpgQuality(parseFloat(e.target.value))}
              disabled={isExporting}
            />
          </div>
        )}

        <div className={styles.field}>
          <label>Scale</label>
          <div className={styles.scaleGroup}>
            {(['standard', 'high', 'ultra'] as const).map((preset) => (
              <label key={preset} className={styles.radio}>
                <input
                  type="radio"
                  name="scale"
                  checked={scalePreset === preset}
                  onChange={() => setScalePreset(preset)}
                  disabled={isExporting}
                />
                {preset === 'standard' && `Standard (${SCALE_PRESETS.standard}×)`}
                {preset === 'high' && `High (${SCALE_PRESETS.high}×)`}
                {preset === 'ultra' && `Ultra (${SCALE_PRESETS.ultra}×)`}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={isExporting || !canExport}
        >
          {exportButtonLabel}
        </button>
      </div>

      {progress && (
        <ProgressOverlay
          progress={progress}
          onCancel={handleCancel}
        />
      )}
    </section>
  );
}
