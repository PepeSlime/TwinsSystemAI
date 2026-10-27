export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ability_slots: {
        Row: {
          character_id: string
          chosen_suggestion_id: string | null
          created_at: string
          form: string
          id: string
          notes: string | null
          slot_index: number
          slot_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          character_id: string
          chosen_suggestion_id?: string | null
          created_at?: string
          form: string
          id?: string
          notes?: string | null
          slot_index?: number
          slot_type: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          character_id?: string
          chosen_suggestion_id?: string | null
          created_at?: string
          form?: string
          id?: string
          notes?: string | null
          slot_index?: number
          slot_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ability_slots_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ability_slots_chosen_suggestion"
            columns: ["chosen_suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          calls: number
          created_at: string
          day: string
          est_cost: number
          id: string
          kind: string
        }
        Insert: {
          calls?: number
          created_at?: string
          day?: string
          est_cost?: number
          id?: string
          kind: string
        }
        Update: {
          calls?: number
          created_at?: string
          day?: string
          est_cost?: number
          id?: string
          kind?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          anchored_ok: boolean
          cancollide_ok: boolean
          completed_at: string | null
          created_at: string
          evo_enabled: boolean
          height_m: number | null
          id: string
          image_url: string | null
          model_sheet_name: string | null
          model_sheet_type: string | null
          model_sheet_url: string | null
          name: string
          rarity: string
          scale: number | null
          scale_ok: boolean
          status: string
          universe: string | null
        }
        Insert: {
          anchored_ok?: boolean
          cancollide_ok?: boolean
          completed_at?: string | null
          created_at?: string
          evo_enabled?: boolean
          height_m?: number | null
          id?: string
          image_url?: string | null
          model_sheet_name?: string | null
          model_sheet_type?: string | null
          model_sheet_url?: string | null
          name: string
          rarity?: string
          scale?: number | null
          scale_ok?: boolean
          status?: string
          universe?: string | null
        }
        Update: {
          anchored_ok?: boolean
          cancollide_ok?: boolean
          completed_at?: string | null
          created_at?: string
          evo_enabled?: boolean
          height_m?: number | null
          id?: string
          image_url?: string | null
          model_sheet_name?: string | null
          model_sheet_type?: string | null
          model_sheet_url?: string | null
          name?: string
          rarity?: string
          scale?: number | null
          scale_ok?: boolean
          status?: string
          universe?: string | null
        }
        Relationships: []
      }
      job_schedules: {
        Row: {
          character_id: string | null
          created_at: string
          cron: string
          enabled: boolean
          id: string
          last_run_at: string | null
          scope: Json | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          cron: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          scope?: Json | null
        }
        Update: {
          character_id?: string | null
          created_at?: string
          cron?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          scope?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_schedules_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          character_id: string | null
          cost_estimate: number | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          progress: number
          scope: Json | null
          started_at: string | null
          status: string
          total: number
          type: string
        }
        Insert: {
          character_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          scope?: Json | null
          started_at?: string | null
          status?: string
          total?: number
          type: string
        }
        Update: {
          character_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          scope?: Json | null
          started_at?: string | null
          status?: string
          total?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      overrides_runs: {
        Row: {
          character_id: string | null
          created_at: string
          id: string
          input_materials: string | null
          model: string | null
          part_hints: string | null
          prompt_version: string | null
          questions: Json | null
          result_json: Json | null
          result_python: string | null
          result_table: Json | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          id?: string
          input_materials?: string | null
          model?: string | null
          part_hints?: string | null
          prompt_version?: string | null
          questions?: Json | null
          result_json?: Json | null
          result_python?: string | null
          result_table?: Json | null
        }
        Update: {
          character_id?: string | null
          created_at?: string
          id?: string
          input_materials?: string | null
          model?: string | null
          part_hints?: string | null
          prompt_version?: string | null
          questions?: Json | null
          result_json?: Json | null
          result_python?: string | null
          result_table?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "overrides_runs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          key: string
          version: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          key: string
          version: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          key?: string
          version?: string
        }
        Relationships: []
      }
      reference_items: {
        Row: {
          content_hash: string
          fetched_at: string
          id: string
          slot_id: string
          snippet: string | null
          source_type: string
          thumb_path: string | null
          title: string | null
          url: string
        }
        Insert: {
          content_hash: string
          fetched_at?: string
          id?: string
          slot_id: string
          snippet?: string | null
          source_type?: string
          thumb_path?: string | null
          title?: string | null
          url: string
        }
        Update: {
          content_hash?: string
          fetched_at?: string
          id?: string
          slot_id?: string
          snippet?: string | null
          source_type?: string
          thumb_path?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_items_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "ability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          animation_beats: Json | null
          created_at: string
          fidelity_source: string | null
          hype_note: string | null
          id: string
          image_path: string | null
          image_prompt: string | null
          model: string | null
          position: number
          roblox_feasibility: string | null
          slot_id: string
          status: string
          title: string
          vfx: Json | null
          visual_description: string | null
        }
        Insert: {
          animation_beats?: Json | null
          created_at?: string
          fidelity_source?: string | null
          hype_note?: string | null
          id?: string
          image_path?: string | null
          image_prompt?: string | null
          model?: string | null
          position?: number
          roblox_feasibility?: string | null
          slot_id: string
          status?: string
          title: string
          vfx?: Json | null
          visual_description?: string | null
        }
        Update: {
          animation_beats?: Json | null
          created_at?: string
          fidelity_source?: string | null
          hype_note?: string | null
          id?: string
          image_path?: string | null
          image_prompt?: string | null
          model?: string | null
          position?: number
          roblox_feasibility?: string | null
          slot_id?: string
          status?: string
          title?: string
          vfx?: Json | null
          visual_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "ability_slots"
            referencedColumns: ["id"]
          },
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
