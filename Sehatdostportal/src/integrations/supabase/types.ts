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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      claim_documents: {
        Row: {
          claim_id: string
          created_at: string
          doc_type: string
          file_name: string | null
          id: string
          storage_path: string | null
          uploaded_by: string | null
          verified: boolean
        }
        Insert: {
          claim_id: string
          created_at?: string
          doc_type: string
          file_name?: string | null
          id?: string
          storage_path?: string | null
          uploaded_by?: string | null
          verified?: boolean
        }
        Update: {
          claim_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string | null
          id?: string
          storage_path?: string | null
          uploaded_by?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          claim_id: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          step: number | null
          step_label: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          claim_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          step?: number | null
          step_label?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          claim_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          step?: number | null
          step_label?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          approved_amount: number | null
          claim_number: string
          claimed_amount: number | null
          created_at: string
          created_by: string | null
          current_step: number
          decided_at: string | null
          disease_name: string | null
          eligibility_check_id: string | null
          hospital_id: string
          icd10_code: string | null
          id: string
          is_demo: boolean
          package_code: string | null
          patient_age: number | null
          patient_gender: string | null
          patient_mobile: string | null
          patient_name: string
          payment_released_at: string | null
          policy_id: string | null
          procedure_code: string | null
          procedure_name: string | null
          query_text: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_number?: string
          claimed_amount?: number | null
          created_at?: string
          created_by?: string | null
          current_step?: number
          decided_at?: string | null
          disease_name?: string | null
          eligibility_check_id?: string | null
          hospital_id: string
          icd10_code?: string | null
          id?: string
          is_demo?: boolean
          package_code?: string | null
          patient_age?: number | null
          patient_gender?: string | null
          patient_mobile?: string | null
          patient_name: string
          payment_released_at?: string | null
          policy_id?: string | null
          procedure_code?: string | null
          procedure_name?: string | null
          query_text?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_number?: string
          claimed_amount?: number | null
          created_at?: string
          created_by?: string | null
          current_step?: number
          decided_at?: string | null
          disease_name?: string | null
          eligibility_check_id?: string | null
          hospital_id?: string
          icd10_code?: string | null
          id?: string
          is_demo?: boolean
          package_code?: string | null
          patient_age?: number | null
          patient_gender?: string | null
          patient_mobile?: string | null
          patient_name?: string
          payment_released_at?: string | null
          policy_id?: string | null
          procedure_code?: string | null
          procedure_name?: string | null
          query_text?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_eligibility_check_id_fkey"
            columns: ["eligibility_check_id"]
            isOneToOne: false
            referencedRelation: "eligibility_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_master: {
        Row: {
          category: string | null
          chronic_flag: boolean
          created_at: string
          critical_illness_flag: boolean
          disease_code: string
          disease_name: string
          icd10_code: string | null
          id: string
          keywords: string[]
          metadata: Json
          short_name: string | null
          specialty: string | null
          status: string
          synonyms: string[]
          updated_at: string
        }
        Insert: {
          category?: string | null
          chronic_flag?: boolean
          created_at?: string
          critical_illness_flag?: boolean
          disease_code: string
          disease_name: string
          icd10_code?: string | null
          id?: string
          keywords?: string[]
          metadata?: Json
          short_name?: string | null
          specialty?: string | null
          status?: string
          synonyms?: string[]
          updated_at?: string
        }
        Update: {
          category?: string | null
          chronic_flag?: boolean
          created_at?: string
          critical_illness_flag?: boolean
          disease_code?: string
          disease_name?: string
          icd10_code?: string | null
          id?: string
          keywords?: string[]
          metadata?: Json
          short_name?: string | null
          specialty?: string | null
          status?: string
          synonyms?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      eligibility_checks: {
        Row: {
          created_at: string
          created_by: string | null
          hospital_id: string | null
          id: string
          patient_name: string | null
          policy_id: string | null
          result: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hospital_id?: string | null
          id?: string
          patient_name?: string | null
          policy_id?: string | null
          result?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hospital_id?: string | null
          id?: string
          patient_name?: string | null
          policy_id?: string | null
          result?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_checks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_config: {
        Row: {
          all_disease_categories: boolean
          all_policies: boolean
          all_procedure_categories: boolean
          all_specialties: boolean
          created_at: string
          enabled_disease_categories: string[]
          enabled_policy_ids: string[]
          enabled_procedure_categories: string[]
          enabled_specialties: string[]
          hospital_id: string
          id: string
          updated_at: string
        }
        Insert: {
          all_disease_categories?: boolean
          all_policies?: boolean
          all_procedure_categories?: boolean
          all_specialties?: boolean
          created_at?: string
          enabled_disease_categories?: string[]
          enabled_policy_ids?: string[]
          enabled_procedure_categories?: string[]
          enabled_specialties?: string[]
          hospital_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          all_disease_categories?: boolean
          all_policies?: boolean
          all_procedure_categories?: boolean
          all_specialties?: boolean
          created_at?: string
          enabled_disease_categories?: string[]
          enabled_policy_ids?: string[]
          enabled_procedure_categories?: string[]
          enabled_specialties?: string[]
          hospital_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: true
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          city: string | null
          created_at: string
          hospital_code: string
          hospital_name: string
          hospital_type: string | null
          id: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          hospital_code: string
          hospital_name: string
          hospital_type?: string | null
          id?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          hospital_code?: string
          hospital_name?: string
          hospital_type?: string | null
          id?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string
          id: string
          insurer_name: string
          policy_name: string
          policy_type: string
          uin_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          insurer_name: string
          policy_name: string
          policy_type: string
          uin_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          insurer_name?: string
          policy_name?: string
          policy_type?: string
          uin_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      policy_data: {
        Row: {
          created_at: string
          data: Json
          id: string
          policy_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          policy_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_data_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_master: {
        Row: {
          category: string | null
          cpt_codes: string[]
          created_at: string
          daycare_possible: boolean
          icd_codes: string[]
          id: string
          inpatient_required: boolean
          keywords: string[]
          metadata: Json
          pmjay_package_code: string | null
          procedure_code: string
          procedure_name: string
          short_name: string | null
          specialty: string | null
          status: string
          synonyms: string[]
          tpa_package_code: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cpt_codes?: string[]
          created_at?: string
          daycare_possible?: boolean
          icd_codes?: string[]
          id?: string
          inpatient_required?: boolean
          keywords?: string[]
          metadata?: Json
          pmjay_package_code?: string | null
          procedure_code: string
          procedure_name: string
          short_name?: string | null
          specialty?: string | null
          status?: string
          synonyms?: string[]
          tpa_package_code?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cpt_codes?: string[]
          created_at?: string
          daycare_possible?: boolean
          icd_codes?: string[]
          id?: string
          inpatient_required?: boolean
          keywords?: string[]
          metadata?: Json
          pmjay_package_code?: string | null
          procedure_code?: string
          procedure_name?: string
          short_name?: string | null
          specialty?: string | null
          status?: string
          synonyms?: string[]
          tpa_package_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          hospital_id: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          hospital_id?: string | null
          id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          hospital_id?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          hospital_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          hospital_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          hospital_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_hospital_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      next_claim_number: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "super_admin" | "hospital_admin" | "claims_executive"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "hospital_admin", "claims_executive"],
    },
  },
} as const
