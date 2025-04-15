export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_name: string
          account_number_last4: string
          bank_name: string | null
          bank_type: Database["public"]["Enums"]["bank_type"]
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number_last4: string
          bank_name?: string | null
          bank_type: Database["public"]["Enums"]["bank_type"]
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number_last4?: string
          bank_name?: string | null
          bank_type?: Database["public"]["Enums"]["bank_type"]
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          nif: string
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nif: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nif?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          cloud_storage_path: string | null
          cloud_storage_status:
            | Database["public"]["Enums"]["cloud_storage_status"]
            | null
          created_at: string
          currency: string | null
          dropbox_path: string | null
          extracted_date: string | null
          extracted_total: number | null
          extracted_vendor: string | null
          file_name: string | null
          file_type: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          manual_date: string | null
          manual_total: number | null
          manual_vendor: string | null
          nif_number: string | null
          raw_text: string | null
          source: Database["public"]["Enums"]["source_type"] | null
          status: Database["public"]["Enums"]["invoice_status"]
          storage_path: string
          transaction_id: string | null
          updated_at: string
          uploaded_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          cloud_storage_path?: string | null
          cloud_storage_status?:
            | Database["public"]["Enums"]["cloud_storage_status"]
            | null
          created_at?: string
          currency?: string | null
          dropbox_path?: string | null
          extracted_date?: string | null
          extracted_total?: number | null
          extracted_vendor?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          manual_date?: string | null
          manual_total?: number | null
          manual_vendor?: string | null
          nif_number?: string | null
          raw_text?: string | null
          source?: Database["public"]["Enums"]["source_type"] | null
          status?: Database["public"]["Enums"]["invoice_status"]
          storage_path: string
          transaction_id?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          cloud_storage_path?: string | null
          cloud_storage_status?:
            | Database["public"]["Enums"]["cloud_storage_status"]
            | null
          created_at?: string
          currency?: string | null
          dropbox_path?: string | null
          extracted_date?: string | null
          extracted_total?: number | null
          extracted_vendor?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          manual_date?: string | null
          manual_total?: number | null
          manual_vendor?: string | null
          nif_number?: string | null
          raw_text?: string | null
          source?: Database["public"]["Enums"]["source_type"] | null
          status?: Database["public"]["Enums"]["invoice_status"]
          storage_path?: string
          transaction_id?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          dropbox_access_token: string | null
          dropbox_refresh_token: string | null
          full_name: string | null
          gdrive_access_token: string | null
          gdrive_refresh_token: string | null
          id: string
          invited_by_user_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          dropbox_access_token?: string | null
          dropbox_refresh_token?: string | null
          full_name?: string | null
          gdrive_access_token?: string | null
          gdrive_refresh_token?: string | null
          id: string
          invited_by_user_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          dropbox_access_token?: string | null
          dropbox_refresh_token?: string | null
          full_name?: string | null
          gdrive_access_token?: string | null
          gdrive_refresh_token?: string | null
          id?: string
          invited_by_user_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      statements: {
        Row: {
          bank_account_id: string | null
          created_at: string | null
          filename: string
          id: string
          source_bank: string
          status: Database["public"]["Enums"]["statement_status"] | null
          storage_path: string
          transactions_count: number
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string | null
          filename: string
          id?: string
          source_bank: string
          status?: Database["public"]["Enums"]["statement_status"] | null
          storage_path: string
          transactions_count?: number
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string | null
          filename?: string
          id?: string
          source_bank?: string
          status?: Database["public"]["Enums"]["statement_status"] | null
          storage_path?: string
          transactions_count?: number
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          ai_analysis_status:
            | Database["public"]["Enums"]["ai_analysis_status"]
            | null
          ai_extracted_category: string | null
          ai_extracted_vendor: string | null
          amount: number
          bank_account_id: string | null
          category: string | null
          created_at: string
          currency: string
          description: string | null
          has_multiple_invoices: boolean | null
          id: string
          invoice_id: string | null
          note: string | null
          source_bank: string | null
          source_id: string | null
          statement_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          updated_at: string
          user_id: string
          vendor_guess: string | null
        }
        Insert: {
          ai_analysis_status?:
            | Database["public"]["Enums"]["ai_analysis_status"]
            | null
          ai_extracted_category?: string | null
          ai_extracted_vendor?: string | null
          amount: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          currency: string
          description?: string | null
          has_multiple_invoices?: boolean | null
          id?: string
          invoice_id?: string | null
          note?: string | null
          source_bank?: string | null
          source_id?: string | null
          statement_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          updated_at?: string
          user_id: string
          vendor_guess?: string | null
        }
        Update: {
          ai_analysis_status?:
            | Database["public"]["Enums"]["ai_analysis_status"]
            | null
          ai_extracted_category?: string | null
          ai_extracted_vendor?: string | null
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          has_multiple_invoices?: boolean | null
          id?: string
          invoice_id?: string | null
          note?: string | null
          source_bank?: string | null
          source_id?: string | null
          statement_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
          user_id?: string
          vendor_guess?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      ai_analysis_status: "pending" | "processing" | "completed" | "error"
      bank_type:
        | "bpi"
        | "cgd"
        | "millennium"
        | "santander"
        | "novobanco"
        | "bankinter"
        | "revolut"
        | "wise"
        | "other"
      cloud_storage_status: "pending_sync" | "syncing" | "synced" | "sync_error"
      invoice_status:
        | "pending_match"
        | "matched"
        | "match_failed"
        | "syncing"
        | "synced"
      source_type: "upload" | "dropbox" | "gdrive"
      statement_status: "uploaded" | "parsing" | "parsed" | "error"
      transaction_status: "unmatched" | "matched" | "ignored"
      user_role: "user" | "accountant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_analysis_status: ["pending", "processing", "completed", "error"],
      bank_type: [
        "bpi",
        "cgd",
        "millennium",
        "santander",
        "novobanco",
        "bankinter",
        "revolut",
        "wise",
        "other",
      ],
      cloud_storage_status: ["pending_sync", "syncing", "synced", "sync_error"],
      invoice_status: [
        "pending_match",
        "matched",
        "match_failed",
        "syncing",
        "synced",
      ],
      source_type: ["upload", "dropbox", "gdrive"],
      statement_status: ["uploaded", "parsing", "parsed", "error"],
      transaction_status: ["unmatched", "matched", "ignored"],
      user_role: ["user", "accountant"],
    },
  },
} as const
