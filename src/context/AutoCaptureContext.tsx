import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Annotation, CapturedPage } from '../types';

type AnnotationsState = Record<number, Annotation[]>;
type UndoRedoState = Record<number, Annotation[][]>;

type AutoCaptureContextValue = {
  /** Page number -> capture (full blob + thumbnail URL). */
  captures: Map<number, CapturedPage>;
  /** Set of page numbers that have been captured (for "at most once" auto-capture). */
  capturedSet: Set<number>;
  /** Set of page numbers currently being captured (for placeholder display). */
  capturingSet: Set<number>;
  /** Page numbers selected for export (subset of captured). */
  selectedForExport: Set<number>;
  /** Annotations per page (1-based). */
  annotations: AnnotationsState;
  /** Undo stack per page (previous full states). */
  annotationUndo: UndoRedoState;
  /** Redo stack per page. */
  annotationRedo: UndoRedoState;
  /** Page rotation in degrees: 0, 90, 180, 270. */
  pageRotations: Record<number, number>;
  /** Whether auto-capture on active page is enabled. */
  autoCaptureEnabled: boolean;
  /** Currently active page (highest intersection ratio). */
  activePage: number | null;

  addCapturing: (pageNum: number) => void;
  removeCapturing: (pageNum: number) => void;
  addCapture: (pageNum: number, capture: CapturedPage) => void;
  removeCapture: (pageNum: number) => void;
  setCapture: (pageNum: number, capture: CapturedPage) => void;
  toggleSelected: (pageNum: number) => void;
  selectAllCaptured: () => void;
  deselectAllCaptured: () => void;
  removeSelectedCaptures: () => void;
  clearAllCaptures: () => void;

  setAnnotationsForPage: (pageNum: number, list: Annotation[]) => void;
  appendAnnotation: (pageNum: number, annotation: Annotation) => void;
  removeLastAnnotation: (pageNum: number) => void;
  undoAnnotation: (pageNum: number) => void;
  redoAnnotation: (pageNum: number) => void;
  canUndo: (pageNum: number) => boolean;
  canRedo: (pageNum: number) => boolean;

  setPageRotation: (pageNum: number, degrees: number) => void;
  setAutoCaptureEnabled: (enabled: boolean) => void;
  setActivePage: (page: number | null) => void;

  /** Ordered list of captured page numbers (for gallery display), includes placeholders. */
  capturedPageNumbers: number[];
  /** Scroll the viewer to a given page (set by PdfViewer). */
  scrollToPage: ((pageNum: number) => void) | null;
  setScrollToPage: (fn: ((pageNum: number) => void) | null) => void;
};

const AutoCaptureContext = createContext<AutoCaptureContextValue | null>(null);

