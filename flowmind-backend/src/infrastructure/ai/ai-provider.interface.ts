/**
 * src/infrastructure/ai/ai-provider.interface.ts
 *
 * Provider-agnostic contract. Every AI backend (Gemini, OpenAI, OpenRouter)
 * implements this interface. Node executors depend only on this interface —
 * swapping providers requires no changes outside the infrastructure layer.
 */

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;   // 0–1, default 0.7
  maxTokens?: number;     // default 1024
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SummarizeOptions {
  text: string;
  maxLength?: number;     // target word count hint
  style?: 'bullet' | 'paragraph'; // default 'paragraph'
}

export interface ClassifyOptions {
  text: string;
  labels: string[];       // possible categories to classify into
  multiLabel?: boolean;   // allow multiple labels (default: false)
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface TextResult {
  text: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ClassifyResult {
  labels: string[];       // selected label(s)
  confidence?: number;    // 0–1 if provider supports it
  model: string;
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface AiProvider {
  readonly name: string;

  generateText(options: GenerateTextOptions): Promise<TextResult>;
  chat(options: ChatOptions): Promise<TextResult>;
  summarize(options: SummarizeOptions): Promise<TextResult>;
  classify(options: ClassifyOptions): Promise<ClassifyResult>;
}
