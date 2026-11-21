// The editing board (spec 16): the plan as a week grid of slots, one group, instructor or room at a time, where a
// class is dragged to another time. Pure functions; the checks themselves are those of the edit form (spec 14).
import { wgEtykiety } from "./labels";
import { koniecSlotu, LICZBA_SLOTOW, LICZBA_TYGODNI, odczytajTydzien, poczatekSlotu } from "./plan";
import type { Cel, KontekstEdycji, Przydzial, WolnyTermin, ZajeciaPlanu } from "./plan-edycja";
import { przodkowie } from "./plan-problemy";

export const DNI_TABLICY = [1, 2, 3, 4, 5] as const;

export type RodzajFiltra = "grupa" | "prowadzacy" | "sala";
export const RODZAJE_FILTRA: RodzajFiltra[] = ["grupa", "prowadzacy", "sala"];

export type FiltrTablicy = {
  rodzaj: RodzajFiltra;
  id: string;
  /** Only the classes held in this plan week (1–14); all weeks when missing. */
  tydzien?: number;
};

export type OpcjaFiltra = { value: string; label: string };

/** What each kind of filter can show: groups and instructors that have classes, rooms the plan uses or may use. */
export function opcjeFiltra(k: KontekstEdycji, nadrzedne: Record<string, string | null>): Record<RodzajFiltra, OpcjaFiltra[]> {
  const zajecia = Object.values(k.zajecia);
  // A group shows its own classes and those of its parents, so a group whose parent has classes is useful too.
  const grupy = new Set<string>();
  for (const id of Object.keys(k.etykiety.grupy)) {
    if (przodkowie(nadrzedne, id).some((g) => zajecia.some((z) => z.grupy.includes(g)))) grupy.add(id);
  }
  const prowadzacy = new Set(zajecia.flatMap((z) => z.prowadzacy));
  const wPlanie = new Set(k.plan.map((p) => p.sala));
  return {
    grupa: [...grupy].map((id) => ({ value: id, label: k.etykiety.grupy[id] ?? id })).sort(wgEtykiety),
    prowadzacy: [...prowadzacy].map((id) => ({ value: id, label: k.etykiety.prowadzacy[id] ?? id })).sort(wgEtykiety),
    sala: k.sale
      .filter((s) => s.dostepna || wPlanie.has(s.id))
      .map((s) => ({ value: s.id, label: s.id }))
      .sort(wgEtykiety),
  };
}

/**
 * The filter from `?grupa=` / `?prowadzacy=` / `?sala=` (the first one that names something on offer) and `?tydzien=`.
 * Without one: the first group of `?zajecia=`, so a class opened from elsewhere is on the board, else the first group.
 */
export function odczytajFiltr(
  sp: Partial<Record<RodzajFiltra | "tydzien", string>>,
  opcje: Record<RodzajFiltra, OpcjaFiltra[]>,
  k: KontekstEdycji,
  zajeciaId?: string,
): FiltrTablicy | null {
  const tydzien = odczytajTydzien(sp.tydzien);
  for (const rodzaj of RODZAJE_FILTRA) {
    const id = sp[rodzaj];
    if (id && opcje[rodzaj].some((o) => o.value === id)) return { rodzaj, id, tydzien };
  }
  const grupaZajec = zajeciaId ? k.zajecia[zajeciaId]?.grupy.find((g) => opcje.grupa.some((o) => o.value === g)) : undefined;
  const grupa = grupaZajec ?? opcje.grupa[0]?.value;
  return grupa ? { rodzaj: "grupa", id: grupa, tydzien } : null;
}

/** The placements the filter shows: a group with the classes of its parent groups (a lecture for the whole year). */
export function zajeciaWFiltrze(k: KontekstEdycji, f: FiltrTablicy, nadrzedne: Record<string, string | null>): Przydzial[] {
  const lancuch = f.rodzaj === "grupa" ? new Set(przodkowie(nadrzedne, f.id)) : null;
  return k.plan.filter((p) => {
    const z = k.zajecia[p.zajeciaId];
    if (!z || (f.tydzien !== undefined && !p.tygodnie.includes(f.tydzien))) return false;
    if (lancuch) return z.grupy.some((g) => lancuch.has(g));
    if (f.rodzaj === "prowadzacy") return z.prowadzacy.includes(f.id);
    return p.sala === f.id;
  });
}

