/**
 * GET  /api/xp        — current XP total for the signed-in user
 * POST /api/xp/update — add `amount` XP and return the new total
 *
 * Restored from the original app/api/xp/update/route.ts. That route read
 * `userId` from the request body and trusted it — anyone could award XP to
 * any other user's account by supplying their id. Here the user id comes
 * from the verified JWT (see middleware/auth.ts) instead, the same pattern
 * already used by routes/summaries.ts. The accumulate-and-return logic itself
 * (read current total, add amount, write back) is unchanged.
 *
 * Also restored as *working*: in the original app this endpoint existed but
 * was never called from anywhere in the frontend (see AGENTS notes / commit
 * message), so XP never actually changed. ExamModal now calls this after
 * grading — 10 XP per correct answer — so the number on screen is real.
 */

import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { supabase } from "../lib/supabase.js";

export const xpRouter = Router();

xpRouter.use(requireAuth);

xpRouter.get(
  "/",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase.from("user_stats").select("xp").eq("user_id", req.userId).maybeSingle();
    if (error) throw error;
    res.json({ xp: data?.xp ?? 0 });
  })
);

xpRouter.post(
  "/update",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { amount } = req.body ?? {};
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      return res.status(400).json({ error: "`amount` must be a number." });
    }

    const { data, error } = await supabase.from("user_stats").select("xp").eq("user_id", req.userId).maybeSingle();
    if (error) throw error;

    const currentXP = data?.xp ?? 0;
    const updatedXP = currentXP + amount;

    const { error: upsertError } = await supabase
      .from("user_stats")
      .upsert({ user_id: req.userId, xp: updatedXP, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (upsertError) throw upsertError;

    res.json({ success: true, xp: updatedXP });
  })
);
