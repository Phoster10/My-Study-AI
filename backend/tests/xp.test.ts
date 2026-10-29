import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const state = { row: null as { xp: number } | null, upsertError: null as Error | null };
const upsert = vi.fn(async () => ({ error: state.upsertError }));
const getUser = vi.fn();

vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }),
      upsert: (...a: unknown[]) => (upsert as any)(...a),
    }),
  },
}));

import { xpRouter } from "../src/routes/xp.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/xp", xpRouter).use(errorHandler);
const authed = (r: request.Test) => r.set("Authorization", "Bearer good-token");

beforeEach(() => {
  state.row = null;
  state.upsertError = null;
  upsert.mockClear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("auth on /api/xp", () => {
  it("rejects requests with no token", async () => {
    expect((await request(app).get("/api/xp")).status).toBe(401);
    expect((await request(app).post("/api/xp/update").send({ amount: 10 })).status).toBe(401);
  });
});

describe("GET /api/xp", () => {
  it("returns 0 for a user with no XP row yet", async () => {
    const res = await authed(request(app).get("/api/xp"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ xp: 0 });
  });

  it("returns the stored total", async () => {
    state.row = { xp: 240 };
    const res = await authed(request(app).get("/api/xp"));
    expect(res.body).toEqual({ xp: 240 });
  });
});

describe("POST /api/xp/update", () => {
  it("validates that amount is a number", async () => {
    expect((await authed(request(app).post("/api/xp/update")).send({})).status).toBe(400);
    expect((await authed(request(app).post("/api/xp/update")).send({ amount: "10" })).status).toBe(400);
  });

  it("creates a fresh total for a first-time user", async () => {
    const res = await authed(request(app).post("/api/xp/update")).send({ amount: 30 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, xp: 30 });
    const [row, opts] = upsert.mock.calls[0] as any;
    expect(row).toMatchObject({ user_id: "user-1", xp: 30 });
    expect(opts).toEqual({ onConflict: "user_id" });
  });

  it("adds to an existing total rather than overwriting it", async () => {
    state.row = { xp: 100 };
    const res = await authed(request(app).post("/api/xp/update")).send({ amount: 15 });
    expect(res.body).toEqual({ success: true, xp: 115 });
  });

  it("accepts a negative amount (e.g. a penalty)", async () => {
    state.row = { xp: 50 };
    const res = await authed(request(app).post("/api/xp/update")).send({ amount: -20 });
    expect(res.body.xp).toBe(30);
  });

  it("returns 500 when persistence fails", async () => {
    state.upsertError = new Error("db down");
    const res = await authed(request(app).post("/api/xp/update")).send({ amount: 10 });
    expect(res.status).toBe(500);
  });
});
