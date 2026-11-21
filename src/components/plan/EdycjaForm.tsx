"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { zapiszPrzydzial, type StanEdycji } from "@/app/plan/edycja/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { WAGA_LABEL } from "@/lib/generator";
import { DNI_PLANU, dzienLabel, koniecSlotu, LICZBA_SLOTOW, opisTygodni, poczatekSlotu } from "@/lib/plan";
import {
  bladTygodni,
  dostepneTygodnie,
  naruszenia,
  opcjeTygodni,
  opisTerminu,
  opisZajec,
  przygotuj,
  razem,
  salaPasuje,
  tenSamPrzydzial,
  TYP_SALI_LABEL,
  wolneTerminy,
  zmianyDla,
  type Cel,
  type KontekstEdycji,
  type Naruszenie,
  type SalaPlanu,
  type WolnyTermin,
} from "@/lib/plan-edycja";
import { karaWgRodzaju, ocenaPlanu, RODZAJE, type DaneOceny, type ProblemyPlanu } from "@/lib/plan-problemy";

const POCZATEK: StanEdycji = { status: "poczatek" };

function miejsca(n: number | null): string {
  if (n == null) return "liczba miejsc nieznana";
  const slowo = n === 1 ? "miejsce" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "miejsca" : "miejsc";
  return `${n} ${slowo}`;
}

/** "A283 · aula · 120 miejsc". */
const opisSali = (s: SalaPlanu) => `${s.id} · ${TYP_SALI_LABEL[s.typ] ?? s.typ} · ${miejsca(s.pojemnosc)}`;

