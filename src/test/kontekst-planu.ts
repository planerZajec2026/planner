// Test data for spec 14: the real input data (requirements/dane_planu.json) with the plan of the e2e fixture, which
// the Python validator accepts. Read from disk because src/ may not import mock-data.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DanePlanu } from "@/lib/dane-planu";
import type { Czestotliwosc, Forma } from "@/lib/plan";
import type { KontekstEdycji, Przydzial, TypPowiazania, ZajeciaPlanu } from "@/lib/plan-edycja";

const plik = (sciezka: string) => JSON.parse(readFileSync(join(process.cwd(), sciezka), "utf8"));

export const JOB_ID = "00000000-0000-0000-0000-00000000e2e0";

/** A fresh context on every call, so tests can change it freely. */
export function kontekstTestowy(): KontekstEdycji {
  const dane = plik("requirements/dane_planu.json") as DanePlanu;
  const plan = plik("e2e/fixtures/plan.json") as {
    przydzialy: { zajecia_id: string; dzien: number; slot: number; sala: string; tygodnie: number[] }[];
  };

  const zajecia: Record<string, ZajeciaPlanu> = {};
  for (const z of dane.zajecia) {
    zajecia[z.id] = {
      id: z.id,
      przedmiot: z.przedmiot,
      forma: z.forma as Forma,
      grupy: z.grupy,
      prowadzacy: z.prowadzacy,
      miejsca: z.liczba_studentow + z.dodatkowi_studenci,
      liczbaSpotkan: z.liczba_spotkan,
      sloty: z.sloty_na_spotkanie,
      czestotliwosc: z.czestotliwosc as Czestotliwosc,
      tydzienOd: z.tydzien_od,
      tydzienDo: z.tydzien_do,
      tygodnieNiedostepne: z.tygodnie_niedostepne,
      typySal: z.typy_sal,
      dozwoloneSale: z.dozwolone_sale,
      wymaganeWyposazenie: z.wymagane_wyposazenie,
      powiazanie: z.powiazanie,
      typPowiazania: z.typ_powiazania as TypPowiazania | null,
    };
  }

  const wykluczone: Record<string, [number, number][]> = {};
  const dodaj = (prow: string, dzien: number, slot: number) => (wykluczone[prow] ??= []).push([dzien, slot]);
  for (const d of dane.dezyderaty_terminy) dodaj(d.prowadzacy, d.dzien, d.slot);
  for (const p of dane.prowadzacy.filter((x) => x.czlonek_rady_wydzialu)) {
    for (const r of dane.rada_wydzialu) for (let s = r.slot_od; s <= r.slot_do; s++) dodaj(p.id, r.dzien, s);
  }

  return {
    jobId: JOB_ID,
    wersja: 0,
    zajecia,
    plan: plan.przydzialy.map(
      (p): Przydzial => ({ zajeciaId: p.zajecia_id, dzien: p.dzien, slot: p.slot, sala: p.sala, tygodnie: p.tygodnie }),
    ),
    sale: dane.sale.map((s) => ({
      id: s.id,
      typ: s.typ,
      pojemnosc: s.pojemnosc,
      wyposazenie: s.wyposazenie,
      dostepna: s.dostepna_do_planowania,
    })),
    kolizje: dane.kolizje_grup.map((k): [string, string] => [k.grupa_a, k.grupa_b]),
    blokady: dane.blokady_stale.map((b) => ({ grupa: b.grupa, dzien: b.dzien, slotOd: b.slot_od, slotDo: b.slot_do })),
    wykluczone,
    etykiety: {
      grupy: Object.fromEntries(dane.grupy.map((g) => [g.id, `${g.rocznik} · ${g.nazwa}`])),
      prowadzacy: Object.fromEntries(dane.prowadzacy.map((p) => [p.id, p.nazwa])),
    },
  };
}
