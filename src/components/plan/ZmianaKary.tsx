import { WAGA_LABEL } from "@/lib/generator";
import { karaWgRodzaju, RODZAJE, type DaneOceny, type ProblemyPlanu } from "@/lib/plan-problemy";

const liczba = (n: number) => n.toLocaleString("pl-PL");
const zeZnakiem = (n: number) => (n > 0 ? `+${liczba(n)}` : n < 0 ? `−${liczba(-n)}` : "0");

/** The plan's soft-constraint penalty now and with the chosen placement, so a move that lowers it is easy to find. */
export function ZmianaKary({ przed, po, ocena }: { przed: ProblemyPlanu; po: ProblemyPlanu | null; ocena: DaneOceny }) {
  const poGenerowaniu =
    ocena.wynikPoGenerowaniu != null && ocena.wynikPoGenerowaniu !== przed.wynik
      ? ` (po wygenerowaniu ${liczba(ocena.wynikPoGenerowaniu)})`
      : "";
  if (!po) {
    return (
      <p className="kara-zmiana">
        Kara miękkich planu: <strong>{liczba(przed.wynik)}</strong>
        {poGenerowaniu}. Wybierz inny termin, żeby zobaczyć, jak go zmieni.
      </p>
    );
  }

  const roznica = po.wynik - przed.wynik;
  const rodzajePrzed = karaWgRodzaju(przed.miekkie, ocena.wagi);
  const rodzajePo = karaWgRodzaju(po.miekkie, ocena.wagi);
  const zmienione = RODZAJE.filter((r) => rodzajePo[r] !== rodzajePrzed[r]);
  return (
    <div className={["kara-zmiana", roznica < 0 ? "lepiej" : roznica > 0 ? "gorzej" : ""].join(" ").trim()}>
      <p>
        Kara miękkich: {liczba(przed.wynik)} → <strong>{liczba(po.wynik)}</strong> ({zeZnakiem(roznica)})
        {poGenerowaniu}.{" "}
        {roznica < 0 ? "Ta zmiana zmniejsza karę." : roznica > 0 ? "Ta zmiana zwiększa karę." : "Ta zmiana nie zmienia kary."}
      </p>
      {zmienione.length > 0 && (
        <p className="kara-rodzaje">
          {zmienione.map((r) => `${WAGA_LABEL[r] ?? r}: ${zeZnakiem(rodzajePo[r] - rodzajePrzed[r])}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
