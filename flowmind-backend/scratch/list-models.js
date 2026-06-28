import { GoogleGenAI } from '@google/genai';

async function main() {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey || apiKey.startsWith('your-')) {
    console.error('GEMINI_API_KEY is not set');
    return;
  }

  const client = new GoogleGenAI({ apiKey });
  try {
    const list = await client.models.list();
    console.log('Available models:');
    for (const model of list) {
      if (model.name.includes('embed')) {
        console.log(`- ${model.name} (Supported methods: ${model.supportedGenerationMethods})`);
      }
    }
  } catch (err) {
    console.error('Failed to list models:', err);
  }
}

main().catch(console.error);
