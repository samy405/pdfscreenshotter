import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker to avoid Vite dev server issues with /pdf.worker.min.mjs?import
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type PDFDocument = pdfjsLib.PDFDocumentProxy;

export async function loadPdf(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf;
}

export async function loadPdfWithPassword(
  file: File,
  password: string
): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    password,
  }).promise;
  return pdf;
}

export function getPageCount(pdf: PDFDocument): number {
  return pdf.numPages;
}

export async function renderPageToCanvas(
  pdf: PDFDocument,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number = 2,
  rotation: number = 0
): Promise<void> {
  const page = await pdf.getPage(pageNum);
  try {
    const viewport = page.getViewport({ scale, rotation });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
  } finally {
    page.cleanup();
  }
}
