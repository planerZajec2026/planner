import { createClient } from "@/lib/supabase/server";
import type { Grupa, Kierunek } from "@/lib/types";

/** "Informatyka" → "informatyka": the programme's id in URLs. The source data has no separate id for it. */
export function kierunekId(nazwa: string): string {
  return nazwa
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/ł/g, "l")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type GrupaDb = {
  id: string;
  rocznik_id: string;
  grupa_nadrzedna: string | null;
  liczba_studentow: number;
  roczniki: { kierunek: string; nazwa: string };
};

/** The programmes that have a year in the loaded data; empty until the input data is loaded. */
export async function getKierunki(): Promise<Kierunek[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roczniki").select("kierunek");
  if (error) throw new Error(`Nie udało się pobrać kierunków: ${error.message}`);
  const nazwy = [...new Set(data.map((r) => r.kierunek))].sort((a, b) => a.localeCompare(b, "pl"));
  return nazwy.map((nazwa) => ({ id: kierunekId(nazwa), nazwa }));
}

/** Every group (whole years, lab and exercise groups, specialisations, options), ordered by code. */
export async function getGrupy(): Promise<Grupa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grupy_plan")
    .select("id, rocznik_id, grupa_nadrzedna, liczba_studentow, roczniki!inner (kierunek, nazwa)")
    .order("id");
  if (error) throw new Error(`Nie udało się pobrać grup: ${error.message}`);
  return (data as unknown as GrupaDb[]).map((g) => ({
    id: g.id,
    kod: g.id,
    kierunekId: kierunekId(g.roczniki.kierunek),
    rocznikId: g.rocznik_id,
    rocznikNazwa: g.roczniki.nazwa,
    nadrzednaId: g.grupa_nadrzedna ?? undefined,
    liczbaStudentow: g.liczba_studentow,
  }));
}

export async function getGrupa(id: string): Promise<Grupa | undefined> {
  return (await getGrupy()).find((g) => g.id === id);
}
