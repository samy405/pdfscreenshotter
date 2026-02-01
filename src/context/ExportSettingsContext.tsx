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
import type { PageRange } from '../lib/rangeUtils';
import { createRangeId } from '../lib/rangeUtils';

const STORAGE_KEY = 'pdf-screenshot-exporter-settings';

type StoredSettings = {
  mode: ExportMode;
  ranges: PageRange[];
  format: ExportFormat;
  jpgQuality: number;
  scalePreset: ScalePreset;
  prefix: string;
};

function defaultRange(): PageRange {
  return { id: createRangeId(), start: '', end: '' };
}

function defaultRangeForNumPages(numPages: number): PageRange {
  return { id: createRangeId(), start: '1', end: String(numPages) };
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        mode: 'all',
        ranges: [defaultRange()],
        format: 'png',
        jpgQuality: 0.85,
        scalePreset: 'high',
        prefix: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredSettings> & { startPage?: number; endPage?: number };
    let ranges: PageRange[];
    if (Array.isArray(parsed.ranges) && parsed.ranges.length > 0) {
      ranges = parsed.ranges.map((r) => ({
        id: typeof r.id === 'string' ? r.id : createRangeId(),
        start: typeof r.start === 'string' ? r.start : (typeof r.start === 'number' ? String(r.start) : ''),
        end: typeof r.end === 'string' ? r.end : (typeof r.end === 'number' ? String(r.end) : ''),
      }));
    } else if (typeof parsed.startPage === 'number' && typeof parsed.endPage === 'number') {
      ranges = [{ id: createRangeId(), start: String(parsed.startPage), end: String(parsed.endPage) }];
    } else {
      ranges = [defaultRange()];
    }
    return {
      mode: parsed.mode === 'range' ? 'range' : 'all',
      ranges,
      format: parsed.format === 'jpg' ? 'jpg' : 'png',
      jpgQuality: typeof parsed.jpgQuality === 'number'
        ? Math.max(0.6, Math.min(0.95, parsed.jpgQuality))
        : 0.85,
      scalePreset: ['standard', 'high', 'ultra'].includes(parsed.scalePreset ?? '')
        ? (parsed.scalePreset as ScalePreset)
        : 'high',
      prefix: typeof parsed.prefix === 'string' ? parsed.prefix : '',
    };
  } catch {
    return {
      mode: 'all',
      ranges: [defaultRange()],
      format: 'png',
      jpgQuality: 0.85,
      scalePreset: 'high',
      prefix: '',
    };
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
  ranges: PageRange[];
  setRanges: (r: PageRange[]) => void;
  addRange: () => void;
  addRangeWithDefaults: (numPages: number) => void;
  removeRange: (id: string) => void;
  updateRange: (id: string, updates: Partial<Pick<PageRange, 'start' | 'end'>>) => void;
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

  const addRange = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      ranges: [...prev.ranges, defaultRange()],
    }));
  }, []);

  const addRangeWithDefaults = useCallback((numPages: number) => {
    setSettings((prev) => ({
      ...prev,
      ranges: [defaultRangeForNumPages(numPages)],
    }));
  }, []);

  const removeRange = useCallback((id: string) => {
    setSettings((prev) => {
      const next = prev.ranges.filter((r) => r.id !== id);
      if (next.length === 0) return prev;
      return { ...prev, ranges: next };
    });
  }, []);

  const updateRange = useCallback((id: string, updates: Partial<Pick<PageRange, 'start' | 'end'>>) => {
    setSettings((prev) => ({
      ...prev,
      ranges: prev.ranges.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  }, []);

  const setRanges = useCallback((ranges: PageRange[]) => {
    update('ranges', ranges.length > 0 ? ranges : [defaultRange()]);
  }, [update]);

  const value: ExportSettingsContextValue = {
    mode: settings.mode,
    setMode: (m) => update('mode', m),
    ranges: settings.ranges,
    setRanges,
    addRange,
    addRangeWithDefaults,
    removeRange,
    updateRange,
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
