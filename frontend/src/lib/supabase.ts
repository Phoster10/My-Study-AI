import { createClient } from "@supabase/supabase-js";

/** Client-side Supabase instance. Only used for authentication (sign up /
 * sign in / session) — all application data flows through the backend API,
 * which verifies the resulting access token (see backend/src/middleware/auth.ts). */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""
);
