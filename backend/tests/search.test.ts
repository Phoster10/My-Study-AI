import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const create = vi.fn();
vi.mock("../src/lib/groq.js", () => ({ CHAT_MODEL: "m", groq: { chat: { completions: { create: (...a: unknown[]) => create(...a) } } } }));

import { searchRouter } from "../src/routes/search.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/search", searchRouter).use(errorHandler);

beforeEach(() => { create.mockReset(); });

describe("POST /api/search", () => {
  it("surfaces AI failures as a 500 JSON error", async () => {
    create.mockImplementation(async () => { throw new Error("groq down"); });
    const res = await request(app).post("/api/search").send({ query: "x" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("groq down");
  });

  it("returns the AI's answer", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "Mitochondria produce ATP." } }] });
    const res = await request(app).post("/api/search").send({ query: "what do mitochondria do" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: "Mitochondria produce ATP." });
  });

  it("uses the Aether Command AI persona prompt", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "ok" } }] });
    await request(app).post("/api/search").send({ query: "photosynthesis" });
    const call = create.mock.calls[0][0];
    expect(call.messages[0]).toMatchObject({ role: "system", content: expect.stringContaining("Aether Command AI") });
    expect(call.messages[1]).toEqual({ role: "user", content: "photosynthesis" });
  });

  it("returns a prompt-to-enter-a-topic message for empty queries, without calling the AI", async () => {
    const res = await request(app).post("/api/search").send({ query: "   " });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: "Enter a topic first." });
    expect(create).not.toHaveBeenCalled();
  });

  it("handles a missing query field the same way", async () => {
    const res = await request(app).post("/api/search").send({});
    expect(res.body).toEqual({ result: "Enter a topic first." });
  });

  it("falls back to a default message when the AI returns no content", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const res = await request(app).post("/api/search").send({ query: "x" });
    expect(res.body).toEqual({ result: "No result found." });
  });
});
