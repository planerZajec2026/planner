import type { Metadata } from "next";
import { Suspense } from "react";
import { HarmonogramProwadzacego } from "@/components/harmonogram/HarmonogramProwadzacego";
import { HarmonogramFallback } from "@/components/harmonogram/Reveal";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Harmonogram prowadzącego" };

/** Reading the search params is request-time data, so the page itself owns the Suspense boundary. */
export default function HarmonogramProwadzacychPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<HarmonogramFallback />}>
      <HarmonogramProwadzacego searchParams={searchParams} />
    </Suspense>
  );
}
