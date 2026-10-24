// Resolves the "kierunek → grupa" cascade of the group timetable filters.
// Shared by the server page (initial render from the URL) and the client filters (on change).
import type { Grupa, Kierunek } from "./types";

export type GrupaSelection = {
  kierunekId: string;
  /** Groups of the selected programme. */
  grupy: Grupa[];
  /** Selected group, or undefined when the programme has none. */
  grupa?: Grupa;
};

export type GrupaSelectionInput = {
  kierunek?: string;
  grupa?: string;
};

/**
 * Unknown values are ignored. A missing programme defaults to the requested group's own, otherwise to the first one.
 * A group outside the programme is replaced by the programme's first group.
 */
export function resolveGrupaSelection(kierunki: Kierunek[], grupy: Grupa[], input: GrupaSelectionInput): GrupaSelection {
  const kierunekId = kierunki.some((k) => k.id === input.kierunek) ? input.kierunek : undefined;

  const anchor = grupy.find((g) => g.id === input.grupa) ?? grupy.find((g) => !kierunekId || g.kierunekId === kierunekId);

  const resolvedKierunek = kierunekId ?? anchor?.kierunekId ?? kierunki[0]?.id ?? "";
  const matching = grupy.filter((g) => g.kierunekId === resolvedKierunek);

  return {
    kierunekId: resolvedKierunek,
    grupy: matching,
    grupa: matching.find((g) => g.id === input.grupa) ?? matching[0],
  };
}
