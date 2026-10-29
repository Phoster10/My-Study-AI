// study-ai/backend/src/routes/account.ts
/**
 * Account routes (all require a signed-in user).
 *
 * PATCH  /api/account/username  Body: { username: string }
 * PATCH  /api/account/password  Body: { password: string, confirmPassword: string }
 * DELETE /api/account
 *
 * Username and password changes are validated here, on the server, *before*
 * anything is sent to Supabase. The frontend never calls supabase.auth.updateUser
 * for these any more, so the rules below cannot be bypassed by editing the
 * client. The actual write uses the admin API (auth.admin.updateUserById) with
 * the service-role key, always scoped to the id resolved from the verified
 * access token — never an id supplied by the client.
 *
 * Username is stored in the user's `user_metadata`, since there's no separate
 * profiles table in the schema.
 *
 * Deletion also needs the admin API (auth.admin.deleteUser). `user_stats` and
 * `summaries` both reference auth.users(id) with ON DELETE CASCADE, so
 * deleting the auth user cleans up everything else.
 */

import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { supabase } from "../lib/supabase.js";

export const accountRouter = Router();

accountRouter.use(requireAuth);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72; // bcrypt's input limit, which Supabase also enforces

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateUsername(input: unknown): Validation<string> {
  if (typeof input !== "string") {
    return { ok: false, error: "`username` is required." };
  }
  const username = input.trim();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return { ok: false, error: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters long.` };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, error: "Username can only contain letters, numbers, dots, underscores and hyphens." };
  }
  return { ok: true, value: username };
}

export function validatePassword(password: unknown, confirmPassword: unknown): Validation<string> {
  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return { ok: false, error: "`password` and `confirmPassword` are required." };
  }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN} characters.` };
  }
  if (password.length > PASSWORD_MAX) {
    return { ok: false, error: `Password must be at most ${PASSWORD_MAX} characters.` };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }
  return { ok: true, value: password };
}

/** Supabase 4xx errors (e.g. "new password should be different") are the
 * caller's problem, not a server fault, so they go back as 400 with the
 * message. Anything else is a real failure and falls through to errorHandler. */
function isClientError(error: unknown): error is { message: string } {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

accountRouter.patch(
  "/username",
  asyncRoute(async (req: AuthedRequest, res) => {
    const result = validateUsername(req.body?.username);
    if (!result.ok) return res.status(400).json({ error: result.error });

    // Merge with the existing metadata so nothing else stored there is lost.
    const { data: existing, error: lookupError } = await supabase.auth.admin.getUserById(req.userId!);
    if (lookupError) throw lookupError;

    const { error } = await supabase.auth.admin.updateUserById(req.userId!, {
      user_metadata: { ...(existing?.user?.user_metadata ?? {}), username: result.value },
    });
    if (error) {
      if (isClientError(error)) return res.status(400).json({ error: error.message });
      throw error;
    }

    res.json({ success: true, username: result.value });
  })
);

accountRouter.patch(
  "/password",
  asyncRoute(async (req: AuthedRequest, res) => {
    const result = validatePassword(req.body?.password, req.body?.confirmPassword);
    if (!result.ok) return res.status(400).json({ error: result.error });

    const { error } = await supabase.auth.admin.updateUserById(req.userId!, { password: result.value });
    if (error) {
      if (isClientError(error)) return res.status(400).json({ error: error.message });
      throw error;
    }

    res.json({ success: true });
  })
);

accountRouter.delete(
  "/",
  asyncRoute(async (req: AuthedRequest, res) => {
    const { error } = await supabase.auth.admin.deleteUser(req.userId!);
    if (error) throw error;
    res.json({ success: true });
  })
);