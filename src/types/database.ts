// Tipos generados directamente desde el esquema real del proyecto Supabase
// (`supabase gen types typescript --linked`, vía MCP `generate_typescript_types`).
// Única fuente de verdad: el esquema en supabase/migrations/. No editar a
// mano — para regenerar tras una migración nueva:
//
//   supabase gen types typescript --linked > src/types/database.ts
//
// src/types/index.ts reexporta alias de conveniencia derivados de este
// archivo (Profile, Punch, AuditLog, UserRole, PunchType); no hace falta
// tocarlo al regenerar.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          ip_address: unknown;
          metadata: Json;
          target_user_id: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json;
          target_user_id?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json;
          target_user_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_target_user_id_fkey";
            columns: ["target_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          course: Database["public"]["Enums"]["course"] | null;
          created_at: string;
          degree: Database["public"]["Enums"]["degree"] | null;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          course?: Database["public"]["Enums"]["course"] | null;
          created_at?: string;
          degree?: Database["public"]["Enums"]["degree"] | null;
          email: string;
          id: string;
          name: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          course?: Database["public"]["Enums"]["course"] | null;
          created_at?: string;
          degree?: Database["public"]["Enums"]["degree"] | null;
          email?: string;
          id?: string;
          name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      punches: {
        Row: {
          created_at: string;
          id: string;
          ip_address: unknown;
          source: Database["public"]["Enums"]["punch_source"];
          timestamp: string;
          type: Database["public"]["Enums"]["punch_type"];
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          source?: Database["public"]["Enums"]["punch_source"];
          timestamp?: string;
          type: Database["public"]["Enums"]["punch_type"];
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          source?: Database["public"]["Enums"]["punch_source"];
          timestamp?: string;
          type?: Database["public"]["Enums"]["punch_type"];
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "punches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      latest_punches: {
        Row: {
          created_at: string | null;
          id: string | null;
          timestamp: string | null;
          type: Database["public"]["Enums"]["punch_type"] | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "punches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      admin_change_role: {
        Args: {
          p_actor_id: string;
          p_ip: unknown;
          p_new_role: Database["public"]["Enums"]["user_role"];
          p_reason?: string;
          p_target_id: string;
        };
        Returns: {
          active: boolean;
          course: Database["public"]["Enums"]["course"] | null;
          created_at: string;
          degree: Database["public"]["Enums"]["degree"] | null;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
      };
      admin_create_profile: {
        Args: {
          p_actor_id: string;
          p_course: Database["public"]["Enums"]["course"];
          p_degree: Database["public"]["Enums"]["degree"];
          p_email: string;
          p_ip: unknown;
          p_name: string;
          p_role: Database["public"]["Enums"]["user_role"];
          p_target_id: string;
        };
        Returns: {
          active: boolean;
          course: Database["public"]["Enums"]["course"] | null;
          created_at: string;
          degree: Database["public"]["Enums"]["degree"] | null;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
      };
      admin_set_active: {
        Args: {
          p_active: boolean;
          p_actor_id: string;
          p_ip: unknown;
          p_reason?: string;
          p_target_id: string;
        };
        Returns: {
          active: boolean;
          course: Database["public"]["Enums"]["course"] | null;
          created_at: string;
          degree: Database["public"]["Enums"]["degree"] | null;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
      };
      close_open_student_punches: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      course: "1" | "2";
      degree: "SMR" | "ASIR";
      punch_source: "manual" | "automatic";
      punch_type: "IN" | "OUT";
      user_role: "student" | "teacher" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      course: ["1", "2"],
      degree: ["SMR", "ASIR"],
      punch_source: ["manual", "automatic"],
      punch_type: ["IN", "OUT"],
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const;
