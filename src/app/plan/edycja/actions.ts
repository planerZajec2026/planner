"use server";

import { revalidatePath } from "next/cache";
import { getKontekstEdycji, type WynikKontekstu } from "@/lib/data/plan-edycja";
import {
  naruszenia,
  odczytajFormularz,
  opisTerminu,
  opisZajec,
  przygotuj,
  tenSamPrzydzial,
  zmianyDla,
  type Naruszenie,
} from "@/lib/plan-edycja";
import { createAdminClient } from "@/lib/supabase/admin";

export type StanEdycji =
  | { status: "poczatek" }
  | { status: "zapisano"; komunikat: string }
  | { status: "blad"; komunikat: string; naruszenia?: Naruszenie[] };

const blad = (komunikat: string): StanEdycji => ({ status: "blad", komunikat });

const NIEAKTUALNY =
  "Plan został w międzyczasie zmieniony. Formularz pokazuje teraz aktualne dane: sprawdź konflikty i zapisz ponownie.";

/** Every page shows the plan (the plan itself, both timetables, the generator), so all of them are refreshed. */
const odswiez = () => revalidatePath("/", "layout");

/**
 * Saves a manual edit of one class (spec 14): a new day, slot, room and weeks. Classes linked by `ten_sam_termin`
 * move with it. Nothing is saved when the change breaks a hard constraint or the plan changed since the form was
 * loaded.
 */
export async function zapiszPrzydzial(_poprzedni: StanEdycji, formData: FormData): Promise<StanEdycji> {
  // Reachable by a direct POST, so nothing from the form is trusted: everything is checked against the database.
  const formularz = odczytajFormularz(formData);
  if (!formularz) return blad("Formularz jest niekompletny. Odśwież stronę i spróbuj ponownie.");

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return blad("Serwer nie ma skonfigurowanego dostępu do zapisu w bazie.");
  }

  let wynik: WynikKontekstu;
  try {
    wynik = await getKontekstEdycji(supabase, formularz.zajeciaId);
  } catch {
    return blad("Nie udało się wczytać planu. Spróbuj ponownie.");
  }
  if (wynik.status === "brak-planu") return blad("Nie ma wygenerowanego planu.");
  if (wynik.status === "brak-zajec") return blad(`Zajęć ${formularz.zajeciaId} nie ma w aktualnym planie.`);

  const k = wynik.kontekst;
  if (k.jobId !== formularz.jobId) {
    odswiez();
    return blad(
      "W międzyczasie wygenerowano nowy plan. Formularz pokazuje teraz jego dane: sprawdź termin i zapisz ponownie.",
    );
  }
  if (k.wersja !== formularz.wersja) {
    odswiez();
    return blad(NIEAKTUALNY);
  }

  const i = przygotuj(k);
  const zmiany = zmianyDla(i, formularz.zajeciaId, formularz.cel);
  const doZapisu = zmiany.filter((p) => !tenSamPrzydzial(p, i.plan.get(p.zajeciaId)!));
  if (doZapisu.length === 0) return blad("Wybrany termin jest taki sam jak obecny, nie ma czego zapisywać.");

  const zle = naruszenia(i, zmiany);
  if (zle.length > 0) {
    return { status: "blad", komunikat: "Tej zmiany nie da się zapisać, bo łamie ograniczenia planu.", naruszenia: zle };
  }

  const { data: zapisano, error } = await supabase.rpc("zapisz_przydzialy", {
    p_job_id: k.jobId,
    p_wersja: k.wersja,
    p_przydzialy: doZapisu.map((p) => ({
      zajecia_id: p.zajeciaId,
      dzien: p.dzien,
      slot: p.slot,
      sala_id: p.sala,
      tygodnie: p.tygodnie,
    })),
  });
  if (error) return blad("Nie udało się zapisać zmiany. Spróbuj ponownie.");
  if (!zapisano) {
    // Someone saved another edit (or a new plan was generated) between our read and the save.
    odswiez();
    return blad(NIEAKTUALNY);
  }

  odswiez();
  const z = k.zajecia[formularz.zajeciaId];
  const razem = zmiany.filter((p) => p.zajeciaId !== z.id).map((p) => p.zajeciaId);
  return {
    status: "zapisano",
    komunikat:
      `Zapisano: ${opisZajec(z)}, ${opisTerminu(formularz.cel, z.sloty)}, sala ${formularz.cel.sala}.` +
      (razem.length > 0 ? ` Razem z nimi przeniesiono zajęcia powiązane: ${razem.join(", ")}.` : ""),
  };
}
