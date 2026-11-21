"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { LICZBA_TYGODNI } from "@/lib/plan";
import { adresTablicy, type FiltrTablicy as Filtr, type OpcjaFiltra, type RodzajFiltra } from "@/lib/tablica-planu";

const RODZAJ_LABEL: Record<RodzajFiltra, string> = { grupa: "Grupa", prowadzacy: "Prowadzący", sala: "Sala" };

type FiltrTablicyProps = {
  filtr: Filtr;
  opcje: Record<RodzajFiltra, OpcjaFiltra[]>;
  /** What the selected class has for each kind, so switching the kind keeps it on the board. */
  zaznaczone?: Record<RodzajFiltra, string[]>;
};

/** One group, instructor or room on the board, and optionally one week; all of it lives in the URL. */
export function FiltrTablicy({ filtr, opcje, zaznaczone }: FiltrTablicyProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [biezacy, setBiezacy] = useOptimistic(filtr);

  const przejdz = (nowy: Filtr) =>
    startTransition(() => {
      setBiezacy(nowy);
      const inne = { zajecia: searchParams.get("zajecia") ?? undefined, powrot: searchParams.get("powrot") ?? undefined };
      router.replace(adresTablicy(nowy, inne), { scroll: false });
    });

  const zmienRodzaj = (rodzaj: RodzajFiltra) => {
    const dostepne = new Set(opcje[rodzaj].map((o) => o.value));
    const id = zaznaczone?.[rodzaj].find((x) => dostepne.has(x)) ?? opcje[rodzaj][0]?.value;
    if (id) przejdz({ rodzaj, id, tydzien: biezacy.tydzien });
  };

  return (
    <div className="filters-bar">
      <SelectField
        id="t-rodzaj"
        label="Pokaż"
        options={(Object.keys(RODZAJ_LABEL) as RodzajFiltra[]).map((r) => ({ value: r, label: RODZAJ_LABEL[r] }))}
        value={biezacy.rodzaj}
        onChange={(e) => zmienRodzaj(e.target.value as RodzajFiltra)}
      />
      <SelectField
        id="t-id"
        label={RODZAJ_LABEL[biezacy.rodzaj]}
        options={opcje[biezacy.rodzaj]}
        value={biezacy.id}
        onChange={(e) => przejdz({ ...biezacy, id: e.target.value })}
      />
      <SelectField
        id="t-tydzien"
        // Not "Tydzień": label lookups match parts of words, and the form below has "Dzień".
        label="Zakres tygodni"
        options={[
          { value: "", label: "Wszystkie tygodnie" },
          ...Array.from({ length: LICZBA_TYGODNI }, (_, i) => ({ value: String(i + 1), label: `Tydzień ${i + 1}` })),
        ]}
        value={biezacy.tydzien ? String(biezacy.tydzien) : ""}
        onChange={(e) => przejdz({ ...biezacy, tydzien: e.target.value ? Number(e.target.value) : undefined })}
      />
    </div>
  );
}
