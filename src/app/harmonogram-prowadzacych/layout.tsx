import { Suspense, type ReactNode } from "react";
import { ExportButton } from "@/components/harmonogram/ExportButton";
import { HarmonogramFallback } from "@/components/harmonogram/Reveal";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

/** Suspense above the page so instructor/week changes keep the current calendar until the new one is ready (see app/harmonogram/layout.tsx). */
export default function HarmonogramProwadzacychLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <PageHeader
        back={{ href: "/prowadzacy", label: "Prowadzący" }}
        title="Harmonogram prowadzącego"
        description="Plan zajęć wybranego prowadzącego we wszystkich grupach i trybach studiów."
        actions={<ExportButton />}
      />
      <Suspense fallback={<HarmonogramFallback />}>{children}</Suspense>
    </PageTransition>
  );
}
