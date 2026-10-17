import { PROWADZACY } from "@/lib/mock-data";
import type { Prowadzacy } from "@/lib/types";

export async function getProwadzacy(): Promise<Prowadzacy[]> {
  // TODO(backend): supabase.from("prowadzacy").select("*, przedmioty(nazwa)").order("nazwisko")
  return PROWADZACY;
}

export async function getProwadzacyById(id: string): Promise<Prowadzacy | undefined> {
  // TODO(backend): supabase.from("prowadzacy").select(...).eq("id", id).maybeSingle()
  return PROWADZACY.find((p) => p.id === id);
}
