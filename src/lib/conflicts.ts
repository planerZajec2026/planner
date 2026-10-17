// Timetable conflict detection (same group, room or instructor at overlapping times).
import { DNI_KROTKIE, timeToMinutes } from "./dates";
import { POWTARZALNOSC_LABEL } from "./labels";
import { normalize } from "./pl";
import { pelneImie } from "./prowadzacy";
import type { Grupa, Prowadzacy, Zajecia } from "./types";

export type RodzajKonfliktu = "sala" | "prowadzacy" | "grupa";

export type Konflikt = {
  /** The class it clashes with. */
  z: Zajecia;
  /** Every shared resource, most significant first. */
  rodzaje: RodzajKonfliktu[];
  /** Polish explanation, e.g. "Sala B21 jest zajęta: Bazy danych (INF/Z-3), pt 18:00–20:00". */
  opis: string;
};

export type KonfliktContext = {
  grupy: Grupa[];
  prowadzacy: Prowadzacy[];
};

/** Same day, overlapping hours (touching ends don't count) and weeks that can coincide. */
export function nakladajaSie(a: Zajecia, b: Zajecia): boolean {
  if (a.dzien !== b.dzien) return false;
  const parity = new Set([a.powtarzalnosc, b.powtarzalnosc]);
  if (parity.has("parzyste") && parity.has("nieparzyste")) return false;
  return timeToMinutes(a.od) < timeToMinutes(b.do) && timeToMinutes(b.od) < timeToMinutes(a.do);
}

function opisz(z: Zajecia, rodzaj: RodzajKonfliktu, ctx: KonfliktContext): string {
  const kod = ctx.grupy.find((g) => g.id === z.grupaId)?.kod ?? z.grupaId;
  const p = ctx.prowadzacy.find((x) => x.id === z.prowadzacyId);
  const kiedy =
    `${DNI_KROTKIE[z.dzien - 1].toLocaleLowerCase("pl-PL")} ${z.od}–${z.do}` +
    (z.powtarzalnosc === "co-tydzien" ? "" : ` (${POWTARZALNOSC_LABEL[z.powtarzalnosc].toLocaleLowerCase("pl-PL")})`);
  switch (rodzaj) {
    case "sala":
      return `Sala ${z.sala} jest zajęta: ${z.przedmiot} (${kod}), ${kiedy}`;
    case "prowadzacy":
      return `${p ? pelneImie(p) : "Prowadzący"} prowadzi w tym czasie: ${z.przedmiot} (${kod}), ${kiedy}`;
    case "grupa":
      return `Grupa ${kod} ma w tym czasie: ${z.przedmiot}, ${kiedy}`;
  }
}

/**
 * For each class in `nowe`, the classes it clashes with: those in `istniejace` and the other entries of `nowe`
 * (so a file can't clash with itself either). Results are index-aligned with `nowe`.
 * TODO(backend): enforce on the server too (exclusion constraint or RPC), since local data may be stale.
 */
export function znajdzKonflikty(nowe: Zajecia[], istniejace: Zajecia[], ctx: KonfliktContext): Konflikt[][] {
  return nowe.map((n) =>
    [...istniejace, ...nowe]
      .filter((z) => z.id !== n.id && nakladajaSie(n, z))
      .flatMap((z): Konflikt[] => {
        const rodzaje: RodzajKonfliktu[] = [];
        if (normalize(z.sala) === normalize(n.sala)) rodzaje.push("sala");
        if (z.prowadzacyId === n.prowadzacyId) rodzaje.push("prowadzacy");
        if (z.grupaId === n.grupaId) rodzaje.push("grupa");
        return rodzaje.length ? [{ z, rodzaje, opis: opisz(z, rodzaje[0], ctx) }] : [];
      }),
  );
}
