// study-ai/backend/tests/summarizeRoute.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const create = vi.fn();
vi.mock("../src/lib/groq.js", () => ({ CHAT_MODEL: "m", groq: { chat: { completions: { create: (...a: unknown[]) => create(...a) } } } }));

import { summarizeRouter } from "../src/routes/summarize.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/summarize", summarizeRouter).use(errorHandler);

// The route requires at least 50 characters of study material.
const NOTES = "Mitochondria are the powerhouse of the cell and produce ATP through cellular respiration.";

// Mode instructions live in the system message; the user message carries the notes.
const systemPrompt = () => create.mock.calls[0][0].messages[0].content as string;
const userPrompt = () => create.mock.calls[0][0].messages[1].content as string;
const post = (body: object) => request(app).post("/api/summarize").send(body);

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] });
});

describe("POST /api/summarize prompts", () => {
  it.each([
    ["bullet", /bullet points/i],
    ["detailed", /detailed summary/i],
    ["compressed", /3-5 sentences/i],
    ["flashcard", /flashcards/i],
  ])("uses the %s prompt", async (type, pattern) => {
    await post({ text: NOTES, type });
    expect(systemPrompt()).toMatch(pattern);
  });

  it("sends the notes to the model as the user message", async () => {
    await post({ text: NOTES, type: "bullet" });
    expect(userPrompt()).toContain(NOTES);
  });

  it("defaults to the detailed prompt when no type is given", async () => {
    await post({ text: NOTES });
    expect(systemPrompt()).toMatch(/detailed summary/i);
  });
});

describe("POST /api/summarize validation", () => {
  it("rejects an unknown type without calling the model", async () => {
    const res = await post({ text: NOTES, type: "weird" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid `type`/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only text", async () => {
    expect((await post({ text: "   " })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects text shorter than 50 characters", async () => {
    const res = await post({ text: "notes" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too short/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects text longer than 30,000 characters with 413", async () => {
    const res = await post({ text: "a".repeat(30_001) });
    expect(res.status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("POST /api/summarize responses", () => {
  it("returns 502 when the AI gives an empty response", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "" } }] });
    expect((await post({ text: NOTES })).status).toBe(502);
  });

  it("returns 502 when the AI request itself fails", async () => {
    create.mockRejectedValue(new Error("groq down"));
    expect((await post({ text: NOTES })).status).toBe(502);
  });

  it("returns 422 when the model says the text is not study material", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "NOT_STUDY_MATERIAL" } }] });
    expect((await post({ text: NOTES })).status).toBe(422);
  });

  it("returns the summary text for text modes", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "- point one" }, finish_reason: "stop" }] });
    const res = await post({ text: NOTES, type: "bullet" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: "bullet", summary: "- point one", truncated: false });
  });

  it("flags a truncated response", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "- point one" }, finish_reason: "length" }] });
    expect((await post({ text: NOTES, type: "bullet" })).body.truncated).toBe(true);
  });

  it("parses flashcard output into cards", async () => {
    const content = "Front: What makes ATP? ||| Back: Mitochondria.\n2. Front: What is ATP? ||| Back: Energy currency.";
    create.mockResolvedValue({ choices: [{ message: { content }, finish_reason: "stop" }] });
    const res = await post({ text: NOTES, type: "flashcard" });
    expect(res.status).toBe(200);
    expect(res.body.cards).toEqual([
      { front: "What makes ATP?", back: "Mitochondria." },
      { front: "What is ATP?", back: "Energy currency." },
    ]);
    expect(res.body.summary).toBe(content);
  });

  it("returns 502 when flashcard output cannot be parsed", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "just some prose" }, finish_reason: "stop" }] });
    expect((await post({ text: NOTES, type: "flashcard" })).status).toBe(502);
  });
});