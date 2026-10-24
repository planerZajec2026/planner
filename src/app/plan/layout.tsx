import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

export default function PlanLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <PageHeader
        title="Plan zajęć"
        description="Wygenerowany plan semestru zimowego 2026/27: wszystkie zajęcia z dniem, godziną, salą i tygodniami."
      />
      {children}
    </PageTransition>
  );
}
