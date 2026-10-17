"use client";

import { Fragment, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/motion/Collapse";
import { FormField } from "@/components/ui/FormField";
import { Icon } from "@/components/ui/Icon";
import { znajdzKonflikty, type Konflikt } from "@/lib/conflicts";
import { DNI_PELNE, timeToMinutes } from "@/lib/dates";
import type { ResolveContext } from "@/lib/import";
import { POWTARZALNOSC_LABEL, TYP_ZAJEC_LABEL } from "@/lib/labels";
import { pelneImie } from "@/lib/prowadzacy";
import type { DzienTygodnia, Powtarzalnosc, TypZajec, Zajecia } from "@/lib/types";

type Pole = "grupa" | "przedmiot" | "od" | "do" | "sala";
type Bledy = Partial<Record<Pole, string>>;

const WYMAGANE = "To pole jest wymagane";

type ManualZajeciaFormProps = ResolveContext & {
  istniejace: Zajecia[];
  onAdd: (z: Zajecia) => void;
};

function errorProps(bledy: Bledy, pole: Pole) {
  return bledy[pole] ? { "aria-invalid": true as const, "aria-describedby": `m-${pole}-error` } : {};
}

export function ManualZajeciaForm({ istniejace, onAdd, ...ctx }: ManualZajeciaFormProps) {
  const { kierunki, grupy, prowadzacy } = ctx;
  const domyslnyKierunek = kierunki[0]?.id ?? "";
  const pierwszaGrupa = (kierunekId: string) => grupy.find((g) => g.kierunekId === kierunekId)?.id ?? "";

  const [kierunekId, setKierunekId] = useState(domyslnyKierunek);
  const [grupaId, setGrupaId] = useState(() => pierwszaGrupa(domyslnyKierunek));
  const [bledy, setBledy] = useState<Bledy>({});
  const [konflikty, setKonflikty] = useState<Konflikt[]>([]);
  const [dodano, setDodano] = useState(false);
  // Changing the key remounts the uncontrolled fields, which resets them to their defaults.
  const [resetKey, setResetKey] = useState(0);

  const grupyKierunku = grupy.filter((g) => g.kierunekId === kierunekId);

  const clearError = (pole: Pole) => {
    if (bledy[pole]) setBledy((prev) => ({ ...prev, [pole]: undefined }));
    setDodano(false);
  };

  const wyczysc = () => {
    setKierunekId(domyslnyKierunek);
    setGrupaId(pierwszaGrupa(domyslnyKierunek));
    setBledy({});
    setKonflikty([]);
    setDodano(false);
    setResetKey((k) => k + 1);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();

    const z: Zajecia = {
      id: `lokalne-${crypto.randomUUID()}`,
      przedmiot: text("przedmiot"),
      typ: text("typ") as TypZajec,
      prowadzacyId: text("prowadzacy"),
      grupaId,
      dzien: Number(text("dzien")) as DzienTygodnia,
      od: text("od"),
      do: text("do"),
      sala: text("sala"),
      powtarzalnosc: text("powtarzalnosc") as Powtarzalnosc,
    };

    const nextBledy: Bledy = {};
    if (!z.grupaId) nextBledy.grupa = WYMAGANE;
    if (!z.przedmiot) nextBledy.przedmiot = WYMAGANE;
    if (!z.od) nextBledy.od = WYMAGANE;
    if (!z.do) nextBledy.do = WYMAGANE;
    else if (z.od && timeToMinutes(z.od) >= timeToMinutes(z.do)) {
      nextBledy.do = "Godzina zakończenia musi być późniejsza niż rozpoczęcia";
    }
    if (!z.sala) nextBledy.sala = WYMAGANE;
    setBledy(nextBledy);
    setDodano(false);

    const firstInvalid = (Object.keys(nextBledy) as Pole[])[0];
    if (firstInvalid) {
      setKonflikty([]);
      form.querySelector<HTMLElement>(`#m-${firstInvalid}`)?.focus();
      return;
    }

    const found = znajdzKonflikty([z], istniejace, ctx)[0];
    setKonflikty(found);
    if (found.length > 0) return;

    // TODO(backend): insert the class into `zajecia` (server action); the server re-checks conflicts.
    onAdd(z);
    setDodano(true);
    setResetKey((k) => k + 1);
  };

  return (
    <form className="card form-panel" noValidate onSubmit={handleSubmit} aria-labelledby="manual-title">
      <div className="section-title" id="manual-title">
        Dodaj zajęcia ręcznie
      </div>
      <Fragment key={resetKey}>
        <div className="form-grid">
          <FormField id="m-kierunek" label="Kierunek">
            <select
              id="m-kierunek"
              value={kierunekId}
              onChange={(e) => {
                setKierunekId(e.target.value);
                setGrupaId(pierwszaGrupa(e.target.value));
                clearError("grupa");
              }}
            >
              {kierunki.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nazwa}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="m-grupa" label="Grupa" error={bledy.grupa}>
            <select
              id="m-grupa"
              value={grupaId}
              disabled={grupyKierunku.length === 0}
              onChange={(e) => {
                setGrupaId(e.target.value);
                setDodano(false);
              }}
              {...errorProps(bledy, "grupa")}
            >
              {grupyKierunku.length === 0 && <option value="">Brak grup</option>}
              {grupyKierunku.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.kod}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="m-przedmiot" label="Przedmiot *" error={bledy.przedmiot}>
            <input
              id="m-przedmiot"
              name="przedmiot"
              type="text"
              placeholder="np. Bazy danych"
              aria-required="true"
              onChange={() => clearError("przedmiot")}
              {...errorProps(bledy, "przedmiot")}
            />
          </FormField>
          <FormField id="m-typ" label="Typ zajęć">
            <select id="m-typ" name="typ">
              {Object.entries(TYP_ZAJEC_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="m-prowadzacy" label="Prowadzący">
            <select id="m-prowadzacy" name="prowadzacy">
              {prowadzacy.map((p) => (
                <option key={p.id} value={p.id}>
                  {pelneImie(p)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="m-dzien" label="Dzień tygodnia">
            <select id="m-dzien" name="dzien">
              {DNI_PELNE.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="m-od" label="Godzina od *" error={bledy.od}>
            <input
              id="m-od"
              name="od"
              type="time"
              aria-required="true"
              onChange={() => clearError("od")}
              {...errorProps(bledy, "od")}
            />
          </FormField>
          <FormField id="m-do" label="Godzina do *" error={bledy.do}>
            <input
              id="m-do"
              name="do"
              type="time"
              aria-required="true"
              onChange={() => clearError("do")}
              {...errorProps(bledy, "do")}
            />
          </FormField>
          <FormField id="m-sala" label="Sala *" error={bledy.sala}>
            <input
              id="m-sala"
              name="sala"
              type="text"
              placeholder="np. B21"
              aria-required="true"
              onChange={() => clearError("sala")}
              {...errorProps(bledy, "sala")}
            />
          </FormField>
        </div>
        <FormField id="m-powtarzalnosc" label="Powtarzalność" style={{ maxWidth: 240 }}>
          <select id="m-powtarzalnosc" name="powtarzalnosc">
            {Object.entries(POWTARZALNOSC_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </Fragment>

      <Collapse show={konflikty.length > 0}>
        <div className="conflict-banner" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Zajęcia kolidują z planem</strong>
            <ul>
              {konflikty.map((k) => (
                <li key={k.z.id}>{k.opis}</li>
              ))}
            </ul>
          </div>
        </div>
      </Collapse>
      <div role="status" style={{ display: "contents" }}>
        <Collapse show={dodano}>
          <div className="success-banner">
            <Icon name="check" />
            Dodano zajęcia (dane lokalne)
          </div>
        </Collapse>
      </div>

      <div className="form-actions">
        <Button type="submit">Dodaj zajęcia do planu</Button>
        <Button variant="secondary" onClick={wyczysc}>
          Wyczyść formularz
        </Button>
      </div>
    </form>
  );
}
