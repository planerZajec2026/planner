"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";
import { WeekNav } from "@/components/calendar/WeekNav";
import { SelectField } from "@/components/ui/SelectField";
import { pelneImie } from "@/lib/prowadzacy";
import { PRZEJSCIE } from "@/lib/motion";
import type { Prowadzacy } from "@/lib/types";
import { useNavigationTransition } from "./PendingNavigation";

type ProwadzacyFiltersProps = {
  prowadzacy: Prowadzacy[];
  prowadzacyId?: string;
  /** Monday of the displayed week, "YYYY-MM-DD". */
  weekStart: string;
};

export function ProwadzacyFilters({ prowadzacy, prowadzacyId, weekStart }: ProwadzacyFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useNavigationTransition();
  const [selected, setSelected] = useOptimistic(prowadzacyId ?? "");

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("prowadzacy", id);
    startTransition(() => {
      setSelected(id);
      router.replace(`${pathname}?${params}`, { scroll: false, transitionTypes: [PRZEJSCIE.filtr] });
    });
  };

  return (
    <div className="filters-bar">
      <SelectField
        id="f-prow"
        label="Prowadzący"
        options={prowadzacy.map((p) => ({ value: p.id, label: pelneImie(p) }))}
        placeholder="Brak prowadzących"
        value={selected}
        disabled={prowadzacy.length === 0}
        style={{ minWidth: 220 }}
        onChange={(e) => select(e.target.value)}
      />
      <WeekNav weekStart={weekStart} />
    </div>
  );
}
