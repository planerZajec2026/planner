import { ViewTransition } from "react";
import { WeekCalendar, type CalendarEvent } from "@/components/calendar/WeekCalendar";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { getZajeciaGrupy } from "@/lib/data/zajecia";
import { toISODate } from "@/lib/dates";
import { resolveGrupaSelection } from "@/lib/grupa-selection";
import { pelneImie } from "@/lib/prowadzacy";
import { zajeciaWTygodniu } from "@/lib/schedule";
import { resolveTydzien, single, type SearchParams } from "@/lib/search-params";
import { GrupaFilters } from "./GrupaFilters";
import { PendingProvider, PendingRegion } from "./PendingNavigation";
import { Reveal, WEEK_TRANSITION } from "./Reveal";

/** Filters + weekly calendar for the group chosen in `?tryb=&kierunek=&grupa=&tydzien=`. */
export async function HarmonogramGrupy({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [kierunki, grupy, prowadzacy] = await Promise.all([getKierunki(), getGrupy(), getProwadzacy()]);
  const selection = resolveGrupaSelection(kierunki, grupy, {
    tryb: single(sp.tryb),
    kierunek: single(sp.kierunek),
    grupa: single(sp.grupa),
  });

  const weekStart = await resolveTydzien(sp.tydzien);

  // TODO(backend): fetch only this week's classes, applying date-based exceptions (cancellations, holidays).
  const zajecia = selection.grupa
    ? zajeciaWTygodniu(await getZajeciaGrupy(selection.grupa.id), weekStart)
    : [];

  const events: CalendarEvent[] = zajecia.map((z) => {
    const p = prowadzacy.find((x) => x.id === z.prowadzacyId);
    return {
      id: z.id,
      dzien: z.dzien,
      od: z.od,
      do: z.do,
      typ: z.typ,
      tytul: z.przedmiot,
      meta: p ? `${z.sala} · ${pelneImie(p)}` : z.sala,
    };
  });

  return (
    <Reveal>
      <PendingProvider>
        <GrupaFilters
          kierunki={kierunki}
          grupy={grupy}
          tryb={selection.tryb}
          kierunekId={selection.kierunekId}
          grupaId={selection.grupa?.id}
          weekStart={toISODate(weekStart)}
        />
        {/* Keyed by group and week: a week change slides, a group change crossfades (spec 07). */}
        <ViewTransition
          key={`${selection.grupa?.id}|${toISODate(weekStart)}`}
          name="harmonogram-grupy"
          share={WEEK_TRANSITION}
          default="none"
        >
          <PendingRegion>
            {!selection.grupa ? (
              <div className="empty-state">Brak grup dla wybranego trybu i kierunku.</div>
            ) : events.length === 0 ? (
              <div className="empty-state">Brak zajęć w tym tygodniu.</div>
            ) : (
              <WeekCalendar events={events} weekStart={weekStart} />
            )}
          </PendingRegion>
        </ViewTransition>
      </PendingProvider>
    </Reveal>
  );
}
