"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppLink } from "@/components/ui/AppLink";
import type { KontekstEdycji } from "@/lib/plan-edycja";
import type { DaneOceny } from "@/lib/plan-problemy";
import type { FiltrTablicy as Filtr, OpcjaFiltra, RodzajFiltra } from "@/lib/tablica-planu";
import { EdycjaForm } from "../EdycjaForm";
import type { Powrot } from "../EdycjaView";
import { FiltrTablicy } from "./FiltrTablicy";
import { KartaZajec } from "./KartaZajec";
import { LegendaTablicy, TablicaPlanu } from "./TablicaPlanu";

type EdycjaPlanuProps = {
  kontekst: KontekstEdycji;
  ocena: DaneOceny;
  filtr: Filtr;
  opcje: Record<RodzajFiltra, OpcjaFiltra[]>;
  /** The class from `?zajecia=`, already checked to be in the plan. */
  zaznaczone?: string;
  powrot: Powrot;
};

/**
 * The editing page (spec 16): the selected class with its form, and the board of the whole plan below them. The
 * selection lives in the URL (`?zajecia=`) without a server round trip; a filter change reloads the page.
 */
export function EdycjaPlanu({ kontekst, ocena, filtr, opcje, zaznaczone: poczatkowe, powrot }: EdycjaPlanuProps) {
  const [zaznaczone, setZaznaczone] = useState(poczatkowe);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  // A move saved from the board changes the class under the form; a new key starts the form from the new placement.
  const [przeniesienia, setPrzeniesienia] = useState(0);

  // A link to another class on the same board (the URL changed, the board stayed).
  const [zAdresu, setZAdresu] = useState(poczatkowe);
  if (poczatkowe !== zAdresu) {
    setZAdresu(poczatkowe);
    if (poczatkowe) setZaznaczone(poczatkowe);
  }

  // A class opened from elsewhere is scrolled into view once, not again after every save.
  const doPrzewiniecia = useRef(poczatkowe);
  useEffect(() => {
    const id = doPrzewiniecia.current;
    if (id) document.querySelector(`[data-zajecia="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
  }, []);

  const zaznacz = useCallback((id: string) => {
    setZaznaczone(id);
    setKomunikat(null);
    const params = new URLSearchParams(window.location.search);
    params.set("zajecia", id);
    window.history.replaceState(null, "", `?${params}`);
  }, []);

  const zapisano = useCallback((tekst: string) => {
    setKomunikat(tekst);
    setPrzeniesienia((n) => n + 1);
  }, []);

  const z = zaznaczone ? kontekst.zajecia[zaznaczone] : undefined;
  const obecny = zaznaczone ? kontekst.plan.find((p) => p.zajeciaId === zaznaczone) : undefined;

  return (
    <>
      <FiltrTablicy
        filtr={filtr}
        opcje={opcje}
        zaznaczone={z && obecny ? { grupa: z.grupy, prowadzacy: z.prowadzacy, sala: [obecny.sala] } : undefined}
      />
      {z ? (
        <>
          <KartaZajec kontekst={kontekst} zajeciaId={z.id} />
          <EdycjaForm
            key={`${z.id}|${przeniesienia}`}
            kontekst={kontekst}
            ocena={ocena}
            zajeciaId={z.id}
            powrot={powrot.href}
            powrotEtykieta={powrot.etykieta}
          />
        </>
      ) : (
        <p className="card-note">
          Nie wybrano zajęć do edycji. <AppLink href={powrot.href}>{powrot.etykieta}</AppLink>
        </p>
      )}

      <section className="tablica-sekcja" aria-label="Siatka planu">
        <div className="tablica-pasek">
          <p className="card-note">
            Przeciągnij zajęcia na inny termin (na ekranie dotykowym najpierw przytrzymaj kafelek). Kliknij zajęcia, żeby
            zmienić je w formularzu powyżej; prawy przycisk pokazuje szczegóły.
          </p>
          <LegendaTablicy />
        </div>
        <div aria-live="polite">{komunikat && <div className="success-banner">{komunikat}</div>}</div>
        <TablicaPlanu
          kontekst={kontekst}
          ocena={ocena}
          filtr={filtr}
          zaznaczone={zaznaczone}
          onZaznacz={zaznacz}
          onZapisano={zapisano}
        />
      </section>
    </>
  );
}
