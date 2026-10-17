// Date helpers. Everything works on local dates; weeks start on Monday.
import type { DzienTygodnia } from "./types";

export const DNI_KROTKIE = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"] as const;
export const DNI_PELNE = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses "YYYY-MM-DD" into a local date, or returns null when invalid. */
export function parseISODate(value: string | undefined | null): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toISODate(d) === value ? d : null;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(d, -offset);
}

/** Monday of the week given as `?tydzien=YYYY-MM-DD`, falling back to the week of `today`. */
export function resolveWeekStart(param: string | undefined, today: Date): Date {
  return startOfWeek(parseISODate(param) ?? today);
}

const dayMonth = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" });

/** "12–18 października 2026", "28 września – 4 października 2026", "29 grudnia 2025 – 4 stycznia 2026" */
export function weekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const y1 = weekStart.getFullYear();
  const y2 = end.getFullYear();
  if (y1 !== y2) return `${dayMonth.format(weekStart)} ${y1} – ${dayMonth.format(end)} ${y2}`;
  if (weekStart.getMonth() !== end.getMonth()) {
    return `${dayMonth.format(weekStart)} – ${dayMonth.format(end)} ${y2}`;
  }
  return `${weekStart.getDate()}–${dayMonth.format(end)} ${y2}`;
}

/** "12.10" */
export function shortDate(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

/** ISO-8601 week number. */
export function isoWeekNumber(d: Date): number {
  const thursday = addDays(startOfWeek(d), 3);
  const firstThursday = addDays(startOfWeek(new Date(thursday.getFullYear(), 0, 4)), 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

export function isEvenWeek(d: Date): boolean {
  return isoWeekNumber(d) % 2 === 0;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "8:00" style label used in the calendar time column. */
export function hourLabel(hour: number): string {
  return `${hour}:00`;
}

export function isWeekend(dzien: DzienTygodnia): boolean {
  return dzien >= 6;
}
