import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocument } from '../lib/pdfUtils';
import { getPageCount, renderPageToCanvas } from '../lib/pdfUtils';
import styles from './PreviewPanel.module.css';

const THUMBNAIL_COUNT = 6;
const THUMBNAIL_SCALE = 0.5;
const LARGE_PREVIEW_SCALE = 2;

type Props = {
  pdf: PDFDocument;
  file: File;
};

export function PreviewPanel({ pdf, file }: Props) {
  const numPages = getPageCount(pdf);
  const [selectedPage, setSelectedPage] = useState(1);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);

  const thumbCount = Math.min(THUMBNAIL_COUNT, numPages);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    let cancelled = false;

    const load = async () => {
      for (let i = 1; i <= thumbCount; i++) {
        if (cancelled) return;
        try {
          await renderPageToCanvas(pdf, i, canvas, THUMBNAIL_SCALE);
          if (cancelled) return;
          const dataUrl = canvas.toDataURL('image/png');
          setThumbnails((prev) => ({ ...prev, [i]: dataUrl }));
        } catch {
          // ignore
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [pdf, thumbCount]);

  useEffect(() => {
    if (!pdf || !largeCanvasRef.current) return;
    renderPageToCanvas(pdf, selectedPage, largeCanvasRef.current, LARGE_PREVIEW_SCALE).catch(console.error);
  }, [pdf, selectedPage]);

  const goPrev = useCallback(() => {
    setSelectedPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setSelectedPage((p) => Math.min(numPages, p + 1));
  }, [numPages]);

  if (!pdf || !file) return null;

  return (
    <section className={styles.container} aria-label="PDF Preview">
      <div className={styles.header}>
        <span className={styles.filename}>{file.name}</span>
        <span className={styles.pageCount}>{numPages} page{numPages !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.thumbnails}>
        {Array.from({ length: thumbCount }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            className={`${styles.thumb} ${selectedPage === pageNum ? styles.thumbActive : ''}`}
            onClick={() => setSelectedPage(pageNum)}
          >
            {thumbnails[pageNum] ? (
              <img src={thumbnails[pageNum]} alt={`Page ${pageNum}`} />
            ) : (
              <span className={styles.thumbPlaceholder}>{pageNum}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.largePreview}>
        <canvas ref={largeCanvasRef} className={styles.canvas} />
        <div className={styles.nav}>
          <button
            type="button"
            onClick={goPrev}
            disabled={selectedPage <= 1}
            className={styles.navBtn}
            aria-label="Previous page"
          >
            ←
          </button>
          <span className={styles.pageLabel}>
            Page {selectedPage} of {numPages}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={selectedPage >= numPages}
            className={styles.navBtn}
            aria-label="Next page"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
