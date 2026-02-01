export type Theme = 'light' | 'dark';

export type ExportFormat = 'png' | 'jpg';
export type ExportMode = 'all' | 'range';

export type ScalePreset = 'standard' | 'high' | 'ultra';
export const SCALE_PRESETS: Record<ScalePreset, number> = {
  standard: 2.0,
  high: 3.0,
  ultra: 4.0,
};

