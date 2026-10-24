import { czasZajec, dzienLabel, FORMA_LABEL, opisTygodni, sortujWgCzasu, type Etykiety, type PlanWiersz } from "@/lib/plan";

/** Every placed class in one table: day, time, room and weeks next to the class, groups and instructors. */
export function PlanTable({ wiersze, etykiety }: { wiersze: PlanWiersz[]; etykiety: Etykiety }) {
  if (wiersze.length === 0) return <div className="empty-state">Żadne zajęcia nie pasują do wybranych filtrów.</div>;

  return (
    <div className="plan-table-wrap">
      <table className="plan-table">
        <caption className="visually-hidden">Plan zajęć: {wiersze.length} pozycji</caption>
        <thead>
          <tr>
            <th scope="col">Id</th>
            <th scope="col">Przedmiot</th>
            <th scope="col">Forma</th>
            <th scope="col">Grupy</th>
            <th scope="col">Prowadzący</th>
            <th scope="col">Dzień</th>
            <th scope="col">Godziny</th>
            <th scope="col">Sala</th>
            <th scope="col">Tygodnie</th>
          </tr>
        </thead>
        <tbody>
          {sortujWgCzasu(wiersze).map((w) => {
            const czas = czasZajec(w);
            return (
              <tr key={w.zajeciaId}>
                <td className="plan-id">{w.zajeciaId}</td>
                <td>{w.przedmiot}</td>
                <td>{FORMA_LABEL[w.forma]}</td>
                <td>{w.grupy.map((g) => etykiety.grupy[g] ?? g).join(", ")}</td>
                <td>{w.prowadzacy.map((p) => etykiety.prowadzacy[p] ?? p).join(", ")}</td>
                <td>{dzienLabel(w.dzien)}</td>
                <td className="plan-nowrap">
                  {czas.od}–{czas.do}
                </td>
                <td className="plan-nowrap">{w.sala}</td>
                <td>{opisTygodni(w)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
