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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          hub_city: string
          id: string
          is_active: boolean
          lane: string | null
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          hub_city: string
          id?: string
          is_active?: boolean
          lane?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          hub_city?: string
          id?: string
          is_active?: boolean
          lane?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          auth_user_id: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number
          balance: number | null
          created_at: string
          currency: string
          customer_id: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          issued_at: string
          issued_by: string | null
          notes: string | null
          receiver_signature_path: string | null
          receiver_signed_at: string | null
          shipment_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          vat_amount: number
          vat_rate: number | null
        }
        Insert: {
          amount: number
          amount_paid?: number
          balance?: number | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          receiver_signature_path?: string | null
          receiver_signed_at?: string | null
          shipment_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          vat_amount?: number
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          balance?: number | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          receiver_signature_path?: string | null
          receiver_signed_at?: string | null
          shipment_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          vat_amount?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          cargo_type: Database["public"]["Enums"]["cargo_type"]
          created_at: string
          customer_id: string | null
          destination: string
          email: string
          full_name: string
          id: string
          message: string | null
          origin: string
          phone: string | null
          status: Database["public"]["Enums"]["quote_status"]
          weight: number | null
        }
        Insert: {
          cargo_type?: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          customer_id?: string | null
          destination: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          origin: string
          phone?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          weight?: number | null
        }
        Update: {
          cargo_type?: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          customer_id?: string | null
          destination?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          origin?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          assigned_to: string | null
          booking_contact: string | null
          branch_code: string | null
          cargo_type: Database["public"]["Enums"]["cargo_type"]
          cn_number: string | null
          created_at: string
          current_location: string | null
          customer_id: string | null
          customer_name: string
          delivered_at: string | null
          delivery_proof_url: string | null
          destination: string
          estimated_delivery: string | null
          flight_number: string | null
          id: string
          origin: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          pieces: number
          price_per_kg: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status: Database["public"]["Enums"]["shipment_status"]
          total_price: number | null
          tracking_number: string
          updated_at: string
          warehouse: string | null
          weight: number | null
        }
        Insert: {
          assigned_to?: string | null
          booking_contact?: string | null
          branch_code?: string | null
          cargo_type?: Database["public"]["Enums"]["cargo_type"]
          cn_number?: string | null
          created_at?: string
          current_location?: string | null
          customer_id?: string | null
          customer_name: string
          delivered_at?: string | null
          delivery_proof_url?: string | null
          destination: string
          estimated_delivery?: string | null
          flight_number?: string | null
          id?: string
          origin: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pieces?: number
          price_per_kg?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"]
          total_price?: number | null
          tracking_number: string
          updated_at?: string
          warehouse?: string | null
          weight?: number | null
        }
        Update: {
          assigned_to?: string | null
          booking_contact?: string | null
          branch_code?: string | null
          cargo_type?: Database["public"]["Enums"]["cargo_type"]
          cn_number?: string | null
          created_at?: string
          current_location?: string | null
          customer_id?: string | null
          customer_name?: string
          delivered_at?: string | null
          delivery_proof_url?: string | null
          destination?: string
          estimated_delivery?: string | null
          flight_number?: string | null
          id?: string
          origin?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pieces?: number
          price_per_kg?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"]
          total_price?: number | null
          tracking_number?: string
          updated_at?: string
          warehouse?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          company_address: string
          company_email: string
          company_name: string
          company_phone: string
          company_website: string
          created_at: string
          default_shipping_method: string
          id: string
          logo_url: string | null
          singleton: boolean
          updated_at: string
          vat_rate: number
        }
        Insert: {
          company_address?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          company_website?: string
          created_at?: string
          default_shipping_method?: string
          id?: string
          logo_url?: string | null
          singleton?: boolean
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          company_address?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          company_website?: string
          created_at?: string
          default_shipping_method?: string
          id?: string
          logo_url?: string | null
          singleton?: boolean
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      tracking_lookup_attempts: {
        Row: {
          id: number
          ip: string
          requested_at: string
        }
        Insert: {
          id?: never
          ip: string
          requested_at?: string
        }
        Update: {
          id?: never
          ip?: string
          requested_at?: string
        }
        Relationships: []
      }
      tracking_updates: {
        Row: {
          city: string
          country: string
          created_at: string
          date: string
          description: string | null
          id: string
          location: string
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          time: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          location: string
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          time?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          location?: string
          shipment_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_updates_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_users_overview: {
        Args: never
        Returns: {
          auth_user_id: string
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          shipment_count: number
          status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      analytics_report: { Args: { p_months?: number }; Returns: Json }
      current_customer_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      customer_balances_overview: {
        Args: { p_customer_ids?: string[] }
        Returns: {
          balance_owed: number
          customer_id: string
          shipment_count: number
          total_paid: number
        }[]
      }
      dashboard_stats: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_ops: { Args: never; Returns: boolean }
      public_settings: { Args: never; Returns: Json }
      suggest_tracking_number: { Args: Record<PropertyKey, never>; Returns: string }
      sync_shipment_payment_status: {
        Args: { p_shipment_id: string }
        Returns: undefined
      }
      track_shipment: { Args: { p_tracking_number: string }; Returns: Json }
    }
    Enums: {
      cargo_type:
        | "General Goods"
        | "Electronics"
        | "Textiles & Apparel"
        | "Machinery"
        | "Auto Parts"
        | "Cosmetics"
        | "Foodstuff"
        | "Furniture"
        | "Medical Supplies"
        | "Documents"
      invoice_status: "Draft" | "Issued" | "Partially Paid" | "Paid" | "Void"
      payment_method:
        | "Cash"
        | "Bank Transfer"
        | "Mobile Money"
        | "Card"
        | "Cheque"
        | "EVC Plus"
        | "Edahab"
      payment_status: "Unpaid" | "Partially Paid" | "Paid" | "Refunded"
      quote_status: "Pending" | "Reviewed" | "Quoted" | "Closed"
      shipment_status:
        | "Received"
        | "Processing"
        | "Warehouse"
        | "Shipped"
        | "In Transit"
        | "Customs Clearance"
        | "Arrived"
        | "Out for Delivery"
        | "Delivered"
      shipping_method:
        | "Air Express"
        | "Air Freight"
        | "Sea Freight"
        | "Road Freight"
        | "Door to Door"
      user_role: "Admin" | "Dispatcher" | "Staff"
      user_status: "Active" | "Disabled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals["public"]

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
      cargo_type: [
        "General Goods",
        "Electronics",
        "Textiles & Apparel",
        "Machinery",
        "Auto Parts",
        "Cosmetics",
        "Foodstuff",
        "Furniture",
        "Medical Supplies",
        "Documents",
      ],
      invoice_status: ["Draft", "Issued", "Partially Paid", "Paid", "Void"],
      payment_method: [
        "Cash",
        "Bank Transfer",
        "Mobile Money",
        "Card",
        "Cheque",
        "EVC Plus",
        "Edahab",
      ],
      payment_status: ["Unpaid", "Partially Paid", "Paid", "Refunded"],
      quote_status: ["Pending", "Reviewed", "Quoted", "Closed"],
      shipment_status: [
        "Received",
        "Processing",
        "Warehouse",
        "Shipped",
        "In Transit",
        "Customs Clearance",
        "Arrived",
        "Out for Delivery",
        "Delivered",
      ],
      shipping_method: [
        "Air Express",
        "Air Freight",
        "Sea Freight",
        "Road Freight",
        "Door to Door",
      ],
      user_role: ["Admin", "Dispatcher", "Staff"],
      user_status: ["Active", "Disabled"],
    },
  },
} as const
