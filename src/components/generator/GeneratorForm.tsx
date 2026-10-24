"use client";

import { useActionState } from "react";
import { zlecGenerowanie, type StanFormularza } from "@/app/generator/actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { LIMIT_DOMYSLNY, LIMIT_MAX, LIMIT_MIN, WAGA_MAX, WAGI } from "@/lib/generator";

const POCZATEK: StanFormularza = { status: "poczatek" };

/** Parameters of a generation job: time limit and the weights of the soft constraints. */
export function GeneratorForm() {
  const [stan, akcja, trwa] = useActionState(zlecGenerowanie, POCZATEK);
  const bledy = stan.status === "blad" ? stan.bledy : undefined;

  return (
    <form action={akcja} className="card form-panel" noValidate>
      <div>
        <div className="section-title card-head">Parametry generowania</div>
        <p className="card-note" style={{ margin: 0 }}>
          Solver najpierw znajduje plan spełniający wszystkie ograniczenia twarde, potem przez resztę czasu poprawia
          jakość. Dłuższy czas daje lepszy plan.
        </p>
      </div>

      <div className="form-grid">
        <FormField
          id="limit_czasu"
          label="Limit czasu (sekundy)"
          hint={`Od ${LIMIT_MIN} do ${LIMIT_MAX}.`}
          error={bledy?.limit}
        >
          <input
            id="limit_czasu"
            name="limit_czasu"
            type="number"
            inputMode="numeric"
            min={LIMIT_MIN}
            max={LIMIT_MAX}
            defaultValue={LIMIT_DOMYSLNY}
            aria-invalid={bledy?.limit ? true : undefined}
            aria-describedby={bledy?.limit ? "limit_czasu-error" : "limit_czasu-hint"}
          />
        </FormField>
      </div>

      <details>
        <summary className="section-title" style={{ cursor: "pointer" }}>
          Wagi ograniczeń miękkich
        </summary>
        <p className="card-note">Im większa waga, tym mocniej solver unika danego problemu. 0 wyłącza ograniczenie.</p>
        <div className="form-grid" style={{ marginTop: 14 }}>
          {WAGI.map((waga) => {
            const id = `waga_${waga.klucz}`;
            const blad = bledy?.wagi[waga.klucz];
            return (
              <FormField key={id} id={id} label={waga.label} hint={waga.opis} error={blad}>
                <input
                  id={id}
                  name={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={WAGA_MAX}
                  defaultValue={waga.domyslna}
                  aria-invalid={blad ? true : undefined}
                  aria-describedby={blad ? `${id}-error` : `${id}-hint`}
                />
              </FormField>
            );
          })}
        </div>
      </details>

      <div className="form-actions">
        <Button type="submit" disabled={trwa}>
          {trwa ? "Zlecanie…" : "Generuj plan"}
        </Button>
      </div>

      <div aria-live="polite">
        {stan.status === "zlecone" && <div className="success-banner">{stan.komunikat}</div>}
        {stan.status === "blad" && stan.komunikat && <div className="conflict-banner">{stan.komunikat}</div>}
        {stan.status === "blad" && !stan.komunikat && (
          <div className="conflict-banner">Popraw zaznaczone pola i spróbuj ponownie.</div>
        )}
      </div>
    </form>
  );
}
