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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_type: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      college_memberships: {
        Row: {
          college_id: string
          created_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          college_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          college_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_memberships_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          allowed_domains: string[]
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          allowed_domains?: string[]
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          allowed_domains?: string[]
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          tenant_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash: string
          phone: string
          tenant_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          tenant_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          diet: Database["public"]["Enums"]["diet"]
          id: string
          image_url: string | null
          in_stock: boolean
          name: string
          prep_target_seconds: number
          price_paise: number
          sort_order: number
          status: Database["public"]["Enums"]["menu_item_status"]
          stock_qty: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          diet?: Database["public"]["Enums"]["diet"]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name: string
          prep_target_seconds?: number
          price_paise: number
          sort_order?: number
          status?: Database["public"]["Enums"]["menu_item_status"]
          stock_qty?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          diet?: Database["public"]["Enums"]["diet"]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name?: string
          prep_target_seconds?: number
          price_paise?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["menu_item_status"]
          stock_qty?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          order_id: string
          payload: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          order_id: string
          payload?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          order_id?: string
          payload?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          diet_snapshot: Database["public"]["Enums"]["diet"]
          id: string
          menu_item_id: string | null
          name_snapshot: string
          order_id: string
          price_paise_snapshot: number
          qty: number
          tenant_id: string
        }
        Insert: {
          diet_snapshot: Database["public"]["Enums"]["diet"]
          id?: string
          menu_item_id?: string | null
          name_snapshot: string
          order_id: string
          price_paise_snapshot: number
          qty: number
          tenant_id: string
        }
        Update: {
          diet_snapshot?: Database["public"]["Enums"]["diet"]
          id?: string
          menu_item_id?: string | null
          name_snapshot?: string
          order_id?: string
          price_paise_snapshot?: number
          qty?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          collected_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          otp_attempts: number
          otp_hash: string | null
          payment_expires_at: string | null
          placed_at: string
          ready_at: string | null
          short_code: string
          status: Database["public"]["Enums"]["order_status"]
          table_label: string | null
          tenant_id: string
          total_paise: number
          user_id: string | null
        }
        Insert: {
          collected_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          otp_attempts?: number
          otp_hash?: string | null
          payment_expires_at?: string | null
          placed_at?: string
          ready_at?: string | null
          short_code: string
          status?: Database["public"]["Enums"]["order_status"]
          table_label?: string | null
          tenant_id: string
          total_paise: number
          user_id?: string | null
        }
        Update: {
          collected_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          otp_attempts?: number
          otp_hash?: string | null
          payment_expires_at?: string | null
          placed_at?: string
          ready_at?: string | null
          short_code?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_label?: string | null
          tenant_id?: string
          total_paise?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          order_id: string
          raw_event_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          order_id: string
          raw_event_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          order_id?: string
          raw_event_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_secrets: {
        Row: {
          created_at: string
          expires_at: string
          order_id: string
          otp_plain: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          order_id: string
          otp_plain: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          order_id?: string
          otp_plain?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_secrets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          locked_until: string | null
          pin_attempt_count: number
          pin_hash: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          locked_until?: string | null
          pin_attempt_count?: number
          pin_hash: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          locked_until?: string | null
          pin_attempt_count?: number
          pin_hash?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          allowed_domain: string | null
          building: string | null
          closes_at: string | null
          college_id: string | null
          college_name: string
          created_at: string
          guest_orders_enabled: boolean
          hero_tagline: string | null
          id: string
          is_active: boolean
          is_open: boolean
          logo_url: string | null
          mess_type: string | null
          name: string
          opens_at: string | null
          paused_until: string | null
          razorpay_key_id_enc: string | null
          razorpay_key_secret_enc: string | null
          slug: string
          upi_vpa: string | null
          zone: string | null
        }
        Insert: {
          allowed_domain?: string | null
          building?: string | null
          closes_at?: string | null
          college_id?: string | null
          college_name: string
          created_at?: string
          guest_orders_enabled?: boolean
          hero_tagline?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          logo_url?: string | null
          mess_type?: string | null
          name: string
          opens_at?: string | null
          paused_until?: string | null
          razorpay_key_id_enc?: string | null
          razorpay_key_secret_enc?: string | null
          slug: string
          upi_vpa?: string | null
          zone?: string | null
        }
        Update: {
          allowed_domain?: string | null
          building?: string | null
          closes_at?: string | null
          college_id?: string | null
          college_name?: string
          created_at?: string
          guest_orders_enabled?: boolean
          hero_tagline?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          logo_url?: string | null
          mess_type?: string | null
          name?: string
          opens_at?: string | null
          paused_until?: string | null
          razorpay_key_id_enc?: string | null
          razorpay_key_secret_enc?: string | null
          slug?: string
          upi_vpa?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_enroll_student: { Args: never; Returns: undefined }
      college_canteens: {
        Args: { p_college_slug: string }
        Returns: {
          building: string
          closes_at: string
          hero_tagline: string
          is_open: boolean
          logo_url: string
          mess_type: string
          name: string
          opens_at: string
          paused_until: string
          pending_orders_count: number
          slug: string
          zone: string
        }[]
      }
      current_tenant_id: { Args: never; Returns: string }
      is_tenant_admin: { Args: { p_tenant: string }; Returns: boolean }
      is_tenant_member: { Args: { p_tenant: string }; Returns: boolean }
      is_tenant_staff: { Args: { p_tenant: string }; Returns: boolean }
      next_order_short_code: { Args: { p_tenant: string }; Returns: string }
      pre_request_set_tenant: { Args: never; Returns: undefined }
      read_my_pickup_otp: { Args: { p_order: string }; Returns: string }
      resolve_tenant: {
        Args: { p_slug: string }
        Returns: {
          allowed_domain: string
          college_name: string
          hero_tagline: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          slug: string
          upi_vpa: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      verify_staff_pin: {
        Args: { p_pin: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      diet: "veg" | "nonveg" | "egg"
      member_role:
        | "student"
        | "kitchen_staff"
        | "canteen_admin"
        | "super_admin"
        | "college_admin"
      menu_item_status: "draft" | "live" | "archived"
      order_status:
        | "pending_payment"
        | "placed"
        | "preparing"
        | "ready"
        | "collected"
        | "rejected"
        | "expired"
        | "cancelled_by_kitchen"
        | "partially_ready"
        | "refunded"
      order_type: "takeaway" | "dine_in"
      payment_status: "initiated" | "captured" | "failed" | "refunded"
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
      diet: ["veg", "nonveg", "egg"],
      member_role: [
        "student",
        "kitchen_staff",
        "canteen_admin",
        "super_admin",
        "college_admin",
      ],
      menu_item_status: ["draft", "live", "archived"],
      order_status: [
        "pending_payment",
        "placed",
        "preparing",
        "ready",
        "collected",
        "rejected",
        "expired",
        "cancelled_by_kitchen",
        "partially_ready",
        "refunded",
      ],
      order_type: ["takeaway", "dine_in"],
      payment_status: ["initiated", "captured", "failed", "refunded"],
    },
  },
} as const

// ── Project-local type aliases (kept after the generated block) ────────────
export type Tenant = Tables<"tenants">;
export type MenuItem = Tables<"menu_items">;
export type MenuCategory = Tables<"menu_categories">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderType = Database["public"]["Enums"]["order_type"];
export type Diet = Database["public"]["Enums"]["diet"];
export type MemberRole = Database["public"]["Enums"]["member_role"];
export type MenuItemStatus = Database["public"]["Enums"]["menu_item_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
