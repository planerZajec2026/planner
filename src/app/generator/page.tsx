import type { Metadata } from "next";
import { Suspense } from "react";
import { GeneratorForm } from "@/components/generator/GeneratorForm";
import { ListaZadan } from "@/components/generator/ListaZadan";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

export const metadata: Metadata = { title: "Generator planu" };

export default function GeneratorPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Generator planu"
        description="Wygeneruj plan zajęć na semestr zimowy 2026/27 z danych wejściowych i sprawdź jego jakość."
      />
      <GeneratorForm />
      {/* Jobs are read per request, so they stream in behind this boundary. */}
      <Suspense fallback={<div className="empty-state">Wczytywanie zadań…</div>}>
        <ListaZadan />
      </Suspense>
    </PageTransition>
  );
}
