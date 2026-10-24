
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "blokady_stale": {
                  Row: {
                    "dzien": number,"grupa_id": string,"id": number,"opis": string | null,"slot_do": number,"slot_od": number
                  }
                  ComputedFields: never
                  Insert: {
                    "dzien": number,"grupa_id": string,"id"?: number,"opis"?: string | null,"slot_do": number,"slot_od": number
                  }
                  Update: {
                    "dzien"?: number,"grupa_id"?: string,"id"?: number,"opis"?: string | null,"slot_do"?: number,"slot_od"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "blokady_stale_grupa_id_fkey"
      columns: ["grupa_id"]
isOneToOne: false
      referencedRelation: "grupy_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"dezyderaty_ogolne": {
                  Row: {
                    "inne_uwagi": string | null,"liczba_godzin_wykluczonych": number,"powod_wykluczen": string | null,"preferencja_dni": string,"prowadzacy_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "inne_uwagi"?: string | null,"liczba_godzin_wykluczonych"?: number,"powod_wykluczen"?: string | null,"preferencja_dni"?: string,"prowadzacy_id": string
                  }
                  Update: {
                    "inne_uwagi"?: string | null,"liczba_godzin_wykluczonych"?: number,"powod_wykluczen"?: string | null,"preferencja_dni"?: string,"prowadzacy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dezyderaty_ogolne_prowadzacy_id_fkey"
      columns: ["prowadzacy_id"]
isOneToOne: true
      referencedRelation: "prowadzacy_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"dezyderaty_sale": {
                  Row: {
                    "forma": string | null,"id": number,"prowadzacy_id": string,"przedmiot": string,"rodzaj_sali_nr": string | null,"sprzet": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "forma"?: string | null,"id"?: number,"prowadzacy_id": string,"przedmiot": string,"rodzaj_sali_nr"?: string | null,"sprzet"?: string | null
                  }
                  Update: {
                    "forma"?: string | null,"id"?: number,"prowadzacy_id"?: string,"przedmiot"?: string,"rodzaj_sali_nr"?: string | null,"sprzet"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dezyderaty_sale_prowadzacy_id_fkey"
      columns: ["prowadzacy_id"]
isOneToOne: false
      referencedRelation: "prowadzacy_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"dezyderaty_terminy": {
                  Row: {
                    "dzien": number,"prowadzacy_id": string,"slot": number,"typ": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dzien": number,"prowadzacy_id": string,"slot": number,"typ": string
                  }
                  Update: {
                    "dzien"?: number,"prowadzacy_id"?: string,"slot"?: number,"typ"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dezyderaty_terminy_prowadzacy_id_fkey"
      columns: ["prowadzacy_id"]
isOneToOne: false
      referencedRelation: "prowadzacy_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"dni_wolne": {
                  Row: {
                    "data": string,"opis": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data": string,"opis": string
                  }
                  Update: {
                    "data"?: string,"opis"?: string
                  }
                  Relationships: [
                    
                  ]
                },"generation_jobs": {
                  Row: {
                    "blad": string | null,"id": string,"parametry": NonNullable<Json>,"raport": Json | null,"rozpoczeto": string | null,"status": Database["public"]['Enums']["status_zadania"],"utworzono": string,"wynik_miekkich": number | null,"zakonczono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "blad"?: string | null,"id"?: string,"parametry"?: NonNullable<Json>,"raport"?: Json | null,"rozpoczeto"?: string | null,"status"?: Database["public"]['Enums']["status_zadania"],"utworzono"?: string,"wynik_miekkich"?: number | null,"zakonczono"?: string | null
                  }
                  Update: {
                    "blad"?: string | null,"id"?: string,"parametry"?: NonNullable<Json>,"raport"?: Json | null,"rozpoczeto"?: string | null,"status"?: Database["public"]['Enums']["status_zadania"],"utworzono"?: string,"wynik_miekkich"?: number | null,"zakonczono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"grupy": {
                  Row: {
                    "created_at": string,"id": string,"kierunek_id": string,"kod": string,"liczba_studentow": number,"tryb": Database["public"]['Enums']["tryb_studiow"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kierunek_id": string,"kod": string,"liczba_studentow"?: number,"tryb": Database["public"]['Enums']["tryb_studiow"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kierunek_id"?: string,"kod"?: string,"liczba_studentow"?: number,"tryb"?: Database["public"]['Enums']["tryb_studiow"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "grupy_kierunek_id_fkey"
      columns: ["kierunek_id"]
isOneToOne: false
      referencedRelation: "kierunki"
      referencedColumns: ["id"]
    }
                  ]
                },"grupy_plan": {
                  Row: {
                    "grupa_nadrzedna": string | null,"id": string,"liczba_studentow": number,"nazwa": string,"podzial": string | null,"rocznik_id": string,"typ": string
                  }
                  ComputedFields: never
                  Insert: {
                    "grupa_nadrzedna"?: string | null,"id": string,"liczba_studentow": number,"nazwa": string,"podzial"?: string | null,"rocznik_id": string,"typ": string
                  }
                  Update: {
                    "grupa_nadrzedna"?: string | null,"id"?: string,"liczba_studentow"?: number,"nazwa"?: string,"podzial"?: string | null,"rocznik_id"?: string,"typ"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grupy_plan_grupa_nadrzedna_fkey"
      columns: ["grupa_nadrzedna"]
isOneToOne: false
      referencedRelation: "grupy_plan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "grupy_plan_rocznik_id_fkey"
      columns: ["rocznik_id"]
isOneToOne: false
      referencedRelation: "roczniki"
      referencedColumns: ["id"]
    }
                  ]
                },"kalendarz": {
                  Row: {
                    "data": string,"dzien_tygodnia": string,"nr_tygodnia": number | null,"opis": string,"plan_dnia": number | null,"typ_dnia": Database["public"]['Enums']["typ_dnia"]
                  }
                  ComputedFields: never
                  Insert: {
                    "data": string,"dzien_tygodnia": string,"nr_tygodnia"?: number | null,"opis"?: string,"plan_dnia"?: number | null,"typ_dnia": Database["public"]['Enums']["typ_dnia"]
                  }
                  Update: {
                    "data"?: string,"dzien_tygodnia"?: string,"nr_tygodnia"?: number | null,"opis"?: string,"plan_dnia"?: number | null,"typ_dnia"?: Database["public"]['Enums']["typ_dnia"]
                  }
                  Relationships: [
                    
                  ]
                },"kierunki": {
                  Row: {
                    "created_at": string,"id": string,"nazwa": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nazwa": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nazwa"?: string
                  }
                  Relationships: [
                    
                  ]
                },"kolizje_grup": {
                  Row: {
                    "grupa_a": string,"grupa_b": string,"wspolni_studenci": number
                  }
                  ComputedFields: never
                  Insert: {
                    "grupa_a": string,"grupa_b": string,"wspolni_studenci": number
                  }
                  Update: {
                    "grupa_a"?: string,"grupa_b"?: string,"wspolni_studenci"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "kolizje_grup_grupa_a_fkey"
      columns: ["grupa_a"]
isOneToOne: false
      referencedRelation: "grupy_plan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kolizje_grup_grupa_b_fkey"
      columns: ["grupa_b"]
isOneToOne: false
      referencedRelation: "grupy_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"odwolane_zajecia": {
                  Row: {
                    "data": string,"powod": string | null,"zajecia_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "data": string,"powod"?: string | null,"zajecia_id": number
                  }
                  Update: {
                    "data"?: string,"powod"?: string | null,"zajecia_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "odwolane_zajecia_zajecia_id_fkey"
      columns: ["zajecia_id"]
isOneToOne: false
      referencedRelation: "zajecia"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_zajec": {
                  Row: {
                    "dzien": number,"job_id": string,"sala_id": string,"slot": number,"tygodnie": (number)[],"zajecia_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dzien": number,"job_id": string,"sala_id": string,"slot": number,"tygodnie": (number)[],"zajecia_id": string
                  }
                  Update: {
                    "dzien"?: number,"job_id"?: string,"sala_id"?: string,"slot"?: number,"tygodnie"?: (number)[],"zajecia_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_zajec_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "generation_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_zajec_sala_id_fkey"
      columns: ["sala_id"]
isOneToOne: false
      referencedRelation: "sale"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_zajec_zajecia_id_fkey"
      columns: ["zajecia_id"]
isOneToOne: false
      referencedRelation: "zajecia_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"prowadzacy": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"imie": string,"instytut": string,"nazwisko": string,"tytul": Database["public"]['Enums']["tytul_naukowy"],"zdjecie_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"imie": string,"instytut"?: string,"nazwisko": string,"tytul": Database["public"]['Enums']["tytul_naukowy"],"zdjecie_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"imie"?: string,"instytut"?: string,"nazwisko"?: string,"tytul"?: Database["public"]['Enums']["tytul_naukowy"],"zdjecie_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"prowadzacy_plan": {
                  Row: {
                    "czlonek_rady_wydzialu": boolean,"id": string,"jednostka": string | null,"nazwa": string,"stopien": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "czlonek_rady_wydzialu"?: boolean,"id": string,"jednostka"?: string | null,"nazwa": string,"stopien"?: string | null
                  }
                  Update: {
                    "czlonek_rady_wydzialu"?: boolean,"id"?: string,"jednostka"?: string | null,"nazwa"?: string,"stopien"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"prowadzacy_przedmioty": {
                  Row: {
                    "prowadzacy_id": string,"przedmiot_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "prowadzacy_id": string,"przedmiot_id": number
                  }
                  Update: {
                    "prowadzacy_id"?: string,"przedmiot_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "prowadzacy_przedmioty_prowadzacy_id_fkey"
      columns: ["prowadzacy_id"]
isOneToOne: false
      referencedRelation: "prowadzacy"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prowadzacy_przedmioty_przedmiot_id_fkey"
      columns: ["przedmiot_id"]
isOneToOne: false
      referencedRelation: "przedmioty"
      referencedColumns: ["id"]
    }
                  ]
                },"przedmioty": {
                  Row: {
                    "id": number,"nazwa": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"nazwa": string
                  }
                  Update: {
                    "id"?: number,"nazwa"?: string
                  }
                  Relationships: [
                    
                  ]
                },"przedmioty_plan": {
                  Row: {
                    "id": string,"nazwa": string,"rocznik_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"nazwa": string,"rocznik_id": string
                  }
                  Update: {
                    "id"?: string,"nazwa"?: string,"rocznik_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "przedmioty_plan_rocznik_id_fkey"
      columns: ["rocznik_id"]
isOneToOne: false
      referencedRelation: "roczniki"
      referencedColumns: ["id"]
    }
                  ]
                },"rada_wydzialu": {
                  Row: {
                    "dzien": number,"id": number,"opis": string | null,"slot_do": number,"slot_od": number
                  }
                  ComputedFields: never
                  Insert: {
                    "dzien": number,"id"?: number,"opis"?: string | null,"slot_do": number,"slot_od": number
                  }
                  Update: {
                    "dzien"?: number,"id"?: number,"opis"?: string | null,"slot_do"?: number,"slot_od"?: number
                  }
                  Relationships: [
                    
                  ]
                },"roczniki": {
                  Row: {
                    "id": string,"kierunek": string,"liczba_studentow": number,"nazwa": string,"rok": number,"semestr": number,"stopien_studiow": string,"syntetyczny": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"kierunek": string,"liczba_studentow": number,"nazwa": string,"rok": number,"semestr": number,"stopien_studiow": string,"syntetyczny"?: boolean
                  }
                  Update: {
                    "id"?: string,"kierunek"?: string,"liczba_studentow"?: number,"nazwa"?: string,"rok"?: number,"semestr"?: number,"stopien_studiow"?: string,"syntetyczny"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"sale": {
                  Row: {
                    "budynek": string,"dostepna_do_planowania": boolean,"id": string,"metraz_m2": number | null,"nazwa": string | null,"pojemnosc": number | null,"pojemnosc_szacowana": boolean,"przeznaczenie": string | null,"typ": string,"uwagi": string | null,"wyposazenie": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "budynek": string,"dostepna_do_planowania"?: boolean,"id": string,"metraz_m2"?: number | null,"nazwa"?: string | null,"pojemnosc"?: number | null,"pojemnosc_szacowana"?: boolean,"przeznaczenie"?: string | null,"typ": string,"uwagi"?: string | null,"wyposazenie"?: (string)[]
                  }
                  Update: {
                    "budynek"?: string,"dostepna_do_planowania"?: boolean,"id"?: string,"metraz_m2"?: number | null,"nazwa"?: string | null,"pojemnosc"?: number | null,"pojemnosc_szacowana"?: boolean,"przeznaczenie"?: string | null,"typ"?: string,"uwagi"?: string | null,"wyposazenie"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"sloty": {
                  Row: {
                    "do": string,"od": string,"slot": number
                  }
                  ComputedFields: never
                  Insert: {
                    "do": string,"od": string,"slot": number
                  }
                  Update: {
                    "do"?: string,"od"?: string,"slot"?: number
                  }
                  Relationships: [
                    
                  ]
                },"studenci": {
                  Row: {
                    "id": string,"rocznik_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"rocznik_id": string
                  }
                  Update: {
                    "id"?: string,"rocznik_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "studenci_rocznik_id_fkey"
      columns: ["rocznik_id"]
isOneToOne: false
      referencedRelation: "roczniki"
      referencedColumns: ["id"]
    }
                  ]
                },"studenci_grupy": {
                  Row: {
                    "grupa_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "grupa_id": string,"student_id": string
                  }
                  Update: {
                    "grupa_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "studenci_grupy_grupa_id_fkey"
      columns: ["grupa_id"]
isOneToOne: false
      referencedRelation: "grupy_plan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "studenci_grupy_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "studenci"
      referencedColumns: ["id"]
    }
                  ]
                },"ustawienia": {
                  Row: {
                    "id": boolean,"rok_akademicki": string,"semestr": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"rok_akademicki": string,"semestr": string
                  }
                  Update: {
                    "id"?: boolean,"rok_akademicki"?: string,"semestr"?: string
                  }
                  Relationships: [
                    
                  ]
                },"zajecia": {
                  Row: {
                    "created_at": string,"czas": unknown,"dzien": number,"godzina_do": string,"godzina_od": string,"grupa_id": string,"id": number,"powtarzalnosc": Database["public"]['Enums']["powtarzalnosc"],"prowadzacy_id": string,"przedmiot_id": number,"sala": string,"tygodnie": unknown,"typ": Database["public"]['Enums']["typ_zajec"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"czas"?: never,"dzien": number,"godzina_do": string,"godzina_od": string,"grupa_id": string,"id"?: number,"powtarzalnosc"?: Database["public"]['Enums']["powtarzalnosc"],"prowadzacy_id": string,"przedmiot_id": number,"sala": string,"tygodnie"?: never,"typ": Database["public"]['Enums']["typ_zajec"]
                  }
                  Update: {
                    "created_at"?: string,"czas"?: never,"dzien"?: number,"godzina_do"?: string,"godzina_od"?: string,"grupa_id"?: string,"id"?: number,"powtarzalnosc"?: Database["public"]['Enums']["powtarzalnosc"],"prowadzacy_id"?: string,"przedmiot_id"?: number,"sala"?: string,"tygodnie"?: never,"typ"?: Database["public"]['Enums']["typ_zajec"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "zajecia_grupa_id_fkey"
      columns: ["grupa_id"]
isOneToOne: false
      referencedRelation: "grupy"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "zajecia_prowadzacy_id_fkey"
      columns: ["prowadzacy_id"]
isOneToOne: false
      referencedRelation: "prowadzacy"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "zajecia_przedmiot_id_fkey"
      columns: ["przedmiot_id"]
isOneToOne: false
      referencedRelation: "przedmioty"
      referencedColumns: ["id"]
    }
                  ]
                },"zajecia_plan": {
                  Row: {
                    "czestotliwosc": string,"dodatkowi_studenci": number,"dozwolone_sale": (string)[],"forma": string,"godziny_programowe": number | null,"id": string,"laczone_z": string | null,"liczba_spotkan": number,"liczba_studentow": number,"powiazanie": string | null,"przedmiot_id": string,"rocznik_id": string,"sloty_na_spotkanie": number,"tryb": string,"tydzien_do": number,"tydzien_od": number,"tygodnie_niedostepne": (number)[],"typ_powiazania": string | null,"typy_sal": (string)[],"uwagi": string | null,"wymagane_wyposazenie": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "czestotliwosc": string,"dodatkowi_studenci"?: number,"dozwolone_sale"?: (string)[],"forma": string,"godziny_programowe"?: number | null,"id": string,"laczone_z"?: string | null,"liczba_spotkan": number,"liczba_studentow": number,"powiazanie"?: string | null,"przedmiot_id": string,"rocznik_id": string,"sloty_na_spotkanie": number,"tryb": string,"tydzien_do": number,"tydzien_od": number,"tygodnie_niedostepne"?: (number)[],"typ_powiazania"?: string | null,"typy_sal"?: (string)[],"uwagi"?: string | null,"wymagane_wyposazenie"?: (string)[]
                  }
                  Update: {
                    "czestotliwosc"?: string,"dodatkowi_studenci"?: number,"dozwolone_sale"?: (string)[],"forma"?: string,"godziny_programowe"?: number | null,"id"?: string,"laczone_z"?: string | null,"liczba_spotkan"?: number,"liczba_studentow"?: number,"powiazanie"?: string | null,"przedmiot_id"?: string,"rocznik_id"?: string,"sloty_na_spotkanie"?: number,"tryb"?: string,"tydzien_do"?: number,"tydzien_od"?: number,"tygodnie_niedostepne"?: (number)[],"typ_powiazania"?: string | null,"typy_sal"?: (string)[],"uwagi"?: string | null,"wymagane_wyposazenie"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "zajecia_plan_przedmiot_id_fkey"
      columns: ["przedmiot_id"]
isOneToOne: false
      referencedRelation: "przedmioty_plan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "zajecia_plan_rocznik_id_fkey"
      columns: ["rocznik_id"]
isOneToOne: false
      referencedRelation: "roczniki"
      referencedColumns: ["id"]
    }
                  ]
                },"zajecia_plan_grupy": {
                  Row: {
                    "grupa_id": string,"zajecia_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "grupa_id": string,"zajecia_id": string
                  }
                  Update: {
                    "grupa_id"?: string,"zajecia_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "zajecia_plan_grupy_grupa_id_fkey"
      columns: ["grupa_id"]
isOneToOne: false
      referencedRelation: "grupy_plan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "zajecia_plan_grupy_zajecia_id_fkey"
      columns: ["zajecia_id"]
isOneToOne: false
      referencedRelation: "zajecia_plan"
      referencedColumns: ["id"]
    }
                  ]
                },"zajecia_plan_prowadzacy": {
                  Row: {
                    "prowadzacy_id": string,"zajecia_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "prowadzacy_id": string,"zajecia_id": string
                  }
                  Update: {
                    "prowadzacy_id"?: string,"zajecia_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "zajecia_plan_prowadzacy_prowadzacy_id_fkey"
      columns: ["prowadzacy_id"]
isOneToOne: false
      referencedRelation: "prowadzacy_plan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "zajecia_plan_prowadzacy_zajecia_id_fkey"
      columns: ["zajecia_id"]
isOneToOne: false
      referencedRelation: "zajecia_plan"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "plan_spotkania": {
                  Row: {
                    "data": string | null,"dzien": number | null,"job_id": string | null,"nr_tygodnia": number | null,"sala_id": string | null,"slot_do": number | null,"slot_od": number | null,"zajecia_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "plan_zajec_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "generation_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_zajec_sala_id_fkey"
      columns: ["sala_id"]
isOneToOne: false
      referencedRelation: "sale"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_zajec_zajecia_id_fkey"
      columns: ["zajecia_id"]
isOneToOne: false
      referencedRelation: "zajecia_plan"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "powtarzalnosc": "co-tydzien"|"parzyste"|"nieparzyste","status_zadania": "queued"|"running"|"done"|"failed","tryb_studiow": "stacjonarne"|"niestacjonarne","typ_dnia": "zajecia"|"wolne"|"odpracowanie","typ_zajec": "wyklad"|"cwiczenia"|"laboratorium"|"seminarium","tytul_naukowy": "mgr"|"mgr inż."|"dr"|"dr inż."|"dr hab."|"prof."
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "powtarzalnosc": ["co-tydzien", "parzyste", "nieparzyste"],"status_zadania": ["queued", "running", "done", "failed"],"tryb_studiow": ["stacjonarne", "niestacjonarne"],"typ_dnia": ["zajecia", "wolne", "odpracowanie"],"typ_zajec": ["wyklad", "cwiczenia", "laboratorium", "seminarium"],"tytul_naukowy": ["mgr", "mgr inż.", "dr", "dr inż.", "dr hab.", "prof."]
          }
        }
} as const
