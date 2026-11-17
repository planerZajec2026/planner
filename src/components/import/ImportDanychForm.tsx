"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Icon } from "@/components/ui/Icon";
import { MAKS_ROZMIAR, rozmiarPliku, wyslijDane, type FazaWgrywania } from "@/lib/wgrywanie-klient";
import type { StanImportu } from "@/lib/wgrywanie-danych";

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
  const router = useRouter();
  const formularz = useRef<HTMLFormElement>(null);
  const pole = useRef<HTMLInputElement>(null);
  const [plik, setPlik] = useState<File | null>(null);
  const [nadStrefa, setNadStrefa] = useState(false);
  const [faza, setFaza] = useState<FazaWgrywania | null>(null);
  const [stan, setStan] = useState<StanImportu>(POCZATEK);
  const trwa = faza !== null;

  async function wyslij(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trwa) return;
    const dane = new FormData(e.currentTarget);
    // The chosen or dropped file, set explicitly: a dropped file reaches the input only where DataTransfer is supported.
    const wybrany = plik;
    // The server checks the same; checking here first saves sending a file that would be refused anyway.
    if (!wybrany || wybrany.size === 0) return setStan({ status: "blad", komunikat: "Wybierz plik z danymi." });
    dane.set("plik", wybrany);
    if (wybrany.size > MAKS_ROZMIAR) return setStan({ status: "blad", komunikat: "Plik jest za duży (limit 4 MB)." });
    if (dane.get("potwierdzenie") !== "tak") {
      return setStan({ status: "blad", komunikat: "Potwierdź, że wgranie danych usunie dotychczasowe dane i plany." });
    }

    setStan(POCZATEK);
    setFaza({ krok: "wysylanie", wyslano: 0, razem: wybrany.size });
    const wynik = await wyslijDane(dane, setFaza);
    setFaza(null);
    setStan(wynik);
    if (wynik.status === "wgrano") {
      formularz.current?.reset();
      setPlik(null);
      router.refresh();
    }
  }

  function upusc(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setNadStrefa(false);
    const upuszczony = e.dataTransfer.files[0];
    if (trwa || !upuszczony || !pole.current) return;
    try {
      const lista = new DataTransfer();
      lista.items.add(upuszczony);
      pole.current.files = lista.files;
    } catch {
      // The file is still sent from state; only the native input does not show it.
    }
    setPlik(upuszczony);
  }

  return (
    <form ref={formularz} onSubmit={wyslij} className="card form-panel" noValidate>
      <div>
        <div className="section-title card-head">Plik z danymi wejściowymi</div>
        <p className="card-note" style={{ margin: 0 }}>
          Plik <code>.xlsx</code> (jeden arkusz na tabelę) albo <code>.json</code> w formacie <code>dane_planu</code>:
          kalendarz, sale, prowadzący, roczniki, grupy, studenci, zajęcia do zaplanowania, blokady i dezyderaty.
        </p>
      </div>

      <FormField id="plik" label="Plik z danymi" hint="Plik .xlsx albo .json, do 4 MB.">
        {/* The input stays the real, focusable control; the zone only gives it a bigger target and takes drops. */}
        <div
          className={`dropzone${nadStrefa ? " drag-over" : ""}${plik ? " wybrany" : ""}${trwa ? " zablokowana" : ""}`}
          onClick={(e) => {
            if (!trwa && e.target !== pole.current) pole.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!trwa) setNadStrefa(true);
          }}
          onDragLeave={() => setNadStrefa(false)}
          onDrop={upusc}
        >
          <input
            ref={pole}
            id="plik"
            name="plik"
            type="file"
            accept=".xlsx,.json"
            className="visually-hidden"
            aria-describedby="plik-hint"
            disabled={trwa}
            onChange={(e) => setPlik(e.currentTarget.files?.[0] ?? null)}
          />
          <Icon name={plik ? "file" : "cloud-upload"} size={28} />
          {plik ? (
            <>
              <strong>{plik.name}</strong>
              <span className="filetypes">
                {rozmiarPliku(plik.size)} · kliknij albo upuść inny plik, żeby go zmienić
              </span>
            </>
          ) : (
            <>
              <strong>Przeciągnij plik tutaj albo kliknij, żeby go wybrać</strong>
              <span className="filetypes">.xlsx albo .json</span>
            </>
          )}
        </div>
      </FormField>

      <label className="radio-row">
        <input type="checkbox" name="potwierdzenie" value="tak" disabled={trwa} />
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

      {faza && <PostepWgrywania faza={faza} />}

      <div aria-live="polite">
        {faza && <span className="visually-hidden">{opisFazy(faza).tytul}</span>}
        {stan.status === "wgrano" && (
          <div className="form-panel" style={{ gap: 12 }}>
            <div className="success-banner">
              <Icon name="check" />
              Wgrano dane:{" "}
              {NAZWY.filter(([klucz]) => klucz in stan.podsumowanie)
                .map(([klucz, nazwa]) => `${stan.podsumowanie[klucz]} ${nazwa}`)
                .join(", ")}
              . Teraz możesz wygenerować plan.
            </div>
            {/* The next step after loading data; the pulse draws the eye a few times, then stops. */}
            <ButtonLink href="/generator" variant="primary" className="btn-puls" style={{ alignSelf: "flex-start" }}>
              Przejdź do generatora
              <Icon name="chevron-right" />
            </ButtonLink>
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

function opisFazy(faza: FazaWgrywania): { tytul: string; opis: string } {
  switch (faza.krok) {
    case "wysylanie":
      return { tytul: "Krok 1 z 3: wysyłanie pliku", opis: "Przeglądarka wysyła plik na serwer." };
    case "sprawdzanie":
      return { tytul: "Krok 2 z 3: sprawdzanie pliku", opis: "Serwer odczytuje plik i sprawdza, czy dane są kompletne i spójne." };
    case "zapis":
      return {
        tytul: "Krok 3 z 3: zapis do bazy",
        opis: "Baza zastępuje dane w jednej transakcji: wejdą wszystkie albo żadne.",
      };
  }
}

/**
 * Real progress of the upload (spec 15): the bar fills with the bytes the browser has sent. The server's stages have
 * no measurable share of work, so their bar only shows that the stage is running.
 */
function PostepWgrywania({ faza }: { faza: FazaWgrywania }) {
  const { tytul, opis } = opisFazy(faza);
  const pct = faza.krok === "wysylanie" && faza.razem > 0 ? Math.min(100, Math.floor((100 * faza.wyslano) / faza.razem)) : null;

  return (
    <div className="postep">
      <div className="postep-naglowek">
        <strong>{tytul}</strong>
        {faza.krok === "wysylanie" && (
          <span>
            {rozmiarPliku(faza.wyslano)} z {rozmiarPliku(faza.razem)}
          </span>
        )}
      </div>
      <div
        className={`postep-pasek${pct == null ? " nieokreslony" : ""}`}
        role="progressbar"
        aria-label="Postęp wgrywania"
        aria-valuemin={pct == null ? undefined : 0}
        aria-valuemax={pct == null ? undefined : 100}
        aria-valuenow={pct ?? undefined}
        aria-valuetext={pct == null ? tytul : `${pct}% pliku wysłane`}
      >
        <div className="postep-wypelnienie szybkie" style={pct == null ? undefined : { width: `${pct}%` }} />
      </div>
      <p className="postep-opis">{opis}</p>
    </div>
  );
}