function ListaNaruszen({ tytul, lista }: { tytul: string; lista: Naruszenie[] }) {
  return (
    <div className="conflict-banner">
      <div>
        <strong>{tytul}</strong>
        <ul>
          {lista.map((n, nr) => (
            <li key={nr}>{n.opis}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const liczba = (n: number) => n.toLocaleString("pl-PL");
const zeZnakiem = (n: number) => (n > 0 ? `+${liczba(n)}` : n < 0 ? `−${liczba(-n)}` : "0");

/** The plan's soft-constraint penalty now and with the chosen placement, so a move that lowers it is easy to find. */
function ZmianaKary({ przed, po, ocena }: { przed: ProblemyPlanu; po: ProblemyPlanu | null; ocena: DaneOceny }) {
  const poGenerowaniu =
    ocena.wynikPoGenerowaniu != null && ocena.wynikPoGenerowaniu !== przed.wynik
      ? ` (po wygenerowaniu ${liczba(ocena.wynikPoGenerowaniu)})`
      : "";
  if (!po) {
    return (
      <p className="kara-zmiana">
        Kara miękkich planu: <strong>{liczba(przed.wynik)}</strong>
        {poGenerowaniu}. Wybierz inny termin, żeby zobaczyć, jak go zmieni.
      </p>
    );
  }

  const roznica = po.wynik - przed.wynik;
  const rodzajePrzed = karaWgRodzaju(przed.miekkie, ocena.wagi);
  const rodzajePo = karaWgRodzaju(po.miekkie, ocena.wagi);
  const zmienione = RODZAJE.filter((r) => rodzajePo[r] !== rodzajePrzed[r]);
  return (
    <div className={["kara-zmiana", roznica < 0 ? "lepiej" : roznica > 0 ? "gorzej" : ""].join(" ").trim()}>
      <p>
        Kara miękkich: {liczba(przed.wynik)} → <strong>{liczba(po.wynik)}</strong> ({zeZnakiem(roznica)})
        {poGenerowaniu}.{" "}
        {roznica < 0 ? "Ta zmiana zmniejsza karę." : roznica > 0 ? "Ta zmiana zwiększa karę." : "Ta zmiana nie zmienia kary."}
      </p>
      {zmienione.length > 0 && (
        <p className="kara-rodzaje">
          {zmienione.map((r) => `${WAGA_LABEL[r] ?? r}: ${zeZnakiem(rodzajePo[r] - rodzajePrzed[r])}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

/**
 * Moves one class of the plan to another day, hour, room or weeks (spec 14). The conflicts and the grid of free
 * times are computed in the browser as hints; the Server Action checks again and decides. With `ocena` the form
 * also shows how the move changes the plan's soft-constraint penalty (spec 15).
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
  const zleTygodnie = bladTygodni(z, cel.tygodnie);

  function wyslij(e: FormEvent<HTMLFormElement>) {
    // Sent by hand, not as a form action: React resets a form after its action, which would desync the selects.
    e.preventDefault();
    const fd = new FormData();
    fd.set("job", kontekst.jobId);
    fd.set("wersja", String(kontekst.wersja));
    fd.set("zajecia", zajeciaId);
    fd.set("dzien", String(cel.dzien));
    fd.set("slot", String(cel.slot));
    fd.set("sala", cel.sala);
    fd.set("tygodnie", cel.tygodnie.join(","));
    startTransition(() => akcja(fd));
  }

  function wybierzTermin(t: WolnyTermin) {
    // Keep the room when it is free at the new time; otherwise suggest the smallest room that is.
    const sala = t.sale.includes(cel.sala) || t.sale.length === 0 ? cel.sala : t.sale[0];
    ustaw({ dzien: t.dzien, slot: t.slot, sala });
  }

  function przelaczTydzien(tydzien: number, wybrano: boolean) {
    const bez = cel.tygodnie.filter((t) => t !== tydzien);
    ustaw({ tygodnie: (wybrano ? [...bez, tydzien] : bez).sort((a, b) => a - b) });
  }

  const odpowiedz = stan !== nieaktualny ? stan : POCZATEK;

  return (
    <>
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
              To obecny termin zajęć. Wybierz inny w polach powyżej albo w tabeli wolnych terminów.
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

      <section className="card" aria-labelledby="wolne-terminy">
        <div className="section-title card-head" id="wolne-terminy">
          Wolne terminy
        </div>
        {zleTygodnie ? (
          <p className="card-note" style={{ margin: 0 }}>
            Najpierw wybierz poprawne tygodnie: {zleTygodnie}.
          </p>
        ) : (
          <>
            <div className="terminy-wrap">
              <table className="terminy">
                <caption className="visually-hidden">
                  Liczba wolnych sal dla każdego dnia i godziny rozpoczęcia, w wybranych tygodniach
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Początek</th>
                    {DNI_PLANU.map((d) => (
                      <th key={d} scope="col">
                        {dzienLabel(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {starty.map((s) => (
                    <tr key={s}>
                      <th scope="row">{poczatekSlotu(s)}</th>
                      {DNI_PLANU.map((d) => {
                        const t = terminy.find((x) => x.dzien === d && x.slot === s);
                        if (!t) return <td key={d} />;
                        const wolny = t.terminWolny && t.sale.length > 0;
                        const toObecny = d === obecny.dzien && s === obecny.slot;
                        return (
                          <td key={d}>
                            <button
                              type="button"
                              className={["termin", wolny ? "termin-wolny" : "termin-zajety", toObecny ? "termin-obecny" : ""].join(" ").trim()}
                              aria-pressed={d === cel.dzien && s === cel.slot}
                              aria-label={`${dzienLabel(d)} ${poczatekSlotu(s)}: ${
                                !t.terminWolny ? "termin zajęty" : `wolne sale: ${t.sale.length}`
                              }${toObecny ? ", obecny termin" : ""}`}
                              onClick={() => wybierzTermin(t)}
                            >
                              {t.terminWolny ? t.sale.length : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="card-note">
              Liczba to sale wolne w tym terminie, „—” oznacza, że termin jest zajęty dla prowadzącego lub studentów
              (albo wyklucza go dezyderat, blokada lub powiązanie). Obecny termin ma pogrubioną ramkę. Kliknięcie
              ustawia dzień i godzinę; lista konfliktów powie, co dokładnie przeszkadza.
            </p>
          </>
        )}
      </section>
    </>
  );
}
