"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Icon } from "@/components/ui/Icon";
import type { ResolveContext } from "@/lib/import";
import { pelneImie } from "@/lib/prowadzacy";

type Zakres = "calosc" | "kierunek" | "grupa" | "prowadzacy";

const ZAKRESY: { value: Zakres; label: string }[] = [
  { value: "calosc", label: "Cały plan uczelni" },
  { value: "kierunek", label: "Wybrany kierunek" },
  { value: "grupa", label: "Wybrana grupa" },
  { value: "prowadzacy", label: "Wybrany prowadzący" },
];

export function ExportPanel({ kierunki, grupy, prowadzacy }: ResolveContext) {
  const [zakres, setZakres] = useState<Zakres>("calosc");
  const [cel, setCel] = useState("");
  const [komunikat, setKomunikat] = useState(false);

  const cele: Record<Exclude<Zakres, "calosc">, { label: string; options: { value: string; label: string }[] }> = {
    kierunek: { label: "Kierunek", options: kierunki.map((k) => ({ value: k.id, label: k.nazwa })) },
    grupa: { label: "Grupa", options: grupy.map((g) => ({ value: g.id, label: g.kod })) },
    prowadzacy: { label: "Prowadzący", options: prowadzacy.map((p) => ({ value: p.id, label: pelneImie(p) })) },
  };
  const wybor = zakres === "calosc" ? null : cele[zakres];

  return (
    <section className="card" aria-labelledby="export-title">
      <div className="section-title card-head" id="export-title">
        Eksport danych
      </div>
      <div className="export-row">
        <FormField id="exp-zakres" label="Zakres eksportu">
          <select
            id="exp-zakres"
            value={zakres}
            onChange={(e) => {
              const next = e.target.value as Zakres;
              setZakres(next);
              setCel(next === "calosc" ? "" : (cele[next].options[0]?.value ?? ""));
              setKomunikat(false);
            }}
          >
            {ZAKRESY.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </FormField>
        {wybor && (
          <FormField id="exp-cel" label={wybor.label}>
            <select
              id="exp-cel"
              value={cel}
              onChange={(e) => {
                setCel(e.target.value);
                setKomunikat(false);
              }}
            >
              {wybor.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {/* TODO(backend): generate the .xlsx for `zakres`/`cel` in a route handler (e.g. exceljs)
            or a Supabase Edge Function, and return it as a download. */}
        <Button onClick={() => setKomunikat(true)}>
          <Icon name="table" />
          Eksportuj do Excela
        </Button>
      </div>
      <p className="card-note">Plik .xlsx będzie zawierał wszystkie zaplanowane zajęcia wraz z salami i prowadzącymi.</p>
      <div role="status" style={{ display: "contents" }}>
        {komunikat && (
          <div className="info-banner" style={{ marginTop: 14 }}>
            <Icon name="alert" />
            Eksport będzie dostępny po podłączeniu backendu
          </div>
        )}
      </div>
    </section>
  );
}
