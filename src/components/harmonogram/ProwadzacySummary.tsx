import { Avatar } from "@/components/ui/Avatar";
import { pluralPl } from "@/lib/pl";
import { inicjaly, pelneImie } from "@/lib/prowadzacy";
import type { Prowadzacy } from "@/lib/types";

type ProwadzacySummaryProps = {
  prowadzacy: Prowadzacy;
  godziny: number;
  grupy: number;
  spotkania: number;
};

const formatGodziny = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

/** Instructor card above the calendar, with stats for the displayed week. */
export function ProwadzacySummary({ prowadzacy: p, godziny, grupy, spotkania }: ProwadzacySummaryProps) {
  return (
    <section className="card summary-card" aria-label={`Podsumowanie tygodnia: ${pelneImie(p)}`}>
      <Avatar initials={inicjaly(p)} />
      <div>
        <div className="instructor-name">{pelneImie(p)}</div>
        {p.jednostka && <div className="instructor-role">{p.jednostka}</div>}
      </div>
      <dl className="summary-stats">
        <Stat value={`${formatGodziny.format(godziny)} godz.`} label="w tym tygodniu" />
        <Stat value={spotkania} label={pluralPl(spotkania, "spotkanie", "spotkania", "spotkań")} />
        <Stat value={grupy} label={pluralPl(grupy, "grupa", "grupy", "grup")} />
      </dl>
    </section>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    // Label first for valid <dl> order; CSS (column-reverse) shows the value above it.
    <div className="summary-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
