import { getAktywnyPlan } from "@/lib/data/plan";
import { doEksportu, doJson, filtruj, nazwaPliku, odczytajFiltry } from "@/lib/plan";
import { zbudujXlsx } from "@/lib/plan-xlsx";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const dataGodzina = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Warsaw" });

/**
 * Downloads the active plan as .xlsx (default) or .json: `?format=json`. The same filters as /plan narrow it
 * (`grupa`, `prowadzacy`, `sala`, `rocznik`, `dzien`, `tydzien`); with none, the whole plan is exported.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = params.get("format") === "json" ? "json" : "xlsx";
  const filtry = odczytajFiltry(Object.fromEntries(params));

  const plan = await getAktywnyPlan();
  if (!plan) return new Response("Nie wygenerowano jeszcze żadnego planu.", { status: 404 });

  const wiersze = filtruj(plan.wiersze, filtry);
  const naglowki = { "Content-Disposition": `attachment; filename="${nazwaPliku(filtry, format)}"` };
  const { zadanie } = plan;

  if (format === "json") {
    return Response.json(
      {
        zadanie: {
          id: zadanie.id,
          zakonczono: zadanie.zakonczono,
          wynik_miekkich: zadanie.wynikMiekkich,
          raport: zadanie.raport,
        },
        filtry,
        liczba_zajec: wiersze.length,
        zajecia: doJson(wiersze),
      },
      { headers: naglowki },
    );
  }

  const informacje = [
    { Pole: "Zadanie generowania", Wartość: zadanie.id },
    { Pole: "Zakończono", Wartość: zadanie.zakonczono ? dataGodzina.format(new Date(zadanie.zakonczono)) : "" },
    { Pole: "Liczba zajęć w pliku", Wartość: String(wiersze.length) },
    { Pole: "Kara miękkich (mniej = lepiej)", Wartość: String(zadanie.wynikMiekkich ?? "") },
    { Pole: "Filtry", Wartość: Object.entries(filtry).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join(", ") || "brak (cały plan)" },
  ];
  const bufor = await zbudujXlsx(doEksportu(wiersze, plan.etykiety), informacje);
  return new Response(new Uint8Array(bufor), { headers: { "Content-Type": XLSX, ...naglowki } });
}
