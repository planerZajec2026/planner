import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Supabase client for Client Components.
 *
 * TODO(backend): not used yet. The UI reads mock data through src/lib/data/* until spec 10.
 * database.types.ts is generated: regenerate it with `npm run db:types` after every migration.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
