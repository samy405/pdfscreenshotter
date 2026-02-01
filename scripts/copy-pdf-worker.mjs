import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const dest = join(root, 'public/pdf.worker.min.mjs');

if (!existsSync(src)) {
  console.warn('copy-pdf-worker: pdf.worker.min.mjs not found, skipping');
  process.exit(0);
}

mkdirSync(join(root, 'public'), { recursive: true });
copyFileSync(src, dest);
console.log('copy-pdf-worker: copied pdf.worker.min.mjs to public/');
