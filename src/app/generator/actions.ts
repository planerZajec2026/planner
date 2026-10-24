"use server";

import { revalidatePath } from "next/cache";
import { MAKS_OCZEKUJACYCH, odczytajFormularz, type BledyFormularza } from "@/lib/generator";
import { createAdminClient } from "@/lib/supabase/admin";

export type StanFormularza =
  | { status: "poczatek" }
  | { status: "zlecone"; komunikat: string }
  | { status: "blad"; komunikat?: string; bledy?: BledyFormularza };

/** Queues a generation job. The worker picks it up from `generation_jobs`; the list on the page then follows it. */
export async function zlecGenerowanie(_poprzedni: StanFormularza, formData: FormData): Promise<StanFormularza> {
  // Reachable by a direct POST, so validate here and don't trust the form.
  const wynik = odczytajFormularz(formData);
  if (!wynik.ok) return { status: "blad", bledy: wynik.bledy };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { status: "blad", komunikat: "Serwer nie ma skonfigurowanego dostępu do zapisu w bazie." };
  }

  const { count, error: bladLiczenia } = await supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"]);
  if (bladLiczenia) return { status: "blad", komunikat: "Nie udało się sprawdzić kolejki zadań." };
  if ((count ?? 0) >= MAKS_OCZEKUJACYCH) {
    return {
      status: "blad",
      komunikat: `W kolejce jest już ${count} zadań. Poczekaj, aż worker je przetworzy.`,
    };
  }

  const { error } = await supabase.from("generation_jobs").insert({ parametry: wynik.parametry });
  if (error) return { status: "blad", komunikat: "Nie udało się zlecić generowania planu." };

  revalidatePath("/generator");
  return { status: "zlecone", komunikat: "Zadanie dodane do kolejki. Worker zacznie liczyć, gdy będzie wolny." };
}
