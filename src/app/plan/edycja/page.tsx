import type { Metadata } from "next";
import { Suspense } from "react";
import { EdycjaView } from "@/components/plan/EdycjaView";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Edycja zajęć w planie" };

/** The class comes from the URL and the plan from the database, so the page owns the Suspense boundary. */
export default function EdycjaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="empty-state">Wczytywanie zajęć…</div>}>
      <EdycjaView searchParams={searchParams} />
    </Suspense>
  );
}
