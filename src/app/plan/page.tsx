import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanView } from "@/components/plan/PlanView";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Plan zajęć" };

/** The plan and the filters come from the database and the URL, so the page owns the Suspense boundary. */
export default function PlanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="empty-state">Wczytywanie planu…</div>}>
      <PlanView searchParams={searchParams} />
    </Suspense>
  );
}
