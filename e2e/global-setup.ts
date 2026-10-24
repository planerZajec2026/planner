// Puts the database in a known state before the e2e run (spec 13): the input data from mock-data.ts, loaded through the
// same function the seed and the import page use, plus one finished generation job holding the plan in
// e2e/fixtures/plan.json (the solver is not run in tests). Needs a running Supabase and the server-side env:
// NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local when not set).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { DANE_PLANU } from "../src/lib/mock-data";

export const ID_ZADANIA = "00000000-0000-0000-0000-00000000e2e0";

type Przydzial = { zajecia_id: string; dzien: number; slot: number; sala: string; tygodnie: number[] };

export default async function globalSetup() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI passes the variables in the environment.
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("e2e needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example) and a running Supabase.");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const wgrano = await supabase.rpc("wgraj_dane_planu", { payload: DANE_PLANU as never });
  if (wgrano.error) throw new Error(`Loading the input data failed: ${wgrano.error.message}`);

  const plan = JSON.parse(readFileSync("e2e/fixtures/plan.json", "utf8")).przydzialy as Przydzial[];
  const zadanie = await supabase.from("generation_jobs").insert({
    id: ID_ZADANIA,
    status: "done",
    parametry: { limit_czasu: 200 },
    rozpoczeto: new Date(Date.now() - 200_000).toISOString(),
    zakonczono: new Date().toISOString(),
    raport: {
      status_solvera: "FEASIBLE",
      czas_s: 200,
      kara_modelu: 4893,
      dolna_granica: 2743,
      naruszenia: {},
      miekkie: { preferencja_dni: 57, okienka_studentow: 225, okienka_prowadzacych: 240, poza_godzinami: 555, przeciazenie_dnia: 5, zla_wielkosc_sali: 3073 },
    },
    wynik_miekkich: 5088,
  });
  if (zadanie.error) throw new Error(`Creating the plan job failed: ${zadanie.error.message}`);

  const wiersze = plan.map((p) => ({ job_id: ID_ZADANIA, zajecia_id: p.zajecia_id, dzien: p.dzien, slot: p.slot, sala_id: p.sala, tygodnie: p.tygodnie }));
  const zapis = await supabase.from("plan_zajec").insert(wiersze);
  if (zapis.error) throw new Error(`Loading the plan failed: ${zapis.error.message}`);
}
