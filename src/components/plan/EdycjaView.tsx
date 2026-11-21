import { AppLink } from "@/components/ui/AppLink";
import { getKontekstPlanu } from "@/lib/data/plan-edycja";
import { single, type SearchParams } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";
import { odczytajFiltr, opcjeFiltra } from "@/lib/tablica-planu";
import { EdycjaPlanu } from "./tablica/EdycjaPlanu";

export type Powrot = { href: string; etykieta: string };

/**
 * `?powrot=` is the plan's own query string (its filters), or `generator` when the class was opened from the list
 * of problems after generation (spec 15); anything else is dropped.
 */
export function adresPowrotu(powrot: string | undefined): Powrot {
  if (powrot === "generator") return { href: "/generator", etykieta: "Wróć do generatora" };
  return { href: powrot && /^\?[\w%=&.+-]*$/.test(powrot) ? `/plan${powrot}` : "/plan", etykieta: "Wróć do planu" };
}

/**
 * The whole active plan on the editing board (spec 16), filtered by `?grupa=` / `?prowadzacy=` / `?sala=` and
 * `?tydzien=`, with the class from `?zajecia=` selected and its form (spec 14) below.
 */
export async function EdycjaView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const zajeciaId = single(sp.zajecia);
  const powrot = adresPowrotu(single(sp.powrot));

  const wynik = await getKontekstPlanu(await createClient());
  if (wynik.status === "brak-planu") {
    return (
      <div className="empty-state">
        Nie wygenerowano jeszcze żadnego planu. <AppLink href="/generator">Przejdź do generatora</AppLink>, żeby go
        utworzyć.
      </div>
    );
  }

  const { kontekst, ocena } = wynik;
  const brakZajec = zajeciaId !== undefined && !kontekst.zajecia[zajeciaId];
  const opcje = opcjeFiltra(kontekst, ocena.nadrzedne);
  const filtr = odczytajFiltr(
    { grupa: single(sp.grupa), prowadzacy: single(sp.prowadzacy), sala: single(sp.sala), tydzien: single(sp.tydzien) },
    opcje,
    kontekst,
    brakZajec ? undefined : zajeciaId,
  );

  return (
    <>
      {brakZajec && (
        <div className="conflict-banner">
          Zajęć {zajeciaId} nie ma w aktualnym planie. <AppLink href={powrot.href}>{powrot.etykieta}</AppLink>.
        </div>
      )}
      {filtr ? (
        <EdycjaPlanu
          // A new filter starts the board afresh; a save keeps it, with its message and selection.
          key={`${filtr.rodzaj}|${filtr.id}|${filtr.tydzien ?? ""}`}
          kontekst={kontekst}
          ocena={ocena}
          filtr={filtr}
          opcje={opcje}
          zaznaczone={brakZajec ? undefined : zajeciaId}
          powrot={powrot}
        />
      ) : (
        <div className="empty-state">Plan nie ma żadnych zajęć.</div>
      )}
    </>
  );
}
