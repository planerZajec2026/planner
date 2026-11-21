"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { zapiszPrzydzial, type StanEdycji } from "@/app/plan/edycja/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { DNI_PLANU, dzienLabel, koniecSlotu, LICZBA_SLOTOW, opisTygodni, poczatekSlotu } from "@/lib/plan";
import {
  dostepneTygodnie,
  naruszenia,
  opcjeTygodni,
  opisSali,
  opisTerminu,
  opisZajec,
  przygotuj,
  razem,
  salaPasuje,
  tenSamPrzydzial,
  wolneTerminy,
  zmianyDla,
  type Cel,
  type KontekstEdycji,
} from "@/lib/plan-edycja";
import { ocenaPlanu, type DaneOceny } from "@/lib/plan-problemy";
import { formularzZapisu } from "@/lib/tablica-planu";
import { ListaNaruszen } from "./ListaNaruszen";
import { ZmianaKary } from "./ZmianaKary";

const POCZATEK: StanEdycji = { status: "poczatek" };

/**
 * Moves one class of the plan to another day, hour, room or weeks (spec 14); the keyboard way of the editing board
 * (spec 16), which also changes the weeks. The conflicts are computed in the browser as hints; the Server Action
 * checks again and decides. With `ocena` the form also shows how the move changes the soft-constraint penalty.
 */
