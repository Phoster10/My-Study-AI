// study-ai/frontend/tests/apiClient.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getSession = vi.fn();
vi.mock("../src/lib/supabase", () => ({ supabase: { auth: { getSession: () => getSession() } } }));

import { api } from "../src/api/client";

const fetchMock = vi.fn();
const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "jwt-123" } } });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("attaches the Supabase access token as a Bearer header", async () => {
    fetchMock.mockResolvedValue(ok({ xp: 0 }));
    await api.getXP();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/xp$/);
    expect(init.headers.Authorization).toBe("Bearer jwt-123");
  });

  it("omits the Authorization header when signed out", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValue(ok({ summary: "s" }));
    await api.summarize("t", "bullet");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("sends JSON bodies with a content type", async () => {
    fetchMock.mockResolvedValue(ok({ summary: "s" }));
    await api.summarize("notes", "bullet");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ text: "notes", type: "bullet" });
  });

  it("uploads files as multipart FormData without forcing a content type", async () => {
    fetchMock.mockResolvedValue(ok({ text: "t", source: "pdf" }));
    await api.ingestFile(new File(["x"], "n.pdf"));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("throws the server's error message on a failed request", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "`text` is required." }) });
    await expect(api.summarize("", "bullet")).rejects.toThrow("`text` is required.");
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("no json"); } });
    await expect(api.getXP()).rejects.toThrow(/status 502/);
  });

  it("posts exam grading payloads", async () => {
    fetchMock.mockResolvedValue(ok({}));
    await api.gradeExam([{ id: "q1", question: "Q", type: "short_answer" }], { q1: "a" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ exam: [{ id: "q1", question: "Q", type: "short_answer" }], userAnswers: { q1: "a" } });
  });

  it("sends username and password changes to the backend as PATCH requests", async () => {
    fetchMock.mockResolvedValue(ok({ success: true, username: "newname" }));
    await api.updateUsername("newname");
    let [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/account\/username$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ username: "newname" });

    fetchMock.mockResolvedValue(ok({ success: true }));
    await api.updatePassword("abcdef", "abcdef");
    [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/api\/account\/password$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ password: "abcdef", confirmPassword: "abcdef" });
  });
});