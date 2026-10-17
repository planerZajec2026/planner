import { connection } from "next/server";
import { parseISODate, startOfWeek } from "./dates";

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param (`?a=1&a=2` → "1"). */
export function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Monday of the week given as `?tydzien=YYYY-MM-DD`, or of the current week.
 * Server-only: without a valid param it waits for the request, so "today" is never frozen at prerender time.
 */
export async function resolveTydzien(param: string | string[] | undefined): Promise<Date> {
  const requested = parseISODate(single(param));
  if (requested) return startOfWeek(requested);
  await connection();
  return startOfWeek(new Date());
}
