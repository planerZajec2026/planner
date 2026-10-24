import { createClient } from "@/lib/supabase/server";
import { wierszZBazy, type Etykiety, type KalendarzDzien, type PlanRowDb, type PlanWiersz } from "@/lib/plan";

export type StatusZadania = "queued" | "running" | "done" | "failed";

export type Zadanie = {
  id: string;
  status: StatusZadania;
  limitCzasu: number | null;
  utworzono: string;
  rozpoczeto: string | null;
  zakonczono: string | null;
  blad: string | null;
  raport: RaportZadania | null;
  wynikMiekkich: number | null;
};

/** What the worker stores in `generation_jobs.raport`. */
export type RaportZadania = {
  status_solvera?: string;
  czas_s?: number;
  kara_modelu?: number | null;
  dolna_granica?: number | null;
  naruszenia?: Record<string, number>;
  miekkie?: Record<string, number>;
};

export type AktywnyPlan = {
  zadanie: Zadanie;
  wiersze: PlanWiersz[];
  etykiety: Etykiety;
  /** Rooms that appear in the plan, for the room filter. */
  sale: string[];
  kalendarz: KalendarzDzien[];
};

type ZadanieDb = {
  id: string;
  status: StatusZadania;
  parametry: { limit_czasu?: number } | null;
  utworzono: string;
  rozpoczeto: string | null;
  zakonczono: string | null;
  blad: string | null;
  raport: RaportZadania | null;
  wynik_miekkich: number | null;
};

const ZADANIE_KOLUMNY = "id, status, parametry, utworzono, rozpoczeto, zakonczono, blad, raport, wynik_miekkich";

function zadanie(r: ZadanieDb): Zadanie {
  return {
    id: r.id,
    status: r.status,
    limitCzasu: r.parametry?.limit_czasu ?? null,
    utworzono: r.utworzono,
    rozpoczeto: r.rozpoczeto,
    zakonczono: r.zakonczono,
    blad: r.blad,
    raport: r.raport,
    wynikMiekkich: r.wynik_miekkich,
  };
}

/** The latest generation jobs, newest first. */
export async function getZadania(limit = 10): Promise<Zadanie[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select(ZADANIE_KOLUMNY)
    .order("utworzono", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Nie udało się pobrać zadań: ${error.message}`);
  return (data as unknown as ZadanieDb[]).map(zadanie);
}

/** The most recently finished plan with everything the plan views need, or null when none was generated yet. */
export async function getAktywnyPlan(): Promise<AktywnyPlan | null> {
  const supabase = await createClient();
  const { data: zadania, error } = await supabase
    .from("generation_jobs")
    .select(ZADANIE_KOLUMNY)
    .eq("status", "done")
    .order("zakonczono", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Nie udało się pobrać planu: ${error.message}`);
  if (!zadania || zadania.length === 0) return null;
  const job = zadanie(zadania[0] as unknown as ZadanieDb);

  const [plan, grupy, prowadzacy, kalendarz] = await Promise.all([
    supabase
      .from("plan_zajec")
      .select(
        `zajecia_id, dzien, slot, sala_id, tygodnie,
         zajecia_plan!inner (
           forma, rocznik_id, sloty_na_spotkanie, czestotliwosc,
           przedmioty_plan!inner (nazwa),
           zajecia_plan_grupy (grupa_id),
           zajecia_plan_prowadzacy (prowadzacy_id)
         )`,
      )
      .eq("job_id", job.id)
      .order("zajecia_id"),
    supabase.from("grupy_plan").select("id, nazwa, rocznik_id"),
    supabase.from("prowadzacy_plan").select("id, nazwa"),
    supabase.from("kalendarz").select("data, plan_dnia, nr_tygodnia").not("plan_dnia", "is", null),
  ]);
  for (const wynik of [plan, grupy, prowadzacy, kalendarz]) {
    if (wynik.error) throw new Error(`Nie udało się pobrać planu: ${wynik.error.message}`);
  }

  const wiersze = (plan.data as unknown as PlanRowDb[]).map(wierszZBazy);
  return {
    zadanie: job,
    wiersze,
    etykiety: {
      grupy: Object.fromEntries((grupy.data ?? []).map((g) => [g.id, `${g.rocznik_id} · ${g.nazwa}`])),
      prowadzacy: Object.fromEntries((prowadzacy.data ?? []).map((p) => [p.id, p.nazwa])),
    },
    sale: [...new Set(wiersze.map((w) => w.sala))].sort((a, b) => a.localeCompare(b, "pl")),
    kalendarz: (kalendarz.data ?? []).map((k) => ({ data: k.data, planDnia: k.plan_dnia, nrTygodnia: k.nr_tygodnia })),
  };
}
