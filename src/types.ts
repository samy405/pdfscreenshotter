export type Theme = 'light' | 'dark';

export type ExportFormat = 'png' | 'jpg';
export type ExportMode = 'all' | 'range' | 'autoCapture';

export type ScalePreset = 'standard' | 'high' | 'ultra';
export const SCALE_PRESETS: Record<ScalePreset, number> = {
  standard: 2.0,
  high: 3.0,
  ultra: 4.0,
};

/** Annotation kinds for edit overlay (relative to canvas dimensions). */
export type AnnotationKind = 'highlight' | 'pen' | 'text' | 'redaction' | 'eraser';

export type HighlightAnnotation = {
  kind: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0–1 */
  opacity?: number;
};

export type PenPoint = { x: number; y: number };
export type PenAnnotation = {
  kind: 'pen';
  points: PenPoint[];
  strokeWidth: number;
  color: string;
};

export type TextNoteAnnotation = {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
};

export type RedactionAnnotation = {
  kind: 'redaction';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Annotation =
  | HighlightAnnotation
  | PenAnnotation
  | TextNoteAnnotation
  | RedactionAnnotation;

/** One captured page: full-size blob for export, thumbnail URL for gallery. */
export type CapturedPage = {
  fullSizeBlob: Blob;
  thumbnailUrl: string;
};

