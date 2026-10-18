import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new client for every request; never share one between requests.
 *
 * TODO(backend): not used yet. The UI reads mock data through src/lib/data/* until spec 10.
 * database.types.ts is generated: regenerate it with `npm run db:types` after every migration.
 * Add a proxy/middleware that refreshes the session once auth is introduced.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only. Session refresh belongs in the proxy.
          }
        },
      },
    },
  );
}
