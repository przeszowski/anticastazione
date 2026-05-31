export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      stanowiska: {
        Row: {
          id: string
          nazwa: string
          dzial: string
          opis: string | null
          godziny_od: string
          godziny_do: string
          aktywne: boolean
          kolejnosc: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nazwa: string
          dzial: string
          opis?: string | null
          godziny_od?: string
          godziny_do?: string
          aktywne?: boolean
          kolejnosc?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['stanowiska']['Insert']>
      }
      procedury: {
        Row: {
          id: string
          nazwa: string
          opis: string | null
          stanowisko_id: string | null
          pora_dnia: 'Rano' | 'Dzień' | 'Wieczór'
          norma_min: number
          aktywna: boolean
          kolejnosc: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nazwa: string
          opis?: string | null
          stanowisko_id?: string | null
          pora_dnia: 'Rano' | 'Dzień' | 'Wieczór'
          norma_min?: number
          aktywna?: boolean
          kolejnosc?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['procedury']['Insert']>
      }
      wykonania: {
        Row: {
          id: string
          procedura_id: string
          stanowisko_id: string | null
          data_dnia: string
          status: 'do_zrobienia' | 'w_trakcie' | 'wykonane' | 'odrzucone'
          czas_start: string | null
          czas_koniec: string | null
          czas_min: number | null
          odchylenie_min: number | null
          uwagi: string | null
          wykonane_przez: string | null
          created_at: string
        }
        Insert: {
          id?: string
          procedura_id: string
          stanowisko_id?: string | null
          data_dnia?: string
          status?: 'do_zrobienia' | 'w_trakcie' | 'wykonane' | 'odrzucone'
          czas_start?: string | null
          czas_koniec?: string | null
          uwagi?: string | null
          wykonane_przez?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['wykonania']['Insert']>
      }
    }
    Views: {}
    Functions: {}
  }
}
