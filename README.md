# PDF Screenshot Exporter

Export PDF pages as PNG or JPG images. Upload a PDF, choose options, and download a ZIP file—no server required.

## Overview

PDF Screenshot Exporter is a client-side web app that renders PDF pages to images using Mozilla’s PDF.js and packages them into a downloadable ZIP. It runs entirely in the browser; PDFs are never sent to a server.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in a browser (or use Cursor’s Simple Browser: Ctrl+Shift+P → “Simple Browser: Show” → enter the URL).

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or run:

```bash
npm run preview
```

## Privacy

**Client-side only.** PDFs are processed in your browser. Nothing is uploaded or stored on any server. The app fetches the PDF.js worker from unpkg.com; PDF content stays on your device.

## Tech

- Vite + React + TypeScript
- pdfjs-dist (PDF.js) – render PDF pages to canvas
- jszip – create ZIP archives
- file-saver – trigger downloads

## Production

The PDF.js worker loads from unpkg.com. This works in both dev and production. No extra build steps are needed.

## Multi-range export

In **Range** mode, you can define multiple page ranges (e.g., 2–3 and 5–6) and export them all in one ZIP. The UI shows exactly what you enter; overlapping or adjacent ranges are merged silently for export only. Output pages are deduplicated and sorted in ascending order.

## Auto Capture (Review Mode)

In **Auto Capture (Review Mode)** you scroll through the PDF viewer; when a page becomes the “active” page (highest visibility in the viewport), it is captured automatically as a full-page image at the selected scale. Each page is captured at most once automatically; you can recapture or undo capture from the viewer.

- **Captured Pages panel**: Thumbnail grid of captured pages (in page order), with checkboxes (selected by default). Use **Select all / Deselect all**, **Remove selected**, **Clear all**, and **Export selected to ZIP**. Summary: “Captured: X pages | Selected: Y pages”. Clicking a thumbnail scrolls the viewer to that page.
- **Auto Capture toggle**: Turn auto-capture on or off. When off, use **Capture now** in the viewer to capture the current page manually.
- **Per-page actions**: **Undo capture** (remove from captured set), **Recapture** (re-render and replace the stored image).
- **Edit tools**: Annotations (highlight, pen, text note, redaction, eraser) and undo/redo for the current page; optional rotate 90°. Annotations are drawn on an overlay and included in the captured/exported image. If a page was already captured, you’ll see a prompt to undo capture before re-capturing after edits.

Export from the Captured Pages panel uses the same format, scale, and filename prefix as in Export settings. Output filenames are `page-001.png` (or `.jpg`) by page number.

## Editing tools (annotations)

Editing is **annotation overlays only**, not full Acrobat-style editing:

- **Highlight**: Semi-transparent yellow rectangle.
- **Pen**: Freehand drawing.
- **Text note**: Simple text box (prompt for text).
- **Redaction**: Black rectangle.
- **Eraser**: Removes the last annotation on the current page.
- **Undo / Redo**: For annotations on the current page only.
- **Rotate**: Rotate the current page 90° (affects capture/export).

Annotations are stored as data and composited with the PDF when capturing or exporting. They are not written back into the PDF file.

## Known limitations

- **PDF size**: Optimized for PDFs up to ~50 pages. Larger files may be slow or hit browser memory limits.
- **Worker**: The PDF.js worker loads from unpkg.com. Requires network access for first load.
- **Memory**: Large PDFs and high scale settings increase memory use. In Auto Capture mode, thumbnails use object URLs; full-size captures are stored as Blobs.
- **Filename sanitization**: Output filenames are sanitized for Windows compatibility.
- **Editing**: Annotations are overlay-only (highlight, pen, text, redaction). No full PDF text editing or “Export edited PDF” (e.g. pdf-lib) in this version.
