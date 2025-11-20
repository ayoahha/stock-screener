/**
 * Types Supabase générés manuellement depuis le schéma SQL
 *
 * Ces types sont basés sur packages/database/src/migrations/001_initial_schema.sql
 * Pour les régénérer automatiquement : pnpm db:generate-types (nécessite npx supabase login)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          default_scoring_profile: 'value' | 'growth' | 'dividend';
          theme: 'light' | 'dark';
          settings: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          default_scoring_profile?: 'value' | 'growth' | 'dividend';
          theme?: 'light' | 'dark';
          settings?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          default_scoring_profile?: 'value' | 'growth' | 'dividend';
          theme?: 'light' | 'dark';
          settings?: Json;
        };
      };
      watchlists: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          tickers: string[];
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          description?: string | null;
          tickers?: string[];
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          description?: string | null;
          tickers?: string[];
          metadata?: Json;
        };
      };
      custom_scoring_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          base_profile: 'value' | 'growth' | 'dividend';
          config: Json;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          description?: string | null;
          base_profile?: 'value' | 'growth' | 'dividend';
          config?: Json;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          description?: string | null;
          base_profile?: 'value' | 'growth' | 'dividend';
          config?: Json;
          is_active?: boolean;
        };
      };
      stock_cache: {
        Row: {
          ticker: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
          data: Json;
          source: 'yahoo' | 'fmp' | 'polygon' | 'scraping';
          fetch_duration_ms: number | null;
          error_count: number;
        };
        Insert: {
          ticker: string;
          created_at?: string;
          updated_at?: string;
          expires_at: string;
          data: Json;
          source: 'yahoo' | 'fmp' | 'polygon' | 'scraping';
          fetch_duration_ms?: number | null;
          error_count?: number;
        };
        Update: {
          ticker?: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          data?: Json;
          source?: 'yahoo' | 'fmp' | 'polygon' | 'scraping';
          fetch_duration_ms?: number | null;
          error_count?: number;
        };
      };
    };
    Views: {
      valid_stock_cache: {
        Row: {
          ticker: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
          data: Json;
          source: 'yahoo' | 'fmp' | 'polygon' | 'scraping';
          fetch_duration_ms: number | null;
          error_count: number;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
