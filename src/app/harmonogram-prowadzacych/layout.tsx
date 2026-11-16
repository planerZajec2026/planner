import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";

/** The header is static; the data (and its Suspense boundary) lives in page.tsx (see app/harmonogram). */
export default function HarmonogramProwadzacychLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <PageHeader
        back={{ href: "/prowadzacy", label: "Prowadzący" }}
        title="Harmonogram prowadzącego"
        description="Plan zajęć wybranego prowadzącego we wszystkich grupach."
      />
      {children}
    </PageTransition>
  );
}
