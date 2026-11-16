"use server";

import { revalidatePath } from "next/cache";
import { wczytajJson, wczytajXlsx } from "@/lib/dane-planu-xlsx";
import type { WynikSprawdzenia } from "@/lib/dane-planu";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/** What the database reports back after a load. */
export type PodsumowanieWgrania = Record<string, number>;

export type StanImportu =
  | { status: "poczatek" }
  | { status: "wgrano"; podsumowanie: PodsumowanieWgrania }
  | { status: "blad"; komunikat: string; szczegoly?: string[] };

const MAKS_ROZMIAR = 4 * 1024 * 1024;

async function odczytaj(plik: File): Promise<WynikSprawdzenia | string> {
  const nazwa = plik.name.toLowerCase();
  if (nazwa.endsWith(".xlsx")) return wczytajXlsx(new Uint8Array(await plik.arrayBuffer()));
  if (nazwa.endsWith(".json")) return wczytajJson(await plik.text());
  return "Wybierz plik .xlsx albo .json.";
}

/**
 * Replaces the input data (and the generated plans) with the contents of an uploaded `dane_planu` file.
 * The file is checked here, and the database loads it in one transaction (`wgraj_dane_planu`), so a rejected
 * file leaves everything as it was.
 */
export async function wgrajDane(_poprzedni: StanImportu, formData: FormData): Promise<StanImportu> {
  // Reachable by a direct POST, so check everything here and don't trust the form.
  if (formData.get("potwierdzenie") !== "tak") {
    return { status: "blad", komunikat: "Potwierdź, że wgranie danych usunie dotychczasowe dane i plany." };
  }
  const plik = formData.get("plik");
  if (!(plik instanceof File) || plik.size === 0) return { status: "blad", komunikat: "Wybierz plik z danymi." };
  if (plik.size > MAKS_ROZMIAR) return { status: "blad", komunikat: "Plik jest za duży (limit 4 MB)." };

  const wynik = await odczytaj(plik);
  if (typeof wynik === "string") return { status: "blad", komunikat: wynik };
  if (!wynik.ok) {
    return { status: "blad", komunikat: "W pliku są błędy. Nic nie zostało wgrane.", szczegoly: wynik.bledy };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { status: "blad", komunikat: "Serwer nie ma skonfigurowanego dostępu do zapisu w bazie." };
  }

  const { data, error } = await supabase.rpc("wgraj_dane_planu", { payload: wynik.dane as unknown as Json });
  if (error) {
    return {
      status: "blad",
      komunikat: "Baza odrzuciła dane. Nic nie zostało zmienione.",
      szczegoly: [error.message],
    };
  }

  revalidatePath("/", "layout");
  return { status: "wgrano", podsumowanie: data as PodsumowanieWgrania };
}
