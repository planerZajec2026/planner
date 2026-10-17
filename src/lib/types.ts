// Domain model. Field names mirror the planned Supabase tables (snake_case columns map 1:1).

export type TrybStudiow = "stacjonarne" | "niestacjonarne";

export type Kierunek = {
  id: string;
  nazwa: string;
};

export type Grupa = {
  id: string;
  /** Group code shown in the UI, e.g. "INF/Z-3". */
  kod: string;
  kierunekId: string;
  tryb: TrybStudiow;
  liczbaStudentow: number;
};

export type TytulNaukowy = "mgr" | "mgr inż." | "dr" | "dr inż." | "dr hab." | "prof.";

export type Prowadzacy = {
  id: string;
  tytul: TytulNaukowy;
  imie: string;
  nazwisko: string;
  instytut: string;
  email: string;
  przedmioty: string[];
  zdjecieUrl?: string;
};

export type TypZajec = "wyklad" | "cwiczenia" | "laboratorium" | "seminarium";

/** 1 = poniedziałek … 7 = niedziela */
export type DzienTygodnia = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Powtarzalnosc = "co-tydzien" | "parzyste" | "nieparzyste";

export type Zajecia = {
  id: string;
  przedmiot: string;
  typ: TypZajec;
  prowadzacyId: string;
  grupaId: string;
  dzien: DzienTygodnia;
  /** "HH:MM" */
  od: string;
  /** "HH:MM" */
  do: string;
  sala: string;
  powtarzalnosc: Powtarzalnosc;
};
