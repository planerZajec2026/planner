"use client";

import { AnimatePresence } from "motion/react";
import { useRef, useState, type DragEvent } from "react";
import { Collapse, CollapseItem } from "@/components/motion/Collapse";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { znajdzKonflikty, type Konflikt } from "@/lib/conflicts";
import { DNI_KROTKIE } from "@/lib/dates";
import { formatBlad, parsePlanJson, PRZYKLADOWY_PLAN, resolvePlan, type ResolveContext } from "@/lib/import";
import { countPl, pluralPl } from "@/lib/pl";
import { pelneImie } from "@/lib/prowadzacy";
import { typLabel } from "@/lib/schedule";
import type { Zajecia } from "@/lib/types";

const MAX_ROZMIAR = 1024 * 1024;

type Status = "gotowe" | "konflikt" | "pominiete" | "zastap";
type Wiersz = { z: Zajecia; konflikty: Konflikt[]; status: Status };
type Wynik = { plik: string; wiersze: Wiersz[] } | { plik: string; bledy: string[] };

type JsonImportProps = ResolveContext & {
  istniejace: Zajecia[];
  /** Adds `dodaj` to the local plan and removes the classes with ids in `usun` (replaced by the import). */
  onImport: (dodaj: Zajecia[], usun: string[]) => void;
};

export function JsonImport({ istniejace, onImport, ...ctx }: JsonImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [zaimportowano, setZaimportowano] = useState(false);

  const wczytaj = async (file: File) => {
    setZaimportowano(false);
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
      setWynik({ plik: file.name, bledy: ["Wybierz plik w formacie .json"] });
      return;
    }
    if (file.size > MAX_ROZMIAR) {
      setWynik({ plik: file.name, bledy: ["Plik jest za duży (maksymalnie 1 MB)"] });
      return;
    }
    // TODO(backend): upload the file to a route handler / server action, validate it on the server,
    //   resolve instructors and groups by name and insert all rows in a single transaction.
    const parsed = parsePlanJson(await file.text());
    if (!parsed.ok) {
      setWynik({ plik: file.name, bledy: parsed.errors.map(formatBlad) });
      return;
    }
    const resolved = resolvePlan(parsed.plan, ctx);
    if (!resolved.ok) {
      setWynik({ plik: file.name, bledy: resolved.errors.map(formatBlad) });
      return;
    }
    const nowe = resolved.zajecia.map((z, i) => ({ ...z, id: `import-${i}` }));
    const konflikty = znajdzKonflikty(nowe, istniejace, ctx);
    setWynik({
      plik: file.name,
      wiersze: nowe.map((z, i) => ({ z, konflikty: konflikty[i], status: konflikty[i].length ? "konflikt" : "gotowe" })),
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void wczytaj(file);
  };

  const setStatus = (index: number, status: Status) => {
    if (!wynik || !("wiersze" in wynik)) return;
    const wiersze = wynik.wiersze.map((w, i) => (i === index ? { ...w, status } : w));
    // Replacing with a row means the other file rows it clashes with can't be imported alongside it.
    if (status === "zastap") {
      const ids = new Set(wynik.wiersze[index].konflikty.map((k) => k.z.id));
      wiersze.forEach((w, i) => {
        if (i !== index && ids.has(w.z.id)) wiersze[i] = { ...w, status: "pominiete" };
      });
    }
    setWynik({ ...wynik, wiersze });
  };

  const anuluj = () => {
    setWynik(null);
    setZaimportowano(false);
  };

  const wiersze = wynik && "wiersze" in wynik ? wynik.wiersze : [];
  const doImportu = wiersze.filter((w) => w.status === "gotowe" || w.status === "zastap");
  const nierozwiazane = wiersze.filter((w) => w.status === "konflikt").length;
  const zKonfliktem = wiersze.filter((w) => w.konflikty.length > 0).length;

  const importuj = () => {
    const fileIds = new Set(wiersze.map((w) => w.z.id));
    const usun = doImportu
      .filter((w) => w.status === "zastap")
      .flatMap((w) => w.konflikty.map((k) => k.z.id))
      .filter((id) => !fileIds.has(id));
    // TODO(backend): persist the import (see above) and refresh the timetables.
    onImport(
      doImportu.map((w) => ({ ...w.z, id: `lokalne-${crypto.randomUUID()}` })),
      [...new Set(usun)],
    );
    setWynik(null);
    setZaimportowano(true);
  };

  return (
    <section className="card" aria-labelledby="import-title">
      <div className="section-title card-head" id="import-title">
        Import z pliku JSON
      </div>
      <div className="two-col">
        <div
          className={dragOver ? "dropzone drag-over" : "dropzone"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
          }}
          onDrop={onDrop}
          // The whole area is clickable ("lub kliknij"); keyboard users get the button below.
          onClick={(e) => {
            if (!(e.target as Element).closest("button")) inputRef.current?.click();
          }}
        >
          <Icon name="cloud-upload" size={36} strokeWidth={1.6} className="icon" />
          <strong>Przeciągnij plik .json lub kliknij, aby wybrać</strong>
          <span className="filetypes">Jeden plik zawiera cały plan dla kierunku i grupy</span>
          <Button onClick={() => inputRef.current?.click()}>Wybierz plik</Button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Plik JSON z planem zajęć"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // allow picking the same file again
              if (file) void wczytaj(file);
            }}
          />
        </div>
        <div>
          <div className="section-title" style={{ marginBottom: 10 }}>
            Oczekiwany format pliku
          </div>
          <pre className="json-sample">{PRZYKLADOWY_PLAN}</pre>
        </div>
      </div>

      <div role="status" style={{ display: "contents" }}>
        <Collapse show={zaimportowano}>
          <div className="success-banner" style={{ marginTop: 18 }}>
            <Icon name="check" />
            Zaimportowano (dane lokalne)
          </div>
        </Collapse>
      </div>

      {/* Keyed by file, so loading another file closes the old result and opens the new one. */}
      <AnimatePresence initial={false}>
        {wynik && "bledy" in wynik && (
          <CollapseItem key={`bledy:${wynik.plik}`}>
            <div className="import-result">
              <div className="conflict-banner" role="alert">
                <Icon name="alert" />
                <div>
                  <strong>Nie udało się wczytać pliku „{wynik.plik}”</strong>
                  <ul>
                    {wynik.bledy.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="form-actions">
                <Button variant="secondary" onClick={anuluj}>
                  Anuluj
                </Button>
              </div>
            </div>
          </CollapseItem>
        )}

        {wynik && "wiersze" in wynik && (
          <CollapseItem key={`wiersze:${wynik.plik}`}>
            <div className="import-result" aria-labelledby="import-result-title">
              <div className="import-result-head">
                <div className="section-title" id="import-result-title">
                  Podgląd importu
                </div>
                <span>{wynik.plik}</span>
              </div>
              <div className="import-summary">
                <Stat n={wiersze.length} label={pluralPl(wiersze.length, "zajęcia w pliku", "zajęcia w pliku", "zajęć w pliku")} />
                <Stat n={doImportu.length} label={pluralPl(doImportu.length, "gotowe do importu", "gotowe do importu", "gotowych do importu")} />
                <Stat n={zKonfliktem} label={pluralPl(zKonfliktem, "konflikt", "konflikty", "konfliktów")} danger />
              </div>
              <Collapse show={nierozwiazane > 0}>
                <div className="conflict-banner" role="alert">
                  <Icon name="alert" />
                  <div>
                    <strong>
                      {nierozwiazane === 1 ? "Zajęcia kolidują z planem" : `${nierozwiazane} zajęć koliduje z planem`}
                    </strong>
                    <p>Wybierz „Pomiń” albo „Zastąp”. Zajęcia z nierozwiązanym konfliktem nie zostaną zaimportowane.</p>
                  </div>
                </div>
              </Collapse>
              <div>
                {wiersze.map((w, i) => (
                  <WierszImportu
                    key={w.z.id}
                    wiersz={w}
                    ctx={ctx}
                    onPomin={() => setStatus(i, "pominiete")}
                    onZastap={() => setStatus(i, "zastap")}
                    onCofnij={() => setStatus(i, w.konflikty.length ? "konflikt" : "gotowe")}
                  />
                ))}
              </div>
              <div className="form-actions">
                <Button onClick={importuj} disabled={doImportu.length === 0}>
                  Importuj {countPl(doImportu.length, "zajęcia", "zajęcia", "zajęć")}
                </Button>
                <Button variant="secondary" onClick={anuluj}>
                  Anuluj
                </Button>
              </div>
            </div>
          </CollapseItem>
        )}
      </AnimatePresence>
    </section>
  );
}

