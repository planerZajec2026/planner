"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { wyczyscBaze } from "@/app/import/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FRAZA_POTWIERDZENIA, OPIS_TABEL, potwierdzono, type StanBazy, type StanCzyszczenia } from "@/lib/czyszczenie-bazy";

const POCZATEK: StanCzyszczenia = { status: "poczatek" };
const TABELE = Object.keys(OPIS_TABEL) as (keyof StanBazy)[];

const opisStanu = (stan: StanBazy) =>
  TABELE.filter((t) => stan[t] > 0).map((t) => `${OPIS_TABEL[t]}: ${stan[t].toLocaleString("pl-PL")}`);

/**
 * The danger zone of the import page (spec 17): clearing the whole database. As when deleting a repository on GitHub,
 * the dialog lists what goes away and unlocks the button only when the user has typed the phrase by hand.
 */
export function CzyszczenieBazy({ stan }: { stan: StanBazy }) {
  const [otwarte, setOtwarte] = useState(false);
  const [usunieto, setUsunieto] = useState<StanBazy | null>(null);
  const pusta = TABELE.every((t) => stan[t] === 0);

  return (
    <section className="card strefa-zagrozenia" aria-labelledby="strefa-zagrozenia">
      <div className="section-title card-head" id="strefa-zagrozenia">
        Strefa zagrożenia
      </div>
      <div className="strefa-wiersz">
        <div>
          <strong>Wyczyść bazę danych</strong>
          <p className="card-note">
            Usuwa wszystkie dane wejściowe, wygenerowane plany i ręczne zmiany. Tego nie da się cofnąć.
          </p>
        </div>
        <Button
          variant="danger-ghost"
          onClick={() => {
            setUsunieto(null);
            setOtwarte(true);
          }}
          disabled={pusta}
        >
          Wyczyść bazę danych…
        </Button>
      </div>
      <div aria-live="polite">
        {usunieto && (
          <div className="success-banner">
            Baza danych została wyczyszczona. Usunięto: {opisStanu(usunieto).join("; ") || "nic"}.
          </div>
        )}
        {pusta && !usunieto && <p className="card-note">Baza jest pusta, nie ma czego czyścić.</p>}
      </div>
      {otwarte && (
        <PotwierdzenieDialog
          stan={stan}
          onZamknij={() => setOtwarte(false)}
          onWyczyszczono={(u) => {
            setOtwarte(false);
            setUsunieto(u);
          }}
        />
      )}
    </section>
  );
}

function PotwierdzenieDialog({
  stan,
  onZamknij,
  onWyczyszczono,
}: {
  stan: StanBazy;
  onZamknij: () => void;
  onWyczyszczono: (usunieto: StanBazy) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tytulId = useId();
  const poleId = useId();
  const [wpisane, setWpisane] = useState("");
  const [wynik, akcja, trwa] = useActionState(wyczyscBaze, POCZATEK);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (wynik.status === "wyczyszczono") onWyczyszczono(wynik.usunieto);
  }, [wynik, onWyczyszczono]);

  return (
    <dialog
      ref={dialog}
      className="class-dialog potwierdzenie-dialog"
      aria-labelledby={tytulId}
      onClose={onZamknij}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <form className="class-dialog-body" action={akcja}>
        <div className="class-dialog-head">
          <h2 id={tytulId}>Wyczyścić całą bazę danych?</h2>
          <button type="button" className="btn-icon" aria-label="Zamknij" onClick={() => dialog.current?.close()}>
            <Icon name="x" />
          </button>
        </div>
        <div className="conflict-banner">
          <div>
            <strong>Tej operacji nie da się cofnąć.</strong> Zostaną usunięte:
            <ul>
              {opisStanu(stan).map((opis) => (
                <li key={opis}>{opis}</li>
              ))}
            </ul>
            Rok akademicki z ustawień zostaje. Żeby znowu generować plan, trzeba wgrać dane od nowa.
          </div>
        </div>

        <label htmlFor={poleId} className="potwierdzenie-etykieta">
          Aby potwierdzić, wpisz <strong>{FRAZA_POTWIERDZENIA}</strong>
        </label>
        <input
          id={poleId}
          name="potwierdzenie"
          className="potwierdzenie-pole"
          value={wpisane}
          onChange={(e) => setWpisane(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
        />

        <div aria-live="polite">{wynik.status === "blad" && <div className="conflict-banner">{wynik.komunikat}</div>}</div>

        <div className="form-actions">
          <Button type="submit" variant="danger" disabled={!potwierdzono(wpisane) || trwa}>
            {trwa ? "Czyszczenie…" : "Rozumiem, wyczyść bazę danych"}
          </Button>
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Anuluj
          </Button>
        </div>
      </form>
    </dialog>
  );
}
