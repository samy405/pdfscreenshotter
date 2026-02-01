import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { PDFDocument } from './pdfUtils';
import { getPageCount, renderPageToCanvas } from './pdfUtils';
import { sanitizeFilenamePrefix } from './filenameUtils';
import type { ExportFormat } from '../types';

export type ExportOptions = {
  format: ExportFormat;
  scale: number;
  jpgQuality: number;
  prefix: string;
  startPage?: number;
  endPage?: number;
};

export type ExportProgress = {
  current: number;
  total: number;
  phase: 'rendering' | 'zipping';
  startPage: number;
  endPage: number;
};

export type ExportResult = {
  zipFilename: string;
  pageCount: number;
  format: ExportFormat;
  scale: number;
};

function padPageNum(n: number): string {
  return String(n).padStart(3, '0');
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  jpgQuality: number
): Promise<Blob> {
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    const cb = (blob: Blob | null) =>
      blob ? resolve(blob) : reject(new Error(`Failed to create ${format.toUpperCase()} blob`));
    if (format === 'jpg') {
      canvas.toBlob(cb, mime, jpgQuality);
    } else {
      canvas.toBlob(cb, mime);
    }
  });
}

export async function exportPagesToZip(
  pdf: PDFDocument,
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal
): Promise<ExportResult> {
  const numPages = getPageCount(pdf);
  const startPage = options.startPage ?? 1;
  const endPage = options.endPage ?? numPages;
  const total = endPage - startPage + 1;
  const ext = options.format === 'jpg' ? 'jpg' : 'png';
  const safePrefix = sanitizeFilenamePrefix(options.prefix) || 'screenshots';
  const zipFilename = `${safePrefix}_screenshots.zip`;

  const zip = new JSZip();
  const offscreenCanvas = document.createElement('canvas');

  let completed = 0;
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');

    completed += 1;
    onProgress({
      current: completed,
      total,
      phase: 'rendering',
      startPage,
      endPage,
    });

    await renderPageToCanvas(pdf, pageNum, offscreenCanvas, options.scale);

    if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');

    const blob = await canvasToBlob(
      offscreenCanvas,
      options.format,
      options.jpgQuality
    );

    const filename = `page-${padPageNum(pageNum)}.${ext}`;
    zip.file(filename, blob);
  }

  if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');

  onProgress({
    current: total,
    total,
    phase: 'zipping',
    startPage,
    endPage,
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' }, () => {});

  if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');

  saveAs(zipBlob, zipFilename);

  return {
    zipFilename,
    pageCount: total,
    format: options.format,
    scale: options.scale,
  };
}
