import type { Zadanie } from "@/lib/data/plan";
import { countPl } from "@/lib/pl";
import { opisEtapu, procent, PROG_CISZY_S, sekundOdSygnalu } from "@/lib/postep";
import { Stat } from "./Stat";

const liczba = (n: number) => n.toLocaleString("pl-PL");

/**
 * How far a queued or running job is (spec 15), from what the worker last wrote. Nothing here is estimated on the
 * client: the bar moves when the page refreshes and the worker has reported a later moment of its run.
 */
export function PostepZadania({ zadanie: z, teraz }: { zadanie: Zadanie; teraz: number }) {
  if (z.status === "queued") {
    return (
      <p className="postep-opis">
        Zadanie czeka, aż worker je pobierze. Worker na serwerze startuje zwykle w ciągu minuty od zlecenia, a sama
        instalacja solvera zajmuje kolejną minutę.
      </p>
    );
  }
  if (z.status !== "running") return null;

  const p = z.postep;
  if (!p) {
    return <p className="postep-opis">Worker pobrał zadanie i zaczyna pracę. Pierwszy raport postępu pojawi się za kilka sekund.</p>;
  }

  const pct = procent(p);
  const { tytul, opis } = opisEtapu(p);
  const cisza = sekundOdSygnalu(p, teraz);
  const czas = `${liczba(Math.floor(Math.min(p.uplyneloS, p.limitS)))} z ${liczba(p.limitS)} s`;

  return (
    <div className="postep">
      <div className="postep-naglowek">
        <strong>{tytul}</strong>
        <span>{p.etap === "wczytywanie" ? `limit ${liczba(p.limitS)} s` : `czas solvera: ${czas}`}</span>
      </div>
      <div
        className="postep-pasek"
        role="progressbar"
        aria-label="Postęp generowania"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}% limitu czasu. ${tytul}`}
      >
        <div className="postep-wypelnienie" style={{ width: `${pct}%` }} />
      </div>
      <p className="postep-opis">{opis}</p>
      {p.etap === "optymalizacja" && p.kara != null && (
        <div className="summary-stats" style={{ marginLeft: 0 }}>
          <Stat
            wartosc={liczba(p.kara)}
            etykieta={p.karaStartowa != null && p.karaStartowa !== p.kara ? `kara wg solvera (start ${liczba(p.karaStartowa)})` : "kara wg solvera"}
          />
          {p.dolnaGranica != null && <Stat wartosc={liczba(p.dolnaGranica)} etykieta="dolna granica kary" />}
        </div>
      )}
      {cisza != null && cisza > PROG_CISZY_S && (
        <div className="conflict-banner">
          Ostatni sygnał od workera {countPl(cisza, "sekundę", "sekundy", "sekund")} temu. Jeśli to się nie zmienia, worker mógł
          przestać działać.
        </div>
      )}
    </div>
  );
}
