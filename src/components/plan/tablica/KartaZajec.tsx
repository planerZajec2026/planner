import { FORMA_LABEL, opisTygodni } from "@/lib/plan";
import { opisTerminu, type KontekstEdycji } from "@/lib/plan-edycja";

/** What the selected class is and where it is now, above the form that moves it (spec 14). */
export function KartaZajec({ kontekst, zajeciaId }: { kontekst: KontekstEdycji; zajeciaId: string }) {
  const z = kontekst.zajecia[zajeciaId];
  const obecny = kontekst.plan.find((p) => p.zajeciaId === zajeciaId)!;
  return (
    <div className="card" id="edycja-zajec">
      <div className="section-title card-head">Edycja zajęć {z.id}</div>
      <dl className="edycja-meta">
        <div>
          <dt>Przedmiot</dt>
          <dd>{z.przedmiot}</dd>
        </div>
        <div>
          <dt>Forma</dt>
          <dd>{FORMA_LABEL[z.forma] ?? z.forma}</dd>
        </div>
        <div>
          <dt>Grupy</dt>
          <dd>{z.grupy.map((g) => kontekst.etykiety.grupy[g] ?? g).join(", ")}</dd>
        </div>
        <div>
          <dt>Prowadzący</dt>
          <dd>{z.prowadzacy.map((p) => kontekst.etykiety.prowadzacy[p] ?? p).join(", ")}</dd>
        </div>
        <div>
          <dt>Długość</dt>
          <dd>
            {z.sloty} × 45 min, {z.miejsca} osób
          </dd>
        </div>
        <div>
          <dt>Obecny termin</dt>
          <dd>
            {opisTerminu(obecny, z.sloty)}, sala {obecny.sala}, {opisTygodni({ tygodnie: obecny.tygodnie, czestotliwosc: z.czestotliwosc })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
