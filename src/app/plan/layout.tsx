import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

/** The Suspense boundary sits above the page so a filter change (only search params) keeps the current plan visible. */
export default function PlanLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <PageHeader
        title="Plan zajęć"
        description="Wygenerowany plan semestru zimowego 2026/27: wszystkie zajęcia z dniem, godziną, salą i tygodniami."
      />
      <Suspense fallback={<div className="empty-state">Wczytywanie planu…</div>}>{children}</Suspense>
    </PageTransition>
  );
}
