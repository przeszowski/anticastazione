export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type PoraDnia = 'Rano' | 'Dzien' | 'Wieczor'
export type StatusWykonania = 'do_zrobienia' | 'w_trakcie' | 'wykonane' | 'odrzucone'

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          nazwa: string
          opis: string | null
          permissions: string[]
          systemowa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nazwa: string
          opis?: string | null
          permissions?: string[]
          systemowa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          imie: string | null
          nazwisko: string | null
          email: string | null
          telefon: string | null
          email_zweryfikowany: boolean
          aktywny: boolean
          role_id: string | null
          stanowisko_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          imie?: string | null
          nazwisko?: string | null
          email?: string | null
          telefon?: string | null
          email_zweryfikowany?: boolean
          aktywny?: boolean
          role_id?: string | null
          stanowisko_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'profiles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_stanowisko_id_fkey'
            columns: ['stanowisko_id']
            isOneToOne: false
            referencedRelation: 'stanowiska'
            referencedColumns: ['id']
          }
        ]
      }
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
        Relationships: []
      }
      procedury: {
        Row: {
          id: string
          nazwa: string
          opis: string | null
          stanowisko_id: string | null
          pora_dnia: PoraDnia
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
          pora_dnia: PoraDnia
          norma_min?: number
          aktywna?: boolean
          kolejnosc?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['procedury']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'procedury_stanowisko_id_fkey'
            columns: ['stanowisko_id']
            isOneToOne: false
            referencedRelation: 'stanowiska'
            referencedColumns: ['id']
          }
        ]
      }
      wykonania: {
        Row: {
          id: string
          procedura_id: string
          stanowisko_id: string | null
          data_dnia: string
          status: StatusWykonania
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
          status?: StatusWykonania
          czas_start?: string | null
          czas_koniec?: string | null
          uwagi?: string | null
          wykonane_przez?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['wykonania']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'wykonania_procedura_id_fkey'
            columns: ['procedura_id']
            isOneToOne: false
            referencedRelation: 'procedury'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wykonania_stanowisko_id_fkey'
            columns: ['stanowisko_id']
            isOneToOne: false
            referencedRelation: 'stanowiska'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {}
    Functions: {
      has_perm: {
        Args: { p: string }
        Returns: boolean
      }
      my_permissions: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      my_role: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
    }
    Enums: Record<PropertyKey, never>
    CompositeTypes: Record<PropertyKey, never>
  }
}
