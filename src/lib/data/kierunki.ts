import { GRUPY, KIERUNKI } from "@/lib/mock-data";
import type { Grupa, Kierunek } from "@/lib/types";

export async function getKierunki(): Promise<Kierunek[]> {
  // TODO(backend): supabase.from("kierunki").select("id, nazwa").order("nazwa")
  return KIERUNKI;
}

export async function getGrupy(): Promise<Grupa[]> {
  // TODO(backend): supabase.from("grupy").select("id, kod, kierunek_id, tryb, liczba_studentow")
  //   (the student count may come from a view aggregating the `studenci` table)
  return GRUPY;
}

export async function getGrupa(id: string): Promise<Grupa | undefined> {
  // TODO(backend): supabase.from("grupy").select(...).eq("id", id).maybeSingle()
  return GRUPY.find((g) => g.id === id);
}
