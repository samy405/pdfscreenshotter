/**
 * Helpers for Auto Capture (Review Mode): active-page detection and canvas compositing.
 */

export type PageIntersectionEntry = { pageNumber: number; ratio: number };

/**
 * From IntersectionObserver entries (page container elements), pick the page with
 * the highest intersection ratio as the "active" page.
 * When currentActive is provided, applies hysteresis to avoid rapid flipping
 * when two pages have similar ratios near the boundary.
 */
export function getActivePageFromIntersections(
  entries: Map<number, number>,
  currentActive: number | null = null
): number | null {
  if (entries.size === 0) return null;
  let bestPage: number | null = null;
  let bestRatio = 0;
  for (const [pageNumber, ratio] of entries) {
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestPage = pageNumber;
    }
  }
  if (bestPage == null) return null;
  // Hysteresis: only switch if new leader is clearly better (>0.15 advantage)
  // or current page is barely visible (<0.2)
  if (currentActive != null) {
    const currentRatio = entries.get(currentActive) ?? 0;
    if (bestPage !== currentActive) {
      if (currentRatio >= 0.2 && bestRatio < currentRatio + 0.15) {
        return currentActive; // Keep current to avoid flicker
      }
    }
  }
  return bestPage;
}

/**
 * Debounce a callback so it runs only after the value has stayed stable for `delayMs`.
 * Returns a function that accepts the new value; when called, the callback will run
 * after delayMs if no newer value is passed.
 */
export function debounceActivePage<T>(
  delayMs: number,
  onStable: (value: T) => void
): (value: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastValue: T | undefined;
  return (value: T) => {
    lastValue = value;
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (lastValue !== undefined) {
        onStable(lastValue);
      }
    }, delayMs);
  };
}

export type ExportFormat = 'png' | 'jpg';

/** Load an image from a data URL and draw it on ctx. */
export function drawSignatureImage(
  ctx: CanvasRenderingContext2D,
  imageDataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, width, height);
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to load signature image'));
    img.src = imageDataUrl;
  });
}

/** Draw wrapped text inside a rect on canvas (for export). */
export function drawTextInRect(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = '#000'
): void {
  const pad = 4;
  const innerW = Math.max(20, width - pad * 2);
  const innerH = Math.max(16, height - pad * 2);
  let fs = Math.min(24, Math.floor(innerH / 1.3), Math.floor(innerW / 4));
  fs = Math.max(10, fs);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  ctx.font = `${fs}px sans-serif`;
  ctx.fillStyle = color;
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    const m = ctx.measureText(test);
    if (m.width > innerW && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const lineHeight = fs * 1.2;
  const totalH = lines.length * lineHeight;
  const startY = y + pad + (innerH - totalH) / 2 + fs;
  lines.forEach((line, i) => {
    ctx.fillText(line, x + pad, startY + i * lineHeight);
  });
}

/**
 * Composite PDF canvas and optional annotation overlay into a single Blob.
 * If overlay is null, returns blob from pdfCanvas only.
 */
export async function compositeCanvasesToBlob(
  pdfCanvas: HTMLCanvasElement,
  overlayCanvas: HTMLCanvasElement | null,
  format: ExportFormat,
  jpgQuality: number
): Promise<Blob> {
  const w = pdfCanvas.width;
  const h = pdfCanvas.height;
  const output = document.createElement('canvas');
  output.width = w;
  output.height = h;
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');
  ctx.drawImage(pdfCanvas, 0, 0);
  if (overlayCanvas && overlayCanvas.width === w && overlayCanvas.height === h) {
    ctx.drawImage(overlayCanvas, 0, 0);
  }
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      mime,
      format === 'jpg' ? jpgQuality : undefined
    );
  });
}

const THUMBNAIL_MAX_SIZE = 200;

/**
 * Create a thumbnail Blob from a full-size image Blob (e.g. PNG/JPEG).
 */
export function createThumbnailBlob(fullSizeBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fullSizeBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > THUMBNAIL_MAX_SIZE || height > THUMBNAIL_MAX_SIZE) {
        const scale = THUMBNAIL_MAX_SIZE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/png',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}
