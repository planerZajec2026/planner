import { AppLink } from "@/components/ui/AppLink";
import { Tag } from "@/components/ui/Tag";
import { getProblemyPlanu } from "@/lib/data/plan-problemy";
import { WAGA_LABEL } from "@/lib/generator";
import { countPl } from "@/lib/pl";
import { RODZAJE, type Problem, type ProblemyPlanu as Problemy } from "@/lib/plan-problemy";
import { Stat } from "./Stat";

const NA_START = 8;
const W_ROZWINIECIU = 32;

const liczba = (n: number) => n.toLocaleString("pl-PL");
const zeZnakiem = (n: number) => (n > 0 ? `+${liczba(n)}` : n < 0 ? `−${liczba(-n)}` : "0");

/**
 * The active plan's soft-constraint penalty as it is now, manual edits included, and the places that add the most
 * to it, linked to the editor (spec 15).
 */
export async function ProblemyPlanu({ jobId, wagi, wynikPoGenerowaniu }: { jobId: string; wagi: Record<string, number>; wynikPoGenerowaniu: number | null }) {
  const problemy = await getProblemyPlanu(jobId, wagi);
  return <ListaProblemow problemy={problemy} wynikPoGenerowaniu={wynikPoGenerowaniu} />;
}

export function ListaProblemow({ problemy: { wynik, miekkie, problemy }, wynikPoGenerowaniu }: { problemy: Problemy; wynikPoGenerowaniu: number | null }) {
  const pierwsze = problemy.slice(0, NA_START);
  const kolejne = problemy.slice(NA_START, NA_START + W_ROZWINIECIU);
  const reszta = problemy.length - pierwsze.length - kolejne.length;

  const zmiana = wynikPoGenerowaniu != null ? wynik - wynikPoGenerowaniu : 0;

  return (
    <>
      <div className="summary-stats" style={{ marginLeft: 0 }}>
        <Stat wartosc={liczba(wynik)} etykieta="kara teraz (z ręcznymi zmianami)" />
        {zmiana !== 0 && <Stat wartosc={zeZnakiem(zmiana)} etykieta="zmiana od wygenerowania" />}
      </div>
      <div className="tag-row">
        {RODZAJE.map((r) => (
          <Tag key={r}>
            {WAGA_LABEL[r] ?? r}: {liczba(miekkie[r])}
          </Tag>
        ))}
      </div>
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
              najbardziej te miejsca. Otwórz zajęcia, żeby przenieść je na inny termin albo do innej sali; strona edycji
              pokaże, o ile zmiana obniży karę.
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
    </>
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
