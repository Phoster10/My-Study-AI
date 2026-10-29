import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const create = vi.fn();
vi.mock("../src/lib/groq.js", () => ({ CHAT_MODEL: "m", groq: { chat: { completions: { create: (...a: unknown[]) => create(...a) } } } }));

import { examRouter } from "../src/routes/exam.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/exam", examRouter).use(errorHandler);
const llm = (content: string) => create.mockResolvedValue({ choices: [{ message: { content } }] });
const questions = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `q${i}`, question: `Q${i}`, type: "short_answer", answer: "a" }));

beforeEach(() => { create.mockReset(); });

describe("POST /api/exam/generate", () => {
  it("returns the LLM's questions", async () => {
    llm(JSON.stringify({ exam: questions(10) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text about biology" });
    expect(res.status).toBe(200);
    expect(res.body.exam).toHaveLength(10);
    expect(res.body.exam[0].id).toBe("q0");
  });

  it("truncates to 10 questions", async () => {
    llm(JSON.stringify({ exam: questions(15) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text about biology" });
    expect(res.body.exam).toHaveLength(10);
  });

  it("pads to 10 questions when the LLM returns fewer", async () => {
    llm(JSON.stringify({ exam: questions(4) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text about biology" });
    expect(res.body.exam).toHaveLength(10);
  });

  it("accepts JSON wrapped in prose", async () => {
    llm(`Here you go: ${JSON.stringify({ exam: questions(10) })}`);
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text about biology" });
    expect(res.body.exam[0].id).toBe("q0");
  });

  it("falls back to generated questions when the LLM returns garbage", async () => {
    llm("totally not json");
    const res = await request(app).post("/api/exam/generate").send({ text: "line one\nline two\nline three" });
    expect(res.status).toBe(200);
    expect(res.body.exam).toHaveLength(10);
    expect(res.body.exam[0].id).toMatch(/^fallback-/);
  });

  it("returns fallback questions without calling the LLM when source text is too short", async () => {
    const res = await request(app).post("/api/exam/generate").send({ text: "hi" });
    expect(create).not.toHaveBeenCalled();
    expect(res.body.exam.length).toBeGreaterThan(0);
  });

  it("surfaces LLM failures as a 500 JSON error", async () => {
    create.mockImplementation(async () => { throw new Error("groq down"); });
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text about biology" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("groq down");
  });
});
