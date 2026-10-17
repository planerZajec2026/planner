import type { Prowadzacy } from "./types";

type Imie = Pick<Prowadzacy, "tytul" | "imie" | "nazwisko">;

/** "dr Paweł Zieliński" */
export function pelneImie(p: Imie): string {
  return `${p.tytul} ${p.imie} ${p.nazwisko}`;
}

/** "PZ" */
export function inicjaly(p: Omit<Imie, "tytul">): string {
  return `${p.imie.charAt(0)}${p.nazwisko.charAt(0)}`.toLocaleUpperCase("pl-PL");
}
