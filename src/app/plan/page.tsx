import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanView } from "@/components/plan/PlanView";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Plan zajęć" };

/** The plan and the filters come from the database and the URL, so the page owns the Suspense boundary. */
export default function PlanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader
        title="Plan zajęć"
        description="Wygenerowany plan semestru zimowego 2026/27: wszystkie zajęcia z dniem, godziną, salą i tygodniami."
      />
      <Suspense fallback={<div className="empty-state">Wczytywanie planu…</div>}>
        <PlanView searchParams={searchParams} />
      </Suspense>
    </>
  );
}
