import type { Metadata } from "next";
import { Suspense } from "react";
import { GeneratorForm } from "@/components/generator/GeneratorForm";
import { ListaZadan } from "@/components/generator/ListaZadan";
import { BrakDanych } from "@/components/layout/BrakDanych";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";
import { getLiczbaZajec, getZmianyReczne } from "@/lib/data/plan";

export const metadata: Metadata = { title: "Generator planu" };

export default function GeneratorPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Generator planu"
        description="Wygeneruj plan zajęć na semestr zimowy 2026/27 z danych wejściowych i sprawdź jego jakość."
      />
      {/* The data and the jobs are read per request, so they stream in behind this boundary. */}
      <Suspense fallback={<div className="empty-state">Wczytywanie…</div>}>
        <Zawartosc />
      </Suspense>
    </PageTransition>
  );
}

async function Zawartosc() {
  const [liczbaZajec, zmianyReczne] = await Promise.all([getLiczbaZajec(), getZmianyReczne()]);
  if (liczbaZajec === 0) return <BrakDanych />;
  return (
    <>
      {zmianyReczne > 0 && (
        <div className="info-banner">
          Aktywny plan ma zmiany ręczne (zapisano ich {zmianyReczne}). Nowe generowanie utworzy plan bez tych zmian.
        </div>
      )}
      <GeneratorForm />
      <ListaZadan />
    </>
  );
}
