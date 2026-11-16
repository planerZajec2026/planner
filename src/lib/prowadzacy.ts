import type { Prowadzacy } from "./types";

/** "dr P39": how an instructor is shown. The source data holds pseudonyms, not names. */
export function pelneImie(p: Pick<Prowadzacy, "nazwa">): string {
  return p.nazwa;
}

/** "P39": the avatar text. */
export function inicjaly(p: Pick<Prowadzacy, "id">): string {
  return p.id;
}
