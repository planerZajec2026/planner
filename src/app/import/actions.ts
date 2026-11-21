"use server";

import { revalidatePath } from "next/cache";
import { potwierdzono, type StanBazy, type StanCzyszczenia } from "@/lib/czyszczenie-bazy";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Empties the input data, the generated plans and their manual edits (spec 17), in one transaction in the database.
 * Reachable by a direct POST, so the typed confirmation phrase is checked here again.
 */
export async function wyczyscBaze(_poprzedni: StanCzyszczenia, formData: FormData): Promise<StanCzyszczenia> {
  const wpisane = formData.get("potwierdzenie");
  if (typeof wpisane !== "string" || !potwierdzono(wpisane)) {
    return { status: "blad", komunikat: "Wpisana fraza się nie zgadza. Nic nie zostało usunięte." };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { status: "blad", komunikat: "Serwer nie ma skonfigurowanego dostępu do zapisu w bazie." };
  }

  const { data, error } = await supabase.rpc("wyczysc_dane_planu");
  if (error) return { status: "blad", komunikat: `Baza odrzuciła czyszczenie. Nic nie zostało usunięte. (${error.message})` };

  revalidatePath("/", "layout");
  return { status: "wyczyszczono", usunieto: data as StanBazy };
}