/**
 * Weeks on a tile, so classes side by side in one slot (odd and even weeks) can be told apart: nothing for every
 * week, else "tyg. nieparzyste", "tyg. 6–14" or "9 wybranych tyg.".
 */
export function krotkieTygodnie(p: Pick<Przydzial, "tygodnie">, z: Pick<ZajeciaPlanu, "czestotliwosc">): string {
  const t = [...p.tygodnie].sort((a, b) => a - b);
  if (t.length === 0 || t.length === LICZBA_TYGODNI) return "";
  if (z.czestotliwosc === "co_2_tygodnie") return t[0] % 2 === 0 ? "tyg. parzyste" : "tyg. nieparzyste";
  if (z.czestotliwosc === "wybrane_tygodnie") return `${t.length} wybranych tyg.`;
  return `tyg. ${t[0]}–${t[t.length - 1]}`;
}

/** "8:15–10:00": the time a class takes from its start slot. */
export function godzinyZajec(slot: number, sloty: number): string {
  return `${poczatekSlotu(slot)}–${koniecSlotu(slot + sloty - 1)}`;
}

export type Obszar = { left: number; top: number; width: number; height: number };

/**
 * The start the class would get if dropped with the pointer at (x, y) over the slot area of the board. `chwyt` is the
 * slot of the class the pointer holds (0 = its first slot), so the class keeps its position under the pointer. The
 * start is kept inside the day; null when the pointer is outside the area.
 */
export function komorkaPod(x: number, y: number, obszar: Obszar, chwyt: number, sloty: number): { dzien: number; slot: number } | null {
  if (x < obszar.left || x >= obszar.left + obszar.width || y < obszar.top || y >= obszar.top + obszar.height) return null;
  const kolumna = Math.floor(((x - obszar.left) / obszar.width) * DNI_TABLICY.length);
  const wiersz = Math.floor(((y - obszar.top) / obszar.height) * LICZBA_SLOTOW);
  const ostatniStart = Math.max(1, LICZBA_SLOTOW - sloty + 1);
  return { dzien: DNI_TABLICY[kolumna], slot: Math.min(Math.max(wiersz + 1 - chwyt, 1), ostatniStart) };
}

/**
 * How a start time looks while a class is dragged:
 * - `wolny`: no violation in at least one room,
 * - `bez-sali`: the people are free but no suitable room is,
 * - `konflikt`: an instructor, students, a preference, a block or a link rules it out,
 * - `poza`: the class does not fit before the end of the day.
 */
export type StanKomorki = "wolny" | "bez-sali" | "konflikt" | "poza";

export function stanKomorki(t: WolnyTermin | undefined, sloty: number): StanKomorki {
  if (!t || t.slot + sloty - 1 > LICZBA_SLOTOW) return "poza";
  if (!t.terminWolny) return "konflikt";
  return t.sale.length > 0 ? "wolny" : "bez-sali";
}

/** The room a class gets at a new time: its own when free there, otherwise the smallest free room. */
export function salaPoUpuszczeniu(t: WolnyTermin | undefined, obecnaSala: string): string {
  if (!t || t.sale.length === 0 || t.sale.includes(obecnaSala)) return obecnaSala;
  return t.sale[0];
}

/** What `zapiszPrzydzial` reads: the plan and its version, the class and its new placement. */
export function formularzZapisu(k: Pick<KontekstEdycji, "jobId" | "wersja">, zajeciaId: string, cel: Cel): FormData {
  const fd = new FormData();
  fd.set("job", k.jobId);
  fd.set("wersja", String(k.wersja));
  fd.set("zajecia", zajeciaId);
  fd.set("dzien", String(cel.dzien));
  fd.set("slot", String(cel.slot));
  fd.set("sala", cel.sala);
  fd.set("tygodnie", cel.tygodnie.join(","));
  return fd;
}

/** The board's address for a filter, keeping the selected class and the way back. */
export function adresTablicy(f: FiltrTablicy, inne: { zajecia?: string; powrot?: string } = {}): string {
  const params = new URLSearchParams({ [f.rodzaj]: f.id });
  if (f.tydzien !== undefined) params.set("tydzien", String(f.tydzien));
  if (inne.zajecia) params.set("zajecia", inne.zajecia);
  if (inne.powrot) params.set("powrot", inne.powrot);
  return `/plan/edycja?${params}`;
}
