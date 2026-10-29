import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — persistence routes will fail at request time.");
}

/** Service-role client. Only ever used server-side — this key must never be
 * shipped to the frontend. */
export const supabase = createClient(url ?? "", serviceKey ?? "");
