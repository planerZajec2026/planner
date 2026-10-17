"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { Tag } from "@/components/ui/Tag";
import { TRYB_LABEL } from "@/lib/labels";
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
        description="Przeglądaj kierunki studiów oraz przypisane im grupy i tryby zajęć."
        actions={
          <SearchField
            label="Szukaj kierunku lub grupy"
            placeholder="Szukaj kierunku lub grupy…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      {visible.length === 0 && (
        <div className="empty-state">Brak wyników dla „{query.trim()}”.</div>
      )}

      {visible.map(({ kierunek, grupy: rows }) => (
        <section key={kierunek.id} className="kierunek-card" aria-labelledby={`k-${kierunek.id}`}>
          <div className="kierunek-head">
            <h3 id={`k-${kierunek.id}`}>{kierunek.nazwa}</h3>
            <span className="kierunek-count">{countPl(rows.length, "grupa", "grupy", "grup")}</span>
          </div>
          {rows.map((g) => (
            <div key={g.id} className="grupa-row">
              <span className="grupa-code">{g.kod}</span>
              <Tag>{TRYB_LABEL[g.tryb]}</Tag>
              <span className="grupa-students">
                {countPl(g.liczbaStudentow, "student", "studentów", "studentów")}
              </span>
              <Link
                className="grupa-link"
                href={`/harmonogram?grupa=${g.id}`}
                aria-label={`Harmonogram grupy ${g.kod}`}
              >
                Harmonogram <Icon name="chevron-right" size={14} strokeWidth={2} />
              </Link>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
