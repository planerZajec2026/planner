"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { layoutDay } from "@/components/calendar/layout";
import { SzczegolyZajecDialog } from "@/components/calendar/SzczegolyZajecDialog";
import { DNI_PELNE, timeToMinutes } from "@/lib/dates";
import { klasaTagu } from "@/lib/labels";
import { dzienLabel, formaNaTyp, koniecSlotu, LICZBA_SLOTOW, poczatekSlotu, szczegolyZajec } from "@/lib/plan";
import { przygotuj, wolneTerminy, type Cel, type KontekstEdycji, type Przydzial, type WolnyTermin } from "@/lib/plan-edycja";
import type { DaneOceny } from "@/lib/plan-problemy";
import { typLabel } from "@/lib/schedule";
import {
  DNI_TABLICY,
  godzinyZajec,
  komorkaPod,
  krotkieTygodnie,
  salaPoUpuszczeniu,
  stanKomorki,
  zajeciaWFiltrze,
  type FiltrTablicy,
  type StanKomorki,
} from "@/lib/tablica-planu";
import { PrzeniesienieDialog } from "./PrzeniesienieDialog";

/** Pixels a mouse or pen moves before a press becomes a drag (below that it is a click). */
const PROG_PRZESUNIECIA = 4;
/** A finger has to rest this long on a tile to pick it up, and may move this far meanwhile. */
const PRZYTRZYMANIE_MS = 300;
const PROG_DOTYKU = 8;

const OPIS_STANU: Record<StanKomorki, string> = {
  wolny: "wolny termin",
  "bez-sali": "brak wolnej sali",
  konflikt: "konflikt",
  poza: "zajęcia się nie mieszczą",
};

/** "Poniedziałek, 12:15–14:00 (105 min)": the board shows the weekly pattern, so there is no date. */
function terminZajec(dzien: number, slot: number, sloty: number): string {
  const minuty = timeToMinutes(koniecSlotu(slot + sloty - 1)) - timeToMinutes(poczatekSlotu(slot));
  return `${DNI_PELNE[dzien - 1]}, ${godzinyZajec(slot, sloty)} (${minuty} min)`;
}

type Wcisniecie = {
  id: string;
  pointerId: number;
  dotyk: boolean;
  x0: number;
  y0: number;
  /** Slot of the class under the pointer, 0 = its first. */
  chwyt: number;
  /** Pointer position inside the tile, for the copy that follows it. */
  dx: number;
  dy: number;
  szerokosc: number;
  wysokosc: number;
  gotowe: boolean;
  timer?: ReturnType<typeof setTimeout>;
};

type Przeciaganie = Omit<Wcisniecie, "timer" | "gotowe" | "x0" | "y0" | "pointerId" | "dotyk"> & {
  x: number;
  y: number;
  sloty: number;
  terminy: WolnyTermin[];
  cel: { dzien: number; slot: number } | null;
};

type Upuszczenie = { id: string; cel: Cel; terminy: WolnyTermin[] };

type TablicaPlanuProps = {
  kontekst: KontekstEdycji;
  ocena: DaneOceny;
  filtr: FiltrTablicy;
  zaznaczone?: string;
  onZaznacz: (zajeciaId: string) => void;
  onZapisano: (komunikat: string) => void;
};

/**
 * The plan as a grid of days and slots for one group, instructor or room (spec 16). A tile is a button: a click or
 * Enter selects the class for the form above the board, a right click (or the context-menu key) shows its details.
 * Dragging it with a mouse, pen or a held finger colours every start time by what a move there would do, marks where
 * the class is now, and a drop opens the confirmation dialog.
 */
