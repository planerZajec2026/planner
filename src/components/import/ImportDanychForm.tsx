"use client";

import { useActionState } from "react";
import { wgrajDane, type StanImportu } from "@/app/import-eksport/actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Icon } from "@/components/ui/Icon";

const POCZATEK: StanImportu = { status: "poczatek" };

/** What the database reports, in the order shown (the database returns the keys in its own order). */
const NAZWY: [string, string][] = [
  ["zajecia", "zajęć do zaplanowania"],
  ["sale", "sal"],
  ["prowadzacy", "prowadzących"],
  ["grupy", "grup"],
  ["roczniki", "roczników"],
  ["studenci", "studentów"],
];

/** Uploads a `dane_planu` workbook or JSON file; the data replaces the loaded data and the generated plans. */
export function ImportDanychForm({ maDane }: { maDane: boolean }) {
  const [stan, akcja, trwa] = useActionState(wgrajDane, POCZATEK);

  return (
    <form action={akcja} className="card form-panel" noValidate>
      <div>
        <div className="section-title card-head">Plik z danymi wejściowymi</div>
        <p className="card-note" style={{ margin: 0 }}>
          Plik <code>.xlsx</code> (jeden arkusz na tabelę) albo <code>.json</code> w formacie <code>dane_planu</code>:
          kalendarz, sale, prowadzący, roczniki, grupy, studenci, zajęcia do zaplanowania, blokady i dezyderaty.
        </p>
      </div>

      <div className="form-grid">
        <FormField id="plik" label="Plik z danymi" hint="Do 4 MB.">
          <input id="plik" name="plik" type="file" accept=".xlsx,.json" required aria-describedby="plik-hint" />
        </FormField>
      </div>

      <label className="radio-row">
        <input type="checkbox" name="potwierdzenie" value="tak" />
        <span>
          {maDane
            ? "Rozumiem, że wgranie usunie dotychczasowe dane wejściowe i wszystkie wygenerowane plany."
            : "Rozumiem, że dane zostaną wgrane do bazy."}
        </span>
      </label>

      <div className="form-actions">
        <Button type="submit" disabled={trwa}>
          <Icon name="upload" />
          {trwa ? "Wgrywanie…" : "Wgraj dane"}
        </Button>
      </div>

      <div aria-live="polite">
        {stan.status === "wgrano" && (
          <div className="success-banner">
            <Icon name="check" />
            Wgrano dane:{" "}
            {NAZWY.filter(([klucz]) => klucz in stan.podsumowanie)
              .map(([klucz, nazwa]) => `${stan.podsumowanie[klucz]} ${nazwa}`)
              .join(", ")}
            . Teraz możesz wygenerować plan.
          </div>
        )}
        {stan.status === "blad" && (
          <div className="conflict-banner" style={{ flexDirection: "column" }}>
            <strong>{stan.komunikat}</strong>
            {stan.szczegoly && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {stan.szczegoly.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
