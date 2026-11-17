import type { ZdarzenieWgrywania } from "@/app/import-eksport/wgraj/route";
import type { EtapSerwera, StanImportu } from "@/lib/wgrywanie-danych";

/** Where an upload is (spec 15): bytes the browser has sent, then the stage the server reported. */
export type FazaWgrywania = { krok: "wysylanie"; wyslano: number; razem: number } | { krok: EtapSerwera };

export const ADRES_WGRYWANIA = "/import-eksport/wgraj";

/** Largest file the server takes (Vercel functions accept request bodies up to 4.5 MB). */
export const MAKS_ROZMIAR = 4 * 1024 * 1024;

/** "350 KB", "1,2 MB". */
export function rozmiarPliku(bajty: number): string {
  if (bajty < 1024 * 1024) return `${(bajty > 0 ? Math.max(1, Math.round(bajty / 1024)) : 0).toLocaleString("pl-PL")} KB`;
  return `${(bajty / 1024 / 1024).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} MB`;
}

const BLAD_POLACZENIA: StanImportu = {
  status: "blad",
  komunikat: "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj jeszcze raz.",
};

/**
 * Sends the import form and reports real progress: upload bytes from `XMLHttpRequest.upload` (fetch has no upload
 * progress), then each stage line the server streams back. Resolves with the server's result; never rejects.
 */
export function wyslijDane(formData: FormData, naPostep: (f: FazaWgrywania) => void): Promise<StanImportu> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let przeczytano = 0;
    let wynik: StanImportu | null = null;

    const czytaj = () => {
      const tekst = xhr.responseText;
      for (let koniec = tekst.indexOf("\n", przeczytano); koniec !== -1; koniec = tekst.indexOf("\n", przeczytano)) {
        const linia = tekst.slice(przeczytano, koniec);
        przeczytano = koniec + 1;
        let z: ZdarzenieWgrywania;
        try {
          z = JSON.parse(linia);
        } catch {
          continue;
        }
        if ("etap" in z) naPostep({ krok: z.etap });
        else if ("wynik" in z) wynik = z.wynik;
      }
    };

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) naPostep({ krok: "wysylanie", wyslano: e.loaded, razem: e.total });
    };
    xhr.onprogress = czytaj;
    xhr.onload = () => {
      czytaj();
      if (xhr.status === 413) resolve({ status: "blad", komunikat: "Plik jest za duży (limit 4 MB)." });
      else if (xhr.status !== 200) resolve({ status: "blad", komunikat: `Serwer odrzucił plik (błąd ${xhr.status}). Nic nie zostało zmienione.` });
      else resolve(wynik ?? { status: "blad", komunikat: "Serwer przerwał wgrywanie bez wyniku. Odśwież stronę i sprawdź, czy dane się zmieniły." });
    };
    xhr.onerror = () => resolve(BLAD_POLACZENIA);
    xhr.onabort = () => resolve(BLAD_POLACZENIA);

    xhr.open("POST", ADRES_WGRYWANIA);
    xhr.send(formData);
  });
}