export function TablicaPlanu({ kontekst, ocena, filtr, zaznaczone, onZaznacz, onZapisano }: TablicaPlanuProps) {
  const indeks = useMemo(() => przygotuj(kontekst), [kontekst]);
  const widoczne = useMemo(() => zajeciaWFiltrze(kontekst, filtr, ocena.nadrzedne), [kontekst, filtr, ocena.nadrzedne]);

  const obszar = useRef<HTMLDivElement>(null);
  const wcisniecie = useRef<Wcisniecie | null>(null);
  // A drag ends with a click on the tile; this swallows it so the drop does not also select the class.
  const bezKlikniecia = useRef(false);
  const [przeciaganie, setPrzeciaganie] = useState<Przeciaganie | null>(null);
  const przeciaganieRef = useRef<Przeciaganie | null>(null);
  const [upuszczenie, setUpuszczenie] = useState<Upuszczenie | null>(null);
  // The class whose details are open (right click, or the context-menu key on a focused tile).
  const [szczegoly, setSzczegoly] = useState<string | null>(null);

  const ustawPrzeciaganie = (p: Przeciaganie | null) => {
    przeciaganieRef.current = p;
    setPrzeciaganie(p);
  };

  const przerwij = useCallback(() => {
    if (wcisniecie.current?.timer) clearTimeout(wcisniecie.current.timer);
    if (przeciaganieRef.current) bezKlikniecia.current = true;
    wcisniecie.current = null;
    przeciaganieRef.current = null;
    setPrzeciaganie(null);
  }, []);

  useEffect(() => {
    if (!przeciaganie) return;
    const naKlawisz = (e: KeyboardEvent) => e.key === "Escape" && przerwij();
    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, [przeciaganie, przerwij]);

  function celPod(x: number, y: number, chwyt: number, sloty: number) {
    const r = obszar.current?.getBoundingClientRect();
    return r ? komorkaPod(x, y, { left: r.left, top: r.top, width: r.width, height: r.height }, chwyt, sloty) : null;
  }

  function rozpocznij(w: Wcisniecie, x: number, y: number) {
    const p = indeks.plan.get(w.id)!;
    const sloty = kontekst.zajecia[w.id].sloty;
    w.gotowe = true;
    ustawPrzeciaganie({
      id: w.id,
      chwyt: w.chwyt,
      dx: w.dx,
      dy: w.dy,
      szerokosc: w.szerokosc,
      wysokosc: w.wysokosc,
      x,
      y,
      sloty,
      terminy: wolneTerminy(indeks, w.id, p.tygodnie),
      cel: celPod(x, y, w.chwyt, sloty),
    });
  }

  function naWcisniecie(e: PointerEvent<HTMLButtonElement>, p: Przydzial) {
    if (e.button !== 0 || upuszczenie) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sloty = kontekst.zajecia[p.zajeciaId].sloty;
    const w: Wcisniecie = {
      id: p.zajeciaId,
      pointerId: e.pointerId,
      dotyk: e.pointerType === "touch",
      x0: e.clientX,
      y0: e.clientY,
      chwyt: Math.min(sloty - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * sloty))),
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      szerokosc: r.width,
      wysokosc: r.height,
      gotowe: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (w.dotyk) w.timer = setTimeout(() => rozpocznij(w, w.x0, w.y0), PRZYTRZYMANIE_MS);
    wcisniecie.current = w;
  }

  function naRuch(e: PointerEvent<HTMLButtonElement>) {
    const w = wcisniecie.current;
    if (!w || e.pointerId !== w.pointerId) return;
    if (!w.gotowe) {
      const odleglosc = Math.hypot(e.clientX - w.x0, e.clientY - w.y0);
      if (w.dotyk) {
        // Moved before the hold finished: a swipe, not a pick-up.
        if (odleglosc > PROG_DOTYKU) przerwij();
        return;
      }
      if (odleglosc < PROG_PRZESUNIECIA) return;
      rozpocznij(w, e.clientX, e.clientY);
      return;
    }
    const d = przeciaganieRef.current;
    if (d) ustawPrzeciaganie({ ...d, x: e.clientX, y: e.clientY, cel: celPod(e.clientX, e.clientY, d.chwyt, d.sloty) });
  }

  function naPuszczenie(e: PointerEvent<HTMLButtonElement>) {
    const w = wcisniecie.current;
    if (!w || e.pointerId !== w.pointerId) return;
    const d = przeciaganieRef.current;
    przerwij();
    if (!d?.cel) return;
    const p = indeks.plan.get(d.id)!;
    if (d.cel.dzien === p.dzien && d.cel.slot === p.slot) return;
    const t = d.terminy.find((x) => x.dzien === d.cel!.dzien && x.slot === d.cel!.slot);
    setUpuszczenie({
      id: d.id,
      cel: { dzien: d.cel.dzien, slot: d.cel.slot, sala: salaPoUpuszczeniu(t, p.sala), tygodnie: p.tygodnie },
      terminy: d.terminy,
    });
  }

  function naKlikniecie(id: string) {
    if (bezKlikniecia.current) {
      bezKlikniecia.current = false;
      return;
    }
    onZaznacz(id);
  }

  const zamknij = useCallback(() => setUpuszczenie(null), []);
  const zapisano = useCallback(
    (komunikat: string) => {
      setUpuszczenie(null);
      onZapisano(komunikat);
    },
    [onZapisano],
  );

  /** Each visible class with its place in the grid; classes at the same time share the day's width. */
  const kafelki = useMemo(
    () =>
      DNI_TABLICY.flatMap((d) =>
        layoutDay(
          widoczne
            .filter((p) => p.dzien === d)
            .map((p) => {
              const sloty = kontekst.zajecia[p.zajeciaId].sloty;
              return { ...p, id: p.zajeciaId, od: poczatekSlotu(p.slot), do: koniecSlotu(p.slot + sloty - 1) };
            }),
        ).map((p) => {
          const z = kontekst.zajecia[p.zajeciaId];
          const style: CSSProperties = { gridColumn: d + 1, gridRow: `${p.slot + 1} / span ${z.sloty}` };
          if (p.lanes > 1) {
            style.width = `calc(${100 / p.lanes}% - 6px)`;
            style.marginLeft = `calc(${(100 * p.lane) / p.lanes}% + 3px)`;
            style.justifySelf = "start";
          }
          return { p, z, style, d };
        }),
      ),
    [widoczne, kontekst.zajecia],
  );

  /** What a tile says besides the subject: what the filter does not already tell. */
  const meta = (p: Przydzial) => {
    const z = kontekst.zajecia[p.zajeciaId];
    const grupy = z.grupy.map((g) => kontekst.etykiety.grupy[g] ?? g).join(", ");
    const prowadzacy = z.prowadzacy.map((id) => kontekst.etykiety.prowadzacy[id] ?? id).join(", ");
    const czesci =
      filtr.rodzaj === "grupa" ? [p.sala, prowadzacy] : filtr.rodzaj === "prowadzacy" ? [p.sala, grupy] : [grupy, prowadzacy];
    return [...czesci, krotkieTygodnie(p, z)].filter(Boolean).join(" · ");
  };

  const stanCelu =
    przeciaganie?.cel &&
    stanKomorki(
      przeciaganie.terminy.find((t) => t.dzien === przeciaganie.cel!.dzien && t.slot === przeciaganie.cel!.slot),
      przeciaganie.sloty,
    );
  const przeciagane = przeciaganie ? kontekst.zajecia[przeciaganie.id] : null;
  // Where the dragged class is now, marked in its own colour so the planner sees what is being moved and from where.
  const zrodlo = przeciaganie ? kafelki.find((k) => k.p.zajeciaId === przeciaganie.id) : undefined;
  const otwarte = szczegoly ? { z: kontekst.zajecia[szczegoly], p: indeks.plan.get(szczegoly) } : null;

  return (
    <>
      <div className="calendar-scroll">
        <div className={przeciaganie ? "tablica-grid przeciaganie" : "tablica-grid"}>
          <div style={{ gridColumn: 1, gridRow: 1 }} />
          {DNI_TABLICY.map((d) => (
            <div key={`h${d}`} className="day-header" style={{ gridColumn: d + 1, gridRow: 1 }}>
              {dzienLabel(d)}
            </div>
          ))}
          {Array.from({ length: LICZBA_SLOTOW }, (_, i) => i + 1).map((s) => (
            <div key={`s${s}`} className="tablica-slot" style={{ gridColumn: 1, gridRow: s + 1 }}>
              {poczatekSlotu(s)}
            </div>
          ))}
          {DNI_TABLICY.map((d) => (
            <div key={`d${d}`} className="day-track tablica-dzien" style={{ gridColumn: d + 1, gridRow: `2 / ${LICZBA_SLOTOW + 2}` }} />
          ))}
          <div ref={obszar} className="tablica-obszar" style={{ gridColumn: `2 / ${DNI_TABLICY.length + 2}`, gridRow: `2 / ${LICZBA_SLOTOW + 2}` }} />

          {przeciaganie?.terminy.map((t) => (
            <div
              key={`k${t.dzien}-${t.slot}`}
              className={`tablica-komorka ${stanKomorki(t, przeciaganie.sloty)}`}
              style={{ gridColumn: t.dzien + 1, gridRow: t.slot + 1 }}
            />
          ))}

          {kafelki.map(({ p, z, style, d }) => {
            const klasy = [
              "class-block",
              "tablica-kafelek",
              z.sloty === 1 ? "compact" : "",
              p.zajeciaId === zaznaczone ? "zaznaczony" : "",
              p.zajeciaId === przeciaganie?.id ? "przeciagany" : "",
            ];
            return (
              <button
                key={p.zajeciaId}
                type="button"
                data-zajecia={p.zajeciaId}
                className={klasy.filter(Boolean).join(" ")}
                style={style}
                aria-pressed={p.zajeciaId === zaznaczone}
                onPointerDown={(e) => naWcisniecie(e, p)}
                onPointerMove={naRuch}
                onPointerUp={naPuszczenie}
                onPointerCancel={przerwij}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // A held finger opens the context menu on some phones: that is a pick-up, not a request for details.
                  if (!wcisniecie.current?.dotyk && !przeciaganieRef.current) setSzczegoly(p.zajeciaId);
                }}
                onClick={() => naKlikniecie(p.zajeciaId)}
              >
                <span className="visually-hidden">{`${DNI_PELNE[d - 1]}, ${godzinyZajec(p.slot, z.sloty)}: `}</span>
                {z.sloty === 1 ? (
                  <span className="visually-hidden">{typLabel(formaNaTyp(z.forma))}: </span>
                ) : (
                  <span className={klasaTagu(formaNaTyp(z.forma))}>{typLabel(formaNaTyp(z.forma))}</span>
                )}
                <span className="title">{z.przedmiot}</span>
                <span className="meta">{meta(p)}</span>
              </button>
            );
          })}

          {zrodlo && <div className="tablica-zrodlo" style={zrodlo.style} />}
          {przeciaganie?.cel && (
            <div
              className={`tablica-cel ${stanCelu}`}
              style={{ gridColumn: przeciaganie.cel.dzien + 1, gridRow: `${przeciaganie.cel.slot + 1} / span ${przeciaganie.sloty}` }}
            />
          )}
        </div>
      </div>

      {przeciaganie && przeciagane && (
        <div
          className="class-block tablica-kopia"
          aria-hidden="true"
          style={{
            left: przeciaganie.x - przeciaganie.dx,
            top: przeciaganie.y - przeciaganie.dy,
            width: przeciaganie.szerokosc,
            height: przeciaganie.wysokosc,
          }}
        >
          <span className="title">{przeciagane.przedmiot}</span>
        </div>
      )}

      <p className="visually-hidden" aria-live="assertive">
        {przeciaganie && przeciagane
          ? przeciaganie.cel && stanCelu
            ? `${przeciagane.przedmiot}: ${dzienLabel(przeciaganie.cel.dzien)} ${poczatekSlotu(przeciaganie.cel.slot)}, ${OPIS_STANU[stanCelu]}`
            : `${przeciagane.przedmiot}: poza siatką`
          : ""}
      </p>

      {otwarte?.z && otwarte.p && (
        <SzczegolyZajecDialog
          typ={formaNaTyp(otwarte.z.forma)}
          tytul={otwarte.z.przedmiot}
          termin={terminZajec(otwarte.p.dzien, otwarte.p.slot, otwarte.z.sloty)}
          szczegoly={[
            ...szczegolyZajec({ ...otwarte.z, sala: otwarte.p.sala, tygodnie: otwarte.p.tygodnie }, kontekst.etykiety),
            { etykieta: "Liczba osób", wartosc: String(otwarte.z.miejsca) },
            { etykieta: "Kod zajęć", wartosc: otwarte.z.id },
          ]}
          onZamknij={() => setSzczegoly(null)}
        />
      )}

      {upuszczenie && (
        <PrzeniesienieDialog
          kontekst={kontekst}
          indeks={indeks}
          ocena={ocena}
          zajeciaId={upuszczenie.id}
          cel={upuszczenie.cel}
          terminy={upuszczenie.terminy}
          onZamknij={zamknij}
          onZapisano={zapisano}
        />
      )}
    </>
  );
}

/** The colours of the board while a class is dragged. */
export function LegendaTablicy() {
  return (
    <ul className="tablica-legenda" aria-label="Kolory podczas przeciągania">
      <li>
        <span className="tablica-probka zrodlo" aria-hidden="true" />
        obecny termin
      </li>
      {(["wolny", "bez-sali", "konflikt"] as const).map((s) => (
        <li key={s}>
          <span className={`tablica-probka ${s}`} aria-hidden="true" />
          {OPIS_STANU[s]}
        </li>
      ))}
    </ul>
  );
}