export function EdycjaForm({
  kontekst,
  ocena,
  zajeciaId,
  powrot,
  powrotEtykieta = "Wróć do planu",
}: {
  kontekst: KontekstEdycji;
  ocena?: DaneOceny;
  zajeciaId: string;
  powrot: string;
  powrotEtykieta?: string;
}) {
  const [stan, akcja, trwa] = useActionState(zapiszPrzydzial, POCZATEK);
  const i = useMemo(() => przygotuj(kontekst), [kontekst]);
  const z = kontekst.zajecia[zajeciaId];
  const obecny = i.plan.get(zajeciaId)!;

  const [cel, setCel] = useState<Cel>({ dzien: obecny.dzien, slot: obecny.slot, sala: obecny.sala, tygodnie: obecny.tygodnie });
  // The server's answer describes the placement that was sent; it is hidden as soon as the selection changes.
  const [nieaktualny, setNieaktualny] = useState<StanEdycji>(POCZATEK);
  const ustaw = (zmiana: Partial<Cel>) => {
    setCel((c) => ({ ...c, ...zmiana }));
    setNieaktualny(stan);
  };

  const zmiany = useMemo(() => zmianyDla(i, zajeciaId, cel), [i, zajeciaId, cel]);
  const konflikty = useMemo(() => naruszenia(i, zmiany), [i, zmiany]);
  const terminy = useMemo(() => wolneTerminy(i, zajeciaId, cel.tygodnie), [i, zajeciaId, cel.tygodnie]);
  const zmieniono = !tenSamPrzydzial({ zajeciaId, ...cel }, obecny);
  const karaPrzed = useMemo(() => (ocena ? ocenaPlanu(kontekst, ocena) : null), [kontekst, ocena]);
  const karaPo = useMemo(
    () => (ocena && zmieniono ? ocenaPlanu(kontekst, ocena, zmiany) : null),
    [kontekst, ocena, zmieniono, zmiany],
  );

  const przenoszone = razem(kontekst, zajeciaId).map((id) => kontekst.zajecia[id]);
  const powiazane = przenoszone.filter((inne) => inne.id !== zajeciaId);
  const wRozneDni =
    z.powiazanie && z.typPowiazania === "rozne_dni"
      ? Object.values(kontekst.zajecia).filter((inne) => inne.powiazanie === z.powiazanie && inne.id !== zajeciaId)
      : [];

  const ostatniStart = LICZBA_SLOTOW - z.sloty + 1;
  const starty = Array.from({ length: ostatniStart }, (_, nr) => nr + 1);
  const wybrany = terminy.find((t) => t.dzien === cel.dzien && t.slot === cel.slot);
  const sale = kontekst.sale
    .filter((s) => s.id === obecny.sala || s.id === cel.sala || przenoszone.every((klasa) => salaPasuje(klasa, s)))
    .sort((a, b) => a.id.localeCompare(b.id, "pl"));

  const opcje = opcjeTygodni(z);
  const dostepne = dostepneTygodnie(z);

  function wyslij(e: FormEvent<HTMLFormElement>) {
    // Sent by hand, not as a form action: React resets a form after its action, which would desync the selects.
    e.preventDefault();
    startTransition(() => akcja(formularzZapisu(kontekst, zajeciaId, cel)));
  }

  function przelaczTydzien(tydzien: number, wybrano: boolean) {
    const bez = cel.tygodnie.filter((t) => t !== tydzien);
    ustaw({ tygodnie: (wybrano ? [...bez, tydzien] : bez).sort((a, b) => a - b) });
  }

  const odpowiedz = stan !== nieaktualny ? stan : POCZATEK;

  return (
    <form onSubmit={wyslij} className="card form-panel" noValidate>
      <div className="section-title">Nowy termin</div>

      <div className="form-grid">
        <FormField id="dzien" label="Dzień">
          <select id="dzien" value={cel.dzien} onChange={(e) => ustaw({ dzien: Number(e.target.value) })}>
            {DNI_PLANU.map((d) => (
              <option key={d} value={d}>
                {dzienLabel(d)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="slot" label="Początek">
          <select id="slot" value={cel.slot} onChange={(e) => ustaw({ slot: Number(e.target.value) })}>
            {starty.map((s) => (
              <option key={s} value={s}>
                {poczatekSlotu(s)}–{koniecSlotu(s + z.sloty - 1)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="sala" label="Sala" hint="Tylko sale pasujące typem, wyposażeniem i pojemnością.">
          <select id="sala" value={cel.sala} aria-describedby="sala-hint" onChange={(e) => ustaw({ sala: e.target.value })}>
            {sale.map((s) => (
              <option key={s.id} value={s.id}>
                {opisSali(s)}
                {wybrany?.terminWolny && !wybrany.sale.includes(s.id) ? " (zajęta)" : ""}
              </option>
            ))}
          </select>
        </FormField>

        {z.czestotliwosc === "co_2_tygodnie" && opcje.length > 1 ? (
          <FormField id="tygodnie" label="Tygodnie">
            <select
              id="tygodnie"
              value={opcje.find((o) => o.tygodnie.join() === cel.tygodnie.join())?.id ?? ""}
              onChange={(e) => ustaw({ tygodnie: opcje.find((o) => o.id === e.target.value)?.tygodnie ?? cel.tygodnie })}
            >
              {opcje.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : z.czestotliwosc !== "wybrane_tygodnie" ? (
          <div className="form-field">
            <span className="form-field-label">Tygodnie</span>
            <span className="form-field-static">{opisTygodni({ tygodnie: cel.tygodnie, czestotliwosc: z.czestotliwosc })}</span>
            <span className="hint">Tych zajęć nie da się przenieść na inne tygodnie.</span>
          </div>
        ) : null}
      </div>

      {z.czestotliwosc === "wybrane_tygodnie" && (
        <fieldset className="tygodnie-pole">
          <legend>
            Tygodnie: wybrano {cel.tygodnie.length} z {z.liczbaSpotkan}
          </legend>
          <div className="tygodnie-lista">
            {dostepne.map((t) => (
              <label key={t}>
                <input type="checkbox" checked={cel.tygodnie.includes(t)} onChange={(e) => przelaczTydzien(t, e.target.checked)} />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {powiazane.length > 0 && (
        <div className="info-banner">
          Razem z tymi zajęciami na ten sam dzień, godzinę i do tej samej sali przeniosą się zajęcia powiązane:{" "}
          {powiazane.map(opisZajec).join("; ")}. Każde zachowuje swoje tygodnie.
        </div>
      )}
      {wRozneDni.length > 0 && (
        <div className="info-banner">
          Zajęcia powiązane muszą być w innym dniu:{" "}
          {wRozneDni.map((inne) => `${opisZajec(inne)}, ${dzienLabel(i.plan.get(inne.id)?.dzien ?? 0).toLowerCase()}`).join("; ")}.
        </div>
      )}

      <div aria-live="polite">
        {konflikty.length > 0 ? (
          <ListaNaruszen tytul="Tego terminu nie da się zapisać" lista={konflikty} />
        ) : zmieniono ? (
          <div className="success-banner">
            Wybrany termin ({opisTerminu(cel, z.sloty)}, sala {cel.sala}) nie łamie żadnych ograniczeń.
          </div>
        ) : (
          <p className="card-note" style={{ margin: 0 }}>
            To obecny termin zajęć. Wybierz inny w polach powyżej albo przeciągnij zajęcia na siatce planu.
          </p>
        )}
      </div>

      {ocena && karaPrzed && (
        <div aria-live="polite">
          <ZmianaKary przed={karaPrzed} po={karaPo} ocena={ocena} />
        </div>
      )}

      <div className="form-actions">
        <Button type="submit" disabled={trwa || !zmieniono || konflikty.length > 0}>
          {trwa ? "Zapisywanie…" : "Zapisz zmianę"}
        </Button>
        <Button
          variant="secondary"
          disabled={!zmieniono}
          onClick={() => ustaw({ dzien: obecny.dzien, slot: obecny.slot, sala: obecny.sala, tygodnie: obecny.tygodnie })}
        >
          Przywróć obecny termin
        </Button>
        <ButtonLink href={powrot}>{powrotEtykieta}</ButtonLink>
      </div>

      <div aria-live="polite">
        {odpowiedz.status === "zapisano" && <div className="success-banner">{odpowiedz.komunikat}</div>}
        {odpowiedz.status === "blad" &&
          (odpowiedz.naruszenia && odpowiedz.naruszenia.length > 0 ? (
            <ListaNaruszen tytul={odpowiedz.komunikat} lista={odpowiedz.naruszenia} />
          ) : (
            <div className="conflict-banner">{odpowiedz.komunikat}</div>
          ))}
      </div>
    </form>
  );
}
