// study-ai/backend/tests/account.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const getUser = vi.fn();
const getUserById = vi.fn();
const updateUserById = vi.fn();
const deleteUser = vi.fn();

vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    auth: {
      getUser: (...a: unknown[]) => getUser(...a),
      admin: {
        getUserById: (...a: unknown[]) => getUserById(...a),
        updateUserById: (...a: unknown[]) => updateUserById(...a),
        deleteUser: (...a: unknown[]) => deleteUser(...a),
      },
    },
  },
}));

import { accountRouter } from "../src/routes/account.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const app = express().use(express.json()).use("/api/account", accountRouter).use(errorHandler);
const authed = (r: request.Test) => r.set("Authorization", "Bearer good-token");

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  getUserById.mockReset().mockResolvedValue({ data: { user: { user_metadata: { username: "old", theme: "dark" } } }, error: null });
  updateUserById.mockReset().mockResolvedValue({ data: {}, error: null });
  deleteUser.mockReset().mockResolvedValue({ error: null });
});

describe("PATCH /api/account/username", () => {
  const patch = (body: unknown) => authed(request(app).patch("/api/account/username")).send(body as object);

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).patch("/api/account/username").send({ username: "newname" });
    expect(res.status).toBe(401);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", {}],
    ["not a string", { username: { $ne: null } }],
    ["empty", { username: "" }],
    ["only spaces", { username: "     " }],
    ["too short", { username: "ab" }],
    ["too long", { username: "a".repeat(31) }],
    ["contains spaces", { username: "john smith" }],
    ["contains symbols", { username: "bad<name>" }],
  ])("rejects a username that is %s, without calling Supabase", async (_label, body) => {
    const res = await patch(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("trims and saves a valid username for the signed-in user only, keeping other metadata", async () => {
    const res = await patch({ username: "  new_name.1  ", userId: "someone-else" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, username: "new_name.1" });
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      user_metadata: { username: "new_name.1", theme: "dark" },
    });
  });

  it("returns Supabase 4xx errors as 400 with the message", async () => {
    updateUserById.mockResolvedValue({ error: Object.assign(new Error("Username taken"), { status: 422 }) });
    const res = await patch({ username: "newname" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username taken");
  });

  it("surfaces an unexpected Supabase failure as 500", async () => {
    updateUserById.mockResolvedValue({ error: new Error("admin api down") });
    const res = await patch({ username: "newname" });
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/account/password", () => {
  const patch = (body: unknown) => authed(request(app).patch("/api/account/password")).send(body as object);

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).patch("/api/account/password").send({ password: "abcdef", confirmPassword: "abcdef" });
    expect(res.status).toBe(401);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", {}],
    ["missing confirmation", { password: "abcdef" }],
    ["not strings", { password: 123456, confirmPassword: 123456 }],
    ["too short", { password: "abc", confirmPassword: "abc" }],
    ["too long", { password: "a".repeat(73), confirmPassword: "a".repeat(73) }],
    ["mismatched", { password: "abcdef", confirmPassword: "different" }],
  ])("rejects a password change that is %s, without calling Supabase", async (_label, body) => {
    const res = await patch(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("explains the specific problem", async () => {
    expect((await patch({ password: "abc", confirmPassword: "abc" })).body.error).toMatch(/at least 6/i);
    expect((await patch({ password: "abcdef", confirmPassword: "abcdeg" })).body.error).toMatch(/do not match/i);
  });

  it("changes the signed-in user's password via the admin API and never echoes it back", async () => {
    const res = await patch({ password: "abcdef", confirmPassword: "abcdef" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(updateUserById).toHaveBeenCalledWith("user-1", { password: "abcdef" });
  });

  it("returns Supabase 4xx errors as 400 with the message", async () => {
    updateUserById.mockResolvedValue({ error: Object.assign(new Error("New password should be different"), { status: 422 }) });
    const res = await patch({ password: "abcdef", confirmPassword: "abcdef" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("New password should be different");
  });

  it("surfaces an unexpected Supabase failure as 500", async () => {
    updateUserById.mockResolvedValue({ error: new Error("admin api down") });
    const res = await patch({ password: "abcdef", confirmPassword: "abcdef" });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/account", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).delete("/api/account");
    expect(res.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the signed-in user's own account via the admin API", async () => {
    const res = await authed(request(app).delete("/api/account"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("surfaces a Supabase admin error as 500", async () => {
    deleteUser.mockResolvedValue({ error: new Error("admin api down") });
    const res = await authed(request(app).delete("/api/account"));
    expect(res.status).toBe(500);
  });
});