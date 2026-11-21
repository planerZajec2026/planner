import type { TypZajec } from "./types";

export const TYP_ZAJEC_LABEL: Record<TypZajec, string> = {
  wyklad: "Wykład",
  cwiczenia: "Ćwiczenia",
  laboratorium: "Laboratorium",
  seminarium: "Seminarium",
};

/** Classes of the type tag: each class type has its own colour (globals.css, `.block-tag.typ-…`). */
export function klasaTagu(typ: TypZajec): string {
  return `block-tag typ-${typ}`;
}

/** "INF1-R1 · Grupa 1": how a group is named in every selector, table and popup. Unique within the input data. */
export function etykietaGrupy(rocznikId: string, nazwa: string): string {
  return `${rocznikId} · ${nazwa}`;
}

/** The order of options in selectors: by label, numbers by value ("Grupa 2" before "Grupa 10"). */
export function wgEtykiety(a: { label: string }, b: { label: string }): number {
  return a.label.localeCompare(b.label, "pl", { numeric: true });
}
