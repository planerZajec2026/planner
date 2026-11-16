import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { getZadania, type StatusZadania, type Zadanie } from "@/lib/data/plan";
import { WAGA_LABEL } from "@/lib/generator";
import { AutoOdswiezanie } from "./AutoOdswiezanie";

export const STATUS_LABEL: Record<StatusZadania, string> = {
  queued: "W kolejce",
  running: "Liczy się",
  done: "Gotowe",
  failed: "Błąd",
};

const dataGodzina = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

export function czyAktywne(zadania: Pick<Zadanie, "status">[]): boolean {
  return zadania.some((z) => z.status === "queued" || z.status === "running");
}

/** The latest generation jobs with their status and, once done, the validator's report. */
export async function ListaZadan() {
  const zadania = await getZadania(8);
  const najnowszeGotowe = zadania.find((z) => z.status === "done");

  return (
    <section aria-labelledby="zadania-naglowek" className="form-panel">
      <AutoOdswiezanie aktywne={czyAktywne(zadania)} />
      <div className="section-title" id="zadania-naglowek">
        Ostatnie zadania
      </div>
      {zadania.length === 0 ? (
        <div className="empty-state">Nie zlecono jeszcze generowania. Uruchom je formularzem powyżej.</div>
      ) : (
        <ul className="kierunki-list" style={{ gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
          {zadania.map((z) => (
            <li key={z.id}>
              <ZadanieKarta zadanie={z} najnowszeGotowe={z.id === najnowszeGotowe?.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ZadanieKarta({ zadanie: z, najnowszeGotowe }: { zadanie: Zadanie; najnowszeGotowe: boolean }) {
  const naruszenia = z.raport?.naruszenia ? Object.values(z.raport.naruszenia).reduce((a, b) => a + b, 0) : 0;
  return (
    <article className="card summary-card" data-status={z.status} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <Tag>{STATUS_LABEL[z.status]}</Tag>
        <span className="grupa-students">
          Zlecone {dataGodzina.format(new Date(z.utworzono))}
          {z.limitCzasu ? ` · limit ${z.limitCzasu} s` : ""}
        </span>
        {najnowszeGotowe && (
          <ButtonLink href="/plan" style={{ marginLeft: "auto" }}>
            Zobacz plan
          </ButtonLink>
        )}
      </div>

      {z.status === "failed" && <div className="conflict-banner">{z.blad ?? "Nieznany błąd."}</div>}

      {z.status === "done" && z.raport && (
        <>
          <div className="summary-stats" style={{ marginLeft: 0 }}>
            <Stat wartosc={String(naruszenia)} etykieta="naruszeń twardych" />
            <Stat wartosc={z.wynikMiekkich?.toLocaleString("pl-PL") ?? "–"} etykieta="kara miękkich (mniej = lepiej)" />
            {z.raport.dolna_granica != null && (
              <Stat wartosc={z.raport.dolna_granica.toLocaleString("pl-PL")} etykieta="dolna granica kary" />
            )}
            {z.raport.czas_s != null && <Stat wartosc={`${Math.round(z.raport.czas_s)} s`} etykieta="czas liczenia" />}
          </div>
          {z.raport.miekkie && (
            <div className="tag-row">
              {Object.entries(z.raport.miekkie).map(([klucz, wartosc]) => (
                <Tag key={klucz}>
                  {WAGA_LABEL[klucz] ?? klucz}: {wartosc.toLocaleString("pl-PL")}
                </Tag>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}

function Stat({ wartosc, etykieta }: { wartosc: string; etykieta: string }) {
  return (
    <div className="summary-stat">
      <span>{etykieta}</span>
      <strong style={{ fontSize: 20, color: "var(--ink)" }}>{wartosc}</strong>
    </div>
  );
}
