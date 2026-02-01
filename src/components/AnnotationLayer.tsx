import { useEffect, useRef } from 'react';
import type { Annotation } from '../types';

type Props = {
  width: number;
  height: number;
  annotations: Annotation[];
  className?: string;
};

export function AnnotationLayer({ width, height, annotations, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const a of annotations) {
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
  }, [width, height, annotations]);

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
