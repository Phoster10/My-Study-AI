/**
 * POST /api/search
 *
 * Restored from the original app/api/search/route.ts almost verbatim,
 * including its "Aether Command AI" system-prompt persona — this is a
 * free-form "ask anything" endpoint, distinct from /api/summarize (which
 * always operates on the student's own notes). No auth: matches the
 * original, which allowed guest use.
 */

import { Router } from "express";
import { groq, CHAT_MODEL } from "../lib/groq.js";
import { asyncRoute } from "../middleware/errorHandler.js";

export const searchRouter = Router();

const SYSTEM_PROMPT = `You are Aether Command AI.

The user will search for a topic.

Your job:
- Provide clear, accurate information
- Keep it concise but informative
- Use clean paragraphs (NO bullet points)
- Prioritize understanding over length`;

searchRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const { query } = req.body ?? {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.json({ result: "Enter a topic first." });
    }

    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      temperature: 0.5,
    });

    res.json({ result: response.choices[0]?.message?.content ?? "No result found." });
  })
);
