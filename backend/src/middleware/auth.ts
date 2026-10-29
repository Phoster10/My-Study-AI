import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

/** Verifies the Supabase access token sent by the SPA in the Authorization
 * header, and attaches the resolved user id to the request. Auth itself
 * (sign up / sign in) is handled by Supabase directly from the frontend;
 * the backend only ever verifies the resulting token. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization bearer token." });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  req.userId = data.user.id;
  next();
}
