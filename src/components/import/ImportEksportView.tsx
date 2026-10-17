"use client";

import { useState } from "react";
import type { ResolveContext } from "@/lib/import";
import type { Zajecia } from "@/lib/types";
import { ExportPanel } from "./ExportPanel";
import { JsonImport } from "./JsonImport";
import { ManualZajeciaForm } from "./ManualZajeciaForm";

/** Holds the local (unsaved) plan so imports and manual additions see each other's changes. */
export function ImportEksportView({ zajecia: initial, ...ctx }: ResolveContext & { zajecia: Zajecia[] }) {
  const [zajecia, setZajecia] = useState(initial);

  return (
    <>
      <JsonImport
        {...ctx}
        istniejace={zajecia}
        onImport={(dodaj, usun) => setZajecia((prev) => [...prev.filter((z) => !usun.includes(z.id)), ...dodaj])}
      />
      <ManualZajeciaForm {...ctx} istniejace={zajecia} onAdd={(z) => setZajecia((prev) => [...prev, z])} />
      <ExportPanel {...ctx} />
    </>
  );
}
