import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { ExportFormat, ExportMode, ScalePreset } from '../types';
import { SCALE_PRESETS } from '../types';

const STORAGE_KEY = 'pdf-screenshot-exporter-settings';

type StoredSettings = {
  mode: ExportMode;
  startPage: number;
  endPage: number;
  format: ExportFormat;
  jpgQuality: number;
  scalePreset: ScalePreset;
  prefix: string;
};

const DEFAULTS: StoredSettings = {
  mode: 'all',
  startPage: 1,
  endPage: 1,
  format: 'png',
  jpgQuality: 0.85,
  scalePreset: 'high',
  prefix: '',
};

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      mode: parsed.mode === 'range' ? 'range' : DEFAULTS.mode,
      startPage: typeof parsed.startPage === 'number' ? Math.max(1, parsed.startPage) : DEFAULTS.startPage,
      endPage: typeof parsed.endPage === 'number' ? Math.max(1, parsed.endPage) : DEFAULTS.endPage,
      format: parsed.format === 'jpg' ? 'jpg' : DEFAULTS.format,
      jpgQuality: typeof parsed.jpgQuality === 'number'
        ? Math.max(0.6, Math.min(0.95, parsed.jpgQuality))
        : DEFAULTS.jpgQuality,
      scalePreset: ['standard', 'high', 'ultra'].includes(parsed.scalePreset ?? '')
        ? (parsed.scalePreset as ScalePreset)
        : DEFAULTS.scalePreset,
      prefix: typeof parsed.prefix === 'string' ? parsed.prefix : DEFAULTS.prefix,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

type ExportSettingsContextValue = {
  mode: ExportMode;
  setMode: (m: ExportMode) => void;
  startPage: number;
  setStartPage: (n: number) => void;
  endPage: number;
  setEndPage: (n: number) => void;
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  jpgQuality: number;
  setJpgQuality: (q: number) => void;
  scalePreset: ScalePreset;
  setScalePreset: (p: ScalePreset) => void;
  prefix: string;
  setPrefix: (p: string) => void;
  scale: number;
  persist: () => void;
};

const ExportSettingsContext = createContext<ExportSettingsContextValue | null>(null);

export function ExportSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = useCallback(<K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value: ExportSettingsContextValue = {
    mode: settings.mode,
    setMode: (m) => update('mode', m),
    startPage: settings.startPage,
    setStartPage: (n) => update('startPage', n),
    endPage: settings.endPage,
    setEndPage: (n) => update('endPage', n),
    format: settings.format,
    setFormat: (f) => update('format', f),
    jpgQuality: settings.jpgQuality,
    setJpgQuality: (q) => update('jpgQuality', q),
    scalePreset: settings.scalePreset,
    setScalePreset: (p) => update('scalePreset', p),
    prefix: settings.prefix,
    setPrefix: (p) => update('prefix', p),
  scale: SCALE_PRESETS[settings.scalePreset],
  persist: () => saveSettings(settings),
};

  return (
    <ExportSettingsContext.Provider value={value}>
      {children}
    </ExportSettingsContext.Provider>
  );
}

export function useExportSettings() {
  const ctx = useContext(ExportSettingsContext);
  if (!ctx) throw new Error('useExportSettings must be used within ExportSettingsProvider');
  return ctx;
}
