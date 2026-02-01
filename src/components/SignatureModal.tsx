import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './SignatureModal.module.css';

const STORAGE_KEY = 'screenshotter_last_signature';

export function getSavedSignature(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSignatureToStorage(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl);
  } catch {
    // ignore quota or other errors
  }
}

export function clearSavedSignature(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

type Props = {
  onSave: (imageDataUrl: string) => void;
  onCancel: () => void;
};

export function SignatureModal({
  onSave,
  onCancel,
}: Props) {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<{ ctx: CanvasRenderingContext2D; isDrawing: boolean; lastX: number; lastY: number } | null>(null);
  const [, setRefresh] = useState(0);
  const savedSignature = getSavedSignature();

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio ?? 1, 3) : 1;
  const padWidth = 400;
  const padHeight = 200;
  const canvasWidth = padWidth * dpr;
  const canvasHeight = padHeight * dpr;

  const clearPad = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const initPad = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.clearRect(0, 0, padWidth, padHeight);
  }, [canvasWidth, canvasHeight, dpr, padWidth, padHeight]);

  useEffect(() => {
    if (activeTab === 'draw') {
      initPad();
    }
  }, [activeTab, initPad]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = padWidth / rect.width;
      const scaleY = padHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      ctx.beginPath();
      ctx.moveTo(x, y);
      drawRef.current = { ctx, isDrawing: true, lastX: x, lastY: y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [padWidth, padHeight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dr = drawRef.current;
      if (!dr?.isDrawing) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = padWidth / rect.width;
      const scaleY = padHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      dr.ctx.lineTo(x, y);
      dr.ctx.stroke();
      dr.lastX = x;
      dr.lastY = y;
    },
    [padWidth, padHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (drawRef.current) {
        drawRef.current.isDrawing = false;
      }
    },
    []
  );

  const handleSaveDraw = useCallback(() => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      saveSignatureToStorage(dataUrl);
      onSave(dataUrl);
    }
  }, [onSave]);

  const handleUploadChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type;
    if (type !== 'image/png' && type !== 'image/jpeg' && type !== 'image/jpg') return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSaveUpload = useCallback(() => {
    if (uploadDataUrl) {
      saveSignatureToStorage(uploadDataUrl);
      onSave(uploadDataUrl);
    }
  }, [uploadDataUrl, onSave]);

  const handleReuseLast = useCallback(() => {
    if (savedSignature) {
      onSave(savedSignature);
    }
  }, [savedSignature, onSave]);

  const handleClearSaved = useCallback(() => {
    clearSavedSignature();
    setRefresh((r) => r + 1);
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onCancel();
    },
    [onCancel]
  );

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-modal-title"
    >
      <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden />
      <div className={styles.modal}>
        <h2 id="signature-modal-title" className={styles.title}>
          Add Signature
        </h2>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'draw' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('draw')}
          >
            Draw
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
        </div>
        {activeTab === 'draw' && (
          <div className={styles.drawTab}>
            <div
              className={styles.padWrap}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                className={styles.pad}
                width={canvasWidth}
                height={canvasHeight}
                style={{ width: padWidth, height: padHeight }}
                aria-label="Signature drawing pad"
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.clearBtn} onClick={clearPad}>
                Clear
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveDraw}
              >
                Save
              </button>
            </div>
          </div>
        )}
        {activeTab === 'upload' && (
          <div className={styles.uploadTab}>
            <label className={styles.uploadLabel}>
              <span className={styles.uploadBtn}>Choose image (PNG/JPG)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleUploadChange}
                className={styles.fileInput}
              />
            </label>
            {uploadDataUrl && (
              <div className={styles.preview}>
                <img src={uploadDataUrl} alt="Signature preview" />
              </div>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveUpload}
                disabled={!uploadDataUrl}
              >
                Save
              </button>
            </div>
          </div>
        )}
        {savedSignature && (
          <div className={styles.reuseRow}>
            <button
              type="button"
              className={styles.reuseBtn}
              onClick={handleReuseLast}
            >
              Reuse last signature
            </button>
            <button
              type="button"
              className={styles.clearSavedBtn}
              onClick={handleClearSaved}
            >
              Clear saved
            </button>
          </div>
        )}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
