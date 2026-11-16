"use client";

import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/motion/FadeIn";
import { SearchField } from "@/components/ui/SearchField";
import { normalize } from "@/lib/pl";
import { pelneImie } from "@/lib/prowadzacy";
import type { Prowadzacy } from "@/lib/types";
import { ProwadzacyCard } from "./ProwadzacyCard";

export function ProwadzacyView({ prowadzacy }: { prowadzacy: Prowadzacy[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = normalize(query);
    if (!q) return prowadzacy;
    return prowadzacy.filter((p) => [pelneImie(p), p.jednostka, ...p.przedmioty].some((text) => normalize(text).includes(q)));
  }, [prowadzacy, query]);

  return (
    <>
      <PageHeader
        title="Prowadzący zajęcia"
        description="Lista prowadzących wraz z jednostką i przedmiotami, które prowadzą."
        actions={
          <SearchField
            label="Szukaj po oznaczeniu lub przedmiocie"
            placeholder="Szukaj po oznaczeniu lub przedmiocie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      <AnimatePresence initial={false}>
        {visible.length === 0 && (
          <FadeIn key="empty">
            <div className="empty-state">Brak prowadzących spełniających kryteria.</div>
          </FadeIn>
        )}
      </AnimatePresence>

      {/* popLayout: removed cards leave the flow at once, so the rest glide to their new cells together. */}
      <div className="card-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => (
            <ProwadzacyCard key={p.id} prowadzacy={p} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
