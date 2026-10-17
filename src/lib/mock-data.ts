// Mock data taken from the design canvas. Only src/lib/data/* may import this file.
// TODO(backend): delete once every data function reads from Supabase.
import type { Grupa, Kierunek, Prowadzacy, Zajecia } from "./types";

export const KIERUNKI: Kierunek[] = [
  { id: "informatyka", nazwa: "Informatyka" },
  { id: "zarzadzanie", nazwa: "Zarządzanie" },
  { id: "ekonomia", nazwa: "Ekonomia" },
];

export const GRUPY: Grupa[] = [
  { id: "inf-2a", kod: "INF-2A", kierunekId: "informatyka", tryb: "stacjonarne", liczbaStudentow: 28 },
  { id: "inf-2b", kod: "INF-2B", kierunekId: "informatyka", tryb: "stacjonarne", liczbaStudentow: 26 },
  { id: "inf-z-3", kod: "INF/Z-3", kierunekId: "informatyka", tryb: "niestacjonarne", liczbaStudentow: 32 },
  { id: "inf-z-2", kod: "INF/Z-2", kierunekId: "informatyka", tryb: "niestacjonarne", liczbaStudentow: 30 },
  { id: "zip-1a", kod: "ZIP-1A", kierunekId: "zarzadzanie", tryb: "stacjonarne", liczbaStudentow: 24 },
  { id: "zip-z-2", kod: "ZIP/Z-2", kierunekId: "zarzadzanie", tryb: "niestacjonarne", liczbaStudentow: 29 },
  { id: "eko-3a", kod: "EKO-3A", kierunekId: "ekonomia", tryb: "stacjonarne", liczbaStudentow: 22 },
  { id: "eko-z-1", kod: "EKO/Z-1", kierunekId: "ekonomia", tryb: "niestacjonarne", liczbaStudentow: 27 },
];

export const PROWADZACY: Prowadzacy[] = [
  {
    id: "e-kaminska",
    tytul: "prof.",
    imie: "Ewa",
    nazwisko: "Kamińska",
    instytut: "Instytut Informatyki",
    email: "e.kaminska@uczelnia.edu.pl",
    przedmioty: ["Bazy danych", "SQL"],
  },
  {
    id: "m-nowak",
    tytul: "dr hab.",
    imie: "Marta",
    nazwisko: "Nowak",
    instytut: "Instytut Informatyki",
    email: "m.nowak@uczelnia.edu.pl",
    przedmioty: ["Programowanie obiektowe"],
  },
  {
    id: "t-gorski",
    tytul: "mgr inż.",
    imie: "Tomasz",
    nazwisko: "Górski",
    instytut: "Instytut Informatyki",
    email: "t.gorski@uczelnia.edu.pl",
    przedmioty: ["Programowanie obiektowe", "Algorytmy i struktury danych"],
  },
  {
    id: "p-zielinski",
    tytul: "dr",
    imie: "Paweł",
    nazwisko: "Zieliński",
    instytut: "Instytut Informatyki",
    email: "p.zielinski@uczelnia.edu.pl",
    przedmioty: ["Sieci komputerowe"],
  },
  {
    id: "m-sobolewski",
    tytul: "dr",
    imie: "Marek",
    nazwisko: "Sobolewski",
    instytut: "Instytut Matematyki",
    email: "m.sobolewski@uczelnia.edu.pl",
    przedmioty: ["Matematyka dyskretna"],
  },
  {
    id: "a-krupa",
    tytul: "mgr",
    imie: "Alicja",
    nazwisko: "Krupa",
    instytut: "Studium Języków Obcych",
    email: "a.krupa@uczelnia.edu.pl",
    przedmioty: ["Język angielski spec."],
  },
];

