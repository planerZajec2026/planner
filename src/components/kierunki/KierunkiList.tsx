"use client";

import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CollapseItem } from "@/components/motion/Collapse";
import { FadeIn } from "@/components/motion/FadeIn";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { Tag } from "@/components/ui/Tag";
import { countPl, normalize } from "@/lib/pl";
import type { Grupa, Kierunek } from "@/lib/types";

type Props = {
  kierunki: Kierunek[];
  grupy: Grupa[];
};

export function KierunkiList({ kierunki, grupy }: Props) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = normalize(query);
    return kierunki
      .map((k) => {
        const own = grupy.filter((g) => g.kierunekId === k.id);
        if (!q || normalize(k.nazwa).includes(q)) return { kierunek: k, grupy: own };
        return { kierunek: k, grupy: own.filter((g) => normalize(g.kod).includes(q)) };
      })
      .filter((entry) => entry.grupy.length > 0);
  }, [kierunki, grupy, query]);

  return (
    <>
      <PageHeader
        title="Kierunki i grupy"
        description="Przeglądaj kierunki studiów oraz przypisane im grupy."
        actions={
          <SearchField
            label="Szukaj kierunku lub grupy"
            placeholder="Szukaj kierunku lub grupy…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      <AnimatePresence initial={false}>
        {visible.length === 0 && (
          <FadeIn key="empty">
            <div className="empty-state">Brak wyników dla „{query.trim()}”.</div>
          </FadeIn>
        )}
      </AnimatePresence>

      {/* Cards and rows collapse in height, so everything below glides into place as results change. */}
      <div className="kierunki-list">
        <AnimatePresence initial={false}>
          {visible.map(({ kierunek, grupy: rows }) => (
            <CollapseItem key={kierunek.id}>
              <section className="kierunek-card" aria-labelledby={`k-${kierunek.id}`}>
                <div className="kierunek-head">
                  <h3 id={`k-${kierunek.id}`}>{kierunek.nazwa}</h3>
                  <span className="kierunek-count">{countPl(rows.length, "grupa", "grupy", "grup")}</span>
                </div>
                <AnimatePresence initial={false}>
                  {rows.map((g) => (
                    <CollapseItem key={g.id} className="grupa-collapse">
                      <div className="grupa-row">
                        <span className="grupa-code">{g.kod}</span>
                        <Tag>{g.rocznikNazwa}</Tag>
                        <span className="grupa-students">
                          {countPl(g.liczbaStudentow, "student", "studentów", "studentów")}
                        </span>
                        <AppLink
                          className="grupa-link"
                          href={`/harmonogram?grupa=${g.id}`}
                          aria-label={`Harmonogram grupy ${g.kod}`}
                        >
                          Harmonogram <Icon name="chevron-right" size={14} strokeWidth={2} />
                        </AppLink>
                      </div>
                    </CollapseItem>
                  ))}
                </AnimatePresence>
              </section>
            </CollapseItem>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
