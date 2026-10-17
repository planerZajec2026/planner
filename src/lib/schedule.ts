import { isEvenWeek, timeToMinutes } from "./dates";
import { TYP_ZAJEC_LABEL } from "./labels";
import type { TypZajec, Zajecia } from "./types";

/** Classes that take place in the week starting on `weekStart`, honouring even/odd ISO-week repetition. */
export function zajeciaWTygodniu(zajecia: Zajecia[], weekStart: Date): Zajecia[] {
  const even = isEvenWeek(weekStart);
  return zajecia.filter((z) => {
    if (z.powtarzalnosc === "parzyste") return even;
    if (z.powtarzalnosc === "nieparzyste") return !even;
    return true;
  });
}

export function typLabel(typ: TypZajec): string {
  return TYP_ZAJEC_LABEL[typ];
}

/** Total duration of the classes in hours (e.g. 1.5 for 90 minutes). */
export function sumaGodzin(zajecia: Pick<Zajecia, "od" | "do">[]): number {
  return zajecia.reduce((sum, z) => sum + timeToMinutes(z.do) - timeToMinutes(z.od), 0) / 60;
}
