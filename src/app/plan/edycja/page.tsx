import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EdycjaView } from "@/components/plan/EdycjaView";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Edycja planu" };

/** The filter and the class come from the URL and the plan from the database, so the page owns the Suspense boundary. */
export default function EdycjaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader
        title="Edycja planu"
        description="Przenoś zajęcia na siatce tygodnia. Każda zmiana jest sprawdzana pod kątem konfliktów, zanim się zapisze."
      />
      <Suspense fallback={<div className="empty-state">Wczytywanie planu…</div>}>
        <EdycjaView searchParams={searchParams} />
      </Suspense>
    </>
  );
}
