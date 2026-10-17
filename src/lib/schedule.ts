import { isEvenWeek } from "./dates";
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
