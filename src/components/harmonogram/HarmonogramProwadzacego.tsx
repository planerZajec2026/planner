import { ViewTransition } from "react";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { BrakDanych, BrakPlanu } from "@/components/layout/BrakDanych";
import { getAktywnyPlan } from "@/lib/data/plan";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { toISODate } from "@/lib/dates";
import { spotkaniaDoEventow, spotkaniaWTygodniu } from "@/lib/plan";
import { sumaGodzin } from "@/lib/schedule";
import { resolveTydzien, single, type SearchParams } from "@/lib/search-params";
import { PendingProvider, PendingRegion } from "./PendingNavigation";
import { ProwadzacyFilters } from "./ProwadzacyFilters";
import { ProwadzacySummary } from "./ProwadzacySummary";
import { Reveal, SUMMARY_TRANSITION, WEEK_TRANSITION } from "./Reveal";

/** Filters, weekly summary and calendar for the instructor chosen in `?prowadzacy=&tydzien=`, from the generated plan. */
export async function HarmonogramProwadzacego({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [lista, plan] = await Promise.all([getProwadzacy(), getAktywnyPlan()]);
  if (lista.length === 0) return <BrakDanych />;

  const requestedId = single(sp.prowadzacy);
  const prowadzacy = lista.find((p) => p.id === requestedId) ?? lista[0];
  const weekStart = await resolveTydzien(sp.tydzien);

  const spotkania = plan
    ? spotkaniaWTygodniu(
        plan.wiersze.filter((w) => w.prowadzacy.includes(prowadzacy.id)),
        plan.kalendarz,
        weekStart,
      )
    : [];
  const events = plan
    ? spotkaniaDoEventow(spotkania, plan.etykiety, (w) =>
        [w.sala, w.grupy.map((g) => plan.etykiety.grupy[g] ?? g).join(", ")].join(" · "),
      )
    : [];
  const grupyTygodnia = new Set(spotkania.flatMap((s) => s.wiersz.grupy));

  return (
    <Reveal>
      <PendingProvider>
        <ProwadzacyFilters prowadzacy={lista} prowadzacyId={prowadzacy.id} weekStart={toISODate(weekStart)} />
        {/* An instructor switch crossfades the card; a week change only updates its numbers. */}
        <ViewTransition key={prowadzacy.id} name="prowadzacy-podsumowanie" share={SUMMARY_TRANSITION} default="none">
          <div>
            <ProwadzacySummary
              prowadzacy={prowadzacy}
              godziny={sumaGodzin(events)}
              grupy={grupyTygodnia.size}
              spotkania={events.length}
            />
          </div>
        </ViewTransition>
        {/* Keyed by instructor and week: a week change slides, an instructor change crossfades. */}
        <ViewTransition
          key={`${prowadzacy.id}|${toISODate(weekStart)}`}
          name="harmonogram-prowadzacego"
          share={WEEK_TRANSITION}
          default="none"
        >
          <PendingRegion>
            {!plan ? (
              <BrakPlanu />
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
