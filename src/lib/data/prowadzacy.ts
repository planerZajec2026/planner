import { createClient } from "@/lib/supabase/server";
import type { Prowadzacy } from "@/lib/types";

type ProwadzacyDb = {
  id: string;
  stopien: string | null;
  nazwa: string;
  jednostka: string | null;
  zajecia_plan_prowadzacy: { zajecia_plan: { przedmioty_plan: { nazwa: string } } }[];
};

/** The instructors with the subjects they teach (from the classes to schedule), ordered by id. */
export async function getProwadzacy(): Promise<Prowadzacy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prowadzacy_plan")
    .select(
      `id, stopien, nazwa, jednostka,
       zajecia_plan_prowadzacy (zajecia_plan!inner (przedmioty_plan!inner (nazwa)))`,
    )
    .order("id");
  if (error) throw new Error(`Nie udało się pobrać prowadzących: ${error.message}`);
  return (data as unknown as ProwadzacyDb[]).map((p) => ({
    id: p.id,
    stopien: p.stopien ?? "",
    nazwa: p.nazwa,
    jednostka: p.jednostka ?? "",
    przedmioty: [...new Set(p.zajecia_plan_prowadzacy.map((z) => z.zajecia_plan.przedmioty_plan.nazwa))].sort((a, b) =>
      a.localeCompare(b, "pl"),
    ),
  }));
}

export async function getProwadzacyById(id: string): Promise<Prowadzacy | undefined> {
  return (await getProwadzacy()).find((p) => p.id === id);
}
