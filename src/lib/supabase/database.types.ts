
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "dni_wolne": {
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "powtarzalnosc": "co-tydzien"|"parzyste"|"nieparzyste","tryb_studiow": "stacjonarne"|"niestacjonarne","typ_zajec": "wyklad"|"cwiczenia"|"laboratorium"|"seminarium","tytul_naukowy": "mgr"|"mgr inż."|"dr"|"dr inż."|"dr hab."|"prof."
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
            "powtarzalnosc": ["co-tydzien", "parzyste", "nieparzyste"],"tryb_studiow": ["stacjonarne", "niestacjonarne"],"typ_zajec": ["wyklad", "cwiczenia", "laboratorium", "seminarium"],"tytul_naukowy": ["mgr", "mgr inż.", "dr", "dr inż.", "dr hab.", "prof."]
          }
        }
} as const
