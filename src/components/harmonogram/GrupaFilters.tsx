"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";
import { WeekNav } from "@/components/calendar/WeekNav";
import { SelectField } from "@/components/ui/SelectField";
import { resolveGrupaSelection, type GrupaSelectionInput } from "@/lib/grupa-selection";
import { PRZEJSCIE } from "@/lib/motion";
import type { Grupa, Kierunek, TrybStudiow } from "@/lib/types";
import { useNavigationTransition } from "./PendingNavigation";

const TRYB_OPTIONS: { value: TrybStudiow; label: string }[] = [
  { value: "niestacjonarne", label: "Niestacjonarne (zaoczne)" },
  { value: "stacjonarne", label: "Stacjonarne" },
];

type GrupaFiltersProps = {
  kierunki: Kierunek[];
  grupy: Grupa[];
  tryb: TrybStudiow;
  kierunekId: string;
  grupaId?: string;
  /** Monday of the displayed week, "YYYY-MM-DD". */
  weekStart: string;
};

export function GrupaFilters({ kierunki, grupy, tryb, kierunekId, grupaId, weekStart }: GrupaFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useNavigationTransition();
  const [current, setCurrent] = useOptimistic(
    resolveGrupaSelection(kierunki, grupy, { tryb, kierunek: kierunekId, grupa: grupaId }),
  );

  const update = (change: GrupaSelectionInput) => {
    const next = resolveGrupaSelection(kierunki, grupy, {
      tryb: current.tryb,
      kierunek: current.kierunekId,
      grupa: current.grupa?.id,
      ...change,
    });
    const params = new URLSearchParams(searchParams);
    params.set("tryb", next.tryb);
    params.set("kierunek", next.kierunekId);
    if (next.grupa) params.set("grupa", next.grupa.id);
    else params.delete("grupa");
    startTransition(() => {
      setCurrent(next);
      router.replace(`${pathname}?${params}`, { scroll: false, transitionTypes: [PRZEJSCIE.filtr] });
    });
  };

  return (
    <div className="filters-bar">
      <SelectField
        id="f-tryb"
        label="Tryb studiów"
        options={TRYB_OPTIONS}
        value={current.tryb}
        onChange={(e) => update({ tryb: e.target.value })}
      />
      <SelectField
        id="f-kierunek"
        label="Kierunek"
        options={kierunki.map((k) => ({ value: k.id, label: k.nazwa }))}
        value={current.kierunekId}
        onChange={(e) => update({ kierunek: e.target.value })}
      />
      <SelectField
        id="f-grupa"
        label="Grupa"
        options={current.grupy.map((g) => ({ value: g.id, label: g.kod }))}
        placeholder="Brak grup"
        value={current.grupa?.id ?? ""}
        disabled={current.grupy.length === 0}
        onChange={(e) => update({ grupa: e.target.value })}
      />
      <WeekNav weekStart={weekStart} />
    </div>
  );
}
