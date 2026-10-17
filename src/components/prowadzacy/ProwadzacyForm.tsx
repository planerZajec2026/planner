"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TYTULY } from "@/lib/labels";
import type { Prowadzacy, TytulNaukowy } from "@/lib/types";

type Pole = "imie" | "nazwisko" | "email";
type Bledy = Partial<Record<Pole, string>>;

const WYMAGANE = "To pole jest wymagane";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProwadzacyFormProps = {
  onSave: (prowadzacy: Omit<Prowadzacy, "id">) => void;
  onCancel: () => void;
};

function walidacja(imie: string, nazwisko: string, email: string): Bledy {
  const bledy: Bledy = {};
  if (!imie) bledy.imie = WYMAGANE;
  if (!nazwisko) bledy.nazwisko = WYMAGANE;
  if (!email) bledy.email = WYMAGANE;
  else if (!EMAIL_RE.test(email)) bledy.email = "Nieprawidłowy adres e-mail";
  return bledy;
}

/** Props for an input that may show an error from `bledy`. */
function errorProps(bledy: Bledy, pole: Pole) {
  return bledy[pole]
    ? { "aria-invalid": true as const, "aria-describedby": `np-${pole}-error` }
    : {};
}

export function ProwadzacyForm({ onSave, onCancel }: ProwadzacyFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [bledy, setBledy] = useState<Bledy>({});

  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>("#np-imie")?.focus({ preventScroll: true });
  }, []);

  const clearError = (pole: Pole) => {
    if (bledy[pole]) setBledy((prev) => ({ ...prev, [pole]: undefined }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();

    const imie = text("imie");
    const nazwisko = text("nazwisko");
    const email = text("email");
    const nextBledy = walidacja(imie, nazwisko, email);
    setBledy(nextBledy);
    const firstInvalid = (Object.keys(nextBledy) as Pole[])[0];
    if (firstInvalid) {
      form.querySelector<HTMLInputElement>(`#np-${firstInvalid}`)?.focus();
      return;
    }

    // TODO(backend): upload the photo to Supabase Storage and store its public URL as `zdjecie_url`.
    const zdjecie = data.get("zdjecie");
    const zdjecieUrl = zdjecie instanceof File && zdjecie.size > 0 ? URL.createObjectURL(zdjecie) : undefined;

    // TODO(backend): insert into Supabase `prowadzacy` (server action) and revalidate the list;
    //   the server must also reject an e-mail that is already taken.
    onSave({
      tytul: text("tytul") as TytulNaukowy,
      imie,
      nazwisko,
      instytut: text("instytut"),
      email,
      przedmioty: text("przedmioty")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      zdjecieUrl,
    });
    form.reset();
  };

  return (
    <form ref={formRef} className="card form-panel" noValidate onSubmit={handleSubmit} aria-labelledby="np-title">
      <div className="section-title" id="np-title">
        Nowy prowadzący
      </div>
      <div className="form-grid">
        <FormField id="np-imie" label="Imię *" error={bledy.imie}>
          <input
            id="np-imie"
            name="imie"
            type="text"
            placeholder="np. Katarzyna"
            autoComplete="off"
            aria-required="true"
            onChange={() => clearError("imie")}
            {...errorProps(bledy, "imie")}
          />
        </FormField>
        <FormField id="np-nazwisko" label="Nazwisko *" error={bledy.nazwisko}>
          <input
            id="np-nazwisko"
            name="nazwisko"
            type="text"
            placeholder="np. Lewandowska"
            autoComplete="off"
            aria-required="true"
            onChange={() => clearError("nazwisko")}
            {...errorProps(bledy, "nazwisko")}
          />
        </FormField>
        <FormField id="np-tytul" label="Tytuł naukowy">
          <select id="np-tytul" name="tytul">
            {TYTULY.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </FormField>
        <FormField id="np-instytut" label="Instytut / Katedra">
          <input id="np-instytut" name="instytut" type="text" placeholder="np. Instytut Informatyki" />
        </FormField>
        <FormField id="np-email" label="E-mail *" error={bledy.email}>
          <input
            id="np-email"
            name="email"
            type="email"
            placeholder="np.lewandowska@uczelnia.edu.pl"
            autoComplete="off"
            aria-required="true"
            onChange={() => clearError("email")}
            {...errorProps(bledy, "email")}
          />
        </FormField>
        <FormField id="np-przedmioty" label="Przedmioty" hint="Oddziel przecinkami">
          <input
            id="np-przedmioty"
            name="przedmioty"
            type="text"
            placeholder="np. Bazy danych, SQL"
            aria-describedby="np-przedmioty-hint"
          />
        </FormField>
        <FormField id="np-zdjecie" label="Zdjęcie">
          <input id="np-zdjecie" name="zdjecie" type="file" accept="image/*" />
        </FormField>
      </div>
      <div className="form-actions">
        <Button type="submit">Zapisz prowadzącego</Button>
        <Button variant="secondary" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
