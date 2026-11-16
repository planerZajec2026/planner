import { ViewTransition } from "react";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { BrakDanych, BrakPlanu } from "@/components/layout/BrakDanych";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { getAktywnyPlan } from "@/lib/data/plan";
import { toISODate } from "@/lib/dates";
import { resolveGrupaSelection } from "@/lib/grupa-selection";
import { lancuchGrup, spotkaniaDoEventow, spotkaniaWTygodniu } from "@/lib/plan";
import { resolveTydzien, single, type SearchParams } from "@/lib/search-params";
import { GrupaFilters } from "./GrupaFilters";
import { PendingProvider, PendingRegion } from "./PendingNavigation";
import { Reveal, WEEK_TRANSITION } from "./Reveal";

/**
 * Filters + weekly calendar for the group chosen in `?kierunek=&grupa=&tydzien=`, from the generated plan.
 * A group attends its own classes and those of the groups it belongs to (a lecture for the whole year).
 */
export async function HarmonogramGrupy({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [kierunki, grupy, prowadzacy, plan] = await Promise.all([
    getKierunki(),
    getGrupy(),
    getProwadzacy(),
    getAktywnyPlan(),
  ]);
  if (grupy.length === 0) return <BrakDanych />;

  const selection = resolveGrupaSelection(kierunki, grupy, { kierunek: single(sp.kierunek), grupa: single(sp.grupa) });
  const weekStart = await resolveTydzien(sp.tydzien);

  const grupaId = selection.grupa?.id;
  const events = (() => {
    if (!plan || !grupaId) return [];
    const nalezace = new Set(lancuchGrup(grupy, grupaId));
    const wiersze = plan.wiersze.filter((w) => w.grupy.some((g) => nalezace.has(g)));
    const nazwy = new Map(prowadzacy.map((p) => [p.id, p.nazwa]));
    return spotkaniaDoEventow(spotkaniaWTygodniu(wiersze, plan.kalendarz, weekStart), plan.etykiety, (w) =>
      [w.sala, w.prowadzacy.map((p) => nazwy.get(p) ?? p).join(", ")].join(" · "),
    );
  })();

  return (
    <Reveal>
      <PendingProvider>
        <GrupaFilters
          kierunki={kierunki}
          grupy={grupy}
          kierunekId={selection.kierunekId}
          grupaId={grupaId}
          weekStart={toISODate(weekStart)}
        />
        {/* Keyed by group and week: a week change slides, a group change crossfades (spec 07). */}
        <ViewTransition
          key={`${grupaId}|${toISODate(weekStart)}`}
          name="harmonogram-grupy"
          share={WEEK_TRANSITION}
          default="none"
        >
          <PendingRegion>
            {!plan ? (
              <BrakPlanu />
            ) : !selection.grupa ? (
              <div className="empty-state">Brak grup dla wybranego kierunku.</div>
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
