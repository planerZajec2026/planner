import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Supabase client with the service_role key: bypasses RLS, so it must never reach the browser.
 * `server-only` makes the build fail if a Client Component imports this file.
 *
 * Exception to the "no service key in the app" rule of spec 08, until login exists (spec 11): the generator's
 * Server Action needs to queue a job in `generation_jobs`, which anonymous users may not write. Use it only for that.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY po stronie serwera.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
