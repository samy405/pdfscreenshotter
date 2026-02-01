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

## Known limitations

- **PDF size**: Optimized for PDFs up to ~50 pages. Larger files may be slow or hit browser memory limits.
- **Worker**: The PDF.js worker loads from unpkg.com. Requires network access for first load.
- **Memory**: Large PDFs and high scale settings increase memory use.
- **Filename sanitization**: Output filenames are sanitized for Windows compatibility.
