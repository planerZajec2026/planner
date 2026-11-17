import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import type { StatusZadania, Zadanie } from "@/lib/data/plan";
import { WAGA_LABEL } from "@/lib/generator";
import { AutoOdswiezanie } from "./AutoOdswiezanie";
import { PostepZadania } from "./PostepZadania";
import { ProblemyPlanu } from "./ProblemyPlanu";
import { Stat } from "./Stat";

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

/** The worker writes its progress every 2 s; a waiting job only needs to be noticed when it starts. */
export function okresOdswiezania(zadania: Pick<Zadanie, "status">[]): number {
  return zadania.some((z) => z.status === "running") ? 3000 : 5000;
}

/** The plan the other views show: the most recently finished job (as `getAktywnyPlan`). */
export function aktywnyPlan<T extends Pick<Zadanie, "status" | "zakonczono">>(zadania: T[]): T | undefined {
  return zadania
    .filter((z) => z.status === "done")
    .reduce<T | undefined>((a, z) => (!a || (z.zakonczono ?? "") > (a.zakonczono ?? "") ? z : a), undefined);
}

/** The time of this request: the "last signal" note compares the worker's timestamp with it. */
async function czasZapytania(): Promise<number> {
  await connection();
  return Date.now();
}

/** The latest generation jobs with their status, the progress of a running one and, once done, the validator's report. */
export async function ListaZadan({ zadania }: { zadania: Zadanie[] }) {
  const teraz = await czasZapytania();
  const najnowszeGotowe = aktywnyPlan(zadania);

  return (
    <section aria-labelledby="zadania-naglowek" className="form-panel">
      <AutoOdswiezanie aktywne={czyAktywne(zadania)} co={okresOdswiezania(zadania)} />
      <div className="section-title" id="zadania-naglowek">
        Ostatnie zadania
      </div>
      {zadania.length === 0 ? (
        <div className="empty-state">Nie zlecono jeszcze generowania. Uruchom je formularzem powyżej.</div>
      ) : (
        <ul className="kierunki-list" style={{ gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
          {zadania.map((z) => (
            <li key={z.id}>
              <ZadanieKarta zadanie={z} najnowszeGotowe={z.id === najnowszeGotowe?.id} teraz={teraz} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ZadanieKarta({ zadanie: z, najnowszeGotowe, teraz }: { zadanie: Zadanie; najnowszeGotowe: boolean; teraz: number }) {
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

      <PostepZadania zadanie={z} teraz={teraz} />

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
          {najnowszeGotowe && (
            // Its own boundary: the job list shows up at once, the evaluation of the plan follows.
            <Suspense fallback={<p className="postep-opis">Szukanie miejsc do poprawy…</p>}>
              <ProblemyPlanu jobId={z.id} wagi={z.wagi} wynikPoGenerowaniu={z.wynikMiekkich} />
            </Suspense>
          )}
        </>
      )}
    </article>
  );
}
