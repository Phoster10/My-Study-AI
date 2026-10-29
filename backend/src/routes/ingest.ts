/**
 * POST /api/ingest
 *
 * Single content-ingestion endpoint. Replaces the original three
 * near-duplicate /extract, /extract-pdf and /extract-image routes with one
 * endpoint that branches on the uploaded file's mime type.
 *
 * Accepts multipart/form-data with a `file` field (.pdf, .docx, .txt) OR a
 * JSON body `{ text: string }` for pasted notes.
 */

import { Router } from "express";
import multer from "multer";
import mammoth from "mammoth";
// pdf-parse has no ESM types; require-style default import works under NodeNext+CJS interop.
import pdfParse from "pdf-parse";
import { asyncRoute } from "../middleware/errorHandler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export const ingestRouter = Router();

ingestRouter.post(
  "/",
  upload.single("file"),
  asyncRoute(async (req, res) => {
    const file = req.file;

    if (!file) {
      const { text } = req.body ?? {};
      if (typeof text === "string" && text.trim()) {
        return res.json({ text: text.trim(), source: "pasted" });
      }
      return res.status(400).json({ error: "Provide a `file` upload or a non-empty `text` field." });
    }

    const { mimetype, originalname, buffer } = file;

    if (mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf")) {
      const parsed = await pdfParse(buffer);
      return res.json({ text: parsed.text.trim(), source: "pdf" });
    }

    if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      originalname.toLowerCase().endsWith(".docx")
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      return res.json({ text: parsed.value.trim(), source: "docx" });
    }

    if (mimetype.startsWith("text/") || originalname.toLowerCase().endsWith(".txt")) {
      return res.json({ text: buffer.toString("utf-8").trim(), source: "txt" });
    }

    return res.status(415).json({ error: `Unsupported file type: ${mimetype}. Supported: .pdf, .docx, .txt.` });
  })
);
