// Domain model of the pages that browse the generator's data (spec 13). The rows come from the database through
// src/lib/data/*; the field names here are the app's own and are mapped from the Polish table columns there.

export type Kierunek = {
  id: string;
  nazwa: string;
};

export type Grupa = {
  id: string;
  /** Group code shown in the UI, e.g. "INF1-R1-G1". */
  kod: string;
  kierunekId: string;
  rocznikId: string;
  /** e.g. "Informatyka I st., rok I, sem. I" */
  rocznikNazwa: string;
  /** The group this one is part of (a lab group belongs to the whole year), if any. */
  nadrzednaId?: string;
  liczbaStudentow: number;
};

export type Prowadzacy = {
  id: string;
  /** Academic degree, e.g. "dr", "dr hab.", "prof.". */
  stopien: string;
  /** How the person is shown: degree and pseudonym, e.g. "dr P01". */
  nazwa: string;
  jednostka: string;
  przedmioty: string[];
};

/** The four block styles of the calendar. */
export type TypZajec = "wyklad" | "cwiczenia" | "laboratorium" | "seminarium";

/** 1 = poniedziałek … 7 = niedziela */
export type DzienTygodnia = 1 | 2 | 3 | 4 | 5 | 6 | 7;
