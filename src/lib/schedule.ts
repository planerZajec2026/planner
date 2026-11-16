import { timeToMinutes } from "./dates";
import { TYP_ZAJEC_LABEL } from "./labels";
import type { TypZajec } from "./types";

export function typLabel(typ: TypZajec): string {
  return TYP_ZAJEC_LABEL[typ];
}

/** Total duration of the classes in hours (e.g. 1.5 for 90 minutes). */
export function sumaGodzin(zajecia: { od: string; do: string }[]): number {
  return zajecia.reduce((sum, z) => sum + timeToMinutes(z.do) - timeToMinutes(z.od), 0) / 60;
}
