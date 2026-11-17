import { AppLink } from "@/components/ui/AppLink";
import { getKontekstEdycji } from "@/lib/data/plan-edycja";
import { FORMA_LABEL, opisTygodni } from "@/lib/plan";
import { opisTerminu } from "@/lib/plan-edycja";
import { single, type SearchParams } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";
import { EdycjaForm } from "./EdycjaForm";

export type Powrot = { href: string; etykieta: string };

/**
 * `?powrot=` is the plan's own query string (its filters), or `generator` when the class was opened from the list
 * of problems after generation (spec 15); anything else is dropped.
 */
export function adresPowrotu(powrot: string | undefined): Powrot {
  if (powrot === "generator") return { href: "/generator", etykieta: "Wróć do generatora" };
  return { href: powrot && /^\?[\w%=&.+-]*$/.test(powrot) ? `/plan${powrot}` : "/plan", etykieta: "Wróć do planu" };
}

/** One class of the active plan with the form that moves it (spec 14), from `?zajecia=<id>`. */
export async function EdycjaView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const zajeciaId = single(sp.zajecia) ?? "";
  const powrot = adresPowrotu(single(sp.powrot));
  const wrocDoPlanu = <AppLink href={powrot.href}>{powrot.etykieta}</AppLink>;

  const wynik = zajeciaId ? await getKontekstEdycji(await createClient(), zajeciaId) : ({ status: "brak-zajec" } as const);
  if (wynik.status === "brak-planu") {
    return (
      <div className="empty-state">
        Nie wygenerowano jeszcze żadnego planu. <AppLink href="/generator">Przejdź do generatora</AppLink>, żeby go
        utworzyć.
      </div>
    );
  }
  if (wynik.status === "brak-zajec") {
    return (
      <div className="empty-state">
        {zajeciaId ? `Zajęć ${zajeciaId} nie ma w aktualnym planie.` : "Nie wybrano zajęć do edycji."} {wrocDoPlanu}.
      </div>
    );
  }

  const { kontekst } = wynik;
  const z = kontekst.zajecia[zajeciaId];
  const obecny = kontekst.plan.find((p) => p.zajeciaId === zajeciaId)!;

  return (
    <>
      <div className="card">
        <div className="section-title card-head">Edycja zajęć {z.id}</div>
        <dl className="edycja-meta">
          <div>
            <dt>Przedmiot</dt>
            <dd>{z.przedmiot}</dd>
          </div>
          <div>
            <dt>Forma</dt>
            <dd>{FORMA_LABEL[z.forma] ?? z.forma}</dd>
          </div>
          <div>
            <dt>Grupy</dt>
            <dd>{z.grupy.map((g) => kontekst.etykiety.grupy[g] ?? g).join(", ")}</dd>
          </div>
          <div>
            <dt>Prowadzący</dt>
            <dd>{z.prowadzacy.map((p) => kontekst.etykiety.prowadzacy[p] ?? p).join(", ")}</dd>
          </div>
          <div>
            <dt>Długość</dt>
            <dd>
              {z.sloty} × 45 min, {z.miejsca} osób
            </dd>
          </div>
          <div>
            <dt>Obecny termin</dt>
            <dd>
              {opisTerminu(obecny, z.sloty)}, sala {obecny.sala}, {opisTygodni({ tygodnie: obecny.tygodnie, czestotliwosc: z.czestotliwosc })}
            </dd>
          </div>
        </dl>
      </div>

      {/* The key resets the selection when another class is opened; a saved edit keeps it and gets fresh data. */}
      <EdycjaForm key={zajeciaId} kontekst={kontekst} zajeciaId={zajeciaId} powrot={powrot.href} powrotEtykieta={powrot.etykieta} />
    </>
  );
}
