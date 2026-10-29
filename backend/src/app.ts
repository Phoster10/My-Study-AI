import express from "express";
import cors from "cors";

import { ingestRouter } from "./routes/ingest.js";
import { summarizeRouter } from "./routes/summarize.js";
import { examRouter } from "./routes/exam.js";
import { xpRouter } from "./routes/xp.js";
import { searchRouter } from "./routes/search.js";
import { summariesRouter } from "./routes/summaries.js";
import { accountRouter } from "./routes/account.js";
import { errorHandler } from "./middleware/errorHandler.js";

/** Builds the Express app without starting a listener, so integration
 * tests can drive it in-process with supertest. */
export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/ingest", ingestRouter);
  app.use("/api/summarize", summarizeRouter);
  app.use("/api/exam", examRouter);
  app.use("/api/xp", xpRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/summaries", summariesRouter);
  app.use("/api/account", accountRouter);

  app.use(errorHandler);
  return app;
}
