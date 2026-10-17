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
    PostgrestVersion: "14.17"
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
      complaint_book: {
        Row: {
          address: string
          branch_id: string | null
          claim_code: string
          claim_type: string
          claimed_amount: number | null
          consumer_request: string
          contracted_good_type: string
          created_at: string | null
          declaration_accepted_at: string | null
          detail: string
          doc_number: string
          doc_type: string
          email: string
          full_name: string
          good_description: string | null
          id: string
          is_minor: boolean | null
          parent_name: string | null
          phone: string
          provider_snapshot: Json | null
          request_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          submission_payload: Json | null
          table_number: string | null
        }
        Insert: {
          address: string
          branch_id?: string | null
          claim_code: string
          claim_type: string
          claimed_amount?: number | null
          consumer_request: string
          contracted_good_type: string
          created_at?: string | null
          declaration_accepted_at?: string | null
          detail: string
          doc_number: string
          doc_type: string
          email: string
          full_name: string
          good_description?: string | null
          id?: string
          is_minor?: boolean | null
          parent_name?: string | null
          phone: string
          provider_snapshot?: Json | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          submission_payload?: Json | null
          table_number?: string | null
        }
        Update: {
          address?: string
          branch_id?: string | null
          claim_code?: string
          claim_type?: string
          claimed_amount?: number | null
          consumer_request?: string
          contracted_good_type?: string
          created_at?: string | null
          declaration_accepted_at?: string | null
          detail?: string
          doc_number?: string
          doc_type?: string
          email?: string
          full_name?: string
          good_description?: string | null
          id?: string
          is_minor?: boolean | null
          parent_name?: string | null
          phone?: string
          provider_snapshot?: Json | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          submission_payload?: Json | null
          table_number?: string | null
        }
        Relationships: []
      }
      complaint_books: {
        Row: {
          active: boolean
          id: string
          provider_address: string | null
          provider_name: string
          provider_ruc: string
        }
        Insert: {
          active?: boolean
          id: string
          provider_address?: string | null
          provider_name: string
          provider_ruc: string
        }
        Update: {
          active?: boolean
          id?: string
          provider_address?: string | null
          provider_name?: string
          provider_ruc?: string
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          operation_code: string | null
          order_id: string | null
          payment_method: string | null
          rating: number
          table_number: string
          tip_amount: number
          verified: boolean
          voucher_uploaded: boolean
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          operation_code?: string | null
          order_id?: string | null
          payment_method?: string | null
          rating: number
          table_number: string
          tip_amount?: number
          verified?: boolean
          voucher_uploaded?: boolean
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          operation_code?: string | null
          order_id?: string | null
          payment_method?: string | null
          rating?: number
          table_number?: string
          tip_amount?: number
          verified?: boolean
          voucher_uploaded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          line_no: number | null
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
          line_no?: number | null
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
          line_no?: number | null
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
          completed_at: string | null
          completion_date_estimated: boolean
          created_at: string | null
          id: string
          idempotency_key: string | null
          is_critical: boolean | null
          order_number: number
          origin: string | null
          paid_at: string | null
          pax: number | null
          payment_claimed_at: string | null
          payment_date_estimated: boolean
          payment_method: string | null
          payment_reference: string | null
          payment_reviewed_at: string | null
          payment_reviewed_by: string | null
          payment_status: string
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
          completed_at?: string | null
          completion_date_estimated?: boolean
          created_at?: string | null
          id: string
          idempotency_key?: string | null
          is_critical?: boolean | null
          order_number?: number
          origin?: string | null
          paid_at?: string | null
          pax?: number | null
          payment_claimed_at?: string | null
          payment_date_estimated?: boolean
          payment_method?: string | null
          payment_reference?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_status?: string
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
          completed_at?: string | null
          completion_date_estimated?: boolean
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_critical?: boolean | null
          order_number?: number
          origin?: string | null
          paid_at?: string | null
          pax?: number | null
          payment_claimed_at?: string | null
          payment_date_estimated?: boolean
          payment_method?: string | null
          payment_reference?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_status?: string
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
        Relationships: [
          {
            foreignKeyName: "promo_offers_complementary_dish_id_fkey"
            columns: ["complementary_dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_offers_main_dish_id_fkey"
            columns: ["main_dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
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
          actor_auth_id: string | null
          actor_role: string | null
          created_at: string | null
          details: string | null
          event_type: string | null
          id: string
          level: string | null
          metadata: Json | null
          performed_by: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor_auth_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          details?: string | null
          event_type?: string | null
          id?: string
          level?: string | null
          metadata?: Json | null
          performed_by?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_auth_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          details?: string | null
          event_type?: string | null
          id?: string
          level?: string | null
          metadata?: Json | null
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
          geofence_config: Json
          id: string
          language: string | null
          logo_url: string | null
          low_stock_alerts: boolean | null
          manager_name: string | null
          max_items_per_dish: number
          max_items_per_order: number
          pairing_price: number
          paper_width: string | null
          payment_alerts: boolean | null
          payment_config: Json
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
          geofence_config?: Json
          id?: string
          language?: string | null
          logo_url?: string | null
          low_stock_alerts?: boolean | null
          manager_name?: string | null
          max_items_per_dish?: number
          max_items_per_order?: number
          pairing_price?: number
          paper_width?: string | null
          payment_alerts?: boolean | null
          payment_config?: Json
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
          geofence_config?: Json
          id?: string
          language?: string | null
          logo_url?: string | null
          low_stock_alerts?: boolean | null
          manager_name?: string | null
          max_items_per_dish?: number
          max_items_per_order?: number
          pairing_price?: number
          paper_width?: string | null
          payment_alerts?: boolean | null
          payment_config?: Json
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
      waiter_calls: {
        Row: {
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
          table_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string
          table_number: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
          table_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_staff_pin: {
        Args: { p_pin: string; p_staff_id: string }
        Returns: undefined
      }
      configure_complaint_book: {
        Args: {
          p_address: string
          p_book_id: string
          p_name: string
          p_ruc: string
        }
        Returns: Json
      }
      create_waiter_call: {
        Args: { p_reason: string; p_table: string; p_table_token?: string }
        Returns: boolean
      }
      current_staff_role: { Args: never; Returns: string }
      diner_table_signal: {
        Args: {
          p_operation_code?: string
          p_payment_kind?: string
          p_payment_method?: string
          p_signal: string
          p_table: string
          p_table_token?: string
        }
        Returns: boolean
      }
      get_complaint_book: { Args: { p_book_id: string }; Returns: Json }
      get_daily_sales_report: { Args: { p_date?: string }; Returns: Json }
      get_diner_orders: { Args: { p_refs: Json }; Returns: Json }
      get_table_qr_tokens: { Args: { p_count: number }; Returns: Json }
      login_retry_after: {
        Args: { p_identifier: string; p_ip: string }
        Returns: number
      }
      place_order: {
        Args: {
          p_accuracy?: number
          p_idempotency_key: string
          p_items: Json
          p_lat?: number
          p_lng?: number
          p_origin?: string
          p_pax?: number
          p_table_number: string
          p_table_token?: string
          p_waiter?: string
        }
        Returns: Json
      }
      record_login_attempt: {
        Args: { p_identifier: string; p_ip: string; p_success: boolean }
        Returns: undefined
      }
      review_table_payment: {
        Args: { p_approve: boolean; p_table: string }
        Returns: number
      }
      rotate_table_qr_tokens: { Args: { p_tables?: number[] }; Returns: number }
      submit_complaint: {
        Args: { p_book_id: string; p_entry: Json; p_request_id: string }
        Returns: Json
      }
      submit_review: {
        Args: {
          p_comments?: string
          p_operation_code?: string
          p_order_id?: string
          p_order_key?: string
          p_payment_method?: string
          p_rating: number
          p_table_number: string
          p_tip_amount?: number
          p_voucher_uploaded?: boolean
        }
        Returns: string
      }
      verify_my_pin: { Args: { p_pin: string }; Returns: Json }
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
