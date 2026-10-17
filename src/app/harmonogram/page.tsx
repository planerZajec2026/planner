import type { Metadata } from "next";
import { Suspense } from "react";
import { ExportButton } from "@/components/harmonogram/ExportButton";
import { HarmonogramGrupy } from "@/components/harmonogram/HarmonogramGrupy";
import { PageHeader } from "@/components/layout/PageHeader";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Harmonogram grup" };

export default function HarmonogramPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader
        back={{ href: "/kierunki", label: "Kierunki i grupy" }}
        title="Harmonogram zajęć"
        description="Plan zajęć dla wybranego kierunku i grupy, poniedziałek–niedziela."
        actions={<ExportButton />}
      />
      <Suspense fallback={<div className="empty-state">Wczytywanie harmonogramu…</div>}>
        <HarmonogramGrupy searchParams={searchParams} />
      </Suspense>
    </>
  );
}
