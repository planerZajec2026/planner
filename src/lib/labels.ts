import type { Powtarzalnosc, Prowadzacy, TrybStudiow, TypZajec, TytulNaukowy } from "./types";

export const TRYB_LABEL: Record<TrybStudiow, string> = {
  stacjonarne: "Stacjonarne",
  niestacjonarne: "Niestacjonarne",
};

export const TYP_ZAJEC_LABEL: Record<TypZajec, string> = {
  wyklad: "Wykład",
  cwiczenia: "Ćwiczenia",
  laboratorium: "Laboratorium",
  seminarium: "Seminarium",
};

export const POWTARZALNOSC_LABEL: Record<Powtarzalnosc, string> = {
  "co-tydzien": "Co tydzień",
  parzyste: "Tygodnie parzyste",
  nieparzyste: "Tygodnie nieparzyste",
};

export const TYTULY: TytulNaukowy[] = ["mgr", "mgr inż.", "dr", "dr inż.", "dr hab.", "prof."];

/** "dr Paweł Zieliński" */
export function prowadzacyLabel(p: Pick<Prowadzacy, "tytul" | "imie" | "nazwisko">): string {
  return `${p.tytul} ${p.imie} ${p.nazwisko}`;
}