function Stat({ n, label, danger }: { n: number; label: string; danger?: boolean }) {
  return (
    <div className={danger ? "import-stat import-stat--danger" : "import-stat"}>
      <strong>{n}</strong>
      {label}
    </div>
  );
}

type WierszImportuProps = {
  wiersz: Wiersz;
  ctx: ResolveContext;
  onPomin: () => void;
  onZastap: () => void;
  onCofnij: () => void;
};

function WierszImportu({ wiersz: { z, konflikty, status }, ctx, onPomin, onZastap, onCofnij }: WierszImportuProps) {
  const grupa = ctx.grupy.find((g) => g.id === z.grupaId);
  const prowadzacy = ctx.prowadzacy.find((p) => p.id === z.prowadzacyId);
  const className = ["import-result-row", status === "konflikt" && "conflict", status === "pominiete" && "skipped"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <Icon name={status === "konflikt" ? "alert" : status === "pominiete" ? "file" : "check"} />
      <div>
        <div className="row-title">
          {z.przedmiot} · {typLabel(z.typ)} · {grupa?.kod}
        </div>
        <p className="row-meta">
          {DNI_KROTKIE[z.dzien - 1]} {z.od}–{z.do} · {z.sala} · {prowadzacy && pelneImie(prowadzacy)}
        </p>
        {status === "konflikt" &&
          konflikty.map((k) => (
            <p key={k.z.id} className="row-note">
              {k.opis}
            </p>
          ))}
        {status === "zastap" && (
          <p className="row-status">
            Zastąpi:{" "}
            {konflikty
              .map((k) => `${k.z.przedmiot} (${DNI_KROTKIE[k.z.dzien - 1].toLocaleLowerCase("pl-PL")} ${k.z.od}–${k.z.do})`)
              .join(", ")}
          </p>
        )}
        {status === "pominiete" && <p className="row-status">Pominięto</p>}
        {status === "konflikt" && (
          <div className="row-actions">
            <Button variant="secondary" onClick={onPomin}>
              Pomiń
            </Button>
            <Button variant="danger-ghost" onClick={onZastap}>
              Zastąp
            </Button>
          </div>
        )}
        {(status === "zastap" || (status === "pominiete" && konflikty.length > 0)) && (
          <div className="row-actions">
            <Button variant="secondary" onClick={onCofnij}>
              Cofnij
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
