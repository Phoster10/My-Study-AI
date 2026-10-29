import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const state = { rows: [] as any[], existing: null as any, upsertError: null as any };
const upsert = vi.fn(async () => ({ error: state.upsertError }));
const getUser = vi.fn();

vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: () => ({
      select: () => ({
        eq: () => {
          const p: any = Promise.resolve({ data: state.rows, error: null });
          p.eq = () => ({ maybeSingle: async () => ({ data: state.existing, error: null }) });
          return p;
        },
      }),
      upsert: (...a: unknown[]) => (upsert as any)(...a),
    }),
  },
}));

import { reviewRouter } from "../src/routes/review.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/review", reviewRouter).use(errorHandler);
const authed = (r: request.Test) => r.set("Authorization", "Bearer good-token");

beforeEach(() => {
  state.rows = []; state.existing = null; state.upsertError = null;
  upsert.mockClear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("auth middleware on review routes", () => {
  it("rejects a missing token", async () => {
    expect((await request(app).get("/api/review/due")).status).toBe(401);
  });
  it("rejects an invalid token", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("bad") });
    expect((await authed(request(app).get("/api/review/due"))).status).toBe(401);
  });
});

describe("GET /api/review/due", () => {
  it("returns only topics whose review date has passed, mapped to camelCase", async () => {
    const now = Date.now();
    state.rows = [
      { topic: "overdue", interval: 1, repetition: 1, ease_factor: 2.5, last_reviewed: now - 1e6, next_review_date: now - 1000 },
      { topic: "future", interval: 6, repetition: 2, ease_factor: 2.6, last_reviewed: now, next_review_date: now + 1e9 },
    ];
    const res = await authed(request(app).get("/api/review/due"));
    expect(res.status).toBe(200);
    expect(res.body.due).toHaveLength(1);
    expect(res.body.due[0]).toMatchObject({ topic: "overdue", easeFactor: 2.5 });
  });

  it("returns an empty list when the user has no topics", async () => {
    const res = await authed(request(app).get("/api/review/due"));
    expect(res.body.due).toEqual([]);
  });
});

describe("POST /api/review/submit", () => {
  it("validates the request body", async () => {
    expect((await authed(request(app).post("/api/review/submit")).send({ topic: "x" })).status).toBe(400);
    expect((await authed(request(app).post("/api/review/submit")).send({ isCorrect: true })).status).toBe(400);
  });

  it("creates a new topic scheduled 1 day out after a first correct review", async () => {
    const res = await authed(request(app).post("/api/review/submit")).send({ topic: "ATP", isCorrect: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ topic: "ATP", interval: 1, repetition: 1 });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0] as any;
    expect(row).toMatchObject({ user_id: "user-1", topic: "ATP", interval: 1, repetition: 1 });
    expect(opts).toEqual({ onConflict: "user_id,topic" });
  });

  it("advances an existing topic using its stored SM-2 state", async () => {
    state.existing = { interval: 1, repetition: 1, ease_factor: 2.5 };
    const res = await authed(request(app).post("/api/review/submit")).send({ topic: "ATP", isCorrect: true });
    expect(res.body).toMatchObject({ interval: 6, repetition: 2 });
  });

  it("resets an existing topic after an incorrect review", async () => {
    state.existing = { interval: 6, repetition: 2, ease_factor: 2.6 };
    const res = await authed(request(app).post("/api/review/submit")).send({ topic: "ATP", isCorrect: false });
    expect(res.body).toMatchObject({ interval: 0, repetition: 0 });
  });

  it("returns 500 when persistence fails", async () => {
    state.upsertError = new Error("db down");
    const res = await authed(request(app).post("/api/review/submit")).send({ topic: "ATP", isCorrect: true });
    expect(res.status).toBe(500);
  });
});
