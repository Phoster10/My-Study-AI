import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const state = { rows: [] as any[], row: null as any, insertError: null as any, deleteError: null as any };
const getUser = vi.fn();
const insertedRow = { id: "sum-1", title: "My note", summary_type: "bullet", created_at: "2026-01-01" };

vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: () => ({
      select: (cols: string) => ({
        eq: () => {
          if (cols.includes("source_text")) {
            // GET /:id path
            return { eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) };
          }
          // GET / (list) path
          return { order: async () => ({ data: state.rows, error: null }) };
        },
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: insertedRow, error: state.insertError }) }),
      }),
      delete: () => ({ eq: () => ({ eq: async () => ({ error: state.deleteError }) }) }),
    }),
  },
}));

import { summariesRouter } from "../src/routes/summaries.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/summaries", summariesRouter).use(errorHandler);
const authed = (r: request.Test) => r.set("Authorization", "Bearer good-token");

beforeEach(() => {
  state.rows = [];
  state.row = null;
  state.insertError = null;
  state.deleteError = null;
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("auth on /api/summaries", () => {
  it("rejects every route without a token", async () => {
    expect((await request(app).get("/api/summaries")).status).toBe(401);
    expect((await request(app).get("/api/summaries/abc")).status).toBe(401);
    expect((await request(app).post("/api/summaries")).status).toBe(401);
    expect((await request(app).delete("/api/summaries/abc")).status).toBe(401);
  });
});

describe("GET /api/summaries", () => {
  it("lists saved summaries without the full text", async () => {
    state.rows = [insertedRow];
    const res = await authed(request(app).get("/api/summaries"));
    expect(res.status).toBe(200);
    expect(res.body.summaries).toEqual([insertedRow]);
  });
});

describe("GET /api/summaries/:id", () => {
  it("returns 404 when not found (or not owned by this user)", async () => {
    const res = await authed(request(app).get("/api/summaries/nope"));
    expect(res.status).toBe(404);
  });

  it("returns the full record including source_text", async () => {
    state.row = { ...insertedRow, source_text: "original notes", summary_text: "- point one" };
    const res = await authed(request(app).get("/api/summaries/sum-1"));
    expect(res.status).toBe(200);
    expect(res.body.source_text).toBe("original notes");
  });
});

describe("POST /api/summaries", () => {
  it("validates required fields", async () => {
    expect((await authed(request(app).post("/api/summaries")).send({})).status).toBe(400);
    expect((await authed(request(app).post("/api/summaries")).send({ title: "x" })).status).toBe(400);
    expect(
      (await authed(request(app).post("/api/summaries")).send({ title: "x", summaryText: "y" })).status
    ).toBe(400);
  });

  it("saves a summary and returns the created record", async () => {
    const res = await authed(request(app).post("/api/summaries")).send({
      title: "Biology notes",
      summaryType: "bullet",
      sourceText: "mitochondria...",
      summaryText: "- mitochondria produce ATP",
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(insertedRow);
  });

  it("surfaces a database error as 500", async () => {
    state.insertError = new Error("db down");
    const res = await authed(request(app).post("/api/summaries")).send({
      title: "x",
      sourceText: "y",
      summaryText: "z",
    });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/summaries/:id", () => {
  it("deletes and returns success", async () => {
    const res = await authed(request(app).delete("/api/summaries/sum-1"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("surfaces a database error as 500", async () => {
    state.deleteError = new Error("db down");
    const res = await authed(request(app).delete("/api/summaries/sum-1"));
    expect(res.status).toBe(500);
  });
});
