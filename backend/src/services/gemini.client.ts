import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export type EmbeddingTask = 'RETRIEVAL_DOCUMENT' | 'QUESTION_ANSWERING';

export type GeminiClient = {
  embed(texts: string[], task: EmbeddingTask): Promise<number[][]>;
  generate(systemInstruction: string, prompt: string): Promise<string>;
};

let override: GeminiClient | null = null;

export function setGeminiClient(next: GeminiClient | null): void {
  override = next;
}

export function getGeminiClient(): GeminiClient {
  return override ?? googleClient;
}

const googleClient: GeminiClient = {
  async embed(texts, task) {
    const ai = client();
    const response = await withRetry(() =>
      ai.models.embedContent({
        model: env.rag.embeddingModel,
        contents: texts,
        config: {
          taskType: task,
          outputDimensionality: env.rag.embeddingDimensions,
        },
      }),
    );
    const embeddings = response.embeddings ?? [];
    return embeddings.map((item) => item.values ?? []);
  },
  async generate(systemInstruction, prompt) {
    const ai = client();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: env.rag.generationModel,
        contents: prompt,
        config: { systemInstruction },
      }),
    );
    return response.text?.trim() ?? '';
  },
};

function client(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new AppError(503, 'UNAVAILABLE', 'The assistant is not configured.');
  }
  return new GoogleGenAI({ apiKey: env.geminiApiKey });
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isRateLimit(error)) {
      throw error;
    }
    await delay(750);
    return operation();
  }
}

function isRateLimit(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 429) {
    return true;
  }
  const message = error instanceof Error ? error.message : '';
  return message.includes('429') || message.toLowerCase().includes('resource exhausted');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
