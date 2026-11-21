import type { SupabaseClient } from "@supabase/supabase-js";
import type { Czestotliwosc, Forma } from "@/lib/plan";
import { razem, type KontekstEdycji, type Przydzial, type TypPowiazania, type ZajeciaPlanu } from "@/lib/plan-edycja";
import type { DaneOceny } from "@/lib/plan-problemy";
import type { Database } from "@/lib/supabase/database.types";

export type WynikKontekstu =
  /** No plan was generated yet. */
  | { status: "brak-planu" }
  /** The active plan has no such class. */
  | { status: "brak-zajec" }
  /** `ocena` scores the plan before and after the edit (spec 15); the Server Action needs only `kontekst`. */
  | { status: "ok"; kontekst: KontekstEdycji; ocena: DaneOceny };

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
    liczba_spotkan: number;
    sloty_na_spotkanie: number;
    czestotliwosc: string;
    tydzien_od: number;
    tydzien_do: number;
    typy_sal: string[];
    dozwolone_sale: string[];
    wymagane_wyposazenie: string[];
    powiazanie: string | null;
    typ_powiazania: string | null;
    tygodnie_niedostepne: number[];
    przedmioty_plan: { nazwa: string };
    zajecia_plan_grupy: { grupa_id: string }[];
    zajecia_plan_prowadzacy: { prowadzacy_id: string }[];
  };
};

const rosnaco = (a: number, b: number) => a - b;

function zajeciaZBazy(r: WierszPlanu): ZajeciaPlanu {
  const z = r.zajecia_plan;
  return {
    id: r.zajecia_id,
    przedmiot: z.przedmioty_plan.nazwa,
    forma: z.forma as Forma,
    grupy: z.zajecia_plan_grupy.map((g) => g.grupa_id).sort(),
    prowadzacy: z.zajecia_plan_prowadzacy.map((p) => p.prowadzacy_id).sort(),
    miejsca: z.liczba_studentow + z.dodatkowi_studenci,
    liczbaSpotkan: z.liczba_spotkan,
    sloty: z.sloty_na_spotkanie,
    czestotliwosc: z.czestotliwosc as Czestotliwosc,
    tydzienOd: z.tydzien_od,
    tydzienDo: z.tydzien_do,
    tygodnieNiedostepne: z.tygodnie_niedostepne ?? [],
    typySal: z.typy_sal ?? [],
    dozwoloneSale: z.dozwolone_sale ?? [],
    wymaganeWyposazenie: z.wymagane_wyposazenie ?? [],
    powiazanie: z.powiazanie,
    typPowiazania: z.typ_powiazania as TypPowiazania | null,
  };
}

/**
 * The active plan with everything needed to check an edit of one class (spec 14). The caller passes the client:
 * the page reads with the visitor's rights, the Server Action with service_role.
 *
 * The plan's version is read before the placements. If someone saves an edit in between, the context holds newer
 * placements with an older version, and a save from it is refused: never the other way round.
 */
