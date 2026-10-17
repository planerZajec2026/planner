import type { Metadata } from "next";
import { Suspense } from "react";
import { ExportButton } from "@/components/harmonogram/ExportButton";
import { HarmonogramProwadzacego } from "@/components/harmonogram/HarmonogramProwadzacego";
import { PageHeader } from "@/components/layout/PageHeader";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Harmonogram prowadzącego" };

export default function HarmonogramProwadzacychPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader
        back={{ href: "/prowadzacy", label: "Prowadzący" }}
        title="Harmonogram prowadzącego"
        description="Plan zajęć wybranego prowadzącego we wszystkich grupach i trybach studiów."
        actions={<ExportButton />}
      />
      <Suspense fallback={<div className="empty-state">Wczytywanie harmonogramu…</div>}>
        <HarmonogramProwadzacego searchParams={searchParams} />
      </Suspense>
    </>
  );
}
