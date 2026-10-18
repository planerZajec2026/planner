import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components.
 *
 * TODO(backend): not used yet. The UI reads mock data through src/lib/data/*.
 * Once the database exists, generate types (`supabase gen types typescript`) and pass them as the generic.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