export const ZAJECIA: Zajecia[] = [
  // INF/Z-3 (niestacjonarne): exactly as on the "Harmonogram grup" design
  { id: "z1", przedmiot: "Sieci komputerowe", typ: "wyklad", prowadzacyId: "p-zielinski", grupaId: "inf-z-3", dzien: 5, od: "16:00", do: "18:00", sala: "B21", powtarzalnosc: "co-tydzien" },
  { id: "z2", przedmiot: "Bazy danych", typ: "wyklad", prowadzacyId: "e-kaminska", grupaId: "inf-z-3", dzien: 5, od: "18:00", do: "20:00", sala: "B21", powtarzalnosc: "co-tydzien" },
  { id: "z3", przedmiot: "Programowanie obiektowe", typ: "cwiczenia", prowadzacyId: "t-gorski", grupaId: "inf-z-3", dzien: 6, od: "08:00", do: "10:00", sala: "Lab 3", powtarzalnosc: "co-tydzien" },
  { id: "z4", przedmiot: "Programowanie obiektowe", typ: "wyklad", prowadzacyId: "m-nowak", grupaId: "inf-z-3", dzien: 6, od: "10:00", do: "12:00", sala: "Aula C", powtarzalnosc: "co-tydzien" },
  { id: "z5", przedmiot: "Matematyka dyskretna", typ: "wyklad", prowadzacyId: "m-sobolewski", grupaId: "inf-z-3", dzien: 6, od: "12:00", do: "14:00", sala: "B21", powtarzalnosc: "co-tydzien" },
  { id: "z6", przedmiot: "Algorytmy i struktury danych", typ: "cwiczenia", prowadzacyId: "t-gorski", grupaId: "inf-z-3", dzien: 6, od: "14:00", do: "16:00", sala: "Lab 1", powtarzalnosc: "co-tydzien" },
  { id: "z7", przedmiot: "Bazy danych", typ: "laboratorium", prowadzacyId: "e-kaminska", grupaId: "inf-z-3", dzien: 6, od: "16:00", do: "18:00", sala: "Lab 2", powtarzalnosc: "co-tydzien" },
  { id: "z8", przedmiot: "Język angielski spec.", typ: "cwiczenia", prowadzacyId: "a-krupa", grupaId: "inf-z-3", dzien: 7, od: "08:00", do: "10:00", sala: "C14", powtarzalnosc: "co-tydzien" },
  { id: "z9", przedmiot: "Sieci komputerowe", typ: "laboratorium", prowadzacyId: "p-zielinski", grupaId: "inf-z-3", dzien: 7, od: "10:00", do: "12:00", sala: "Lab 4", powtarzalnosc: "co-tydzien" },
  { id: "z10", przedmiot: "Matematyka dyskretna", typ: "cwiczenia", prowadzacyId: "m-sobolewski", grupaId: "inf-z-3", dzien: 7, od: "12:00", do: "14:00", sala: "B9", powtarzalnosc: "co-tydzien" },

  // dr Paweł Zieliński in stationary groups ("Harmonogram prowadzącego" design)
  { id: "z11", przedmiot: "Sieci komputerowe", typ: "wyklad", prowadzacyId: "p-zielinski", grupaId: "inf-2a", dzien: 1, od: "10:00", do: "12:00", sala: "B21", powtarzalnosc: "co-tydzien" },
  { id: "z12", przedmiot: "Sieci komputerowe", typ: "laboratorium", prowadzacyId: "p-zielinski", grupaId: "inf-2b", dzien: 2, od: "14:00", do: "16:00", sala: "Lab 4", powtarzalnosc: "co-tydzien" },

  // Extra stationary classes so the weekday view and week parity have something to show
  { id: "z13", przedmiot: "Bazy danych", typ: "wyklad", prowadzacyId: "e-kaminska", grupaId: "inf-2a", dzien: 1, od: "08:00", do: "10:00", sala: "Aula C", powtarzalnosc: "co-tydzien" },
  { id: "z14", przedmiot: "Programowanie obiektowe", typ: "laboratorium", prowadzacyId: "t-gorski", grupaId: "inf-2a", dzien: 3, od: "10:00", do: "12:00", sala: "Lab 3", powtarzalnosc: "parzyste" },
  { id: "z15", przedmiot: "Matematyka dyskretna", typ: "cwiczenia", prowadzacyId: "m-sobolewski", grupaId: "inf-2a", dzien: 4, od: "12:00", do: "13:30", sala: "B9", powtarzalnosc: "nieparzyste" },
  { id: "z16", przedmiot: "Algorytmy i struktury danych", typ: "wyklad", prowadzacyId: "t-gorski", grupaId: "inf-2b", dzien: 3, od: "08:00", do: "10:00", sala: "B21", powtarzalnosc: "co-tydzien" },
  { id: "z17", przedmiot: "Język angielski spec.", typ: "cwiczenia", prowadzacyId: "a-krupa", grupaId: "inf-2b", dzien: 4, od: "10:15", do: "11:45", sala: "C14", powtarzalnosc: "co-tydzien" },
];
