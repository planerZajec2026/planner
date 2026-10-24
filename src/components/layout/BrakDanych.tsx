import { AppLink } from "@/components/ui/AppLink";

/** Shown on every page that lists the generator's data when the database has none yet. */
export function BrakDanych() {
  return (
    <div className="empty-state">
      Brak danych wejściowych. <AppLink href="/import-eksport">Wgraj je w Imporcie danych</AppLink>, a potem wygeneruj plan
      w Generatorze.
    </div>
  );
}

/** Shown on the timetable pages when the data is there but no plan has been generated yet. */
export function BrakPlanu() {
  return (
    <div className="empty-state">
      Nie wygenerowano jeszcze planu. <AppLink href="/generator">Przejdź do Generatora</AppLink>, żeby go utworzyć.
    </div>
  );
}
