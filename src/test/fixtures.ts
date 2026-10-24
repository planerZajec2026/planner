// Small, fixed data for component and unit tests. The app reads real data from the database, so tests don't depend on
// it; two programmes are listed so the programme → group cascade has something to switch between.
import type { Grupa, Kierunek, Prowadzacy } from "@/lib/types";

export const KIERUNKI: Kierunek[] = [
  { id: "fizyka", nazwa: "Fizyka" },
  { id: "informatyka", nazwa: "Informatyka" },
];

const rok = (id: string, kierunekId: string, nazwa: string) => ({ rocznikId: id, kierunekId, rocznikNazwa: nazwa });

export const GRUPY: Grupa[] = [
  { id: "FIZ-R1-ALL", kod: "FIZ-R1-ALL", ...rok("FIZ-R1", "fizyka", "Fizyka I st., rok I, sem. I"), liczbaStudentow: 40 },
  { id: "INF1-R1-ALL", kod: "INF1-R1-ALL", ...rok("INF1-R1", "informatyka", "Informatyka I st., rok I, sem. I"), liczbaStudentow: 118 },
  {
    id: "INF1-R1-G1",
    kod: "INF1-R1-G1",
    ...rok("INF1-R1", "informatyka", "Informatyka I st., rok I, sem. I"),
    nadrzednaId: "INF1-R1-ALL",
    liczbaStudentow: 24,
  },
  {
    id: "INF1-R1-G2",
    kod: "INF1-R1-G2",
    ...rok("INF1-R1", "informatyka", "Informatyka I st., rok I, sem. I"),
    nadrzednaId: "INF1-R1-ALL",
    liczbaStudentow: 1,
  },
];

export const PROWADZACY: Prowadzacy[] = [
  { id: "P01", stopien: "dr", nazwa: "dr P01", jednostka: "WFiIS", przedmioty: ["Algorytmy i struktury danych", "Bazy danych"] },
  { id: "P02", stopien: "prof.", nazwa: "prof. P02", jednostka: "WFiIS", przedmioty: ["Analiza matematyczna I"] },
  { id: "P03", stopien: "mgr", nazwa: "mgr P03", jednostka: "SJO", przedmioty: ["Język angielski"] },
];
