"use client";

import { startTransition, useActionState, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { zapiszPrzydzial, type StanEdycji } from "@/app/plan/edycja/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { klasaTagu } from "@/lib/labels";
import { dzienLabel, FORMA_LABEL, formaNaTyp, opisTygodni } from "@/lib/plan";
import {
  naruszenia,
  opisSali,
  opisZajec,
  razem,
  zmianyDla,
  type Cel,
  type Indeks,
  type KontekstEdycji,
  type WolnyTermin,
} from "@/lib/plan-edycja";
import { ocenaPlanu, type DaneOceny } from "@/lib/plan-problemy";
import { formularzZapisu, godzinyZajec } from "@/lib/tablica-planu";
import { ListaNaruszen } from "../ListaNaruszen";
import { ZmianaKary } from "../ZmianaKary";

const POCZATEK: StanEdycji = { status: "poczatek" };

type PrzeniesienieDialogProps = {
  kontekst: KontekstEdycji;
  indeks: Indeks;
  ocena?: DaneOceny;
  zajeciaId: string;
  /** Where the class was dropped, with the room the board suggests. */
  cel: Cel;
  /** The free-time grid of the class, for the rooms free at the new time. */
  terminy: WolnyTermin[];
  onZamknij: () => void;
  onZapisano: (komunikat: string) => void;
};

/**
 * Confirms a move made on the board (spec 16): the placement now and after the move, the classes that move with it,
 * the hard-constraint violations (which block the save, as in the form) and the change of the penalty.
 */
export function PrzeniesienieDialog({ kontekst, indeks, ocena, zajeciaId, cel, terminy, onZamknij, onZapisano }: PrzeniesienieDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tytulId = useId();
  const [stan, akcja, trwa] = useActionState(zapiszPrzydzial, POCZATEK);
  const [sala, setSala] = useState(cel.sala);

  const z = kontekst.zajecia[zajeciaId];
  const obecny = indeks.plan.get(zajeciaId)!;
  const nowy: Cel = useMemo(() => ({ ...cel, sala }), [cel, sala]);
  const zmiany = useMemo(() => zmianyDla(indeks, zajeciaId, nowy), [indeks, zajeciaId, nowy]);
  const konflikty = useMemo(() => naruszenia(indeks, zmiany), [indeks, zmiany]);
  const karaPrzed = useMemo(() => (ocena ? ocenaPlanu(kontekst, ocena) : null), [kontekst, ocena]);
  const karaPo = useMemo(() => (ocena ? ocenaPlanu(kontekst, ocena, zmiany) : null), [kontekst, ocena, zmiany]);

  const wolne = terminy.find((t) => t.dzien === cel.dzien && t.slot === cel.slot)?.sale ?? [];
  const sale = kontekst.sale
    .filter((s) => wolne.includes(s.id) || s.id === sala)
    .sort((a, b) => a.id.localeCompare(b.id, "pl"));
  const powiazane = razem(kontekst, zajeciaId).filter((id) => id !== zajeciaId).map((id) => kontekst.zajecia[id]);
  const salaObecna = indeks.sale.get(obecny.sala);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (stan.status === "zapisano") onZapisano(stan.komunikat);
  }, [stan, onZapisano]);

  function zapisz(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(() => akcja(formularzZapisu(kontekst, zajeciaId, nowy)));
  }

  const wiersze: { etykieta: string; teraz: string; po: ReactNode; zmiana: boolean }[] = [
    { etykieta: "Dzień", teraz: dzienLabel(obecny.dzien), po: dzienLabel(cel.dzien), zmiana: obecny.dzien !== cel.dzien },
    {
      etykieta: "Godziny",
      teraz: godzinyZajec(obecny.slot, z.sloty),
      po: godzinyZajec(cel.slot, z.sloty),
      zmiana: obecny.slot !== cel.slot,
    },
    {
      etykieta: "Sala",
      teraz: salaObecna ? opisSali(salaObecna) : obecny.sala,
      po: (
        <select aria-label="Nowa sala" value={sala} onChange={(e) => setSala(e.target.value)}>
          {sale.map((s) => (
            <option key={s.id} value={s.id}>
              {opisSali(s)}
              {wolne.includes(s.id) ? "" : " (zajęta)"}
            </option>
          ))}
        </select>
      ),
      zmiana: obecny.sala !== sala,
    },
    {
      etykieta: "Tygodnie",
      teraz: opisTygodni({ tygodnie: obecny.tygodnie, czestotliwosc: z.czestotliwosc }),
      po: opisTygodni({ tygodnie: cel.tygodnie, czestotliwosc: z.czestotliwosc }),
      zmiana: false,
    },
  ];

  return (
    <dialog
      ref={dialog}
      className="class-dialog przeniesienie-dialog"
      aria-labelledby={tytulId}
      onClose={onZamknij}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <form className="class-dialog-body" onSubmit={zapisz} noValidate>
        <div className="class-dialog-head">
          <span className={klasaTagu(formaNaTyp(z.forma))}>{FORMA_LABEL[z.forma] ?? z.forma}</span>
          <button type="button" className="btn-icon" aria-label="Zamknij" onClick={() => dialog.current?.close()}>
            <Icon name="x" />
          </button>
        </div>
        <h2 id={tytulId}>Przenieść zajęcia?</h2>
        <p className="class-dialog-termin">
          {z.przedmiot} ({z.id}) · {z.grupy.map((g) => kontekst.etykiety.grupy[g] ?? g).join(", ")}
        </p>

        <table className="przeniesienie-tabela">
          <thead>
            <tr>
              <td />
              <th scope="col">Teraz</th>
              <th scope="col">Po zmianie</th>
            </tr>
          </thead>
          <tbody>
            {wiersze.map((w) => (
              <tr key={w.etykieta} className={w.zmiana ? "zmiana" : undefined}>
                <th scope="row">{w.etykieta}</th>
                <td>{w.teraz}</td>
                <td>{w.po}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {powiazane.length > 0 && (
          <div className="info-banner">
            Na ten sam dzień, godzinę i do tej samej sali przeniosą się też zajęcia powiązane:{" "}
            {powiazane.map(opisZajec).join("; ")}.
          </div>
        )}

        <div aria-live="polite">
          {konflikty.length > 0 ? (
            <ListaNaruszen tytul="Tego terminu nie da się zapisać" lista={konflikty} />
          ) : (
            <div className="success-banner">Nowy termin nie łamie żadnych ograniczeń.</div>
          )}
        </div>
        {karaPrzed && ocena && <ZmianaKary przed={karaPrzed} po={karaPo} ocena={ocena} />}

        <div aria-live="polite">
          {stan.status === "blad" &&
            (stan.naruszenia && stan.naruszenia.length > 0 ? (
              <ListaNaruszen tytul={stan.komunikat} lista={stan.naruszenia} />
            ) : (
              <div className="conflict-banner">{stan.komunikat}</div>
            ))}
        </div>

        <div className="form-actions">
          <Button type="submit" disabled={trwa || konflikty.length > 0}>
            {trwa ? "Zapisywanie…" : "Zapisz zmianę"}
          </Button>
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Anuluj
          </Button>
        </div>
      </form>
    </dialog>
  );
}
