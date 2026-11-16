import type { CSSProperties } from "react";
import {
  addDays,
  DNI_KROTKIE,
  DNI_PELNE,
  hourLabel,
  isWeekend,
  shortDate,
  timeToMinutes,
} from "@/lib/dates";
import type { DzienTygodnia, TypZajec } from "@/lib/types";
import { ClassBlock } from "./ClassBlock";
import { layoutDay } from "./layout";

export type CalendarEvent = {
  id: string;
  dzien: DzienTygodnia;
  /** "HH:MM" */
  od: string;
  /** "HH:MM" */
  do: string;
  typ: TypZajec;
  tytul: string;
  meta: string;
};

type WeekCalendarProps = {
  events: CalendarEvent[];
  /** Monday of the displayed week. Not needed when `daySubtitles` gives every column's date. */
  weekStart?: Date;
  /** Days to show as columns; default Monday–Sunday. The generated timetable (spec 13) has no weekend. */
  days?: DzienTygodnia[];
  /** Text under each day name, e.g. the date of that plan day's occurrence; default is the date within `weekStart`. */
  daySubtitles?: Partial<Record<DzienTygodnia, string>>;
  /** First hour shown; extended automatically if an event starts earlier. */
  hourFrom?: number;
  /** Hour the grid ends at; extended automatically if an event ends later. */
  hourTo?: number;
};

const ALL_DAYS: DzienTygodnia[] = [1, 2, 3, 4, 5, 6, 7];
const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
/** 56px per hour, as in the design (the day-track gridlines repeat every 56px). */
const SLOT_HEIGHT = 56 / SLOTS_PER_HOUR;
/** Grid row 1 is the day header. */
const FIRST_SLOT_ROW = 2;

/** Monday–Sunday timetable grid: a time column plus 7 day columns, 15-minute rows. */
export function WeekCalendar({
  events,
  weekStart,
  days: DAYS = ALL_DAYS,
  daySubtitles,
  hourFrom = 8,
  hourTo = 20,
}: WeekCalendarProps) {
  /** Grid column of a day: column 1 is the time column. */
  const column = (dzien: DzienTygodnia) => DAYS.indexOf(dzien) + 2;
  const from = Math.min(hourFrom, ...events.map((e) => Math.floor(timeToMinutes(e.od) / 60)));
  const to = Math.max(hourTo, ...events.map((e) => Math.ceil(timeToMinutes(e.do) / 60)));
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const lastRow = FIRST_SLOT_ROW + hours.length * SLOTS_PER_HOUR;

  const slotRow = (minutes: number, round: (n: number) => number) =>
    FIRST_SLOT_ROW + round((minutes - from * 60) / SLOT_MINUTES);

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `64px repeat(${DAYS.length}, minmax(108px, 1fr))`,
    gridTemplateRows: `44px repeat(${hours.length * SLOTS_PER_HOUR}, ${SLOT_HEIGHT}px)`,
  };

  return (
    <div className="calendar-scroll">
      <div className="calendar-grid" style={gridStyle}>
        <div style={{ gridColumn: 1, gridRow: 1 }} />
        {DAYS.map((dzien) => (
          <div
            key={`h${dzien}`}
            className={isWeekend(dzien) ? "day-header weekend" : "day-header"}
            style={{ gridColumn: column(dzien), gridRow: 1 }}
          >
            {DNI_KROTKIE[dzien - 1]}
            <span className="sub">
              {daySubtitles?.[dzien] ?? (weekStart ? shortDate(addDays(weekStart, dzien - 1)) : "")}
            </span>
          </div>
        ))}

        {hours.map((hour, i) => (
          <div
            key={`t${hour}`}
            className="time-col"
            style={{ gridColumn: 1, gridRow: `${FIRST_SLOT_ROW + i * SLOTS_PER_HOUR} / span ${SLOTS_PER_HOUR}` }}
          >
            {hourLabel(hour)}
          </div>
        ))}

        {DAYS.map((dzien) => (
          <div
            key={`d${dzien}`}
            className={isWeekend(dzien) ? "day-track weekend" : "day-track"}
            style={{ gridColumn: column(dzien), gridRow: `${FIRST_SLOT_ROW} / ${lastRow}` }}
          />
        ))}

        {DAYS.flatMap((dzien) =>
          layoutDay(events.filter((e) => e.dzien === dzien)).map((e) => {
            const style: CSSProperties = {
              gridColumn: column(dzien),
              gridRow: `${slotRow(e.start, Math.floor)} / ${Math.max(slotRow(e.end, Math.ceil), slotRow(e.start, Math.floor) + 1)}`,
            };
            if (e.lanes > 1) {
              style.width = `calc(${100 / e.lanes}% - 6px)`;
              style.marginLeft = `calc(${(100 * e.lane) / e.lanes}% + 3px)`;
              style.justifySelf = "start";
            }
            return (
              <ClassBlock
                key={e.id}
                typ={e.typ}
                tytul={e.tytul}
                meta={e.meta}
                srLabel={`${DNI_PELNE[dzien - 1]}, ${e.od}–${e.do}: `}
                style={style}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
