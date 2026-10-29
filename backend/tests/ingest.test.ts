import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("pdf-parse", () => ({ default: vi.fn().mockResolvedValue({ text: "  pdf body  " }) }));
vi.mock("mammoth", () => ({ default: { extractRawText: vi.fn().mockResolvedValue({ value: "  docx body  " }) } }));

import { ingestRouter } from "../src/routes/ingest.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import pdfParse from "pdf-parse";

const app = express().use(express.json()).use("/api/ingest", ingestRouter).use(errorHandler);
const upload = (name: string, type: string, body = "x") => request(app).post("/api/ingest").attach("file", Buffer.from(body), { filename: name, contentType: type });

describe("POST /api/ingest file handling", () => {
  it("extracts text from a PDF", async () => {
    const res = await upload("n.pdf", "application/pdf");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "pdf body", source: "pdf" });
  });

  it("extracts text from a DOCX", async () => {
    const res = await upload("n.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(res.body).toEqual({ text: "docx body", source: "docx" });
  });

  it("detects type by extension when the mime type is generic", async () => {
    const res = await upload("n.pdf", "application/octet-stream");
    expect(res.body.source).toBe("pdf");
  });

  it("rejects unsupported file types with 415", async () => {
    const res = await upload("n.png", "image/png");
    expect(res.status).toBe(415);
  });

  it("returns 500 with a JSON error when parsing fails", async () => {
    vi.mocked(pdfParse).mockRejectedValueOnce(new Error("corrupt pdf"));
    const res = await upload("bad.pdf", "application/pdf");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("corrupt pdf");
  });
});
