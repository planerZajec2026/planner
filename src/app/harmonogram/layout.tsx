import { Suspense, type ReactNode } from "react";
import { ExportButton } from "@/components/harmonogram/ExportButton";
import { HarmonogramFallback } from "@/components/harmonogram/Reveal";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

/**
 * The Suspense boundary lives here, above the page, on purpose: a week/filter change only changes search params,
 * so this layout is shared by both URLs and its fallback can't be used during that navigation. React keeps the
 * current calendar (dimmed while pending) until the new one is ready, instead of flashing the loading text.
 * Arriving from another page or on a direct visit, the fallback still shows right away.
 */
export default function HarmonogramLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <PageHeader
        back={{ href: "/kierunki", label: "Kierunki i grupy" }}
        title="Harmonogram zajęć"
        description="Plan zajęć dla wybranego kierunku i grupy, poniedziałek–niedziela."
        actions={<ExportButton />}
      />
      <Suspense fallback={<HarmonogramFallback />}>{children}</Suspense>
    </PageTransition>
  );
}