export async function getKontekstEdycji(supabase: SupabaseClient<Database>, zajeciaId: string): Promise<WynikKontekstu> {
  const blad = (co: string, e: { message: string }) => new Error(`Nie udało się pobrać ${co}: ${e.message}`);

  const { data: zadania, error } = await supabase
    .from("generation_jobs")
    .select("id, zmiany_reczne, parametry, wynik_miekkich")
    .eq("status", "done")
    .order("zakonczono", { ascending: false })
    .limit(1);
  if (error) throw blad("planu", error);
  if (!zadania || zadania.length === 0) return { status: "brak-planu" };
  const job = zadania[0];

  const [plan, sale, blokady, rada, grupy, prowadzacy, preferencje] = await Promise.all([
    supabase
      .from("plan_zajec")
      .select(
        `zajecia_id, dzien, slot, sala_id, tygodnie,
         zajecia_plan!inner (
           forma, liczba_studentow, dodatkowi_studenci, liczba_spotkan, sloty_na_spotkanie, czestotliwosc,
           tydzien_od, tydzien_do, typy_sal, dozwolone_sale, wymagane_wyposazenie, powiazanie, typ_powiazania,
           tygodnie_niedostepne,
           przedmioty_plan!inner (nazwa),
           zajecia_plan_grupy (grupa_id),
           zajecia_plan_prowadzacy (prowadzacy_id)
         )`,
      )
      .eq("job_id", job.id)
      .order("zajecia_id"),
    supabase.from("sale").select("id, typ, pojemnosc, wyposazenie, dostepna_do_planowania").order("id"),
    supabase.from("blokady_stale").select("grupa_id, dzien, slot_od, slot_do"),
    supabase.from("rada_wydzialu").select("dzien, slot_od, slot_do"),
    supabase.from("grupy_plan").select("id, nazwa, rocznik_id, grupa_nadrzedna"),
    supabase.from("prowadzacy_plan").select("id, nazwa, czlonek_rady_wydzialu"),
    supabase.from("dezyderaty_ogolne").select("prowadzacy_id, preferencja_dni"),
  ]);
  if (plan.error) throw blad("planu", plan.error);
  if (sale.error) throw blad("sal", sale.error);
  if (blokady.error) throw blad("blokad", blokady.error);
  if (rada.error) throw blad("terminów Rady Wydziału", rada.error);
  if (grupy.error) throw blad("grup", grupy.error);
  if (prowadzacy.error) throw blad("prowadzących", prowadzacy.error);
  if (preferencje.error) throw blad("dezyderatów", preferencje.error);

  const wiersze = plan.data as unknown as WierszPlanu[];
  const zajecia: Record<string, ZajeciaPlanu> = {};
  for (const r of wiersze) zajecia[r.zajecia_id] = zajeciaZBazy(r);
  if (!zajecia[zajeciaId]) return { status: "brak-zajec" };

  const kontekst: KontekstEdycji = {
    jobId: job.id,
    wersja: job.zmiany_reczne,
    zajecia,
    plan: wiersze.map(
      (r): Przydzial => ({
        zajeciaId: r.zajecia_id,
        dzien: r.dzien,
        slot: r.slot,
        sala: r.sala_id,
        tygodnie: [...r.tygodnie].sort(rosnaco),
      }),
    ),
    sale: (sale.data ?? []).map((s) => ({
      id: s.id,
      typ: s.typ,
      pojemnosc: s.pojemnosc,
      wyposazenie: s.wyposazenie ?? [],
      dostepna: s.dostepna_do_planowania,
    })),
    kolizje: [],
    blokady: (blokady.data ?? []).map((b) => ({ grupa: b.grupa_id, dzien: b.dzien, slotOd: b.slot_od, slotDo: b.slot_do })),
    wykluczone: {},
    etykiety: {
      grupy: Object.fromEntries((grupy.data ?? []).map((g) => [g.id, `${g.rocznik_id} · ${g.nazwa}`])),
      prowadzacy: Object.fromEntries((prowadzacy.data ?? []).map((p) => [p.id, p.nazwa])),
    },
  };

  // Collisions and excluded hours only for the classes that move: the checks need nothing else, and the queries
  // stay far below the API's row limit.
  const ruszane = razem(kontekst, zajeciaId).map((id) => zajecia[id]);
  const grupyRuszane = [...new Set(ruszane.flatMap((z) => z.grupy))];
  const prowRuszani = [...new Set(ruszane.flatMap((z) => z.prowadzacy))];

  const [kolizjeA, kolizjeB, dezyderaty] = await Promise.all([
    supabase.from("kolizje_grup").select("grupa_a, grupa_b").in("grupa_a", grupyRuszane),
    supabase.from("kolizje_grup").select("grupa_a, grupa_b").in("grupa_b", grupyRuszane),
    supabase.from("dezyderaty_terminy").select("prowadzacy_id, dzien, slot").in("prowadzacy_id", prowRuszani),
  ]);
  if (kolizjeA.error) throw blad("kolizji grup", kolizjeA.error);
  if (kolizjeB.error) throw blad("kolizji grup", kolizjeB.error);
  if (dezyderaty.error) throw blad("dezyderatów", dezyderaty.error);

  const pary = new Map<string, [string, string]>();
  for (const k of [...(kolizjeA.data ?? []), ...(kolizjeB.data ?? [])]) pary.set(`${k.grupa_a}\u0000${k.grupa_b}`, [k.grupa_a, k.grupa_b]);
  kontekst.kolizje = [...pary.values()];

  const dodaj = (prow: string, dzien: number, slot: number) => (kontekst.wykluczone[prow] ??= []).push([dzien, slot]);
  for (const d of dezyderaty.data ?? []) dodaj(d.prowadzacy_id, d.dzien, d.slot);
  // The Faculty Council blocks its members just like an excluded hour (solver/data.py).
  const radni = new Set((prowadzacy.data ?? []).filter((p) => p.czlonek_rady_wydzialu).map((p) => p.id));
  for (const prow of prowRuszani.filter((p) => radni.has(p))) {
    for (const r of rada.data ?? []) for (let s = r.slot_od; s <= r.slot_do; s++) dodaj(prow, r.dzien, s);
  }

  const ocena: DaneOceny = {
    nadrzedne: Object.fromEntries((grupy.data ?? []).map((g) => [g.id, g.grupa_nadrzedna])),
    preferencje: Object.fromEntries((preferencje.data ?? []).map((p) => [p.prowadzacy_id, p.preferencja_dni])),
    wagi: (job.parametry as { wagi?: Record<string, number> } | null)?.wagi ?? {},
    wynikPoGenerowaniu: job.wynik_miekkich,
  };

  return { status: "ok", kontekst, ocena };
}
