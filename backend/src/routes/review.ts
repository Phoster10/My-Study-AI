/**
 * GET  /api/review/due     — topics due for review for the signed-in user
 * POST /api/review/submit  — records a review outcome for a topic and
 *                             reschedules it via the SM-2 engine
 *
 * All routes require a valid Supabase session (see middleware/auth.ts).
 */

import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { supabase } from "../lib/supabase.js";
import { processReview, getDueTopics, type TopicMemory } from "../spacedRepetition/sm2.js";

export const reviewRouter = Router();

reviewRouter.use(requireAuth);

reviewRouter.get(
  "/due",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase.from("topics").select("*").eq("user_id", req.userId);
    if (error) throw error;

    const topics: TopicMemory[] = (data ?? []).map((t) => ({
      topic: t.topic,
      interval: t.interval,
      repetition: t.repetition,
      easeFactor: t.ease_factor,
      lastReviewed: t.last_reviewed,
      nextReviewDate: t.next_review_date,
    }));

    res.json({ due: getDueTopics(topics) });
  })
);

reviewRouter.post(
  "/submit",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { topic, isCorrect } = req.body ?? {};
    if (!topic || typeof topic !== "string" || typeof isCorrect !== "boolean") {
      return res.status(400).json({ error: "`topic` (string) and `isCorrect` (boolean) are required." });
    }

    const { data: existing } = await supabase
      .from("topics")
      .select("*")
      .eq("user_id", req.userId)
      .eq("topic", topic)
      .maybeSingle();

    const updated = processReview(
      existing
        ? {
            interval: existing.interval,
            repetition: existing.repetition,
            easeFactor: existing.ease_factor,
          }
        : undefined,
      isCorrect
    );

    const { error } = await supabase.from("topics").upsert(
      {
        user_id: req.userId,
        topic,
        interval: updated.interval,
        repetition: updated.repetition,
        ease_factor: updated.easeFactor,
        last_reviewed: updated.lastReviewed,
        next_review_date: updated.nextReviewDate,
      },
      { onConflict: "user_id,topic" }
    );

    if (error) throw error;

    res.json({ topic, ...updated });
  })
);
