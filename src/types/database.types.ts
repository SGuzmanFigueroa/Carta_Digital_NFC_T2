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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id: string
          name: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      dishes: {
        Row: {
          active: boolean | null
          badge: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          dietary: string | null
          has_3d: boolean | null
          id: string
          image: string | null
          name: string
          pairing: string | null
          prep_time: string | null
          price: number
          rating: number | null
          reviews_count: number | null
          tag: string | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          dietary?: string | null
          has_3d?: boolean | null
          id: string
          image?: string | null
          name: string
          pairing?: string | null
          prep_time?: string | null
          price: number
          rating?: number | null
          reviews_count?: number | null
          tag?: string | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          dietary?: string | null
          has_3d?: boolean | null
          id?: string
          image?: string | null
          name?: string
          pairing?: string | null
          prep_time?: string | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          checked: boolean | null
          created_at: string | null
          dish_id: string | null
          id: string
          item_status: string | null
          name: string
          notes: string | null
          order_id: string | null
          price: number
          quantity: number
          station: string | null
        }
        Insert: {
          checked?: boolean | null
          created_at?: string | null
          dish_id?: string | null
          id?: string
          item_status?: string | null
          name: string
          notes?: string | null
          order_id?: string | null
          price: number
          quantity?: number
          station?: string | null
        }
        Update: {
          checked?: boolean | null
          created_at?: string | null
          dish_id?: string | null
          id?: string
          item_status?: string | null
          name?: string
          notes?: string | null
          order_id?: string | null
          price?: number
          quantity?: number
          station?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_requested: boolean | null
          created_at: string | null
          id: string
          is_critical: boolean | null
          idempotency_key: string | null
          order_number: number
          origin: string | null
          pax: number | null
          payment_method: string | null
          preparation_percent: number | null
          runner_assigned: string | null
          status: string
          subtotal: number
          table_number: string
          total: number
          updated_at: string | null
          waiter: string | null
        }
        Insert: {
          account_requested?: boolean | null
          created_at?: string | null
          id: string
          is_critical?: boolean | null
          idempotency_key?: string | null
          order_number?: number
          origin?: string | null
          pax?: number | null
          payment_method?: string | null
          preparation_percent?: number | null
          runner_assigned?: string | null
          status?: string
          subtotal?: number
          table_number: string
          total?: number
          updated_at?: string | null
          waiter?: string | null
        }
        Update: {
          account_requested?: boolean | null
          created_at?: string | null
          id?: string
          is_critical?: boolean | null
          order_number?: number
          idempotency_key?: string | null
          origin?: string | null
          pax?: number | null
          payment_method?: string | null
          preparation_percent?: number | null
          runner_assigned?: string | null
          status?: string
          subtotal?: number
          table_number?: string
          total?: number
          updated_at?: string | null
          waiter?: string | null
        }
        Relationships: []
      }
      promo_offers: {
        Row: {
          complementary_dish_id: string | null
          created_at: string
          discount_percent: number
          display: Json
          ends_at: string | null
          id: string
          is_active: boolean
          main_dish_id: string
          mechanic: string
          priority: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          complementary_dish_id?: string | null
          created_at?: string
          discount_percent: number
          display?: Json
          ends_at?: string | null
          id?: string
          is_active?: boolean
          main_dish_id: string
          mechanic: string
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          complementary_dish_id?: string | null
          created_at?: string
          discount_percent?: number
          display?: Json
          ends_at?: string | null
          id?: string
          is_active?: boolean
          main_dish_id?: string
          mechanic?: string
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          amount: number | null
          capacity: number
          id: string
          number: string
          pax: number | null
          status: string
          time_active: string | null
          updated_at: string | null
          waiter: string | null
          zone: string
        }
        Insert: {
          amount?: number | null
          capacity?: number
          id: string
          number: string
          pax?: number | null
          status?: string
          time_active?: string | null
          updated_at?: string | null
          waiter?: string | null
          zone?: string
        }
        Update: {
          amount?: number | null
          capacity?: number
          id?: string
          number?: string
          pax?: number | null
          status?: string
          time_active?: string | null
          updated_at?: string | null
          waiter?: string | null
          zone?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          anulacion_comandas: string
          cobro_pos: string
          edicion_menu: string
          id: string
          kds_cocina: string
          panel_admin: string
          role_description: string | null
          role_id: string
          role_title: string
          updated_at: string | null
        }
        Insert: {
          anulacion_comandas?: string
          cobro_pos?: string
          edicion_menu?: string
          id?: string
          kds_cocina?: string
          panel_admin?: string
          role_description?: string | null
          role_id: string
          role_title: string
          updated_at?: string | null
        }
        Update: {
          anulacion_comandas?: string
          cobro_pos?: string
          edicion_menu?: string
          id?: string
          kds_cocina?: string
          panel_admin?: string
          role_description?: string | null
          role_id?: string
          role_title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          custom_permissions: Json | null
          email: string | null
          id: string
          must_change_password: boolean
          name: string
          role: string
          role_title: string | null
          station: string | null
          status: string | null
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          email?: string | null
          id?: string
          must_change_password?: boolean
          name: string
          role: string
          role_title?: string | null
          station?: string | null
          status?: string | null
          username: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          email?: string | null
          id?: string
          must_change_password?: boolean
          name?: string
          role?: string
          role_title?: string | null
          station?: string | null
          status?: string | null
          username?: string
        }
        Relationships: []
      }
      staff_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          level: string | null
          performed_by: string | null
          target: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          level?: string | null
          performed_by?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          level?: string | null
          performed_by?: string | null
          target?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          acoustic_buzzer: boolean | null
          auto_cut: boolean | null
          branch_name: string
          branch_ruc: string | null
          color_accent: string | null
          currency: string | null
          delay_alerts: boolean | null
          density: string | null
          email: string | null
          id: string
          language: string | null
          low_stock_alerts: boolean | null
          manager_name: string | null
          paper_width: string | null
          payment_alerts: boolean | null
          phone: string | null
          printer_ip: string | null
          printer_port: string | null
          sound_alerts: boolean | null
          theme_mode: string | null
          time_format: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          acoustic_buzzer?: boolean | null
          auto_cut?: boolean | null
          branch_name?: string
          branch_ruc?: string | null
          color_accent?: string | null
          currency?: string | null
          delay_alerts?: boolean | null
          density?: string | null
          email?: string | null
          id?: string
          language?: string | null
          low_stock_alerts?: boolean | null
          manager_name?: string | null
          paper_width?: string | null
          payment_alerts?: boolean | null
          phone?: string | null
          printer_ip?: string | null
          printer_port?: string | null
          sound_alerts?: boolean | null
          theme_mode?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          acoustic_buzzer?: boolean | null
          auto_cut?: boolean | null
          branch_name?: string
          branch_ruc?: string | null
          color_accent?: string | null
          currency?: string | null
          delay_alerts?: boolean | null
          density?: string | null
          email?: string | null
          id?: string
          language?: string | null
          low_stock_alerts?: boolean | null
          manager_name?: string | null
          paper_width?: string | null
          payment_alerts?: boolean | null
          phone?: string | null
          printer_ip?: string | null
          printer_port?: string | null
          sound_alerts?: boolean | null
          theme_mode?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_staff_pin: {
        Args: { p_staff_id: string; p_pin: string }
        Returns: undefined
      }
      current_staff_role: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      diner_table_signal: {
        Args: { p_table: string; p_signal: string; p_payment_method?: string }
        Returns: boolean
      }
      get_diner_orders: {
        Args: { p_refs: Json }
        Returns: Json
      }
      login_retry_after: {
        Args: { p_identifier: string; p_ip: string }
        Returns: number
      }
      record_login_attempt: {
        Args: { p_identifier: string; p_ip: string; p_success: boolean }
        Returns: undefined
      }
      verify_my_pin: {
        Args: { p_pin: string }
        Returns: Json
      }
      place_order: {
        Args: {
          p_table_number: string
          p_items: Json
          p_idempotency_key: string
          p_pax?: number
          p_origin?: string
          p_waiter?: string
        }
        Returns: Json
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
