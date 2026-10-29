import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const create = vi.fn();
vi.mock("../src/lib/groq.js", () => ({ CHAT_MODEL: "m", groq: { chat: { completions: { create: (...a: unknown[]) => create(...a) } } } }));

import { examRouter } from "../src/routes/exam.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/exam", examRouter).use(errorHandler);
const llm = (content: string) => create.mockResolvedValue({ choices: [{ message: { content } }] });
const questions = (n: number, mcq = false) =>
  Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    question: `Q${i}`,
    type: mcq ? "mcq" : "short_answer",
    options: mcq ? { A: "a", B: "b", C: "c", D: "d" } : undefined,
    answer: "A",
  }));

beforeEach(() => { create.mockReset(); });

describe("POST /api/exam/generate — count and mcqOnly", () => {
  it("defaults to 10 mixed questions when neither param is given", async () => {
    llm(JSON.stringify({ exam: questions(10) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text" });
    expect(res.body.exam).toHaveLength(10);
    const prompt = create.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toMatch(/exactly 10 exam questions/);
    expect(prompt).toMatch(/5 must be multiple choice/);
    expect(prompt).toMatch(/5 must be short answer/);
  });

  it("respects count=5", async () => {
    llm(JSON.stringify({ exam: questions(5) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text", count: 5 });
    expect(res.body.exam).toHaveLength(5);
    const prompt = create.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toMatch(/exactly 5 exam questions/);
  });

  it("rejects an out-of-range count and falls back to 10", async () => {
    llm(JSON.stringify({ exam: questions(10) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text", count: 7 });
    expect(res.body.exam).toHaveLength(10);
  });

  it("generates only MCQ questions when mcqOnly is true, with no short-answer instruction", async () => {
    llm(JSON.stringify({ exam: questions(5, true) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text", count: 5, mcqOnly: true });
    expect(res.body.exam).toHaveLength(5);
    const prompt = create.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toMatch(/5 must be multiple choice/);
    expect(prompt).not.toMatch(/short answer/);
  });

  it("truncates and pads to the requested count, not always 10", async () => {
    llm(JSON.stringify({ exam: questions(3) }));
    const res = await request(app).post("/api/exam/generate").send({ text: "long enough source text", count: 5 });
    expect(res.body.exam).toHaveLength(5);
  });

  it("the fallback path also respects count and mcqOnly", async () => {
    const res = await request(app).post("/api/exam/generate").send({ text: "hi", count: 5, mcqOnly: true });
    expect(create).not.toHaveBeenCalled();
    expect(res.body.exam.length).toBeLessThanOrEqual(5);
  });
});
