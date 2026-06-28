import { OpenAI } from 'openai';

async function main() {
  const apiKey = process.env['GROQ_API_KEY'];
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set');
    return;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  try {
    const response = await client.embeddings.create({
      model: 'nomic-embed-text-v1.5',
      input: 'Hello, world!',
    });

    console.log('Success! Vector dimension:', response.data[0].embedding.length);
    console.log('Sample vector slice:', response.data[0].embedding.slice(0, 5));
  } catch (err) {
    console.error('Groq embedding failed:', err);
  }
}

main().catch(console.error);
