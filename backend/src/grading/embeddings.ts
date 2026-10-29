/**
 * Optional embedding-based semantic similarity.
 *
 * This signal is entirely optional: if neither VOYAGE_API_KEY nor
 * OPENAI_API_KEY is configured, `available` is false and the grader simply
 * relies on its other signals (deterministic checks + the LLM judge).
 */

import { GRADING_CONFIG } from "./types.js";

class SimpleCache<V> {
  private map = new Map<string, V>();
  constructor(private maxSize: number) {}
  get(key: string) {
    return this.map.get(key);
  }
  set(key: string, value: V) {
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}

const embeddingCache = new SimpleCache<number[]>(GRADING_CONFIG.cache.maxSize);

async function fetchEmbedding(text: string): Promise<number[] | null> {
  const cacheKey = `emb:${text.slice(0, 200)}`;
  const cached = embeddingCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.VOYAGE_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const isVoyage = !!process.env.VOYAGE_API_KEY;

  try {
    const body = isVoyage
      ? JSON.stringify({ input: [text], model: GRADING_CONFIG.embedding.model })
      : JSON.stringify({ input: text, model: "text-embedding-3-small" });

    const res = await fetch(isVoyage ? `${GRADING_CONFIG.embedding.baseUrl}/embeddings` : "https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body,
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const embedding: number[] = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) return null;

    embeddingCache.set(cacheKey, embedding);
    return embedding;
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function embeddingSimilarity(
  userAnswer: string,
  correctAnswer: string
): Promise<{ score: number; available: boolean }> {
  const [uEmb, cEmb] = await Promise.all([fetchEmbedding(userAnswer), fetchEmbedding(correctAnswer)]);
  if (!uEmb || !cEmb) return { score: 0, available: false };
  return { score: cosineSimilarity(uEmb, cEmb), available: true };
}
