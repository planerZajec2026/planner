import type { Powtarzalnosc, TrybStudiow, TypZajec, TytulNaukowy } from "./types";

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
