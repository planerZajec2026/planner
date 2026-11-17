import { AppLink } from "@/components/ui/AppLink";
import { Tag } from "@/components/ui/Tag";
import { getProblemyPlanu } from "@/lib/data/plan-problemy";
import { WAGA_LABEL } from "@/lib/generator";
import { countPl } from "@/lib/pl";
import type { Problem, ProblemyPlanu as Problemy } from "@/lib/plan-problemy";

const NA_START = 8;
const W_ROZWINIECIU = 32;

const liczba = (n: number) => n.toLocaleString("pl-PL");

/** The places of the active plan that add the most soft-constraint penalty, linked to the editor (spec 15). */
export async function ProblemyPlanu({ jobId, wagi, wynikPoGenerowaniu }: { jobId: string; wagi: Record<string, number>; wynikPoGenerowaniu: number | null }) {
  const problemy = await getProblemyPlanu(jobId, wagi);
  return <ListaProblemow problemy={problemy} wynikPoGenerowaniu={wynikPoGenerowaniu} />;
}

export function ListaProblemow({ problemy: { wynik, problemy }, wynikPoGenerowaniu }: { problemy: Problemy; wynikPoGenerowaniu: number | null }) {
  const pierwsze = problemy.slice(0, NA_START);
  const kolejne = problemy.slice(NA_START, NA_START + W_ROZWINIECIU);
  const reszta = problemy.length - pierwsze.length - kolejne.length;

  return (
    <section className="problemy" aria-labelledby="problemy-naglowek">
      <h3 className="problemy-tytul" id="problemy-naglowek">
        Do poprawy
      </h3>
      {problemy.length === 0 ? (
        <p className="postep-opis">Plan nie ma kar za ograniczenia miękkie. Nie ma czego poprawiać.</p>
      ) : (
        <>
          <p className="postep-opis">
            Plan spełnia wszystkie ograniczenia twarde. Karę miękkich (teraz {liczba(wynik)}
            {wynikPoGenerowaniu != null && wynikPoGenerowaniu !== wynik ? `, po wygenerowaniu ${liczba(wynikPoGenerowaniu)}` : ""}) podnoszą
            najbardziej te miejsca. Otwórz zajęcia, żeby przenieść je na inny termin albo do innej sali.
          </p>
          <ol className="problemy-lista">
            {pierwsze.map((p, i) => (
              <PozycjaProblemu key={i} problem={p} />
            ))}
          </ol>
          {kolejne.length > 0 && (
            <details className="problemy-wiecej">
              <summary>Pokaż {countPl(kolejne.length, "kolejne miejsce", "kolejne miejsca", "kolejnych miejsc")}</summary>
              <ol className="problemy-lista" start={NA_START + 1}>
                {kolejne.map((p, i) => (
                  <PozycjaProblemu key={i} problem={p} />
                ))}
              </ol>
            </details>
          )}
          {reszta > 0 && (
            <p className="grupa-students">
              Pominięto {countPl(reszta, "drobniejsze miejsce", "drobniejsze miejsca", "drobniejszych miejsc")}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function PozycjaProblemu({ problem: p }: { problem: Problem }) {
  return (
    <li className="problem">
      <div className="problem-naglowek">
        <Tag>{WAGA_LABEL[p.rodzaj] ?? p.rodzaj}</Tag>
        <strong>{p.kto}</strong>
        <span className="problem-kara">kara {liczba(p.kara)}</span>
      </div>
      <p className="problem-opis">{p.opis}</p>
      <ul className="problem-zajecia">
        {p.zajecia.map((z) => (
          <li key={z.id}>
            <AppLink href={`/plan/edycja?zajecia=${encodeURIComponent(z.id)}&powrot=generator`}>{z.opis}</AppLink>
          </li>
        ))}
      </ul>
    </li>
  );
}
