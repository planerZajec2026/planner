// Progress of a running generation job (spec 15): what the worker writes to `generation_jobs.postep`
// (solver/progress.py) and how the generator page describes it. Pure functions, no database.
import { countPl } from "./pl";

export type Etap = "wczytywanie" | "szukanie" | "optymalizacja" | "zapis";

export type Postep = {
  etap: Etap;
  /** Seconds since the solver started; the job's time limit runs from then. */
  uplyneloS: number;
  limitS: number;
  /** Improving plans found in stage 2. */
  rozwiazania: number;
  /** The solver's objective of the best plan so far, and of the first one in stage 2. */
  kara: number | null;
  karaStartowa: number | null;
  /** No plan can have a lower objective than this. */
  dolnaGranica: number | null;
  /** When the worker last wrote, as an ISO timestamp. */
  zaktualizowano: string | null;
};

const ETAPY: Etap[] = ["wczytywanie", "szukanie", "optymalizacja", "zapis"];

/** After this many seconds without a write the page says the worker went quiet (it writes every 2 s). */
export const PROG_CISZY_S = 30;

const liczba = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Reads the worker's JSON; anything malformed (or an unknown stage from a newer worker) gives null. */
export function odczytajPostep(json: unknown): Postep | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const p = json as Record<string, unknown>;
  const etap = ETAPY.find((e) => e === p.etap);
  const limitS = liczba(p.limit_s);
  if (!etap || limitS === null || limitS <= 0) return null;
  return {
    etap,
    uplyneloS: Math.max(0, liczba(p.uplynelo_s) ?? 0),
    limitS,
    rozwiazania: Math.max(0, liczba(p.rozwiazania) ?? 0),
    kara: liczba(p.kara),
    karaStartowa: liczba(p.kara_startowa),
    dolnaGranica: liczba(p.dolna_granica),
    zaktualizowano: typeof p.zaktualizowano === "string" ? p.zaktualizowano : null,
  };
}

/**
 * How far the job is, 0–100. The solver uses its whole time limit unless it proves the plan optimal, so the share
 * of the limit used is the real progress; loading comes before the limit starts and saving after it ends.
 */
export function procent(p: Postep): number {
  if (p.etap === "wczytywanie") return 0;
  if (p.etap === "zapis") return 100;
  return Math.min(100, Math.floor((100 * p.uplyneloS) / p.limitS));
}

export function opisEtapu(p: Postep): { tytul: string; opis: string } {
  switch (p.etap) {
    case "wczytywanie":
      return {
        tytul: "Wczytywanie danych",
        opis: "Worker pobiera dane z bazy i buduje model. Limit czasu zacznie biec, gdy ruszy solver.",
      };
    case "szukanie":
      return { tytul: "Etap 1 z 2: plan bez naruszeń", opis: "Solver szuka pierwszego planu, który spełnia wszystkie ograniczenia twarde." };
    case "optymalizacja":
      return p.rozwiazania === 0
        ? {
            tytul: "Etap 2 z 2: optymalizacja",
            opis: "Jest plan bez naruszeń. Solver analizuje model przed szukaniem lepszych planów; ta faza trwa zwykle kilkadziesiąt sekund.",
          }
        : {
            tytul: "Etap 2 z 2: optymalizacja",
            opis: `Solver znalazł ${countPl(p.rozwiazania, "lepszy plan", "coraz lepsze plany", "coraz lepszych planów")} i szuka dalej do końca limitu.`,
          };
    case "zapis":
      return { tytul: "Sprawdzanie i zapis", opis: "Walidator sprawdza plan i zapisuje go w bazie." };
  }
}

/** Whole seconds since the worker last wrote, or null when unknown. */
export function sekundOdSygnalu(p: Postep, teraz: number): number | null {
  if (!p.zaktualizowano) return null;
  const t = Date.parse(p.zaktualizowano);
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((teraz - t) / 1000));
}
