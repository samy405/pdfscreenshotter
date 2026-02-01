import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocument } from '../lib/pdfUtils';
import {
  exportPagesToZip,
  type ExportOptions,
  type ExportProgress,
  type ExportResult,
} from '../lib/exportUtils';
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
    startPage,
    setStartPage,
    endPage,
    setEndPage,
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
    if (endPage > numPages) setEndPage(numPages);
    if (startPage > numPages) setStartPage(numPages);
  }, [numPages, endPage, startPage, setStartPage, setEndPage]);

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

  const validateRange = useCallback((): string | null => {
    if (mode !== 'range') return null;
    if (startPage < 1) return 'Start page must be at least 1.';
    if (endPage > numPages) return `End page cannot exceed ${numPages}.`;
    if (startPage > endPage) return 'Start page must be less than or equal to end page.';
    return null;
  }, [mode, startPage, endPage, numPages]);

  const canExport = useMemo(() => {
    const err = validateRange();
    return !err && prefix.trim().length > 0;
  }, [validateRange, prefix]);

  const resetExportState = useCallback(() => {
    setProgress(null);
    setIsExporting(false);
    abortControllerRef.current = null;
  }, []);

  const handleExport = useCallback(async () => {
    const validationError = validateRange();
    if (validationError) {
      onError(validationError);
      return;
    }
    if (!prefix.trim()) {
      onError('Please enter an output filename prefix.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsExporting(true);
    setProgress({ current: 0, total: 0, phase: 'rendering', startPage: 1, endPage: 1 });
    onError('');

    const total = mode === 'range' ? endPage - startPage + 1 : numPages;
    const s = mode === 'range' ? startPage : 1;
    const e = mode === 'range' ? endPage : numPages;
    setProgress({ current: 0, total, phase: 'rendering', startPage: s, endPage: e });

    try {
      const options: ExportOptions = {
        format,
        scale,
        jpgQuality,
        prefix: prefix.trim(),
        ...(mode === 'range' && { startPage: s, endPage: e }),
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
    startPage,
    endPage,
    numPages,
    format,
    scale,
    jpgQuality,
    prefix,
    validateRange,
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
      if (m === 'range') {
        setStartPage(1);
        setEndPage(numPages);
      }
    },
    [numPages, setMode, setStartPage, setEndPage]
  );

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
          <div className={styles.rangeRow}>
            <div className={styles.field}>
              <label htmlFor="start">Start</label>
              <input
                id="start"
                type="number"
                min={1}
                max={numPages}
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value, 10) || 1)}
                disabled={isExporting}
              />
            </div>
            <span className={styles.rangeSep}>–</span>
            <div className={styles.field}>
              <label htmlFor="end">End</label>
              <input
                id="end"
                type="number"
                min={1}
                max={numPages}
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value, 10) || numPages)}
                disabled={isExporting}
              />
            </div>
          </div>
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
          {isExporting ? 'Exporting…' : mode === 'range' ? `Export pages ${startPage}–${endPage}` : 'Export all pages'}
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
