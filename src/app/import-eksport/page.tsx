import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportDanychForm } from "@/components/import/ImportDanychForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";
import { getLiczbaZajec } from "@/lib/data/plan";

export const metadata: Metadata = { title: "Import danych" };

export default function ImportPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Import danych"
        description="Wgraj dane wejściowe generatora planu: kalendarz, sale, prowadzących, grupy i zajęcia do zaplanowania."
      />
      {/* Whether data is loaded is read per request, so the form streams in behind this boundary. */}
      <Suspense fallback={<div className="empty-state">Wczytywanie…</div>}>
        <Formularz />
      </Suspense>
    </PageTransition>
  );
}

async function Formularz() {
  const liczba = await getLiczbaZajec();
  return (
    <>
      {liczba > 0 ? (
        <div className="info-banner">W bazie jest już {liczba} zajęć do zaplanowania. Nowy plik je zastąpi.</div>
      ) : (
        <div className="info-banner">Baza jest pusta. Wgraj dane, żeby wygenerować plan.</div>
      )}
      <ImportDanychForm maDane={liczba > 0} />
    </>
  );
}
