import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { AppLink } from "@/components/ui/AppLink";
import { SelectField, type Option } from "@/components/ui/SelectField";
import { getAktywnyPlan, type AktywnyPlan } from "@/lib/data/plan";
import {
  DNI_PLANU,
  doEventow,
  dzienLabel,
  filtruj,
  LICZBA_TYGODNI,
  odczytajFiltry,
  podpisDnia,
  wTygodniu,
  zapytanie,
  type PlanFiltry,
  type PlanWiersz,
} from "@/lib/plan";
import { single, type SearchParams } from "@/lib/search-params";
import { PlanTable } from "./PlanTable";

const WSZYSTKIE: Option = { value: "", label: "Wszystkie" };

const dataGodzina = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Warsaw" });

const widokiOpcje: Option[] = [
  { value: "tabela", label: "Tabela" },
  { value: "tydzien", label: "Kalendarz tygodniowy" },
];

/** Filters, export links and the plan itself (table or weekly calendar) from `?widok=&grupa=&prowadzacy=&sala=…`. */
export async function PlanView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const plan = await getAktywnyPlan();

  if (!plan) {
    return (
      <div className="empty-state">
        Nie wygenerowano jeszcze żadnego planu. <AppLink href="/generator">Przejdź do generatora</AppLink>, żeby go
        utworzyć.
      </div>
    );
  }

  const { wiersze, etykiety, zadanie } = plan;
  const widok = single(sp.widok) === "tydzien" ? "tydzien" : "tabela";
  const filtry = znaneFiltry(odczytajFiltry(sp), plan);

  const rocznikOpcje = [...new Set(wiersze.map((w) => w.rocznikId))].sort().map((r) => ({ value: r, label: r }));
  const grupyOpcje = Object.entries(etykiety.grupy)
    .sort(([, a], [, b]) => a.localeCompare(b, "pl"))
    .map(([value, label]) => ({ value, label }));
  const prowadzacyOpcje = Object.entries(etykiety.prowadzacy)
    .sort(([a], [b]) => a.localeCompare(b, "pl"))
    .map(([value, label]) => ({ value, label }));
  const saleOpcje = plan.sale.map((s) => ({ value: s, label: s }));

  // The week only narrows the calendar; in the table it is not offered, so it never hides rows silently.
  const wybrane = filtruj(wiersze, { ...filtry, tydzien: undefined, dzien: widok === "tabela" ? filtry.dzien : undefined });
  const zFiltrem = wybrane.length !== wiersze.length || Object.values({ ...filtry, tydzien: undefined }).some(Boolean);
  const dlaEksportu = { ...filtry, tydzien: undefined, dzien: widok === "tabela" ? filtry.dzien : undefined };

  return (
    <>
      <form method="get" className="filters-bar" aria-label="Filtry planu">
        <SelectField id="widok" name="widok" label="Widok" defaultValue={widok} options={widokiOpcje} />
        <SelectField id="rocznik" name="rocznik" label="Rocznik" defaultValue={filtry.rocznik ?? ""} options={[WSZYSTKIE, ...rocznikOpcje]} />
        <SelectField id="grupa" name="grupa" label="Grupa" defaultValue={filtry.grupa ?? ""} options={[WSZYSTKIE, ...grupyOpcje]} />
        <SelectField id="prowadzacy" name="prowadzacy" label="Prowadzący" defaultValue={filtry.prowadzacy ?? ""} options={[WSZYSTKIE, ...prowadzacyOpcje]} />
        <SelectField id="sala" name="sala" label="Sala" defaultValue={filtry.sala ?? ""} options={[WSZYSTKIE, ...saleOpcje]} />
        {widok === "tabela" ? (
          <SelectField
            id="dzien"
            name="dzien"
            label="Dzień"
            defaultValue={String(filtry.dzien ?? "")}
            options={[WSZYSTKIE, ...DNI_PLANU.map((d) => ({ value: String(d), label: dzienLabel(d) }))]}
          />
        ) : (
          <SelectField
            id="tydzien"
            name="tydzien"
            label="Tydzień"
            defaultValue={String(filtry.tydzien ?? 1)}
            options={Array.from({ length: LICZBA_TYGODNI }, (_, i) => ({ value: String(i + 1), label: `Tydzień ${i + 1}` }))}
          />
        )}
        <button type="submit" className="btn btn-primary">
          Pokaż
        </button>
        {zFiltrem && (
          <AppLink className="btn btn-secondary" href={`/plan${zapytanie({ widok })}`}>
            Wyczyść filtry
          </AppLink>
        )}
      </form>

      <div className="card summary-card">
        <div>
          <strong>
            {wybrane.length === wiersze.length ? `${wiersze.length} zajęć` : `${wybrane.length} z ${wiersze.length} zajęć`}
          </strong>
          <div className="grupa-students">
            Plan z {zadanie.zakonczono ? dataGodzina.format(new Date(zadanie.zakonczono)) : "—"}
            {zadanie.wynikMiekkich != null ? ` · kara miękkich ${zadanie.wynikMiekkich.toLocaleString("pl-PL")}` : ""}
          </div>
        </div>
        <div className="header-actions" style={{ marginLeft: "auto" }}>
          {/* Plain links: a download must not be handled as a client-side page navigation. */}
          <a className="btn btn-secondary" href={`/plan/eksport${zapytanie(dlaEksportu)}`}>
            Pobierz XLSX
          </a>
          <a className="btn btn-secondary" href={`/plan/eksport${zapytanie({ ...dlaEksportu, format: "json" })}`}>
            Pobierz JSON
          </a>
        </div>
      </div>

      {widok === "tabela" ? (
        <PlanTable wiersze={wybrane} etykiety={etykiety} />
      ) : (
        <Tydzien plan={plan} wybrane={wybrane} filtry={filtry} />
      )}
    </>
  );
}

