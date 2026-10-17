"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Collapse } from "@/components/motion/Collapse";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { normalize } from "@/lib/pl";
import { pelneImie } from "@/lib/prowadzacy";
import type { Prowadzacy } from "@/lib/types";
import { ProwadzacyCard } from "./ProwadzacyCard";
import { ProwadzacyForm } from "./ProwadzacyForm";

export function ProwadzacyView({ initial }: { initial: Prowadzacy[] }) {
  const [lista, setLista] = useState(initial);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const objectUrls = useRef<string[]>([]);

  // Photo previews are object URLs held only in local state; release them when leaving the page.
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const visible = useMemo(() => {
    const q = normalize(query);
    if (!q) return lista;
    return lista.filter((p) => [pelneImie(p), ...p.przedmioty].some((text) => normalize(text).includes(q)));
  }, [lista, query]);

  const toggleForm = () => {
    setFormOpen((open) => !open);
    setSaved(false);
  };

  const handleSave = (nowy: Omit<Prowadzacy, "id">) => {
    if (nowy.zdjecieUrl) objectUrls.current.push(nowy.zdjecieUrl);
    setLista((prev) => [{ ...nowy, id: `lokalny-${crypto.randomUUID()}` }, ...prev]);
    setFormOpen(false);
    setSaved(true);
  };

  return (
    <>
      <PageHeader
        title="Prowadzący zajęcia"
        description="Lista prowadzących wraz z danymi kontaktowymi i przypisanymi przedmiotami."
        actions={
          <>
            <SearchField
              label="Szukaj po nazwisku lub przedmiocie"
              placeholder="Szukaj po nazwisku lub przedmiocie…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button onClick={toggleForm} aria-expanded={formOpen}>
              {formOpen ? "Anuluj" : "+ Dodaj prowadzącego"}
            </Button>
          </>
        }
      />

      {/* display:contents keeps the always-present live region from adding an empty flex gap */}
      <div role="status" style={{ display: "contents" }}>
        <Collapse show={saved}>
          <div className="success-banner">
            <Icon name="check" />
            Dodano prowadzącego (dane lokalne)
          </div>
        </Collapse>
      </div>

      <Collapse show={formOpen}>
        <ProwadzacyForm onSave={handleSave} onCancel={toggleForm} />
      </Collapse>

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
