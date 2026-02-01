import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PDFDocument } from '../lib/pdfUtils';
import { renderPageToCanvas } from '../lib/pdfUtils';
import {
  getActivePageFromIntersections,
  debounceActivePage,
  compositeCanvasesToBlob,
  createThumbnailBlob,
} from '../lib/captureUtils';
import type { ExportFormat } from '../types';
import type { Annotation } from '../types';
import { useAutoCapture } from '../context/AutoCaptureContext';
import { useExportSettings } from '../context/ExportSettingsContext';
import { AnnotationLayer } from './AnnotationLayer';
import { EditToolbar } from './EditToolbar';
import type { AnnotationKind } from '../types';
import styles from './PdfViewer.module.css';

const DEBOUNCE_MS = 150;

type Props = {
  pdf: PDFDocument;
  file: File;
  onError: (message: string) => void;
};

export function PdfViewer({ pdf, file, onError }: Props) {
  const numPages = pdf.numPages;
  const {
    scale,
    format,
    jpgQuality,
  } = useExportSettings();
  const capture = useAutoCapture();
  const {
    capturedSet,
    capturingSet,
    annotations,
    appendAnnotation,
    removeLastAnnotation,
    undoAnnotation,
    redoAnnotation,
    canUndo,
    canRedo,
    setPageRotation,
    pageRotations,
    autoCaptureEnabled,
    setAutoCaptureEnabled,
    activePage,
    setActivePage,
    addCapturing,
    removeCapturing,
    addCapture,
    removeCapture,
    setCapture,
    setScrollToPage,
  } = capture;

  const [currentTool, setCurrentTool] = useState<AnnotationKind | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const intersectionRatios = useRef<Map<number, number>>(new Map());
  const activePageRef = useRef<number | null>(activePage);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialCaptureDone = useRef(false);
  const capturingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  activePageRef.current = activePage;

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(pageNum, el);
    else pageRefs.current.delete(pageNum);
  }, []);

  useEffect(() => {
    const scroll = (pageNum: number) => {
      pageRefs.current.get(pageNum)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    setScrollToPage(scroll);
    return () => setScrollToPage(null);
  }, [setScrollToPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const opts: IntersectionObserverInit = {
      root: container,
      rootMargin: '0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const pageNum = Number((e.target as HTMLElement).dataset.pageNumber);
        if (Number.isNaN(pageNum)) continue;
        const ratio = e.intersectionRatio;
        intersectionRatios.current.set(pageNum, ratio);
      }
      const active = getActivePageFromIntersections(
        intersectionRatios.current,
        activePageRef.current
      );
      const next = active ?? null;
      if (next === activePageRef.current) return;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setActivePage(next);
      });
    }, opts);
    observerRef.current = observer;
    Array.from(pageRefs.current.entries()).forEach(([, el]) => observer.observe(el));
    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [numPages, setActivePage]);

  const performCapture = useCallback(
    async (pageNum: number, replace = false) => {
      if (capturingRef.current) return;
      capturingRef.current = true;
      if (!replace) addCapturing(pageNum);
      const pdfCanvas = document.createElement('canvas');
      const overlayCanvas = document.createElement('canvas');
      try {
        const rotation = pageRotations[pageNum] ?? 0;
        await renderPageToCanvas(pdf, pageNum, pdfCanvas, scale, rotation);
        const w = pdfCanvas.width;
        const h = pdfCanvas.height;
        overlayCanvas.width = w;
        overlayCanvas.height = h;
        const annList = annotations[pageNum] ?? [];
        if (annList.length > 0) {
          const ctx = overlayCanvas.getContext('2d');
          if (ctx) {
            for (const a of annList) {
              switch (a.kind) {
                case 'highlight':
                  ctx.fillStyle = `rgba(255, 255, 0, ${a.opacity ?? 0.35})`;
                  ctx.fillRect(a.x, a.y, a.width, a.height);
                  break;
                case 'pen':
                  if (a.points.length >= 2) {
                    ctx.strokeStyle = a.color;
                    ctx.lineWidth = a.strokeWidth;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(a.points[0].x, a.points[0].y);
                    for (let i = 1; i < a.points.length; i++) {
                      ctx.lineTo(a.points[i].x, a.points[i].y);
                    }
                    ctx.stroke();
                  }
                  break;
                case 'text':
                  ctx.font = `${a.fontSize}px sans-serif`;
                  ctx.fillStyle = a.color;
                  ctx.fillText(a.text, a.x, a.y + a.fontSize);
                  break;
                case 'redaction':
                  ctx.fillStyle = '#000';
                  ctx.fillRect(a.x, a.y, a.width, a.height);
                  break;
                default:
                  break;
              }
            }
          }
        }
        const fullBlob = await compositeCanvasesToBlob(
          pdfCanvas,
          overlayCanvas,
          format as ExportFormat,
          jpgQuality
        );
        const thumbBlob = await createThumbnailBlob(fullBlob);
        const thumbnailUrl = URL.createObjectURL(thumbBlob);
        if (replace) {
          setCapture(pageNum, { fullSizeBlob: fullBlob, thumbnailUrl });
        } else {
          addCapture(pageNum, { fullSizeBlob: fullBlob, thumbnailUrl });
        }
      } catch (err) {
        if (!replace) removeCapturing(pageNum);
        const msg = err instanceof Error ? err.message : String(err);
        onError(`Capture failed: ${msg}`);
      } finally {
        capturingRef.current = false;
      }
    },
    [
      pdf,
      addCapturing,
      removeCapturing,
      scale,
      format,
      jpgQuality,
      pageRotations,
      annotations,
      addCapture,
      setCapture,
      onError,
    ]
  );

  const debouncedOnActive = useMemo(
    () =>
      debounceActivePage<number | null>(DEBOUNCE_MS, (page) => {
        if (page == null) return;
        if (!autoCaptureEnabled) return;
        if (capturedSet.has(page) || capturingSet.has(page)) return;
        performCapture(page);
      }),
    [autoCaptureEnabled, capturedSet, capturingSet, performCapture]
  );

  useEffect(() => {
    debouncedOnActive(activePage);
  }, [activePage, debouncedOnActive]);

  useEffect(() => {
    if (initialCaptureDone.current || numPages === 0) return;
    initialCaptureDone.current = true;
    if (autoCaptureEnabled) {
      debouncedOnActive(1);
    }
  }, [numPages, autoCaptureEnabled, debouncedOnActive]);

  const handleCaptureNow = useCallback(() => {
    if (activePage != null) performCapture(activePage);
  }, [activePage, performCapture]);

  const handleRecapture = useCallback(
    (pageNum: number) => {
      capturingRef.current = false;
      performCapture(pageNum, true);
    },
    [performCapture]
  );

  const [pageDimensions, setPageDimensions] = useState<Record<number, { w: number; h: number }>>({});
  const [textIndicatorPos, setTextIndicatorPos] = useState<{
    pageNum: number;
    x: number;
    y: number;
  } | null>(null);

  /* Fixed viewer scale for stable display; export uses ExportSettings.scale */
  const viewerScale = 1.5;

  const handlePagePointerMoveForText = useCallback(
    (pageNum: number, e: React.PointerEvent) => {
      if (currentTool === 'text') {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTextIndicatorPos({
          pageNum,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        setTextIndicatorPos(null);
      }
    },
    [currentTool]
  );

  const handlePagePointerLeave = useCallback(() => {
    setTextIndicatorPos(null);
  }, []);

  const rotateCurrent = useCallback(() => {
    if (activePage == null) return;
    const current = pageRotations[activePage] ?? 0;
    setPageRotation(activePage, current + 90);
  }, [activePage, pageRotations, setPageRotation]);

  const drawRef = useRef<{
    startX: number;
    startY: number;
    points: { x: number; y: number }[];
  } | null>(null);

  const getCanvasCoords = useCallback(
    (pageNum: number, e: React.MouseEvent) => {
      const el = pageRefs.current.get(pageNum);
      if (!el) return null;
      const canvasEl = el.querySelector('canvas');
      if (!canvasEl) return null;
      const cr = canvasEl.getBoundingClientRect();
      const scaleX = (canvasEl as HTMLCanvasElement).width / cr.width;
      const scaleY = (canvasEl as HTMLCanvasElement).height / cr.height;
      return {
        x: (e.clientX - cr.left) * scaleX,
        y: (e.clientY - cr.top) * scaleY,
      };
    },
    []
  );

  const handlePagePointerDown = useCallback(
    (pageNum: number, e: React.PointerEvent) => {
      if (currentTool === 'eraser') {
        removeLastAnnotation(pageNum);
        return;
      }
      if (!currentTool) return;
      const coords = getCanvasCoords(pageNum, e as unknown as React.MouseEvent);
      if (!coords) return;
      if (currentTool === 'pen') {
        drawRef.current = { startX: coords.x, startY: coords.y, points: [coords] };
      } else if (currentTool === 'highlight' || currentTool === 'redaction') {
        drawRef.current = { startX: coords.x, startY: coords.y, points: [] };
      } else if (currentTool === 'text') {
        const text = window.prompt('Text note:');
        if (text != null && text.trim()) {
          appendAnnotation(pageNum, {
            kind: 'text',
            x: coords.x,
            y: coords.y,
            text: text.trim(),
            fontSize: 16,
            color: '#000',
          });
        }
      }
    },
    [currentTool, getCanvasCoords, appendAnnotation, removeLastAnnotation]
  );

  const handlePagePointerMove = useCallback(
    (pageNum: number, e: React.PointerEvent) => {
      handlePagePointerMoveForText(pageNum, e);
      if (!currentTool || !drawRef.current) return;
      const coords = getCanvasCoords(pageNum, e as unknown as React.MouseEvent);
      if (!coords) return;
      if (currentTool === 'pen' && drawRef.current.points.length > 0) {
        drawRef.current.points.push(coords);
      }
    },
    [currentTool, getCanvasCoords, handlePagePointerMoveForText]
  );

  const handlePagePointerUp = useCallback(
    (pageNum: number, e: React.PointerEvent) => {
      if (!currentTool || currentTool === 'eraser') return;
      const dr = drawRef.current;
      drawRef.current = null;
      if (!dr) return;
      if (currentTool === 'pen' && dr.points.length >= 2) {
        appendAnnotation(pageNum, {
          kind: 'pen',
          points: dr.points,
          strokeWidth: 2,
          color: '#000',
        });
      } else if (currentTool === 'highlight' || currentTool === 'redaction') {
        const endCoords = getCanvasCoords(pageNum, e as unknown as React.MouseEvent);
        if (!endCoords) return;
        const x = Math.min(dr.startX, endCoords.x);
        const y = Math.min(dr.startY, endCoords.y);
        const width = Math.max(10, Math.abs(endCoords.x - dr.startX));
        const height = Math.max(10, Math.abs(endCoords.y - dr.startY));
        appendAnnotation(pageNum, {
          kind: currentTool === 'highlight' ? 'highlight' : 'redaction',
          x,
          y,
          width,
          height,
          ...(currentTool === 'highlight' ? { opacity: 0.35 } : {}),
        } as Annotation);
      }
    },
    [currentTool, appendAnnotation, getCanvasCoords]
  );

  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const setPageCanvasRef = useCallback((pageNum: number, canvas: HTMLCanvasElement | null) => {
    if (canvas) pageCanvasRefs.current.set(pageNum, canvas);
    else pageCanvasRefs.current.delete(pageNum);
  }, []);

  return (
    <section className={styles.container} aria-label="PDF Viewer (Auto Capture)">
      <div className={styles.header}>
        <span className={styles.filename}>{file.name}</span>
        <span className={styles.pageCount}>{numPages} page{numPages !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.toolbarRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={autoCaptureEnabled}
            onChange={(e) => setAutoCaptureEnabled(e.target.checked)}
          />
          Auto Capture
        </label>
        {!autoCaptureEnabled && (
          <button
            type="button"
            className={styles.captureNowBtn}
            onClick={handleCaptureNow}
            disabled={activePage == null}
          >
            Capture now
          </button>
        )}
        <EditToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          onUndo={() => activePage != null && undoAnnotation(activePage)}
          onRedo={() => activePage != null && redoAnnotation(activePage)}
          onRotate={rotateCurrent}
          canUndo={activePage != null && canUndo(activePage)}
          canRedo={activePage != null && canRedo(activePage)}
        />
      </div>

      <div ref={containerRef} className={styles.scrollContainer}>
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const isActive = activePage === pageNum;
          const alreadyCaptured = capturedSet.has(pageNum);
          const rotation = pageRotations[pageNum] ?? 0;
          return (
            <div
              key={pageNum}
              ref={(el) => setPageRef(pageNum, el)}
              data-page-number={pageNum}
              className={`${styles.pageWrap} ${isActive ? styles.pageActive : ''}`}
            >
              <div className={styles.pageInner}>
                <LazyPageCanvas
                  pdf={pdf}
                  pageNum={pageNum}
                  scale={viewerScale}
                  rotation={rotation}
                  setCanvasRef={(c) => setPageCanvasRef(pageNum, c)}
                  onDimensions={(w, h) =>
                    setPageDimensions((prev) => ({ ...prev, [pageNum]: { w, h } }))
                  }
                />
                <>
                  <AnnotationLayer
                    width={pageDimensions[pageNum]?.w ?? 0}
                    height={pageDimensions[pageNum]?.h ?? 0}
                    annotations={annotations[pageNum] ?? []}
                  />
                  <div
                    className={styles.drawOverlay}
                    onPointerDown={(e) => handlePagePointerDown(pageNum, e)}
                    onPointerMove={(e) => handlePagePointerMove(pageNum, e)}
                    onPointerUp={(e) => handlePagePointerUp(pageNum, e)}
                    onPointerLeave={(e) => {
                      handlePagePointerUp(pageNum, e);
                      handlePagePointerLeave();
                    }}
                    style={{ cursor: currentTool ? 'crosshair' : 'default' }}
                  >
                    {currentTool === 'text' &&
                      textIndicatorPos?.pageNum === pageNum && (
                        <div
                          className={styles.textIndicator}
                          style={{
                            left: textIndicatorPos.x,
                            top: textIndicatorPos.y,
                          }}
                        >
                          <div className={styles.textIndicatorLine} />
                          <span className={styles.textIndicatorLabel}>Text</span>
                        </div>
                      )}
                  </div>
                </>
              </div>
              {isActive && alreadyCaptured && (
                <div className={styles.capturedBanner}>
                  <span>This page was captured already. Undo capture to re-capture after edits.</span>
                  <button
                    type="button"
                    className={styles.undoCaptureBtn}
                    onClick={() => removeCapture(pageNum)}
                  >
                    Undo capture
                  </button>
                </div>
              )}
              {isActive && (
                <div className={styles.pageActions}>
                  {alreadyCaptured && (
                    <>
                      <button
                        type="button"
                        className={styles.smallBtn}
                        onClick={() => removeCapture(pageNum)}
                      >
                        Undo capture
                      </button>
                      <button
                        type="button"
                        className={styles.smallBtn}
                        onClick={() => handleRecapture(pageNum)}
                      >
                        Recapture
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}

type LazyPageCanvasProps = {
  pdf: PDFDocument;
  pageNum: number;
  scale: number;
  rotation: number;
  setCanvasRef: (c: HTMLCanvasElement | null) => void;
  onDimensions: (w: number, h: number) => void;
};

function LazyPageCanvas({
  pdf,
  pageNum,
  scale,
  rotation,
  setCanvasRef,
  onDimensions,
}: LazyPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ setCanvasRef, onDimensions, pdf, pageNum, scale, rotation });
  propsRef.current = { setCanvasRef, onDimensions, pdf, pageNum, scale, rotation };

  const setRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    propsRef.current.setCanvasRef(el);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { pdf: p, pageNum: pn, scale: s, rotation: r, onDimensions: od } = propsRef.current;
    renderPageToCanvas(p, pn, el, s, r)
      .then(() => {
        od(el.width, el.height);
      })
      .catch(console.error);
  }, [pdf, pageNum, scale, rotation]);

  return <canvas ref={setRef} className={styles.pageCanvas} />;
}
