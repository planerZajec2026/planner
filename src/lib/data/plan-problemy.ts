import type { Forma } from "@/lib/plan";
import { problemyPlanu, type DaneProblemow, type ProblemyPlanu, type ZajeciaProblemu } from "@/lib/plan-problemy";
import { createClient } from "@/lib/supabase/server";

type WierszPlanu = {
  zajecia_id: string;
  dzien: number;
  slot: number;
  sala_id: string;
  tygodnie: number[];
  zajecia_plan: {
    forma: string;
    liczba_studentow: number;
    dodatkowi_studenci: number;
    sloty_na_spotkanie: number;
    przedmioty_plan: { nazwa: string };
    zajecia_plan_grupy: { grupa_id: string }[];
    zajecia_plan_prowadzacy: { prowadzacy_id: string }[];
  };
};

/**
 * Soft-constraint problems of a finished plan as it is now, manual edits included (spec 15). `wagi` are the job's
 * weights that differ from the defaults, so the score matches the one the worker computed after generation.
 */
export async function getProblemyPlanu(jobId: string, wagi: Record<string, number>): Promise<ProblemyPlanu> {
  const supabase = await createClient();
  const [plan, sale, grupy, prowadzacy, preferencje] = await Promise.all([
    supabase
      .from("plan_zajec")
      .select(
        `zajecia_id, dzien, slot, sala_id, tygodnie,
         zajecia_plan!inner (
           forma, liczba_studentow, dodatkowi_studenci, sloty_na_spotkanie,
           przedmioty_plan!inner (nazwa),
           zajecia_plan_grupy (grupa_id),
           zajecia_plan_prowadzacy (prowadzacy_id)
         )`,
      )
      .eq("job_id", jobId)
      .order("zajecia_id"),
    supabase.from("sale").select("id, pojemnosc"),
    supabase.from("grupy_plan").select("id, nazwa, rocznik_id, grupa_nadrzedna"),
    supabase.from("prowadzacy_plan").select("id, nazwa"),
    supabase.from("dezyderaty_ogolne").select("prowadzacy_id, preferencja_dni"),
  ]);
  for (const wynik of [plan, sale, grupy, prowadzacy, preferencje]) {
    if (wynik.error) throw new Error(`Nie udało się ocenić planu: ${wynik.error.message}`);
  }

  const wiersze = plan.data as unknown as WierszPlanu[];
  const zajecia: Record<string, ZajeciaProblemu> = {};
  for (const r of wiersze) {
    const z = r.zajecia_plan;
    zajecia[r.zajecia_id] = {
      id: r.zajecia_id,
      przedmiot: z.przedmioty_plan.nazwa,
      forma: z.forma as Forma,
      grupy: z.zajecia_plan_grupy.map((g) => g.grupa_id).sort(),
      prowadzacy: z.zajecia_plan_prowadzacy.map((p) => p.prowadzacy_id).sort(),
      miejsca: z.liczba_studentow + z.dodatkowi_studenci,
      sloty: z.sloty_na_spotkanie,
    };
  }

  const dane: DaneProblemow = {
    zajecia,
    plan: wiersze.map((r) => ({ zajeciaId: r.zajecia_id, dzien: r.dzien, slot: r.slot, sala: r.sala_id, tygodnie: r.tygodnie })),
    sale: sale.data ?? [],
    nadrzedne: Object.fromEntries((grupy.data ?? []).map((g) => [g.id, g.grupa_nadrzedna])),
    preferencje: Object.fromEntries((preferencje.data ?? []).map((p) => [p.prowadzacy_id, p.preferencja_dni])),
    etykiety: {
      grupy: Object.fromEntries((grupy.data ?? []).map((g) => [g.id, `${g.rocznik_id} · ${g.nazwa}`])),
      prowadzacy: Object.fromEntries((prowadzacy.data ?? []).map((p) => [p.id, p.nazwa])),
    },
  };
  return problemyPlanu(dane, wagi);
}
