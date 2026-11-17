import { wgrajPlikDanych, type EtapSerwera, type StanImportu } from "@/lib/wgrywanie-danych";

/** One line of the response: what the server started doing, or the final result (always the last line). */
export type ZdarzenieWgrywania = { etap: EtapSerwera } | { wynik: StanImportu };

/**
 * Loads an uploaded `dane_planu` file (spec 15). Unlike a Server Action this lets the page show real progress: the
 * browser reports how much of the file it sent, and the response streams one JSON line per stage of the server's work,
 * then the result.
 */
export async function POST(request: Request) {
  // A Server Action rejects cross-site posts by itself; this handler has to check it.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return new Response("Cross-site request refused.", { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    formData = new FormData();
  }

  const kodowanie = new TextEncoder();
  const strumien = new ReadableStream<Uint8Array>({
    async start(kontroler) {
      const wyslij = (z: ZdarzenieWgrywania) => kontroler.enqueue(kodowanie.encode(`${JSON.stringify(z)}\n`));
      let wynik: StanImportu;
      try {
        wynik = await wgrajPlikDanych(formData, (etap) => wyslij({ etap }));
      } catch {
        wynik = { status: "blad", komunikat: "Serwer nie dokończył wgrywania. Nic nie zostało zmienione." };
      }
      wyslij({ wynik });
      kontroler.close();
    },
  });

  return new Response(strumien, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // no-transform keeps compression from holding the stage lines back until the end.
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
