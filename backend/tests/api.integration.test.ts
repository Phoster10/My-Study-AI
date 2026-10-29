// study-ai/backend/tests/api.integration.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock the external services so integration tests are hermetic.
vi.mock("../src/lib/groq.js", () => ({
  CHAT_MODEL: "test-model",
  groq: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content: "- summary point" } }] }),
      },
    },
  },
}));
vi.mock("../src/lib/supabase.js", () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("bad") }) } },
}));

import { createApp } from "../src/app.js";

const app = createApp();

describe("API integration", () => {
  it("GET /health responds ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/ingest accepts pasted text", async () => {
    const res = await request(app).post("/api/ingest").send({ text: "  my notes  " });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "my notes", source: "pasted" });
  });

  it("POST /api/ingest rejects an empty request", async () => {
    const res = await request(app).post("/api/ingest").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/ingest accepts a .txt upload", async () => {
    const res = await request(app).post("/api/ingest").attach("file", Buffer.from("hello file"), { filename: "n.txt", contentType: "text/plain" });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("txt");
  });

  it("POST /api/summarize returns the AI summary", async () => {
    const res = await request(app).post("/api/summarize").send({
      text: "Mitochondria are the powerhouse of the cell and produce ATP through cellular respiration.",
      type: "bullet",
    });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBe("- summary point");
  });

  it("POST /api/summarize validates input", async () => {
    const res = await request(app).post("/api/summarize").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/exam/grade grades MCQ answers without any AI call", async () => {
    const exam = [{ id: "q1", question: "Which is a fruit?", options: { A: "Apple", B: "Car" }, correctAnswer: "A" }];
    const res = await request(app).post("/api/exam/grade").send({ exam, userAnswers: { q1: "A" } });
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(1);
    expect(res.body.results[0].gradedBy).toBe("mcq");
  });

  it("POST /api/exam/grade rejects an empty exam", async () => {
    const res = await request(app).post("/api/exam/grade").send({ exam: [] });
    expect(res.status).toBe(400);
  });

  it("protects user-data routes without a token", async () => {
    const res = await request(app).get("/api/xp");
    expect(res.status).toBe(401);
  });
});