export function AutoCaptureProvider({ children }: { children: ReactNode }) {
  const [captures, setCaptures] = useState<Map<number, CapturedPage>>(new Map());
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());
  const [annotations, setAnnotations] = useState<AnnotationsState>({});
  const [annotationUndo, setAnnotationUndo] = useState<UndoRedoState>({});
  const [annotationRedo, setAnnotationRedo] = useState<UndoRedoState>({});
  const [pageRotations, setPageRotationsState] = useState<Record<number, number>>({});
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [scrollToPageFn, setScrollToPageFn] = useState<((pageNum: number) => void) | null>(null);
  const [capturingSet, setCapturingSet] = useState<Set<number>>(new Set());

  const capturedSet = useMemo(() => new Set(captures.keys()), [captures]);
  const capturedPageNumbers = useMemo(
    () =>
      Array.from(new Set([...captures.keys(), ...capturingSet])).sort((a, b) => a - b),
    [captures, capturingSet]
  );

  const addCapturing = useCallback((pageNum: number) => {
    setCapturingSet((prev) => new Set(prev).add(pageNum));
  }, []);

  const removeCapturing = useCallback((pageNum: number) => {
    setCapturingSet((prev) => {
      const next = new Set(prev);
      next.delete(pageNum);
      return next;
    });
  }, []);

  const addCapture = useCallback((pageNum: number, capture: CapturedPage) => {
    setCapturingSet((prev) => {
      const next = new Set(prev);
      next.delete(pageNum);
      return next;
    });
    setCaptures((prev) => {
      const next = new Map(prev);
      const existing = next.get(pageNum);
      if (existing?.thumbnailUrl) URL.revokeObjectURL(existing.thumbnailUrl);
      next.set(pageNum, capture);
      return next;
    });
    setSelectedForExport((prev) => new Set(prev).add(pageNum));
  }, []);

  const removeCapture = useCallback((pageNum: number) => {
    setCapturingSet((prev) => {
      const next = new Set(prev);
      next.delete(pageNum);
      return next;
    });
    setCaptures((prev) => {
      const next = new Map(prev);
      const c = next.get(pageNum);
      if (c?.thumbnailUrl) URL.revokeObjectURL(c.thumbnailUrl);
      next.delete(pageNum);
      return next;
    });
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      next.delete(pageNum);
      return next;
    });
  }, []);

  const setCapture = useCallback((pageNum: number, capture: CapturedPage) => {
    setCaptures((prev) => {
      const next = new Map(prev);
      const existing = next.get(pageNum);
      if (existing?.thumbnailUrl) URL.revokeObjectURL(existing.thumbnailUrl);
      next.set(pageNum, capture);
      return next;
    });
  }, []);

  const toggleSelected = useCallback((pageNum: number) => {
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  }, []);

  const selectAllCaptured = useCallback(() => {
    setCaptures((prev) => {
      setSelectedForExport(new Set(prev.keys()));
      return prev;
    });
  }, []);

  const deselectAllCaptured = useCallback(() => {
    setSelectedForExport(new Set());
  }, []);

  const removeSelectedCaptures = useCallback(() => {
    const toRemove = Array.from(captures.keys()).filter((pn) =>
      selectedForExport.has(pn)
    );
    setCaptures((prev) => {
      const next = new Map(prev);
      toRemove.forEach((pn) => {
        const c = next.get(pn);
        if (c?.thumbnailUrl) URL.revokeObjectURL(c.thumbnailUrl);
        next.delete(pn);
      });
      return next;
    });
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      toRemove.forEach((pn) => next.delete(pn));
      return next;
    });
  }, [captures, selectedForExport]);

  const clearAllCaptures = useCallback(() => {
    setCapturingSet(new Set());
    setCaptures((prev) => {
      prev.forEach((c) => {
        if (c.thumbnailUrl) URL.revokeObjectURL(c.thumbnailUrl);
      });
      return new Map();
    });
    setSelectedForExport(new Set());
  }, []);

  const setAnnotationsForPage = useCallback((pageNum: number, list: Annotation[]) => {
    setAnnotations((prev) => ({ ...prev, [pageNum]: list }));
  }, []);

  const appendAnnotation = useCallback((pageNum: number, annotation: Annotation) => {
    setAnnotations((prev) => {
      const current = prev[pageNum] ?? [];
      const next = [...current, annotation];
      setAnnotationUndo((uPrev) => ({
        ...uPrev,
        [pageNum]: [...(uPrev[pageNum] ?? []), current],
      }));
      setAnnotationRedo((rPrev) => ({ ...rPrev, [pageNum]: [] }));
      return { ...prev, [pageNum]: next };
    });
  }, []);

  const undoAnnotation = useCallback((pageNum: number) => {
    const undoStack = annotationUndo[pageNum] ?? [];
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setAnnotationUndo((prev) => ({
      ...prev,
      [pageNum]: (prev[pageNum] ?? []).slice(0, -1),
    }));
    setAnnotationRedo((prev) => ({
      ...prev,
      [pageNum]: [...(prev[pageNum] ?? []), annotations[pageNum] ?? []],
    }));
    setAnnotations((prev) => ({ ...prev, [pageNum]: previous }));
  }, [annotationUndo, annotations]);

  const removeLastAnnotation = useCallback((pageNum: number) => {
    setAnnotations((prev) => {
      const current = prev[pageNum] ?? [];
      if (current.length === 0) return prev;
      const next = current.slice(0, -1);
      setAnnotationUndo((uPrev) => ({
        ...uPrev,
        [pageNum]: [...(uPrev[pageNum] ?? []), current],
      }));
      setAnnotationRedo((rPrev) => ({ ...rPrev, [pageNum]: [] }));
      return { ...prev, [pageNum]: next };
    });
  }, []);

  const redoAnnotation = useCallback((pageNum: number) => {
    const redoStack = annotationRedo[pageNum] ?? [];
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setAnnotationRedo((prev) => ({
      ...prev,
      [pageNum]: (prev[pageNum] ?? []).slice(0, -1),
    }));
    setAnnotationUndo((prev) => ({
      ...prev,
      [pageNum]: [...(prev[pageNum] ?? []), annotations[pageNum] ?? []],
    }));
    setAnnotations((prev) => ({ ...prev, [pageNum]: nextState }));
  }, [annotationRedo, annotations]);

  const canUndo = useCallback(
    (pageNum: number) => (annotationUndo[pageNum]?.length ?? 0) > 0,
    [annotationUndo]
  );
  const canRedo = useCallback(
    (pageNum: number) => (annotationRedo[pageNum]?.length ?? 0) > 0,
    [annotationRedo]
  );

  const setPageRotation = useCallback((pageNum: number, degrees: number) => {
    setPageRotationsState((prev) => ({ ...prev, [pageNum]: degrees % 360 }));
  }, []);

  const value: AutoCaptureContextValue = useMemo(
    () => ({
      captures,
      capturedSet,
      capturingSet,
      addCapturing,
      removeCapturing,
      selectedForExport,
      annotations,
      annotationUndo,
      annotationRedo,
      pageRotations,
      autoCaptureEnabled,
      activePage,
      addCapture,
      removeCapture,
      setCapture,
      toggleSelected,
      selectAllCaptured,
      deselectAllCaptured,
      removeSelectedCaptures,
      clearAllCaptures,
      setAnnotationsForPage,
      appendAnnotation,
      removeLastAnnotation,
      undoAnnotation,
      redoAnnotation,
      canUndo,
      canRedo,
      setPageRotation,
      setAutoCaptureEnabled,
      setActivePage,
      capturedPageNumbers,
      scrollToPage: scrollToPageFn,
      setScrollToPage: setScrollToPageFn,
    }),
    [
      captures,
      capturedSet,
      capturingSet,
      selectedForExport,
      annotations,
      annotationUndo,
      annotationRedo,
      pageRotations,
      autoCaptureEnabled,
      activePage,
      addCapturing,
      removeCapturing,
      addCapture,
      removeCapture,
      setCapture,
      toggleSelected,
      selectAllCaptured,
      deselectAllCaptured,
      removeSelectedCaptures,
      clearAllCaptures,
      setAnnotationsForPage,
      appendAnnotation,
      removeLastAnnotation,
      undoAnnotation,
      redoAnnotation,
      canUndo,
      canRedo,
      setPageRotation,
      setActivePage,
      capturedPageNumbers,
      scrollToPageFn,
    ]
  );

  return (
    <AutoCaptureContext.Provider value={value}>
      {children}
    </AutoCaptureContext.Provider>
  );
}

export function useAutoCapture() {
  const ctx = useContext(AutoCaptureContext);
  if (!ctx) throw new Error('useAutoCapture must be used within AutoCaptureProvider');
  return ctx;
}
