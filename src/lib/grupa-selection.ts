// Resolves the "tryb → kierunek → grupa" cascade of the group timetable filters.
// Shared by the server page (initial render from the URL) and the client filters (on change).
import type { Grupa, Kierunek, TrybStudiow } from "./types";

export type GrupaSelection = {
  tryb: TrybStudiow;
  kierunekId: string;
  /** Groups matching `tryb` and `kierunekId`. */
  grupy: Grupa[];
  /** Selected group, or undefined when no group matches. */
  grupa?: Grupa;
};

export type GrupaSelectionInput = {
  tryb?: string;
  kierunek?: string;
  grupa?: string;
};

const TRYBY: readonly string[] = ["stacjonarne", "niestacjonarne"] satisfies TrybStudiow[];

/**
 * Unknown values are ignored. Missing mode/programme default to the requested group's own,
 * otherwise to the first group matching what was given (or simply the first group).
 * A group that does not match the mode and programme is replaced by the first one that does.
 */
export function resolveGrupaSelection(
  kierunki: Kierunek[],
  grupy: Grupa[],
  input: GrupaSelectionInput,
): GrupaSelection {
  const tryb = input.tryb && TRYBY.includes(input.tryb) ? (input.tryb as TrybStudiow) : undefined;
  const kierunekId = kierunki.some((k) => k.id === input.kierunek) ? input.kierunek : undefined;

  const anchor =
    grupy.find((g) => g.id === input.grupa) ??
    grupy.find((g) => (!tryb || g.tryb === tryb) && (!kierunekId || g.kierunekId === kierunekId)) ??
    grupy[0];

  const resolvedTryb = tryb ?? anchor?.tryb ?? "niestacjonarne";
  const resolvedKierunek = kierunekId ?? anchor?.kierunekId ?? kierunki[0]?.id ?? "";
  const matching = grupy.filter((g) => g.tryb === resolvedTryb && g.kierunekId === resolvedKierunek);

  return {
    tryb: resolvedTryb,
    kierunekId: resolvedKierunek,
    grupy: matching,
    grupa: matching.find((g) => g.id === input.grupa) ?? matching[0],
  };
}
