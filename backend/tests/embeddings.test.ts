import { describe, it, expect, vi, afterEach } from "vitest";
import { cosineSimilarity, embeddingSimilarity } from "../src/grading/embeddings.js";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for orthogonal ones", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it("returns 0 for mismatched lengths, empty input or zero vectors", () => {
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("embeddingSimilarity", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); });

  it("reports unavailable when no API key is configured", async () => {
    delete process.env.VOYAGE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(await embeddingSimilarity("unique-a", "unique-b")).toEqual({ score: 0, available: false });
  });

  it("computes similarity from the embedding API response", async () => {
    process.env.VOYAGE_API_KEY = "test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ embedding: [1, 0, 0] }] }) }));
    const r = await embeddingSimilarity("text-one-xyz", "text-two-xyz");
    expect(r.available).toBe(true);
    expect(r.score).toBeCloseTo(1);
  });

  it("degrades to unavailable when the API errors", async () => {
    process.env.VOYAGE_API_KEY = "test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect((await embeddingSimilarity("err-a-xyz", "err-b-xyz")).available).toBe(false);
  });
});
