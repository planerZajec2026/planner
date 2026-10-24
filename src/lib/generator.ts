// Parameters of a generation job (spec 13). The limits and weight names mirror solver/worker.py and solver/weights.py;
// generator.test.ts checks the weights against weights.py so the two can't drift apart silently.

/** Time limit of the solver in seconds. Shorter runs give worse plans, so the worker enforces the minimum too. */
export const LIMIT_MIN = 200;
export const LIMIT_MAX = 400;
export const LIMIT_DOMYSLNY = 200;

/** The worker takes jobs one at a time, so a long queue only piles up work nobody asked for. */
export const MAKS_OCZEKUJACYCH = 3;

export const WAGA_MAX = 1000;

export type Waga = { klucz: string; label: string; opis: string; domyslna: number };

export const WAGI: Waga[] = [
  { klucz: "preferencja_dni", label: "Preferencje prowadzących", opis: "Skumulowane lub rozłożone dni zajęć.", domyslna: 5 },
  { klucz: "okienka_studentow", label: "Okienka studentów", opis: "Puste sloty między zajęciami grupy w dniu.", domyslna: 3 },
  { klucz: "okienka_prowadzacych", label: "Okienka prowadzących", opis: "Puste sloty między zajęciami prowadzącego w dniu.", domyslna: 2 },
  { klucz: "poza_godzinami", label: "Godziny skrajne", opis: "Zajęcia przed 9:00 i po 17:00.", domyslna: 1 },
  { klucz: "przeciazenie_dnia", label: "Przeciążenie dnia", opis: "Sloty grupy w dniu ponad limit 8.", domyslna: 4 },
  { klucz: "zla_wielkosc_sali", label: "Wielkość sali", opis: "Sala niepotrzebnie duża dla grupy.", domyslna: 1 },
];

export const WAGA_LABEL: Record<string, string> = Object.fromEntries(WAGI.map((w) => [w.klucz, w.label]));

export type ParametryZadania = { limit_czasu: number; wagi: Record<string, number> };

export type BledyFormularza = { limit?: string; wagi: Record<string, string> };

export type WynikFormularza = { ok: true; parametry: ParametryZadania } | { ok: false; bledy: BledyFormularza };

function liczbaCalkowita(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

/** Reads and validates the generator form. Only weights that differ from the defaults are sent to the worker. */
export function odczytajFormularz(formData: FormData): WynikFormularza {
  const bledy: BledyFormularza = { wagi: {} };

  const limit = liczbaCalkowita(formData.get("limit_czasu"));
  if (limit === null || limit < LIMIT_MIN || limit > LIMIT_MAX) {
    bledy.limit = `Podaj liczbę sekund od ${LIMIT_MIN} do ${LIMIT_MAX}.`;
  }

  const wagi: Record<string, number> = {};
  for (const waga of WAGI) {
    const wartosc = liczbaCalkowita(formData.get(`waga_${waga.klucz}`));
    if (wartosc === null || wartosc > WAGA_MAX) {
      bledy.wagi[waga.klucz] = `Podaj liczbę całkowitą od 0 do ${WAGA_MAX}.`;
    } else if (wartosc !== waga.domyslna) {
      wagi[waga.klucz] = wartosc;
    }
  }

  if (bledy.limit || Object.keys(bledy.wagi).length > 0 || limit === null) return { ok: false, bledy };
  return { ok: true, parametry: { limit_czasu: limit, wagi } };
}
