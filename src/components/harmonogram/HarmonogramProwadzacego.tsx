import { WeekCalendar, type CalendarEvent } from "@/components/calendar/WeekCalendar";
import { getGrupy } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { getZajeciaProwadzacego } from "@/lib/data/zajecia";
import { toISODate } from "@/lib/dates";
import { sumaGodzin, zajeciaWTygodniu } from "@/lib/schedule";
import { resolveTydzien, single, type SearchParams } from "@/lib/search-params";
import { ProwadzacyFilters } from "./ProwadzacyFilters";
import { ProwadzacySummary } from "./ProwadzacySummary";

/** Filters, weekly summary and calendar for the instructor chosen in `?prowadzacy=&tydzien=`. */
export async function HarmonogramProwadzacego({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [lista, grupy] = await Promise.all([getProwadzacy(), getGrupy()]);
  const requestedId = single(sp.prowadzacy);
  const prowadzacy = lista.find((p) => p.id === requestedId) ?? lista[0];
  const weekStart = await resolveTydzien(sp.tydzien);

  // TODO(backend): query this instructor's classes for the week, joined with `grupy` (kod, tryb),
  //   applying date-based exceptions (cancellations, holidays).
  const zajecia = prowadzacy
    ? zajeciaWTygodniu(await getZajeciaProwadzacego(prowadzacy.id), weekStart)
    : [];

  const grupyById = new Map(grupy.map((g) => [g.id, g]));
  const grupyTygodnia = new Set(zajecia.map((z) => z.grupaId));
  const trybyTygodnia = new Set(zajecia.map((z) => grupyById.get(z.grupaId)?.tryb).filter(Boolean));

  const events: CalendarEvent[] = zajecia.map((z) => {
    const g = grupyById.get(z.grupaId);
    return {
      id: z.id,
      dzien: z.dzien,
      od: z.od,
      do: z.do,
      typ: z.typ,
      tytul: z.przedmiot,
      meta: g ? `${z.sala} · Grupa ${g.kod} · ${g.tryb}` : z.sala,
    };
  });

  return (
    <>
      <ProwadzacyFilters prowadzacy={lista} prowadzacyId={prowadzacy?.id} weekStart={toISODate(weekStart)} />
      {!prowadzacy ? (
        <div className="empty-state">Brak prowadzących.</div>
      ) : (
        <>
          <ProwadzacySummary
            prowadzacy={prowadzacy}
            godziny={sumaGodzin(zajecia)}
            grupy={grupyTygodnia.size}
            tryby={trybyTygodnia.size}
          />
          {events.length === 0 ? (
            <div className="empty-state">Brak zajęć w tym tygodniu.</div>
          ) : (
            <WeekCalendar events={events} weekStart={weekStart} />
          )}
        </>
      )}
    </>
  );
}
