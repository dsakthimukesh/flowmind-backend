import fs from 'fs';
import path from 'path';

const file = 'e:/flowmind-backend/flowmind-backend/src/modules/rag/services/embedding.service.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the old model name with the new active name
content = content.replace(
  "const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';",
  "const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Model name successfully updated to text-embedding-004!');
