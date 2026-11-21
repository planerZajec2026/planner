// Clearing the whole database (spec 17). Like deleting a repository on GitHub, the user has to type a phrase by hand;
// the dialog and the Server Action check it the same way.

export const FRAZA_POTWIERDZENIA = "wyczyść bazę danych";

/** Whether the typed text confirms clearing: the exact phrase, spaces around it aside. Case matters. */
export function potwierdzono(wpisane: string): boolean {
  return wpisane.trim() === FRAZA_POTWIERDZENIA;
}

/** Rows of the main tables, as the page shows them before clearing and the database reports them after. */
export type StanBazy = { zajecia: number; grupy: number; sale: number; prowadzacy: number; plany: number };

export const OPIS_TABEL: Record<keyof StanBazy, string> = {
  zajecia: "zajęcia do zaplanowania",
  grupy: "grupy",
  sale: "sale",
  prowadzacy: "prowadzący",
  plany: "wygenerowane plany (z ręcznymi zmianami)",
};

export type StanCzyszczenia =
  | { status: "poczatek" }
  | { status: "wyczyszczono"; usunieto: StanBazy }
  | { status: "blad"; komunikat: string };