/** Drops filter values that don't exist in this plan, so a stale link shows the plan instead of an empty page. */
function znaneFiltry(f: PlanFiltry, plan: AktywnyPlan): PlanFiltry {
  return {
    ...f,
    rocznik: plan.wiersze.some((w) => w.rocznikId === f.rocznik) ? f.rocznik : undefined,
    grupa: f.grupa && plan.etykiety.grupy[f.grupa] ? f.grupa : undefined,
    prowadzacy: f.prowadzacy && plan.etykiety.prowadzacy[f.prowadzacy] ? f.prowadzacy : undefined,
    sala: f.sala && plan.sale.includes(f.sala) ? f.sala : undefined,
  };
}

function Tydzien({ plan, wybrane, filtry }: { plan: AktywnyPlan; wybrane: PlanWiersz[]; filtry: PlanFiltry }) {
  if (!filtry.rocznik && !filtry.grupa && !filtry.prowadzacy && !filtry.sala) {
    return (
      <div className="info-banner">
        Wybierz rocznik, grupę, prowadzącego lub salę. Wszystkie {plan.wiersze.length} zajęć naraz nie zmieściłoby się
        czytelnie w kalendarzu; pełną listę pokazuje widok Tabela.
      </div>
    );
  }

  const tydzien = filtry.tydzien ?? 1;
  const wTygodniuPlanu = wTygodniu(wybrane, tydzien);
  const bazowe = { ...filtry, dzien: undefined, widok: "tydzien" };
  const podpisy = Object.fromEntries(DNI_PLANU.map((d) => [d, podpisDnia(plan.kalendarz, d, tydzien)]));

  return (
    <>
      <nav className="week-nav" aria-label="Wybór tygodnia" style={{ marginLeft: 0 }}>
        {tydzien > 1 ? (
          <AppLink className="btn-icon" href={`/plan${zapytanie({ ...bazowe, tydzien: tydzien - 1 })}`} aria-label="Poprzedni tydzień">
            ‹
          </AppLink>
        ) : (
          <span className="btn-icon" aria-hidden="true" style={{ opacity: 0.4 }}>
            ‹
          </span>
        )}
        <span aria-live="polite">
          Tydzień {tydzien} z {LICZBA_TYGODNI}
        </span>
        {tydzien < LICZBA_TYGODNI ? (
          <AppLink className="btn-icon" href={`/plan${zapytanie({ ...bazowe, tydzien: tydzien + 1 })}`} aria-label="Następny tydzień">
            ›
          </AppLink>
        ) : (
          <span className="btn-icon" aria-hidden="true" style={{ opacity: 0.4 }}>
            ›
          </span>
        )}
      </nav>
      {wTygodniuPlanu.length === 0 ? (
        <div className="empty-state">Brak zajęć w tym tygodniu.</div>
      ) : (
        <WeekCalendar events={doEventow(wTygodniuPlanu, plan.etykiety)} days={DNI_PLANU} daySubtitles={podpisy} />
      )}
    </>
  );
}
