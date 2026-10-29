/**
 * Saved summaries, backing the History page.
 *
 * GET    /api/summaries      — list the signed-in user's saved summaries
 *                               (no source_text/summary_text, keeps the
 *                               list payload small)
 * GET    /api/summaries/:id  — one summary in full, including source_text
 *                               (used as the basis for a History-triggered
 *                               exam) and summary_text
 * POST   /api/summaries      — save a new summary
 * DELETE /api/summaries/:id  — remove a saved summary
 */

import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { supabase } from "../lib/supabase.js";

export const summariesRouter = Router();

summariesRouter.use(requireAuth);

summariesRouter.get(
  "/",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("summaries")
      .select("id, title, summary_type, created_at")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ summaries: data ?? [] });
  })
);

summariesRouter.get(
  "/:id",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("summaries")
      .select("id, title, summary_type, source_text, summary_text, created_at")
      .eq("user_id", req.userId)
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Summary not found." });
    res.json(data);
  })
);

summariesRouter.post(
  "/",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { title, summaryType, sourceText, summaryText } = req.body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "`title` is required." });
    }
    if (!summaryText || typeof summaryText !== "string" || !summaryText.trim()) {
      return res.status(400).json({ error: "`summaryText` is required." });
    }
    if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) {
      return res.status(400).json({ error: "`sourceText` is required." });
    }

    const { data, error } = await supabase
      .from("summaries")
      .insert({
        user_id: req.userId,
        title: title.trim().slice(0, 200),
        summary_type: summaryType ?? "bullet",
        source_text: sourceText,
        summary_text: summaryText,
      })
      .select("id, title, summary_type, created_at")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  })
);

summariesRouter.delete(
  "/:id",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { error } = await supabase.from("summaries").delete().eq("user_id", req.userId).eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  })
);
