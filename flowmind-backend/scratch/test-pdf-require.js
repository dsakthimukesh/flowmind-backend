import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  const pdfParse = require('pdf-parse');
  console.log('require("pdf-parse") type:', typeof pdfParse);
  console.log('require("pdf-parse") keys:', Object.keys(pdfParse));
} catch (e) {
  console.error('require failed:', e);
}
