export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_preferences: {
        Row: {
          locale: string | null;
          reminder_enabled: boolean;
          reminder_hour: number | null;
          reminder_minute: number | null;
          theme: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          locale?: string | null;
          reminder_enabled?: boolean;
          reminder_hour?: number | null;
          reminder_minute?: number | null;
          theme?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          locale?: string | null;
          reminder_enabled?: boolean;
          reminder_hour?: number | null;
          reminder_minute?: number | null;
          theme?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_linked: boolean;
          created_at: string;
          display_name: string | null;
          id: string;
          onboarding_completed: boolean;
          updated_at: string;
        };
        Insert: {
          account_linked?: boolean;
          created_at?: string;
          display_name?: string | null;
          id: string;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Update: {
          account_linked?: boolean;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_photos: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          review_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          review_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          review_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [];
      };
      review_tags: {
        Row: {
          review_id: string;
          tag_id: string;
        };
        Insert: {
          review_id: string;
          tag_id: string;
        };
        Update: {
          review_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          answers_json: Json;
          category: string;
          created_at: string;
          id: string;
          import_fingerprint: string | null;
          import_source: string | null;
          is_favorite: boolean;
          mood: number | null;
          review_date: string;
          template_id: string | null;
          template_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers_json?: Json;
          category: string;
          created_at?: string;
          id?: string;
          import_fingerprint?: string | null;
          import_source?: string | null;
          is_favorite?: boolean;
          mood?: number | null;
          review_date: string;
          template_id?: string | null;
          template_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers_json?: Json;
          category?: string;
          created_at?: string;
          id?: string;
          import_fingerprint?: string | null;
          import_source?: string | null;
          is_favorite?: boolean;
          mood?: number | null;
          review_date?: string;
          template_id?: string | null;
          template_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          created_at: string;
          id: string;
          is_archived: boolean;
          label: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          label: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          label?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
  };
};
