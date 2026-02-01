import { useEffect, useRef } from 'react';
import type { Annotation, SignatureAnnotation, TextNoteAnnotation } from '../types';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  ctx.font = `${fontSize}px sans-serif`;
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    const m = ctx.measureText(test);
    if (m.width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawTextInBox(
  ctx: CanvasRenderingContext2D,
  a: TextNoteAnnotation
): void {
  const pad = 4;
  const innerW = Math.max(20, a.width - pad * 2);
  const innerH = Math.max(16, a.height - pad * 2);
  let fs = Math.min(24, Math.floor(innerH / 1.3), Math.floor(innerW / 4));
  fs = Math.max(10, fs);
  const lines = wrapText(ctx, a.text, innerW, fs);
  const lineHeight = fs * 1.2;
  const totalH = lines.length * lineHeight;
  const startY = a.y + pad + (innerH - totalH) / 2 + fs;
  ctx.font = `${fs}px sans-serif`;
  ctx.fillStyle = a.color;
  lines.forEach((line, i) => {
    ctx.fillText(line, a.x + pad, startY + i * lineHeight);
  });
}

type Props = {
  width: number;
  height: number;
  annotations: Annotation[];
  selectedSignature?: { pageNum: number; index: number } | null;
  currentPageNum?: number;
  className?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export function AnnotationLayer({ width, height, annotations, selectedSignature, currentPageNum, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    let cancelled = false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      const signatures: SignatureAnnotation[] = [];
      for (const a of annotations) {
        if (a.kind === 'signature') {
          signatures.push(a);
          continue;
        }
        switch (a.kind) {
        case 'highlight':
          ctx.fillStyle = `rgba(255, 255, 0, ${a.opacity ?? 0.35})`;
          ctx.fillRect(a.x, a.y, a.width, a.height);
          break;
        case 'pen':
          if (a.points.length < 2) break;
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
          break;
        case 'text':
          ctx.strokeStyle = 'rgba(79, 95, 213, 0.5)';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.strokeRect(a.x, a.y, a.width, a.height);
          ctx.fillRect(a.x, a.y, a.width, a.height);
          ctx.strokeRect(a.x, a.y, a.width, a.height);
          drawTextInBox(ctx, a);
          break;
        case 'redaction':
          ctx.fillStyle = '#000';
          ctx.fillRect(a.x, a.y, a.width, a.height);
          break;
        default:
          break;
        }
      }
      if (signatures.length > 0) {
        Promise.all(
          signatures.map((a) =>
            loadImage(a.imageDataUrl).then((img) => {
              if (cancelled) return;
              ctx.drawImage(img, a.x, a.y, a.width, a.height);
            })
          )
        ).then(() => {
          if (cancelled) return;
          if (selectedSignature && currentPageNum === selectedSignature.pageNum) {
            const ann = annotations[selectedSignature.index];
            if (ann?.kind === 'signature') {
              ctx.strokeStyle = 'var(--accent)';
              ctx.lineWidth = 3;
              ctx.setLineDash([6, 4]);
              ctx.strokeRect(ann.x - 2, ann.y - 2, ann.width + 4, ann.height + 4);
              ctx.setLineDash([]);
            }
          }
        }).catch(() => {});
      } else if (selectedSignature && currentPageNum === selectedSignature.pageNum) {
        const ann = annotations[selectedSignature.index];
        if (ann?.kind === 'signature') {
          ctx.strokeStyle = 'var(--accent)';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(ann.x - 2, ann.y - 2, ann.width + 4, ann.height + 4);
          ctx.setLineDash([]);
        }
      }
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [width, height, annotations, selectedSignature, currentPageNum]);

  if (width <= 0 || height <= 0) return null;
  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );
}
