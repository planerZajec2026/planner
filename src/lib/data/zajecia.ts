import { ZAJECIA } from "@/lib/mock-data";
import type { Zajecia } from "@/lib/types";

export async function getWszystkieZajecia(): Promise<Zajecia[]> {
  // TODO(backend): supabase.from("zajecia").select("*")
  return ZAJECIA;
}

export async function getZajeciaGrupy(grupaId: string): Promise<Zajecia[]> {
  // TODO(backend): supabase.from("zajecia").select("*").eq("grupa_id", grupaId)
  //   + filter by the selected week once date-based exceptions (cancelled classes, holidays) exist
  return ZAJECIA.filter((z) => z.grupaId === grupaId);
}

export async function getZajeciaProwadzacego(prowadzacyId: string): Promise<Zajecia[]> {
  // TODO(backend): supabase.from("zajecia").select("*, grupy(kod, tryb)").eq("prowadzacy_id", prowadzacyId)
  return ZAJECIA.filter((z) => z.prowadzacyId === prowadzacyId);
}
