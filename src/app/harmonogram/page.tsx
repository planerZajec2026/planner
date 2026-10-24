import type { Metadata } from "next";
import { Suspense } from "react";
import { HarmonogramGrupy } from "@/components/harmonogram/HarmonogramGrupy";
import { HarmonogramFallback } from "@/components/harmonogram/Reveal";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Harmonogram grup" };

/** Reading the search params is request-time data, so the page itself owns the Suspense boundary. */
export default function HarmonogramPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<HarmonogramFallback />}>
      <HarmonogramGrupy searchParams={searchParams} />
    </Suspense>
  );
}
