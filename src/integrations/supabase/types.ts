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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          tenant_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_proposals: {
        Row: {
          action_type: string
          branch_id: string
          confirmed_at: string | null
          conversation_id: string | null
          created_at: string
          created_by: string
          dedupe_key: string
          description: string | null
          destination: string
          dispatched_task_id: string | null
          evidence: Json
          expires_at: string
          id: string
          model: string | null
          payload: Json
          priority: string
          provider: string | null
          rejected_at: string | null
          rejection_note: string | null
          source_kind: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          branch_id: string
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by: string
          dedupe_key: string
          description?: string | null
          destination: string
          dispatched_task_id?: string | null
          evidence?: Json
          expires_at?: string
          id?: string
          model?: string | null
          payload?: Json
          priority?: string
          provider?: string | null
          rejected_at?: string | null
          rejection_note?: string | null
          source_kind: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          branch_id?: string
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          dedupe_key?: string
          description?: string | null
          destination?: string
          dispatched_task_id?: string | null
          evidence?: Json
          expires_at?: string
          id?: string
          model?: string | null
          payload?: Json
          priority?: string
          provider?: string | null
          rejected_at?: string | null
          rejection_note?: string | null
          source_kind?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_proposals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_proposals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_proposals_dispatched_task_id_fkey"
            columns: ["dispatched_task_id"]
            isOneToOne: false
            referencedRelation: "operations_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          assistant: string
          branch_id: string
          channel: string
          created_at: string
          created_by: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          assistant?: string
          branch_id: string
          channel?: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assistant?: string
          branch_id?: string
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          model: string | null
          provider: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          provider?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          provider?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runtime_settings: {
        Row: {
          auto_reply_enabled: boolean
          enabled: boolean
          fallback_model: string | null
          fallback_provider: string | null
          max_output_tokens: number
          primary_model: string
          primary_provider: string
          scope: string
          tertiary_model: string | null
          tertiary_provider: string | null
          timeout_ms: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_reply_enabled?: boolean
          enabled?: boolean
          fallback_model?: string | null
          fallback_provider?: string | null
          max_output_tokens?: number
          primary_model?: string
          primary_provider?: string
          scope: string
          tertiary_model?: string | null
          tertiary_provider?: string | null
          timeout_ms?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_reply_enabled?: boolean
          enabled?: boolean
          fallback_model?: string | null
          fallback_provider?: string | null
          max_output_tokens?: number
          primary_model?: string
          primary_provider?: string
          scope?: string
          tertiary_model?: string | null
          tertiary_provider?: string | null
          timeout_ms?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_tool_calls: {
        Row: {
          arguments: Json
          branch_id: string
          conversation_id: string
          created_at: string
          duration_ms: number
          id: string
          result_summary: Json | null
          risk_level: string
          status: string
          tool_name: string
          user_id: string
        }
        Insert: {
          arguments?: Json
          branch_id: string
          conversation_id: string
          created_at?: string
          duration_ms?: number
          id?: string
          result_summary?: Json | null
          risk_level: string
          status: string
          tool_name: string
          user_id: string
        }
        Update: {
          arguments?: Json
          branch_id?: string
          conversation_id?: string
          created_at?: string
          duration_ms?: number
          id?: string
          result_summary?: Json | null
          risk_level?: string
          status?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_calls_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          branch_id: string
          conversation_id: string | null
          created_at: string
          error_code: string | null
          fallback_used: boolean
          id: number
          input_tokens: number | null
          latency_ms: number
          metadata: Json
          model: string
          output_tokens: number | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          branch_id: string
          conversation_id?: string | null
          created_at?: string
          error_code?: string | null
          fallback_used?: boolean
          id?: never
          input_tokens?: number | null
          latency_ms?: number
          metadata?: Json
          model: string
          output_tokens?: number | null
          provider: string
          status: string
          user_id: string
        }
        Update: {
          branch_id?: string
          conversation_id?: string | null
          created_at?: string
          error_code?: string | null
          fallback_used?: boolean
          id?: never
          input_tokens?: number | null
          latency_ms?: number
          metadata?: Json
          model?: string
          output_tokens?: number | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          active: boolean | null
          branch_id: string | null
          city_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          city_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          city_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean | null
          category_id: string | null
          company_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          image_url: string
          link: string | null
          main_category_id: string | null
          position: number | null
          products: string[] | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          link?: string | null
          main_category_id?: string | null
          position?: number | null
          products?: string[] | null
          start_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          link?: string | null
          main_category_id?: string | null
          position?: number | null
          products?: string[] | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_main_category_id_fkey"
            columns: ["main_category_id"]
            isOneToOne: false
            referencedRelation: "main_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_delivery_zones: {
        Row: {
          branch_id: string
          color: string | null
          created_at: string | null
          delivery_price: number
          estimated_time: string | null
          id: string
          is_active: boolean | null
          polygon_coordinates: Json
          priority: number | null
          updated_at: string | null
          zone_name: string
        }
        Insert: {
          branch_id: string
          color?: string | null
          created_at?: string | null
          delivery_price?: number
          estimated_time?: string | null
          id?: string
          is_active?: boolean | null
          polygon_coordinates: Json
          priority?: number | null
          updated_at?: string | null
          zone_name: string
        }
        Update: {
          branch_id?: string
          color?: string | null
          created_at?: string | null
          delivery_price?: number
          estimated_time?: string | null
          id?: string
          is_active?: boolean | null
          polygon_coordinates?: Json
          priority?: number | null
          updated_at?: string | null
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_delivery_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_neighborhoods: {
        Row: {
          active: boolean | null
          branch_id: string
          created_at: string | null
          delivery_radius_km: number | null
          estimated_time: string | null
          id: string
          is_primary: boolean | null
          neighborhood_id: string
          price: number | null
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          branch_id: string
          created_at?: string | null
          delivery_radius_km?: number | null
          estimated_time?: string | null
          id?: string
          is_primary?: boolean | null
          neighborhood_id: string
          price?: number | null
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string
          created_at?: string | null
          delivery_radius_km?: number | null
          estimated_time?: string | null
          id?: string
          is_primary?: boolean | null
          neighborhood_id?: string
          price?: number | null
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_neighborhoods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_neighborhoods_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_product_pricing: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          is_offer: boolean | null
          offer_price: number | null
          product_id: string
          purchase_price: number
          sale_price: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          is_offer?: boolean | null
          offer_price?: number | null
          product_id: string
          purchase_price: number
          sale_price: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          is_offer?: boolean | null
          offer_price?: number | null
          product_id?: string
          purchase_price?: number
          sale_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_product_pricing_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_product_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean | null
          address: string | null
          branch_type: Database["public"]["Enums"]["branch_type"]
          category: Database["public"]["Enums"]["branch_category"] | null
          closes_at: string | null
          code: string | null
          commission_rate: number | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          delivery_enabled: boolean
          delivery_fee: number
          delivery_radius_km: number
          email: string | null
          estimated_delivery_minutes: number | null
          franchise_code: string | null
          hub_branch_id: string | null
          id: string
          independent_inventory: boolean | null
          independent_pricing: boolean | null
          inventory_source_branch_id: string
          latitude: number | null
          longitude: number | null
          marketplace_customer_enabled: boolean
          merchant_id: string
          min_order_amount: number
          monthly_fee: number | null
          name: string
          opens_at: string | null
          parent_branch_id: string | null
          phone: string | null
          pricing_source_branch_id: string
          schema_name: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          branch_type?: Database["public"]["Enums"]["branch_type"]
          category?: Database["public"]["Enums"]["branch_category"] | null
          closes_at?: string | null
          code?: string | null
          commission_rate?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          delivery_enabled?: boolean
          delivery_fee?: number
          delivery_radius_km?: number
          email?: string | null
          estimated_delivery_minutes?: number | null
          franchise_code?: string | null
          hub_branch_id?: string | null
          id?: string
          independent_inventory?: boolean | null
          independent_pricing?: boolean | null
          inventory_source_branch_id: string
          latitude?: number | null
          longitude?: number | null
          marketplace_customer_enabled?: boolean
          merchant_id: string
          min_order_amount?: number
          monthly_fee?: number | null
          name: string
          opens_at?: string | null
          parent_branch_id?: string | null
          phone?: string | null
          pricing_source_branch_id: string
          schema_name?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          branch_type?: Database["public"]["Enums"]["branch_type"]
          category?: Database["public"]["Enums"]["branch_category"] | null
          closes_at?: string | null
          code?: string | null
          commission_rate?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          delivery_enabled?: boolean
          delivery_fee?: number
          delivery_radius_km?: number
          email?: string | null
          estimated_delivery_minutes?: number | null
          franchise_code?: string | null
          hub_branch_id?: string | null
          id?: string
          independent_inventory?: boolean | null
          independent_pricing?: boolean | null
          inventory_source_branch_id?: string
          latitude?: number | null
          longitude?: number | null
          marketplace_customer_enabled?: boolean
          merchant_id?: string
          min_order_amount?: number
          monthly_fee?: number | null
          name?: string
          opens_at?: string | null
          parent_branch_id?: string | null
          phone?: string | null
          pricing_source_branch_id?: string
          schema_name?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_hub_branch_id_fkey"
            columns: ["hub_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_inventory_source_branch_id_fkey"
            columns: ["inventory_source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_parent_branch_id_fkey"
            columns: ["parent_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_pricing_source_branch_id_fkey"
            columns: ["pricing_source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          metadata: Json | null
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_type: string
          active: boolean
          branch_id: string
          created_at: string
          currency: string
          custodian_user_id: string | null
          device_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_type: string
          active?: boolean
          branch_id: string
          created_at?: string
          currency?: string
          custodian_user_id?: string | null
          device_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          active?: boolean
          branch_id?: string
          created_at?: string
          currency?: string
          custodian_user_id?: string | null
          device_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_accounts_custodian_user_id_fkey"
            columns: ["custodian_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_accounts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_ledger: {
        Row: {
          account_id: string
          branch_id: string
          created_at: string
          created_by: string | null
          description: string | null
          device_id: string | null
          entry_type: string
          id: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          shift_id: string | null
          signed_amount: number
          transfer_id: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          branch_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          device_id?: string | null
          entry_type: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          shift_id?: string | null
          signed_amount: number
          transfer_id?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          device_id?: string | null
          entry_type?: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          shift_id?: string | null
          signed_amount?: number
          transfer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_ledger_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_ledger_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_ledger_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "cash_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_tracking: {
        Row: {
          branch_id: string | null
          closing_balance: number | null
          created_at: string | null
          created_by: string | null
          date: string
          difference: number | null
          id: string
          notes: string | null
          opening_balance: number | null
          register_type: string
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          branch_id?: string | null
          closing_balance?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          difference?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          register_type?: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          branch_id?: string | null
          closing_balance?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          difference?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          register_type?: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_tracking_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_tracking_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          balance_after: number
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          register_type: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          register_type: string
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          register_type?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          from_account_id: string | null
          from_register: string
          from_transaction_id: string | null
          id: string
          notes: string | null
          shift_id: string | null
          status: string
          to_account_id: string | null
          to_register: string
          to_transaction_id: string | null
          transfer_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_account_id?: string | null
          from_register: string
          from_transaction_id?: string | null
          id?: string
          notes?: string | null
          shift_id?: string | null
          status?: string
          to_account_id?: string | null
          to_register: string
          to_transaction_id?: string | null
          transfer_date?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_account_id?: string | null
          from_register?: string
          from_transaction_id?: string | null
          id?: string
          notes?: string | null
          shift_id?: string | null
          status?: string
          to_account_id?: string | null
          to_register?: string
          to_transaction_id?: string | null
          transfer_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_campaigns: {
        Row: {
          active: boolean
          created_at: string
          description: string
          ends_at: string
          id: string
          kind: string
          product_ids: string[]
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          ends_at: string
          id?: string
          kind: string
          product_ids?: string[]
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          ends_at?: string
          id?: string
          kind?: string
          product_ids?: string[]
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          active: boolean | null
          created_at: string | null
          governorate_id: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          governorate_id: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          governorate_id?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          branch_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string | null
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "special_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          area_id: string | null
          assigned_branch_id: string | null
          city_id: string | null
          created_at: string | null
          distance_km: number | null
          governorate_id: string | null
          id: string
          is_default: boolean | null
          is_deliverable: boolean
          latitude: number | null
          longitude: number | null
          neighborhood_id: string | null
          road_distance_checked_at: string | null
          road_distance_km: number | null
          road_duration_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          area_id?: string | null
          assigned_branch_id?: string | null
          city_id?: string | null
          created_at?: string | null
          distance_km?: number | null
          governorate_id?: string | null
          id?: string
          is_default?: boolean | null
          is_deliverable?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood_id?: string | null
          road_distance_checked_at?: string | null
          road_distance_km?: number | null
          road_duration_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          area_id?: string | null
          assigned_branch_id?: string | null
          city_id?: string | null
          created_at?: string | null
          distance_km?: number | null
          governorate_id?: string | null
          id?: string
          is_default?: boolean | null
          is_deliverable?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood_id?: string | null
          road_distance_checked_at?: string | null
          road_distance_km?: number | null
          road_duration_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_assigned_branch_id_fkey"
            columns: ["assigned_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_admin_audit: {
        Row: {
          action_type: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          metadata: Json
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_admin_audit_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_admin_audit_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_admin_audit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          outcome_code: string | null
          outcome_note: string | null
          priority: string
          scheduled_at: string | null
          source_key: string | null
          source_type: string | null
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          outcome_code?: string | null
          outcome_note?: string | null
          priority?: string
          scheduled_at?: string | null
          source_key?: string | null
          source_type?: string | null
          status?: string
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          outcome_code?: string | null
          outcome_note?: string | null
          priority?: string
          scheduled_at?: string | null
          source_key?: string | null
          source_type?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty_accounts: {
        Row: {
          barcode_token: string
          created_at: string
          customer_id: string
          lifetime_points_earned: number
          lifetime_points_redeemed: number
          membership_number: string
          points_balance: number
          status: string
          updated_at: string
        }
        Insert: {
          barcode_token: string
          created_at?: string
          customer_id: string
          lifetime_points_earned?: number
          lifetime_points_redeemed?: number
          membership_number: string
          points_balance?: number
          status?: string
          updated_at?: string
        }
        Update: {
          barcode_token?: string
          created_at?: string
          customer_id?: string
          lifetime_points_earned?: number
          lifetime_points_redeemed?: number
          membership_number?: string
          points_balance?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          order_id: string | null
          read_at: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          order_id?: string | null
          read_at?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          order_id?: string | null
          read_at?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_opportunity_queue_actions: {
        Row: {
          action_type: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note: string | null
          suppress_until: string
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note?: string | null
          suppress_until: string
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          suppress_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_opportunity_queue_actions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_opportunity_queue_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_opportunity_queue_actions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_smart_ai_limits: {
        Row: {
          requests: number
          usage_date: string
          user_id: string
        }
        Insert: {
          requests?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          requests?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_smart_lists: {
        Row: {
          entries: Json
          id: string
          list_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          entries?: Json
          id?: string
          list_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          entries?: Json
          id?: string
          list_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          customer_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_test_otp_config: {
        Row: {
          code_hash: string
          enabled: boolean
          failed_attempts: number
          last_attempt_at: string | null
          locked_until: string | null
          phone_hash: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          code_hash: string
          enabled?: boolean
          failed_attempts?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          phone_hash: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          code_hash?: string
          enabled?: boolean
          failed_attempts?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          phone_hash?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          area_id: string | null
          city_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          governorate_id: string | null
          id: string
          last_name: string | null
          management_status: string
          name: string
          neighborhood_id: string | null
          notes: string | null
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          address?: string | null
          area_id?: string | null
          city_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          governorate_id?: string | null
          id?: string
          last_name?: string | null
          management_status?: string
          name: string
          neighborhood_id?: string | null
          notes?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          address?: string | null
          area_id?: string | null
          city_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          governorate_id?: string | null
          id?: string
          last_name?: string | null
          management_status?: string
          name?: string
          neighborhood_id?: string | null
          notes?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      damaged_products: {
        Row: {
          batch_number: string
          created_at: string
          created_by: string | null
          damage_cost: number
          damage_date: string
          damaged_quantity: number
          id: string
          notes: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          created_by?: string | null
          damage_cost: number
          damage_date?: string
          damaged_quantity: number
          id?: string
          notes?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          created_by?: string | null
          damage_cost?: number
          damage_date?: string
          damaged_quantity?: number
          id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_realtime_signals_v1: {
        Row: {
          branch_id: string
          created_at: string
          entity_id: string | null
          event_type: string
          id: number
          recipient_user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          entity_id?: string | null
          event_type: string
          id?: never
          recipient_user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          entity_id?: string | null
          event_type?: string
          id?: never
          recipient_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_realtime_signals_v1_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_realtime_signals_v1_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_type_pricing: {
        Row: {
          created_at: string | null
          delivery_location_id: string | null
          delivery_type_id: string | null
          estimated_time: string | null
          id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_location_id?: string | null
          delivery_type_id?: string | null
          estimated_time?: string | null
          id?: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_location_id?: string | null
          delivery_type_id?: string | null
          estimated_time?: string | null
          id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_type_pricing_delivery_type_id_fkey"
            columns: ["delivery_type_id"]
            isOneToOne: false
            referencedRelation: "delivery_types"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_types: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          accounting_treatment: string | null
          actual_fee_amount: number
          amount: number
          beneficiary_name: string | null
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          expected_fee_amount: number
          expense_category_id: string | null
          expense_document_id: string | null
          fee_saving_amount: number
          id: string
          invoice_number: string | null
          paid_from_account_id: string | null
          paid_from_payment_account_id: string | null
          payment_method: string | null
          receipt_url: string | null
          shift_id: string | null
          status: string
          type: string
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          wallet_operation_id: string | null
        }
        Insert: {
          accounting_treatment?: string | null
          actual_fee_amount?: number
          amount: number
          beneficiary_name?: string | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          expected_fee_amount?: number
          expense_category_id?: string | null
          expense_document_id?: string | null
          fee_saving_amount?: number
          id?: string
          invoice_number?: string | null
          paid_from_account_id?: string | null
          paid_from_payment_account_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          shift_id?: string | null
          status?: string
          type: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          wallet_operation_id?: string | null
        }
        Update: {
          accounting_treatment?: string | null
          actual_fee_amount?: number
          amount?: number
          beneficiary_name?: string | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          expected_fee_amount?: number
          expense_category_id?: string | null
          expense_document_id?: string | null
          fee_saving_amount?: number
          id?: string
          invoice_number?: string | null
          paid_from_account_id?: string | null
          paid_from_payment_account_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          shift_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          wallet_operation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_from_account_id_fkey"
            columns: ["paid_from_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_from_payment_account_id_fkey"
            columns: ["paid_from_payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          product_id: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          product_id: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          product_id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_settings: {
        Row: {
          branch_id: string
          can_add_products: boolean | null
          can_manage_inventory: boolean | null
          can_modify_prices: boolean | null
          can_view_analytics: boolean | null
          created_at: string | null
          id: string
          max_discount_percentage: number | null
          payment_terms: string | null
          profit_share_percentage: number | null
          requires_approval_for_orders: boolean | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          can_add_products?: boolean | null
          can_manage_inventory?: boolean | null
          can_modify_prices?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          id?: string
          max_discount_percentage?: number | null
          payment_terms?: string | null
          profit_share_percentage?: number | null
          requires_approval_for_orders?: boolean | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          can_add_products?: boolean | null
          can_manage_inventory?: boolean | null
          can_modify_prices?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          id?: string
          max_discount_percentage?: number | null
          payment_terms?: string | null
          profit_share_percentage?: number | null
          requires_approval_for_orders?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franchise_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      governorates: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          provider_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          provider_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          provider_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governorates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      home_pages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          published_at: string | null
          published_by: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "home_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_pages_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      home_section_events: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          home_page_id: string
          id: string
          metadata: Json
          section_id: string
          section_key: string
          session_key: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          home_page_id: string
          id?: string
          metadata?: Json
          section_id: string
          section_key: string
          session_key: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          home_page_id?: string
          id?: string
          metadata?: Json
          section_id?: string
          section_key?: string
          session_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_section_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_section_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_section_events_home_page_id_fkey"
            columns: ["home_page_id"]
            isOneToOne: false
            referencedRelation: "home_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_section_events_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          audience_segments: string[]
          branch_ids: string[]
          created_at: string
          data_source: Json
          display_config: Json
          ends_at: string | null
          experiment_key: string | null
          experiment_variant: string | null
          home_page_id: string
          id: string
          is_active: boolean
          section_key: string
          section_type: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          audience_segments?: string[]
          branch_ids?: string[]
          created_at?: string
          data_source?: Json
          display_config?: Json
          ends_at?: string | null
          experiment_key?: string | null
          experiment_variant?: string | null
          home_page_id: string
          id?: string
          is_active?: boolean
          section_key?: string
          section_type: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          audience_segments?: string[]
          branch_ids?: string[]
          created_at?: string
          data_source?: Json
          display_config?: Json
          ends_at?: string | null
          experiment_key?: string | null
          experiment_variant?: string | null
          home_page_id?: string
          id?: string
          is_active?: boolean
          section_key?: string
          section_type?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_sections_home_page_id_fkey"
            columns: ["home_page_id"]
            isOneToOne: false
            referencedRelation: "home_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          alert_enabled: boolean
          branch_id: string
          created_at: string | null
          id: string
          max_stock_level: number | null
          min_stock_level: number | null
          product_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          alert_enabled?: boolean
          branch_id: string
          created_at?: string | null
          id?: string
          max_stock_level?: number | null
          min_stock_level?: number | null
          product_id: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          alert_enabled?: boolean
          branch_id?: string
          created_at?: string | null
          id?: string
          max_stock_level?: number | null
          min_stock_level?: number | null
          product_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_enabled: boolean | null
          created_at: string | null
          id: string
          min_stock_level: number | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          alert_enabled?: boolean | null
          created_at?: string | null
          id?: string
          min_stock_level?: number | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          alert_enabled?: boolean | null
          created_at?: string | null
          id?: string
          min_stock_level?: number | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_records: {
        Row: {
          actual_quantity: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          difference: number
          difference_value: number
          expected_quantity: number
          id: string
          inventory_date: string
          notes: string | null
          product_id: string
          purchase_price: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_quantity?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number
          difference_value?: number
          expected_quantity?: number
          id?: string
          inventory_date?: string
          notes?: string | null
          product_id: string
          purchase_price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number
          difference_value?: number
          expected_quantity?: number
          id?: string
          inventory_date?: string
          notes?: string | null
          product_id?: string
          purchase_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          completed_products: number
          created_at: string
          created_by: string | null
          discrepancy_products: number
          id: string
          matched_products: number
          session_date: string
          status: string
          total_difference_value: number
          total_products: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          completed_products?: number
          created_at?: string
          created_by?: string | null
          discrepancy_products?: number
          id?: string
          matched_products?: number
          session_date?: string
          status?: string
          total_difference_value?: number
          total_products?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          completed_products?: number
          created_at?: string
          created_by?: string | null
          discrepancy_products?: number
          id?: string
          matched_products?: number
          session_date?: string
          status?: string
          total_difference_value?: number
          total_products?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_items: {
        Row: {
          barcode_snapshot: string | null
          id: string
          product_id: string
          product_name_snapshot: string | null
          quantity: number
          received_quantity: number | null
          source_quantity_snapshot: number | null
          transfer_id: string
          unit_cost_snapshot: number | null
          unit_snapshot: string | null
          variance_quantity: number | null
        }
        Insert: {
          barcode_snapshot?: string | null
          id?: string
          product_id: string
          product_name_snapshot?: string | null
          quantity: number
          received_quantity?: number | null
          source_quantity_snapshot?: number | null
          transfer_id: string
          unit_cost_snapshot?: number | null
          unit_snapshot?: string | null
          variance_quantity?: number | null
        }
        Update: {
          barcode_snapshot?: string | null
          id?: string
          product_id?: string
          product_name_snapshot?: string | null
          quantity?: number
          received_quantity?: number | null
          source_quantity_snapshot?: number | null
          transfer_id?: string
          unit_cost_snapshot?: number | null
          unit_snapshot?: string | null
          variance_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          actual_arrival_date: string | null
          approved_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          destination_inventory_branch_id: string | null
          dispatch_note: string | null
          dispatched_at: string | null
          dispatched_by: string | null
          expected_arrival_date: string | null
          from_branch_id: string
          id: string
          notes: string | null
          receive_note: string | null
          received_at: string | null
          received_by: string | null
          request_fingerprint: string | null
          request_id: string | null
          requested_at: string
          source_inventory_branch_id: string
          status: string
          to_branch_id: string
          transfer_number: string | null
          transfer_type: string | null
          updated_at: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          approved_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_inventory_branch_id?: string | null
          dispatch_note?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          expected_arrival_date?: string | null
          from_branch_id: string
          id?: string
          notes?: string | null
          receive_note?: string | null
          received_at?: string | null
          received_by?: string | null
          request_fingerprint?: string | null
          request_id?: string | null
          requested_at?: string
          source_inventory_branch_id: string
          status?: string
          to_branch_id: string
          transfer_number?: string | null
          transfer_type?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          approved_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_inventory_branch_id?: string | null
          dispatch_note?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          expected_arrival_date?: string | null
          from_branch_id?: string
          id?: string
          notes?: string | null
          receive_note?: string | null
          received_at?: string | null
          received_by?: string | null
          request_fingerprint?: string | null
          request_id?: string | null
          requested_at?: string
          source_inventory_branch_id?: string
          status?: string
          to_branch_id?: string
          transfer_number?: string | null
          transfer_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_destination_inventory_branch_id_fkey"
            columns: ["destination_inventory_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_dispatched_by_fkey"
            columns: ["dispatched_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_inventory_branch_id_fkey"
            columns: ["source_inventory_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          auto_print: boolean | null
          auto_send_email: boolean | null
          created_at: string | null
          footer_text: string | null
          id: string
          invoice_prefix: string | null
          next_invoice_number: number | null
          show_contact: boolean | null
          show_logo: boolean | null
          show_tax_id: boolean | null
          tax_id: string | null
          terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          auto_print?: boolean | null
          auto_send_email?: boolean | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          invoice_prefix?: string | null
          next_invoice_number?: number | null
          show_contact?: boolean | null
          show_logo?: boolean | null
          show_tax_id?: boolean | null
          tax_id?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_print?: boolean | null
          auto_send_email?: boolean | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          invoice_prefix?: string | null
          next_invoice_number?: number | null
          show_contact?: boolean | null
          show_logo?: boolean | null
          show_tax_id?: boolean | null
          tax_id?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          score: number | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          entry_type: string
          id: string
          metadata: Json
          points_delta: number
          reference: string | null
          source_id: string | null
          source_type: string
          value_egp: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          entry_type: string
          id?: string
          metadata?: Json
          points_delta: number
          reference?: string | null
          source_id?: string | null
          source_type: string
          value_egp?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          entry_type?: string
          id?: string
          metadata?: Json
          points_delta?: number
          reference?: string | null
          source_id?: string | null
          source_type?: string
          value_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          earn_on_shipping: boolean
          enabled: boolean
          points_per_egp: number
          redemption_points: number
          redemption_value_egp: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          earn_on_shipping?: boolean
          enabled?: boolean
          points_per_egp?: number
          redemption_points?: number
          redemption_value_egp?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          earn_on_shipping?: boolean
          enabled?: boolean
          points_per_egp?: number
          redemption_points?: number
          redemption_value_egp?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_voucher_restorations: {
        Row: {
          amount_egp: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          reason: string | null
          source_id: string
          source_type: string
          usage_id: string
          voucher_id: string
        }
        Insert: {
          amount_egp: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          reason?: string | null
          source_id: string
          source_type: string
          usage_id: string
          voucher_id: string
        }
        Update: {
          amount_egp?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          reason?: string | null
          source_id?: string
          source_type?: string
          usage_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_voucher_restorations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_voucher_restorations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_voucher_restorations_usage_id_fkey"
            columns: ["usage_id"]
            isOneToOne: false
            referencedRelation: "loyalty_voucher_usages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_voucher_restorations_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "loyalty_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_voucher_usages: {
        Row: {
          amount_egp: number
          branch_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          metadata: Json
          reversal_reason: string | null
          reversed_at: string | null
          source_id: string
          source_type: string
          voucher_id: string
        }
        Insert: {
          amount_egp: number
          branch_id?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          metadata?: Json
          reversal_reason?: string | null
          reversed_at?: string | null
          source_id: string
          source_type: string
          voucher_id: string
        }
        Update: {
          amount_egp?: number
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          metadata?: Json
          reversal_reason?: string | null
          reversed_at?: string | null
          source_id?: string
          source_type?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_voucher_usages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_voucher_usages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_voucher_usages_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "loyalty_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_vouchers: {
        Row: {
          barcode_token: string
          created_at: string
          created_from_ledger_id: string | null
          customer_id: string
          expires_at: string | null
          id: string
          initial_value_egp: number
          last_used_at: string | null
          points_spent: number
          remaining_value_egp: number
          status: string
          updated_at: string
          voucher_code: string
        }
        Insert: {
          barcode_token: string
          created_at?: string
          created_from_ledger_id?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          initial_value_egp: number
          last_used_at?: string | null
          points_spent: number
          remaining_value_egp: number
          status?: string
          updated_at?: string
          voucher_code: string
        }
        Update: {
          barcode_token?: string
          created_at?: string
          created_from_ledger_id?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          initial_value_egp?: number
          last_used_at?: string | null
          points_spent?: number
          remaining_value_egp?: number
          status?: string
          updated_at?: string
          voucher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_vouchers_created_from_ledger_id_fkey"
            columns: ["created_from_ledger_id"]
            isOneToOne: false
            referencedRelation: "loyalty_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_vouchers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      main_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          position: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      merchant_commission_rules: {
        Row: {
          calculation_basis: string
          commission_percent: number
          created_at: string
          effective_from: string
          effective_to: string | null
          fixed_fee: number
          id: string
          is_active: boolean
          main_category_id: string | null
          merchant_id: string | null
          metadata: Json
          name: string
          priority: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          calculation_basis?: string
          commission_percent?: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_fee?: number
          id?: string
          is_active?: boolean
          main_category_id?: string | null
          merchant_id?: string | null
          metadata?: Json
          name: string
          priority?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          calculation_basis?: string
          commission_percent?: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_fee?: number
          id?: string
          is_active?: boolean
          main_category_id?: string | null
          merchant_id?: string | null
          metadata?: Json
          name?: string
          priority?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_commission_rules_main_category_id_fkey"
            columns: ["main_category_id"]
            isOneToOne: false
            referencedRelation: "main_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_commission_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_financial_entries: {
        Row: {
          branch_id: string | null
          commission_rule_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          entry_type: string
          id: string
          idempotency_key: string
          merchant_id: string
          occurred_at: string
          order_id: string | null
          signed_amount: number
          snapshot: Json
          source_id: string | null
          source_kind: string
          tenant_id: string
        }
        Insert: {
          branch_id?: string | null
          commission_rule_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entry_type: string
          id?: string
          idempotency_key: string
          merchant_id: string
          occurred_at?: string
          order_id?: string | null
          signed_amount: number
          snapshot?: Json
          source_id?: string | null
          source_kind?: string
          tenant_id: string
        }
        Update: {
          branch_id?: string | null
          commission_rule_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string
          merchant_id?: string
          occurred_at?: string
          order_id?: string | null
          signed_amount?: number
          snapshot?: Json
          source_id?: string | null
          source_kind?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_financial_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_financial_entries_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "merchant_commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_financial_entries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_financial_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_financial_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_listings: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          marketplace_customer_enabled: boolean
          merchant_id: string
          merchant_sku: string | null
          metadata: Json
          preparation_minutes: number | null
          product_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          marketplace_customer_enabled?: boolean
          merchant_id: string
          merchant_sku?: string | null
          metadata?: Json
          preparation_minutes?: number | null
          product_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          marketplace_customer_enabled?: boolean
          merchant_id?: string
          merchant_sku?: string | null
          metadata?: Json
          preparation_minutes?: number | null
          product_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_listings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_listings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          role?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_members_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_retail_market_settings_v1: {
        Row: {
          country_code: string
          created_at: string
          currency_code: string
          merchant_id: string
          receipt_language: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          currency_code?: string
          merchant_id: string
          receipt_language?: string
          time_zone?: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency_code?: string
          merchant_id?: string
          receipt_language?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_retail_market_settings_v1_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_retail_payment_channels_v1: {
        Row: {
          account_identifier: string
          account_name: string
          active: boolean
          method: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_identifier: string
          account_name: string
          active?: boolean
          method: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_identifier?: string
          account_name?: string
          active?: boolean
          method?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      merchant_retail_payment_requests_v1: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          id: string
          merchant_id: string
          plan_code: string
          requested_branches: number
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transfer_method: string
          transfer_reference: string
        }
        Insert: {
          amount: number
          billing_cycle: string
          created_at?: string
          id?: string
          merchant_id: string
          plan_code: string
          requested_branches?: number
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_method: string
          transfer_reference: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          id?: string
          merchant_id?: string
          plan_code?: string
          requested_branches?: number
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_method?: string
          transfer_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_retail_payment_requests_v1_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_retail_subscriptions_v1: {
        Row: {
          billing_cycle: string
          ends_at: string | null
          licensed_branches: number
          merchant_id: string
          plan_code: string
          revision: number
          starts_at: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_cycle: string
          ends_at?: string | null
          licensed_branches?: number
          merchant_id: string
          plan_code: string
          revision?: number
          starts_at?: string
          status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_cycle?: string
          ends_at?: string | null
          licensed_branches?: number
          merchant_id?: string
          plan_code?: string
          revision?: number
          starts_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_retail_subscriptions_v1_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_settlement_entries: {
        Row: {
          created_at: string
          financial_entry_id: string
          settlement_id: string
        }
        Insert: {
          created_at?: string
          financial_entry_id: string
          settlement_id: string
        }
        Update: {
          created_at?: string
          financial_entry_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_settlement_entries_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: true
            referencedRelation: "merchant_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_settlement_entries_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "merchant_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_settlements: {
        Row: {
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          external_reference: string | null
          gross_credits: number
          id: string
          merchant_id: string
          metadata: Json
          net_payable: number
          paid_at: string | null
          paid_by: string | null
          period_end: string
          period_start: string | null
          reference: string
          settlement_kind: string
          status: string
          tenant_id: string
          total_deductions: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_reference?: string | null
          gross_credits?: number
          id?: string
          merchant_id: string
          metadata?: Json
          net_payable?: number
          paid_at?: string | null
          paid_by?: string | null
          period_end: string
          period_start?: string | null
          reference: string
          settlement_kind?: string
          status?: string
          tenant_id: string
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_reference?: string | null
          gross_credits?: number
          id?: string
          merchant_id?: string
          metadata?: Json
          net_payable?: number
          paid_at?: string | null
          paid_by?: string | null
          period_end?: string
          period_start?: string | null
          reference?: string
          settlement_kind?: string
          status?: string
          tenant_id?: string
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_settlements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          business_profile: string
          code: string
          contact_name: string | null
          created_at: string
          customer_published_at: string | null
          email: string | null
          id: string
          marketplace_approved_at: string | null
          marketplace_approved_by: string | null
          merchant_type: string
          metadata: Json
          name: string
          phone: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          business_profile?: string
          code: string
          contact_name?: string | null
          created_at?: string
          customer_published_at?: string | null
          email?: string | null
          id?: string
          marketplace_approved_at?: string | null
          marketplace_approved_by?: string | null
          merchant_type?: string
          metadata?: Json
          name: string
          phone?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          business_profile?: string
          code?: string
          contact_name?: string | null
          created_at?: string
          customer_published_at?: string | null
          email?: string | null
          id?: string
          marketplace_approved_at?: string | null
          marketplace_approved_by?: string | null
          merchant_type?: string
          metadata?: Json
          name?: string
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          active: boolean | null
          area_id: string
          branch_id: string | null
          created_at: string | null
          estimated_time: string | null
          id: string
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          area_id: string
          branch_id?: string | null
          created_at?: string | null
          estimated_time?: string | null
          id?: string
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          area_id?: string
          branch_id?: string | null
          created_at?: string | null
          estimated_time?: string | null
          id?: string
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_realtime_signals_v2: {
        Row: {
          audience: string
          branch_id: string | null
          created_at: string
          id: number
          notification_id: string
          recipient_user_id: string
        }
        Insert: {
          audience: string
          branch_id?: string | null
          created_at?: string
          id?: never
          notification_id: string
          recipient_user_id: string
        }
        Update: {
          audience?: string
          branch_id?: string | null
          created_at?: string
          id?: never
          notification_id?: string
          recipient_user_id?: string
        }
        Relationships: []
      }
      online_orders: {
        Row: {
          branch_id: string | null
          checkout_fingerprint: string | null
          checkout_version: number | null
          created_at: string | null
          customer_id: string | null
          customer_snapshot: Json | null
          delivery_location_id: string | null
          delivery_person: string | null
          delivery_zone_id: string | null
          id: string
          inventory_reservation_version: number | null
          items: Json
          loyalty_points_earned: number
          loyalty_voucher_amount: number
          loyalty_voucher_id: string | null
          merchant_id: string
          merchant_snapshot: Json | null
          notes: string | null
          order_group_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          return_status: string | null
          shipping_address: string | null
          shipping_cost: number | null
          shipping_snapshot: Json | null
          source_channel: string
          status: Database["public"]["Enums"]["order_status"]
          stock_deductions: Json | null
          stock_released_at: string | null
          tenant_id: string
          total: number
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          checkout_fingerprint?: string | null
          checkout_version?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_snapshot?: Json | null
          delivery_location_id?: string | null
          delivery_person?: string | null
          delivery_zone_id?: string | null
          id?: string
          inventory_reservation_version?: number | null
          items: Json
          loyalty_points_earned?: number
          loyalty_voucher_amount?: number
          loyalty_voucher_id?: string | null
          merchant_id: string
          merchant_snapshot?: Json | null
          notes?: string | null
          order_group_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          return_status?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          shipping_snapshot?: Json | null
          source_channel?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deductions?: Json | null
          stock_released_at?: string | null
          tenant_id: string
          total: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          checkout_fingerprint?: string | null
          checkout_version?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_snapshot?: Json | null
          delivery_location_id?: string | null
          delivery_person?: string | null
          delivery_zone_id?: string | null
          id?: string
          inventory_reservation_version?: number | null
          items?: Json
          loyalty_points_earned?: number
          loyalty_voucher_amount?: number
          loyalty_voucher_id?: string | null
          merchant_id?: string
          merchant_snapshot?: Json | null
          notes?: string | null
          order_group_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          return_status?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          shipping_snapshot?: Json | null
          source_channel?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deductions?: Json | null
          stock_released_at?: string | null
          tenant_id?: string
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "branch_delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_loyalty_voucher_id_fkey"
            columns: ["loyalty_voucher_id"]
            isOneToOne: false
            referencedRelation: "loyalty_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_task_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          note: string | null
          task_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          note?: string | null
          task_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          note?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_task_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "operations_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_tasks: {
        Row: {
          amount: number
          branch_id: string
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json
          order_id: string | null
          payment_method_code: string | null
          payment_method_id: string | null
          payment_method_name: string | null
          priority: string
          provider_reference: string | null
          return_id: string | null
          sale_id: string | null
          source_id: string
          source_kind: string
          started_at: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_method_code?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          priority?: string
          provider_reference?: string | null
          return_id?: string | null
          sale_id?: string | null
          source_id: string
          source_kind: string
          started_at?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_method_code?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          priority?: string
          provider_reference?: string | null
          return_id?: string | null
          sale_id?: string | null
          source_id?: string
          source_kind?: string
          started_at?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "pos_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_tasks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      order_operations_realtime_signals_v1: {
        Row: {
          branch_id: string
          created_at: string
          event_type: string
          id: number
          order_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          event_type: string
          id?: number
          order_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          event_type?: string
          id?: number
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_operations_realtime_signals_v1_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_operations_realtime_signals_v1_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_routing_log: {
        Row: {
          assigned_branch_id: string | null
          created_at: string | null
          id: string
          neighborhood_id: string | null
          order_id: string | null
          routing_reason: string | null
        }
        Insert: {
          assigned_branch_id?: string | null
          created_at?: string | null
          id?: string
          neighborhood_id?: string | null
          order_id?: string | null
          routing_reason?: string | null
        }
        Update: {
          assigned_branch_id?: string | null
          created_at?: string | null
          id?: string
          neighborhood_id?: string | null
          order_id?: string | null
          routing_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_routing_log_assigned_branch_id_fkey"
            columns: ["assigned_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_routing_log_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_routing_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_type: string
          active: boolean
          branch_id: string
          created_at: string
          currency: string
          custodian_user_id: string | null
          id: string
          name: string
          provider_code: string
          updated_at: string
        }
        Insert: {
          account_type: string
          active?: boolean
          branch_id: string
          created_at?: string
          currency?: string
          custodian_user_id?: string | null
          id?: string
          name: string
          provider_code: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          active?: boolean
          branch_id?: string
          created_at?: string
          currency?: string
          custodian_user_id?: string | null
          id?: string
          name?: string
          provider_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_accounts_custodian_user_id_fkey"
            columns: ["custodian_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_ledger: {
        Row: {
          account_id: string
          branch_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_type: string
          external_reference: string | null
          id: string
          metadata: Json
          order_id: string | null
          payment_method: string | null
          return_id: string | null
          sale_id: string | null
          settlement_id: string | null
          signed_amount: number
        }
        Insert: {
          account_id: string
          branch_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type: string
          external_reference?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_method?: string | null
          return_id?: string | null
          sale_id?: string | null
          settlement_id?: string | null
          signed_amount: number
        }
        Update: {
          account_id?: string
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type?: string
          external_reference?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_method?: string | null
          return_id?: string | null
          sale_id?: string | null
          settlement_id?: string | null
          signed_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "payment_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount: number
          branch_id: string
          clearing_account_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          order_id: string
          payment_method: string
          provider_reference: string | null
          return_id: string
          status: string
        }
        Insert: {
          amount: number
          branch_id: string
          clearing_account_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          payment_method: string
          provider_reference?: string | null
          return_id: string
          status?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          clearing_account_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string
          payment_method?: string
          provider_reference?: string | null
          return_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_clearing_account_id_fkey"
            columns: ["clearing_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: true
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          account_number: string | null
          auto_apply_fees: boolean
          bank_name: string | null
          card_processing_fee: number | null
          created_at: string | null
          e_wallet_name: string | null
          e_wallet_processing_fee: number | null
          enable_card: boolean
          enable_cash: boolean
          enable_e_wallet: boolean
          id: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          auto_apply_fees?: boolean
          bank_name?: string | null
          card_processing_fee?: number | null
          created_at?: string | null
          e_wallet_name?: string | null
          e_wallet_processing_fee?: number | null
          enable_card?: boolean
          enable_cash?: boolean
          enable_e_wallet?: boolean
          id?: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          auto_apply_fees?: boolean
          bank_name?: string | null
          card_processing_fee?: number | null
          created_at?: string | null
          e_wallet_name?: string | null
          e_wallet_processing_fee?: number | null
          enable_card?: boolean
          enable_cash?: boolean
          enable_e_wallet?: boolean
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_settlements: {
        Row: {
          bank_account_id: string | null
          branch_id: string
          cash_account_id: string | null
          clearing_account_id: string
          created_at: string
          created_by: string | null
          destination_cash_ledger_entry_id: string | null
          destination_payment_ledger_entry_id: string | null
          destination_responsible_user_id: string | null
          failure_reason: string | null
          fee_amount: number
          fee_ledger_entry_id: string | null
          gross_amount: number
          id: string
          net_amount: number
          note: string | null
          payment_method: string
          payment_method_name_snapshot: string | null
          provider_reference: string | null
          received_at: string | null
          receiver_confirmed_by: string | null
          receiver_note: string | null
          receiver_task_id: string | null
          request_fingerprint: string | null
          request_id: string | null
          requested_at: string | null
          settled_at: string
          source_account_name_snapshot: string | null
          source_net_ledger_entry_id: string | null
          status: string
          target_account_name_snapshot: string | null
          target_kind: string
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          branch_id: string
          cash_account_id?: string | null
          clearing_account_id: string
          created_at?: string
          created_by?: string | null
          destination_cash_ledger_entry_id?: string | null
          destination_payment_ledger_entry_id?: string | null
          destination_responsible_user_id?: string | null
          failure_reason?: string | null
          fee_amount?: number
          fee_ledger_entry_id?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          note?: string | null
          payment_method: string
          payment_method_name_snapshot?: string | null
          provider_reference?: string | null
          received_at?: string | null
          receiver_confirmed_by?: string | null
          receiver_note?: string | null
          receiver_task_id?: string | null
          request_fingerprint?: string | null
          request_id?: string | null
          requested_at?: string | null
          settled_at?: string
          source_account_name_snapshot?: string | null
          source_net_ledger_entry_id?: string | null
          status?: string
          target_account_name_snapshot?: string | null
          target_kind?: string
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          branch_id?: string
          cash_account_id?: string | null
          clearing_account_id?: string
          created_at?: string
          created_by?: string | null
          destination_cash_ledger_entry_id?: string | null
          destination_payment_ledger_entry_id?: string | null
          destination_responsible_user_id?: string | null
          failure_reason?: string | null
          fee_amount?: number
          fee_ledger_entry_id?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          note?: string | null
          payment_method?: string
          payment_method_name_snapshot?: string | null
          provider_reference?: string | null
          received_at?: string | null
          receiver_confirmed_by?: string | null
          receiver_note?: string | null
          receiver_task_id?: string | null
          request_fingerprint?: string | null
          request_id?: string | null
          requested_at?: string | null
          settled_at?: string
          source_account_name_snapshot?: string | null
          source_net_ledger_entry_id?: string | null
          status?: string
          target_account_name_snapshot?: string | null
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_settlements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_clearing_account_id_fkey"
            columns: ["clearing_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_destination_cash_ledger_entry_id_fkey"
            columns: ["destination_cash_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "cash_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_destination_payment_ledger_entry_id_fkey"
            columns: ["destination_payment_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_destination_responsible_user_id_fkey"
            columns: ["destination_responsible_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_fee_ledger_entry_id_fkey"
            columns: ["fee_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_receiver_confirmed_by_fkey"
            columns: ["receiver_confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_receiver_task_id_fkey"
            columns: ["receiver_task_id"]
            isOneToOne: false
            referencedRelation: "operations_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settlements_source_net_ledger_entry_id_fkey"
            columns: ["source_net_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_branch_receipt_branding_v1: {
        Row: {
          branch_id: string
          display_name: string
          footer: string
          logo_mode: string
          logo_path: string | null
          print_address: string
          print_phone: string
          show_logo: boolean
          show_name: boolean
          slogan: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          display_name: string
          footer?: string
          logo_mode?: string
          logo_path?: string | null
          print_address?: string
          print_phone?: string
          show_logo?: boolean
          show_name?: boolean
          slogan?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          display_name?: string
          footer?: string
          logo_mode?: string
          logo_path?: string | null
          print_address?: string
          print_phone?: string
          show_logo?: boolean
          show_name?: boolean
          slogan?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_branch_receipt_branding_v1_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_card_refunds: {
        Row: {
          amount: number
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          device_id: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          provider_reference: string | null
          return_id: string
          sale_id: string
          shift_id: string | null
          status: string
        }
        Insert: {
          amount: number
          branch_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          provider_reference?: string | null
          return_id: string
          sale_id: string
          shift_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          provider_reference?: string | null
          return_id?: string
          sale_id?: string
          shift_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_card_refunds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_card_refunds_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_card_refunds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_card_refunds_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_card_refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: true
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_card_refunds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_card_refunds_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_devices: {
        Row: {
          active: boolean
          auto_lock_minutes: number
          branch_id: string
          cash_warning_threshold: number | null
          device_code: string
          device_token_hash: string
          id: string
          last_seen_at: string | null
          name: string
          registered_at: string
          registered_by: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          auto_lock_minutes?: number
          branch_id: string
          cash_warning_threshold?: number | null
          device_code: string
          device_token_hash: string
          id?: string
          last_seen_at?: string | null
          name: string
          registered_at?: string
          registered_by?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          auto_lock_minutes?: number
          branch_id?: string
          cash_warning_threshold?: number | null
          device_code?: string
          device_token_hash?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          registered_at?: string
          registered_by?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_devices_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_devices_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_invoice_counters: {
        Row: {
          branch_id: string
          business_date: string
          last_number: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_date: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_date?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_invoice_counters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_invoice_items: {
        Row: {
          barcode: string | null
          created_at: string
          discount: number
          id: string
          invoice_id: string
          line_no: number
          line_total: number
          product_id: string | null
          product_name: string
          purchase_price: number | null
          quantity: number
          sale_mode: string
          unit_of_measure: string | null
          unit_price: number
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          discount?: number
          id?: string
          invoice_id: string
          line_no: number
          line_total?: number
          product_id?: string | null
          product_name: string
          purchase_price?: number | null
          quantity?: number
          sale_mode?: string
          unit_of_measure?: string | null
          unit_price?: number
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          discount?: number
          id?: string
          invoice_id?: string
          line_no?: number
          line_total?: number
          product_id?: string | null
          product_name?: string
          purchase_price?: number | null
          quantity?: number
          sale_mode?: string
          unit_of_measure?: string | null
          unit_price?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "pos_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_invoices: {
        Row: {
          amount_charged: number
          branch_id: string
          card_amount: number
          cash_amount: number
          cashier_id: string | null
          cashier_name: string | null
          customer_credit_amount: number
          customer_id: string | null
          customer_name: string | null
          customer_payment_fee_amount: number
          customer_phone: string | null
          device_id: string | null
          digital_wallet_amount: number
          discount: number
          employee_code: string | null
          employee_credit_amount: number
          employee_id: string | null
          employee_name: string | null
          employee_paid_amount: number
          employee_points_earned: number
          id: string
          invoice_number: string
          item_count: number
          loyalty_points_earned: number
          loyalty_voucher_amount: number
          loyalty_voucher_id: string | null
          merchant_payment_fee_amount: number
          net_profit_after_payment_fee: number | null
          payment_breakdown: Json
          payment_fee_amount: number
          payment_fee_bearer: string | null
          payment_method: string
          payment_method_code: string | null
          payment_method_id: string | null
          payment_method_name: string | null
          payment_method_type: string | null
          payment_reference: string | null
          profit: number
          receivable_balance_after: number | null
          receivable_balance_before: number | null
          receivable_credit_available_after: number | null
          receivable_credit_limit: number | null
          receivable_party_kind: string | null
          sale_date: string
          sale_id: string
          shift_id: string | null
          snapshot_created_at: string
          source_channel: string
          subtotal: number
          total: number
        }
        Insert: {
          amount_charged?: number
          branch_id: string
          card_amount?: number
          cash_amount?: number
          cashier_id?: string | null
          cashier_name?: string | null
          customer_credit_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          customer_payment_fee_amount?: number
          customer_phone?: string | null
          device_id?: string | null
          digital_wallet_amount?: number
          discount?: number
          employee_code?: string | null
          employee_credit_amount?: number
          employee_id?: string | null
          employee_name?: string | null
          employee_paid_amount?: number
          employee_points_earned?: number
          id?: string
          invoice_number: string
          item_count?: number
          loyalty_points_earned?: number
          loyalty_voucher_amount?: number
          loyalty_voucher_id?: string | null
          merchant_payment_fee_amount?: number
          net_profit_after_payment_fee?: number | null
          payment_breakdown?: Json
          payment_fee_amount?: number
          payment_fee_bearer?: string | null
          payment_method?: string
          payment_method_code?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          payment_method_type?: string | null
          payment_reference?: string | null
          profit?: number
          receivable_balance_after?: number | null
          receivable_balance_before?: number | null
          receivable_credit_available_after?: number | null
          receivable_credit_limit?: number | null
          receivable_party_kind?: string | null
          sale_date: string
          sale_id: string
          shift_id?: string | null
          snapshot_created_at?: string
          source_channel?: string
          subtotal?: number
          total?: number
        }
        Update: {
          amount_charged?: number
          branch_id?: string
          card_amount?: number
          cash_amount?: number
          cashier_id?: string | null
          cashier_name?: string | null
          customer_credit_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          customer_payment_fee_amount?: number
          customer_phone?: string | null
          device_id?: string | null
          digital_wallet_amount?: number
          discount?: number
          employee_code?: string | null
          employee_credit_amount?: number
          employee_id?: string | null
          employee_name?: string | null
          employee_paid_amount?: number
          employee_points_earned?: number
          id?: string
          invoice_number?: string
          item_count?: number
          loyalty_points_earned?: number
          loyalty_voucher_amount?: number
          loyalty_voucher_id?: string | null
          merchant_payment_fee_amount?: number
          net_profit_after_payment_fee?: number | null
          payment_breakdown?: Json
          payment_fee_amount?: number
          payment_fee_bearer?: string | null
          payment_method?: string
          payment_method_code?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          payment_method_type?: string | null
          payment_reference?: string | null
          profit?: number
          receivable_balance_after?: number | null
          receivable_balance_before?: number | null
          receivable_credit_available_after?: number | null
          receivable_credit_limit?: number | null
          receivable_party_kind?: string | null
          sale_date?: string
          sale_id?: string
          shift_id?: string | null
          snapshot_created_at?: string
          source_channel?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_operational_events: {
        Row: {
          branch_id: string
          created_at: string
          details: Json
          device_id: string | null
          event_type: string
          id: string
          message_code: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shift_id: string | null
          user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          details?: Json
          device_id?: string | null
          event_type: string
          id?: string
          message_code?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shift_id?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          details?: Json
          device_id?: string | null
          event_type?: string
          id?: string
          message_code?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shift_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_operational_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_operational_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_operational_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_operational_events_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_operational_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_payment_methods: {
        Row: {
          active: boolean
          branch_id: string
          code: string
          created_at: string
          created_by: string | null
          fee_bearer: string
          fee_type: string
          fee_value: number
          id: string
          metadata: Json
          method_type: string
          name: string
          require_reference: boolean
          settlement_account_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          branch_id: string
          code: string
          created_at?: string
          created_by?: string | null
          fee_bearer?: string
          fee_type?: string
          fee_value?: number
          id?: string
          metadata?: Json
          method_type: string
          name: string
          require_reference?: boolean
          settlement_account_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          branch_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          fee_bearer?: string
          fee_type?: string
          fee_value?: number
          id?: string
          metadata?: Json
          method_type?: string
          name?: string
          require_reference?: boolean
          settlement_account_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_payment_methods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_payment_methods_settlement_account_id_fkey"
            columns: ["settlement_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_payment_methods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sale_payments: {
        Row: {
          base_amount: number
          branch_id: string
          charged_amount: number
          created_at: string
          created_by: string | null
          customer_fee_amount: number
          estimated_net_settlement: number
          fee_amount: number
          id: string
          merchant_fee_amount: number
          payment_method_id: string
          reference: string | null
          sale_id: string
        }
        Insert: {
          base_amount: number
          branch_id: string
          charged_amount: number
          created_at?: string
          created_by?: string | null
          customer_fee_amount?: number
          estimated_net_settlement: number
          fee_amount?: number
          id?: string
          merchant_fee_amount?: number
          payment_method_id: string
          reference?: string | null
          sale_id: string
        }
        Update: {
          base_amount?: number
          branch_id?: string
          charged_amount?: number
          created_at?: string
          created_by?: string | null
          customer_fee_amount?: number
          estimated_net_settlement?: number
          fee_amount?: number
          id?: string
          merchant_fee_amount?: number
          payment_method_id?: string
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "pos_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shift_cash_handoffs: {
        Row: {
          branch_id: string
          cashier_id: string
          cashier_name_snapshot: string
          closed_at_snapshot: string
          created_at: string
          device_id: string
          device_name_snapshot: string
          drawer_account_id: string
          expected_handoff_amount: number
          id: string
          received_amount: number | null
          received_at: string | null
          received_by: string | null
          received_by_name_snapshot: string | null
          safe_account_id: string | null
          shift_id: string
          status: string
          transfer_id: string | null
          updated_at: string
          variance_amount: number | null
          variance_reason: string | null
        }
        Insert: {
          branch_id: string
          cashier_id: string
          cashier_name_snapshot: string
          closed_at_snapshot: string
          created_at?: string
          device_id: string
          device_name_snapshot: string
          drawer_account_id: string
          expected_handoff_amount: number
          id?: string
          received_amount?: number | null
          received_at?: string | null
          received_by?: string | null
          received_by_name_snapshot?: string | null
          safe_account_id?: string | null
          shift_id: string
          status?: string
          transfer_id?: string | null
          updated_at?: string
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Update: {
          branch_id?: string
          cashier_id?: string
          cashier_name_snapshot?: string
          closed_at_snapshot?: string
          created_at?: string
          device_id?: string
          device_name_snapshot?: string
          drawer_account_id?: string
          expected_handoff_amount?: number
          id?: string
          received_amount?: number | null
          received_at?: string | null
          received_by?: string | null
          received_by_name_snapshot?: string | null
          safe_account_id?: string | null
          shift_id?: string
          status?: string
          transfer_id?: string | null
          updated_at?: string
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_shift_cash_handoffs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_drawer_account_id_fkey"
            columns: ["drawer_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_safe_account_id_fkey"
            columns: ["safe_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: true
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_cash_handoffs_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "cash_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shift_payment_reconciliations: {
        Row: {
          base_amount: number
          branch_id: string
          charged_amount: number
          confirmed_at: string
          confirmed_by: string | null
          confirmed_by_name_snapshot: string | null
          confirmed_refund_amount: number
          counted_amount: number
          created_at: string
          customer_fee_amount: number
          expected_amount: number
          expected_source: string
          id: string
          merchant_fee_amount: number
          method_code: string
          method_name_snapshot: string
          method_type_snapshot: string
          payment_method_id: string | null
          pending_refund_amount: number
          sale_count: number
          settlement_account_id_snapshot: string | null
          shift_id: string
          variance_amount: number
          variance_reason: string | null
        }
        Insert: {
          base_amount?: number
          branch_id: string
          charged_amount?: number
          confirmed_at?: string
          confirmed_by?: string | null
          confirmed_by_name_snapshot?: string | null
          confirmed_refund_amount?: number
          counted_amount: number
          created_at?: string
          customer_fee_amount?: number
          expected_amount: number
          expected_source: string
          id?: string
          merchant_fee_amount?: number
          method_code: string
          method_name_snapshot: string
          method_type_snapshot: string
          payment_method_id?: string | null
          pending_refund_amount?: number
          sale_count?: number
          settlement_account_id_snapshot?: string | null
          shift_id: string
          variance_amount: number
          variance_reason?: string | null
        }
        Update: {
          base_amount?: number
          branch_id?: string
          charged_amount?: number
          confirmed_at?: string
          confirmed_by?: string | null
          confirmed_by_name_snapshot?: string | null
          confirmed_refund_amount?: number
          counted_amount?: number
          created_at?: string
          customer_fee_amount?: number
          expected_amount?: number
          expected_source?: string
          id?: string
          merchant_fee_amount?: number
          method_code?: string
          method_name_snapshot?: string
          method_type_snapshot?: string
          payment_method_id?: string | null
          pending_refund_amount?: number
          sale_count?: number
          settlement_account_id_snapshot?: string | null
          shift_id?: string
          variance_amount?: number
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_shift_payment_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shift_payment_reconciliations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shifts: {
        Row: {
          branch_id: string
          cash_difference: number | null
          closed_at: string | null
          closed_by: string | null
          closing_cash: number | null
          closing_notes: string | null
          created_at: string
          device_id: string
          drawer_account_id: string | null
          expected_cash: number | null
          id: string
          opened_at: string
          opening_cash: number
          opening_system_balance: number | null
          opening_variance: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          closing_notes?: string | null
          created_at?: string
          device_id: string
          drawer_account_id?: string | null
          expected_cash?: number | null
          id?: string
          opened_at?: string
          opening_cash?: number
          opening_system_balance?: number | null
          opening_variance?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          cash_difference?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          closing_notes?: string | null
          created_at?: string
          device_id?: string
          drawer_account_id?: string | null
          expected_cash?: number | null
          id?: string
          opened_at?: string
          opening_cash?: number
          opening_system_balance?: number | null
          opening_variance?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_drawer_account_id_fkey"
            columns: ["drawer_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_workspace_backups: {
        Row: {
          active_tab_id: string | null
          branch_id: string
          device_id: string | null
          tabs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tab_id?: string | null
          branch_id: string
          device_id?: string | null
          tabs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tab_id?: string | null
          branch_id?: string
          device_id?: string | null
          tabs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_workspace_backups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_workspace_backups_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_workspace_backups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_number: string
          branch_id: string | null
          created_at: string
          expiry_date: string
          id: string
          notes: string | null
          product_id: string
          purchase_date: string | null
          purchase_item_id: string | null
          purchase_price: number | null
          quantity: number
          shelf_location: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number: string
          branch_id?: string | null
          created_at?: string
          expiry_date: string
          id?: string
          notes?: string | null
          product_id: string
          purchase_date?: string | null
          purchase_item_id?: string | null
          purchase_price?: number | null
          quantity?: number
          shelf_location?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string
          branch_id?: string | null
          created_at?: string
          expiry_date?: string
          id?: string
          notes?: string | null
          product_id?: string
          purchase_date?: string | null
          purchase_item_id?: string | null
          purchase_price?: number | null
          quantity?: number
          shelf_location?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: true
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          position: number | null
          products: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          position?: number | null
          products?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          position?: number | null
          products?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          active: boolean
          barcode: string | null
          bulk_barcode: string | null
          conversion_factor: number
          created_at: string
          id: string
          image_url: string | null
          name: string
          parent_product_id: string
          position: number | null
          price: number
          purchase_price: number
          updated_at: string
          variant_type: string
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          bulk_barcode?: string | null
          conversion_factor?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          parent_product_id: string
          position?: number | null
          price?: number
          purchase_price?: number
          updated_at?: string
          variant_type: string
        }
        Update: {
          active?: boolean
          barcode?: string | null
          bulk_barcode?: string | null
          conversion_factor?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          parent_product_id?: string
          position?: number | null
          price?: number
          purchase_price?: number
          updated_at?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          barcode: string | null
          barcode_type: string | null
          base_unit: string | null
          branch_id: string | null
          bulk_barcode: string | null
          bulk_enabled: boolean | null
          bulk_price: number | null
          bulk_quantity: number | null
          catalog_scope: string
          company_id: string | null
          created_at: string | null
          default_weight_grams: number
          description: string | null
          expiry_date: string | null
          has_variants: boolean | null
          id: string
          image_urls: string[] | null
          is_bulk: boolean | null
          is_offer: boolean | null
          is_variant: boolean | null
          main_category_id: string | null
          manufacturer_name: string | null
          name: string
          offer_price: number | null
          owner_merchant_id: string | null
          price: number
          purchase_price: number
          quantity: number | null
          shelf_location: string | null
          subcategory_id: string | null
          track_expiry: boolean | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          barcode?: string | null
          barcode_type?: string | null
          base_unit?: string | null
          branch_id?: string | null
          bulk_barcode?: string | null
          bulk_enabled?: boolean | null
          bulk_price?: number | null
          bulk_quantity?: number | null
          catalog_scope?: string
          company_id?: string | null
          created_at?: string | null
          default_weight_grams?: number
          description?: string | null
          expiry_date?: string | null
          has_variants?: boolean | null
          id?: string
          image_urls?: string[] | null
          is_bulk?: boolean | null
          is_offer?: boolean | null
          is_variant?: boolean | null
          main_category_id?: string | null
          manufacturer_name?: string | null
          name: string
          offer_price?: number | null
          owner_merchant_id?: string | null
          price: number
          purchase_price: number
          quantity?: number | null
          shelf_location?: string | null
          subcategory_id?: string | null
          track_expiry?: boolean | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          barcode?: string | null
          barcode_type?: string | null
          base_unit?: string | null
          branch_id?: string | null
          bulk_barcode?: string | null
          bulk_enabled?: boolean | null
          bulk_price?: number | null
          bulk_quantity?: number | null
          catalog_scope?: string
          company_id?: string | null
          created_at?: string | null
          default_weight_grams?: number
          description?: string | null
          expiry_date?: string | null
          has_variants?: boolean | null
          id?: string
          image_urls?: string[] | null
          is_bulk?: boolean | null
          is_offer?: boolean | null
          is_variant?: boolean | null
          main_category_id?: string | null
          manufacturer_name?: string | null
          name?: string
          offer_price?: number | null
          owner_merchant_id?: string | null
          price?: number
          purchase_price?: number
          quantity?: number | null
          shelf_location?: string | null
          subcategory_id?: string | null
          track_expiry?: boolean | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_main_category"
            columns: ["main_category_id"]
            isOneToOne: false
            referencedRelation: "main_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_subcategory"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_main_category_id_fkey"
            columns: ["main_category_id"]
            isOneToOne: false
            referencedRelation: "main_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_owner_merchant_id_fkey"
            columns: ["owner_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          batch_number: string | null
          branch_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          price: number
          product_id: string
          purchase_id: string
          quantity: number
          sale_price: number | null
          shelf_location: string | null
          total: number
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          branch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          price: number
          product_id: string
          purchase_id: string
          quantity: number
          sale_price?: number | null
          shelf_location?: string | null
          total: number
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          branch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          price?: number
          product_id?: string
          purchase_id?: string
          quantity?: number
          sale_price?: number | null
          shelf_location?: string | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          due_date: string | null
          id: string
          inventory_branch_id: string | null
          invoice_file_url: string | null
          invoice_number: string
          paid: number
          posted_at: string | null
          posted_by: string | null
          pricing_branch_id: string | null
          request_id: string | null
          status: string
          supplier_id: string
          total: number
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          due_date?: string | null
          id?: string
          inventory_branch_id?: string | null
          invoice_file_url?: string | null
          invoice_number: string
          paid: number
          posted_at?: string | null
          posted_by?: string | null
          pricing_branch_id?: string | null
          request_id?: string | null
          status?: string
          supplier_id: string
          total: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          due_date?: string | null
          id?: string
          inventory_branch_id?: string | null
          invoice_file_url?: string | null
          invoice_number?: string
          paid?: number
          posted_at?: string | null
          posted_by?: string | null
          pricing_branch_id?: string | null
          request_id?: string | null
          status?: string
          supplier_id?: string
          total?: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_inventory_branch_id_fkey"
            columns: ["inventory_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_pricing_branch_id_fkey"
            columns: ["pricing_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          created_at: string | null
          id: string
          line_original_total: number | null
          price: number
          product_id: string | null
          profit_loss: number | null
          purchase_price: number | null
          quantity: number
          reason: string | null
          return_id: string | null
          sale_line_index: number | null
          sold_quantity: number | null
          total: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_original_total?: number | null
          price: number
          product_id?: string | null
          profit_loss?: number | null
          purchase_price?: number | null
          quantity: number
          reason?: string | null
          return_id?: string | null
          sale_line_index?: number | null
          sold_quantity?: number | null
          total: number
        }
        Update: {
          created_at?: string | null
          id?: string
          line_original_total?: number | null
          price?: number
          product_id?: string | null
          profit_loss?: number | null
          purchase_price?: number | null
          quantity?: number
          reason?: string | null
          return_id?: string | null
          sale_line_index?: number | null
          sold_quantity?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      return_request_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          return_request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          return_request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_request_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          images: string[] | null
          order_id: string
          reason: string
          status: Database["public"]["Enums"]["return_request_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          order_id: string
          reason: string
          status?: Database["public"]["Enums"]["return_request_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          order_id?: string
          reason?: string
          status?: Database["public"]["Enums"]["return_request_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          customer_credit_refund_amount: number
          customer_id: string | null
          customer_name: string | null
          device_id: string | null
          employee_credit_refund_amount: number
          id: string
          inventory_restored_at: string | null
          loyalty_voucher_id: string | null
          order_id: string | null
          pos_request_id: string | null
          reason: string | null
          refund_account_id: string | null
          refund_card_amount: number
          refund_cash_amount: number
          refund_loyalty_amount: number
          refund_method: string | null
          refund_status: string
          sale_id: string | null
          shift_id: string | null
          source: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_credit_refund_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          device_id?: string | null
          employee_credit_refund_amount?: number
          id?: string
          inventory_restored_at?: string | null
          loyalty_voucher_id?: string | null
          order_id?: string | null
          pos_request_id?: string | null
          reason?: string | null
          refund_account_id?: string | null
          refund_card_amount?: number
          refund_cash_amount?: number
          refund_loyalty_amount?: number
          refund_method?: string | null
          refund_status?: string
          sale_id?: string | null
          shift_id?: string | null
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_credit_refund_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          device_id?: string | null
          employee_credit_refund_amount?: number
          id?: string
          inventory_restored_at?: string | null
          loyalty_voucher_id?: string | null
          order_id?: string | null
          pos_request_id?: string | null
          reason?: string | null
          refund_account_id?: string | null
          refund_card_amount?: number
          refund_cash_amount?: number
          refund_loyalty_amount?: number
          refund_method?: string | null
          refund_status?: string
          sale_id?: string | null
          shift_id?: string | null
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_loyalty_voucher_id_fkey"
            columns: ["loyalty_voucher_id"]
            isOneToOne: false
            referencedRelation: "loyalty_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      salaries: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          month: number
          notes: string | null
          payment_date: string | null
          status: string
          updated_at: string | null
          year: number
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          month: number
          notes?: string | null
          payment_date?: string | null
          status?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          month?: number
          notes?: string | null
          payment_date?: string | null
          status?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salaries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_charged: number
          branch_id: string | null
          card_amount: number | null
          cash_amount: number | null
          cashier_id: string | null
          cashier_name: string | null
          created_at: string | null
          customer_credit_amount: number
          customer_id: string | null
          customer_name: string | null
          customer_payment_fee_amount: number
          customer_phone: string | null
          date: string
          device_id: string | null
          digital_wallet_amount: number
          discount: number
          employee_credit_amount: number
          employee_id: string | null
          employee_paid_amount: number
          employee_points_earned: number
          id: string
          invoice_number: string
          items: Json
          loyalty_points_earned: number
          loyalty_voucher_amount: number
          loyalty_voucher_id: string | null
          merchant_payment_fee_amount: number
          net_profit_after_payment_fee: number | null
          payment_breakdown: Json
          payment_fee_amount: number
          payment_fee_bearer: string | null
          payment_method: string
          payment_method_code: string | null
          payment_method_id: string | null
          payment_method_name: string | null
          payment_reference: string | null
          profit: number
          receivable_balance_after: number | null
          receivable_balance_before: number | null
          receivable_credit_available_after: number | null
          receivable_credit_limit: number | null
          receivable_party_kind: string | null
          request_fingerprint: string | null
          shift_id: string | null
          source_channel: string
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          amount_charged?: number
          branch_id?: string | null
          card_amount?: number | null
          cash_amount?: number | null
          cashier_id?: string | null
          cashier_name?: string | null
          created_at?: string | null
          customer_credit_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          customer_payment_fee_amount?: number
          customer_phone?: string | null
          date?: string
          device_id?: string | null
          digital_wallet_amount?: number
          discount?: number
          employee_credit_amount?: number
          employee_id?: string | null
          employee_paid_amount?: number
          employee_points_earned?: number
          id?: string
          invoice_number: string
          items: Json
          loyalty_points_earned?: number
          loyalty_voucher_amount?: number
          loyalty_voucher_id?: string | null
          merchant_payment_fee_amount?: number
          net_profit_after_payment_fee?: number | null
          payment_breakdown?: Json
          payment_fee_amount?: number
          payment_fee_bearer?: string | null
          payment_method: string
          payment_method_code?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          payment_reference?: string | null
          profit: number
          receivable_balance_after?: number | null
          receivable_balance_before?: number | null
          receivable_credit_available_after?: number | null
          receivable_credit_limit?: number | null
          receivable_party_kind?: string | null
          request_fingerprint?: string | null
          shift_id?: string | null
          source_channel?: string
          subtotal: number
          total: number
          updated_at?: string | null
        }
        Update: {
          amount_charged?: number
          branch_id?: string | null
          card_amount?: number | null
          cash_amount?: number | null
          cashier_id?: string | null
          cashier_name?: string | null
          created_at?: string | null
          customer_credit_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          customer_payment_fee_amount?: number
          customer_phone?: string | null
          date?: string
          device_id?: string | null
          digital_wallet_amount?: number
          discount?: number
          employee_credit_amount?: number
          employee_id?: string | null
          employee_paid_amount?: number
          employee_points_earned?: number
          id?: string
          invoice_number?: string
          items?: Json
          loyalty_points_earned?: number
          loyalty_voucher_amount?: number
          loyalty_voucher_id?: string | null
          merchant_payment_fee_amount?: number
          net_profit_after_payment_fee?: number | null
          payment_breakdown?: Json
          payment_fee_amount?: number
          payment_fee_bearer?: string | null
          payment_method?: string
          payment_method_code?: string | null
          payment_method_id?: string | null
          payment_method_name?: string | null
          payment_reference?: string | null
          profit?: number
          receivable_balance_after?: number | null
          receivable_balance_before?: number | null
          receivable_credit_available_after?: number | null
          receivable_credit_limit?: number | null
          receivable_party_kind?: string | null
          request_fingerprint?: string | null
          shift_id?: string | null
          source_channel?: string
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_loyalty_voucher_id_fkey"
            columns: ["loyalty_voucher_id"]
            isOneToOne: false
            referencedRelation: "loyalty_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "pos_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          employee_id: string | null
          end_time: string | null
          id: string
          start_time: string
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          start_time: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          start_time?: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_shopping_groups: {
        Row: {
          base_servings: number
          created_at: string
          id: string
          kind: string
          position: number
          published: boolean
          slug: string
          source_url: string | null
          subtitle_ar: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          base_servings?: number
          created_at?: string
          id?: string
          kind: string
          position?: number
          published?: boolean
          slug: string
          source_url?: string | null
          subtitle_ar?: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          base_servings?: number
          created_at?: string
          id?: string
          kind?: string
          position?: number
          published?: boolean
          slug?: string
          source_url?: string | null
          subtitle_ar?: string
          title_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      smart_shopping_slots: {
        Row: {
          amount: number
          excluded_terms: string[]
          group_id: string
          id: string
          label_ar: string
          optional: boolean
          position: number
          required_terms: string[]
          search_terms: string[]
          unit: string
        }
        Insert: {
          amount?: number
          excluded_terms?: string[]
          group_id: string
          id?: string
          label_ar: string
          optional?: boolean
          position?: number
          required_terms?: string[]
          search_terms: string[]
          unit: string
        }
        Update: {
          amount?: number
          excluded_terms?: string[]
          group_id?: string
          id?: string
          label_ar?: string
          optional?: boolean
          position?: number
          required_terms?: string[]
          search_terms?: string[]
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_shopping_slots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "smart_shopping_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      special_offers: {
        Row: {
          active: boolean | null
          code: string | null
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          expiry_date: string | null
          id: string
          max_discount: number | null
          min_order_amount: number | null
          name: string
          offer_type: string
          updated_at: string | null
          usage_limit: number | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expiry_date?: string | null
          id?: string
          max_discount?: number | null
          min_order_amount?: number | null
          name: string
          offer_type: string
          updated_at?: string | null
          usage_limit?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expiry_date?: string | null
          id?: string
          max_discount?: number | null
          min_order_amount?: number | null
          name?: string
          offer_type?: string
          updated_at?: string | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      staff_login_attempts: {
        Row: {
          created_at: string
          id: string
          identifier_hash: string
          ip_hash: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_hash: string
          ip_hash?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier_hash?: string
          ip_hash?: string | null
          success?: boolean
        }
        Relationships: []
      }
      staff_password_reset_audit_v1: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          reason: string | null
          source: string
          target_role: string | null
          target_user_id: string
          target_username: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          source?: string
          target_role?: string | null
          target_user_id: string
          target_username?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          source?: string
          target_role?: string | null
          target_user_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
          name_ar: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name_ar: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name_ar?: string
        }
        Relationships: []
      }
      staff_pos_pins: {
        Row: {
          branch_id: string
          created_at: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_pos_pins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_pos_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "staff_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name_ar: string
          scope: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name_ar: string
          scope: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name_ar?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string | null
          created_at: string | null
          currency: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          rtl: boolean | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          rtl?: boolean | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          rtl?: boolean | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          position: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "main_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          balance: number | null
          branch_id: string | null
          code: string | null
          commercial_registration: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms_days: number
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          balance?: number | null
          branch_id?: string | null
          code?: string | null
          commercial_registration?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          balance?: number | null
          branch_id?: string | null
          code?: string | null
          commercial_registration?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_analytics: {
        Row: {
          created_at: string
          id: string
          last_login_at: string | null
          last_order_at: string | null
          month_year: string
          tenant_id: string
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
          total_users: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_login_at?: string | null
          last_order_at?: string | null
          month_year: string
          tenant_id: string
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
          total_users?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_login_at?: string | null
          last_order_at?: string | null
          month_year?: string
          tenant_id?: string
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
          total_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_applications: {
        Row: {
          business_address: string | null
          business_description: string | null
          business_name: string
          business_type: string | null
          created_at: string
          expected_products_count: number | null
          expected_users_count: number | null
          id: string
          owner_email: string
          owner_name: string
          owner_phone: string | null
          rejection_reason: string | null
          requested_subdomain: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_description?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string
          expected_products_count?: number | null
          expected_users_count?: number | null
          id?: string
          owner_email: string
          owner_name: string
          owner_phone?: string | null
          rejection_reason?: string | null
          requested_subdomain: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_description?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          expected_products_count?: number | null
          expected_users_count?: number | null
          id?: string
          owner_email?: string
          owner_name?: string
          owner_phone?: string | null
          rejection_reason?: string | null
          requested_subdomain?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          auto_suspend: boolean
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          ends_at: string
          grace_ends_at: string | null
          id: string
          last_payment_at: string | null
          metadata: Json
          next_payment_at: string | null
          payment_method: Json | null
          plan_id: string | null
          plan_name: string
          plan_price: number
          starts_at: string
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_suspend?: boolean
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          ends_at: string
          grace_ends_at?: string | null
          id?: string
          last_payment_at?: string | null
          metadata?: Json
          next_payment_at?: string | null
          payment_method?: Json | null
          plan_id?: string | null
          plan_name: string
          plan_price?: number
          starts_at: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_suspend?: boolean
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          ends_at?: string
          grace_ends_at?: string | null
          id?: string
          last_payment_at?: string | null
          metadata?: Json
          next_payment_at?: string | null
          payment_method?: Json | null
          plan_id?: string | null
          plan_name?: string
          plan_price?: number
          starts_at?: string
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          domain: string | null
          features: Json | null
          id: string
          limits: Json | null
          logo_url: string | null
          name: string
          settings: Json | null
          status: string
          subdomain: string
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          status?: string
          subdomain: string
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          status?: string
          subdomain?: string
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_branch_roles: {
        Row: {
          active: boolean
          branch_id: string
          created_at: string | null
          id: string
          is_primary: boolean
          pos_enabled: boolean
          role: string
          role_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean
          pos_enabled?: boolean
          role?: string
          role_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean
          pos_enabled?: boolean
          role?: string
          role_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string
          email: string | null
          id: string
          name: string
          password: string
          phone: string | null
          role: string
          system_role_id: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          password: string
          phone?: string | null
          role: string
          system_role_id?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          password?: string
          phone?: string | null
          role?: string
          system_role_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_system_role_id_fkey"
            columns: ["system_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_daily_inventory_audit_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      accept_my_franchise_invitation_v1: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      accept_my_partner_invitation_v1: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      accept_my_picker_assignment_offer_v1: {
        Args: { p_offer_id: string }
        Returns: Json
      }
      accept_pos_online_order_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      accrue_franchise_period_v1: {
        Args: {
          p_merchant_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      add_cash_transaction:
        | {
            Args: {
              p_amount: number
              p_notes: string
              p_register_type: string
              p_transaction_type: string
            }
            Returns: number
          }
        | {
            Args: {
              p_amount: number
              p_created_by?: string
              p_notes: string
              p_register_type: string
              p_transaction_type: string
            }
            Returns: number
          }
        | {
            Args: {
              p_amount: number
              p_branch_id?: string
              p_created_by?: string
              p_notes: string
              p_register_type: string
              p_transaction_type: string
            }
            Returns: number
          }
      add_cash_transaction_api: {
        Args: {
          p_amount: number
          p_branch_id?: string
          p_created_by?: string
          p_notes: string
          p_register_type: string
          p_transaction_type: string
        }
        Returns: number
      }
      add_customer_management_note: {
        Args: {
          p_branch_id?: string
          p_customer_id: string
          p_description: string
          p_priority?: string
          p_subject: string
        }
        Returns: Json
      }
      add_float_to_pos_drawer: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_device_id: string
          p_note?: string
        }
        Returns: Json
      }
      add_hr_payroll_adjustment_v2: {
        Args: {
          p_adjustment_type: string
          p_amount: number
          p_code: string
          p_note: string
          p_payroll_item_id: string
        }
        Returns: Json
      }
      adjust_branch_inventory: {
        Args: {
          p_branch_id: string
          p_delta: number
          p_product_id: string
          p_request_id: string
        }
        Returns: number
      }
      adjust_customer_loyalty_points: {
        Args: {
          p_branch_id?: string
          p_customer_id: string
          p_points_delta: number
          p_reason: string
        }
        Returns: Json
      }
      adjust_franchise_inventory_v1: {
        Args: {
          p_branch_id: string
          p_delta: number
          p_merchant_id: string
          p_note: string
          p_product_id: string
          p_reason_code: string
          p_request_id: string
        }
        Returns: Json
      }
      adjust_inventory_stock_v2: {
        Args: {
          p_branch_id: string
          p_delta: number
          p_note: string
          p_product_id: string
          p_reason_code: string
          p_request_id: string
        }
        Returns: Json
      }
      advance_franchise_order_v1: {
        Args: {
          p_merchant_id: string
          p_note?: string
          p_order_id: string
          p_target_status: string
        }
        Returns: Json
      }
      apply_hr_attendance_correction_v1: {
        Args: { p_note: string; p_task_id: string }
        Returns: Json
      }
      apply_order_group_reprice_v1: {
        Args: {
          p_group_id: string
          p_request_id: string
          p_route_quote_id?: string
        }
        Returns: Json
      }
      approve_franchise_settlement_v1: {
        Args: { p_note?: string; p_settlement_id: string }
        Returns: Json
      }
      approve_inventory_adjustment_v2: {
        Args: {
          p_note: string
          p_reason_code: string
          p_request_id: string
          p_task_id: string
        }
        Returns: Json
      }
      approve_marketplace_merchant_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      approve_marketplace_settlement_v1: {
        Args: { p_note?: string; p_settlement_id: string }
        Returns: Json
      }
      approve_return_atomic: {
        Args: { p_refund_source?: string; p_return_id: string }
        Returns: Json
      }
      approve_staff_device_v1: { Args: { p_device_id: string }; Returns: Json }
      assign_my_delivery_cash_handover_target_v1: {
        Args: { p_handover_id: string; p_shift_id: string }
        Returns: Json
      }
      assign_recommended_delivery_v1: {
        Args: { p_force?: boolean; p_order_id: string }
        Returns: Json
      }
      assign_recommended_order_group_delivery_v1: {
        Args: { p_force?: boolean; p_group_id: string }
        Returns: Json
      }
      assign_tenant_subscription_v1: {
        Args: {
          p_auto_suspend?: boolean
          p_billing_cycle?: string
          p_ends_at?: string
          p_grace_days?: number
          p_plan_id: string
          p_starts_at?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      auto_transfer_from_hub: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_target_branch_id: string
        }
        Returns: string
      }
      bind_my_staff_device_fingerprint_v2: {
        Args: {
          p_device_id: string
          p_device_key: string
          p_device_token: string
          p_metadata?: Json
        }
        Returns: Json
      }
      calculate_branch_needs: {
        Args: never
        Returns: {
          branch_id: string
          branch_name: string
          current_quantity: number
          min_stock_level: number
          needed_quantity: number
          product_id: string
          product_name: string
        }[]
      }
      can_manage_business_structure_v1: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      can_manage_franchise_accounts_v1: {
        Args: { p_merchant_id: string }
        Returns: boolean
      }
      can_manage_home_content: { Args: never; Returns: boolean }
      can_manage_partner_accounts_v1: {
        Args: { p_merchant_id: string }
        Returns: boolean
      }
      can_manage_tenant_marketplace_v1: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      can_publish_home_content: { Args: never; Returns: boolean }
      can_send_notifications_v2: {
        Args: { p_branch_id?: string }
        Returns: boolean
      }
      can_view_home_content: { Args: never; Returns: boolean }
      cancel_customer_followup: {
        Args: {
          p_branch_id?: string
          p_interaction_id: string
          p_reason: string
        }
        Returns: Json
      }
      cancel_finance_transfer_v2: {
        Args: { p_reason: string; p_transfer_id: string }
        Returns: Json
      }
      cancel_franchise_settlement_v1: {
        Args: { p_reason: string; p_settlement_id: string }
        Returns: Json
      }
      cancel_inventory_audit_session_v2: {
        Args: { p_note?: string; p_session_id: string }
        Returns: Json
      }
      cancel_inventory_transfer_v2: {
        Args: { p_reason: string; p_transfer_id: string }
        Returns: Json
      }
      cancel_marketplace_settlement_v1: {
        Args: { p_reason: string; p_settlement_id: string }
        Returns: Json
      }
      cancel_my_franchise_operation_request_v1: {
        Args: { p_request_id: string }
        Returns: Json
      }
      cancel_my_hr_request_v1: { Args: { p_request_id: string }; Returns: Json }
      cancel_my_partner_marketplace_request_v1: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: Json
      }
      cancel_order_fulfillment_substitution_v1: {
        Args: { p_substitution_id: string }
        Returns: Json
      }
      cash_drop_to_safe: {
        Args: {
          p_amount: number
          p_device_id: string
          p_device_token: string
          p_note?: string
        }
        Returns: Json
      }
      change_my_staff_app_pin_v1: {
        Args: { p_current_pin: string; p_new_pin: string }
        Returns: Json
      }
      change_retail_promotion_status_v1: {
        Args: { p_branch_id: string; p_id: string; p_next_status: string }
        Returns: Json
      }
      charge_employee_wallet_purchase_v1: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_description?: string
          p_employee_id: string
          p_idempotency_key: string
          p_payment_mode: string
          p_reference_id: string
          p_reference_kind: string
        }
        Returns: Json
      }
      check_my_it_session_v1: { Args: never; Returns: Json }
      check_point_in_delivery_zone: {
        Args: { p_lat: number; p_lng: number }
        Returns: {
          branch_id: string
          branch_name: string
          delivery_price: number
          estimated_time: string
          priority: number
          zone_id: string
          zone_name: string
        }[]
      }
      claim_operations_task: { Args: { p_task_id: string }; Returns: Json }
      claim_order_fulfillment_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      claim_push_delivery_batch_v2: {
        Args: { p_limit?: number }
        Returns: Json
      }
      clear_customer_opportunity_queue_action: {
        Args: { p_branch_id?: string; p_customer_id: string }
        Returns: Json
      }
      clear_my_pos_workspace: {
        Args: { p_branch_id: string }
        Returns: undefined
      }
      close_pos_shift: {
        Args: {
          p_closing_cash: number
          p_device_id: string
          p_device_token: string
          p_notes?: string
          p_shift_id: string
        }
        Returns: Json
      }
      close_pos_shift_v2: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_notes?: string
          p_reconciliation: Json
          p_shift_id: string
        }
        Returns: Json
      }
      collect_pos_receivable_v2: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_device_id: string
          p_device_token: string
          p_party_id: string
          p_party_kind: string
          p_payment_splits: Json
          p_request_id: string
        }
        Returns: Json
      }
      complete_customer_followup: {
        Args: {
          p_branch_id?: string
          p_interaction_id: string
          p_outcome: string
        }
        Returns: Json
      }
      complete_customer_followup_v2: {
        Args: {
          p_branch_id?: string
          p_interaction_id: string
          p_outcome_code: string
          p_outcome_note?: string
        }
        Returns: Json
      }
      complete_customer_followup_v3: {
        Args: {
          p_branch_id?: string
          p_callback_at?: string
          p_interaction_id: string
          p_outcome_code: string
          p_outcome_note?: string
        }
        Returns: Json
      }
      complete_hr_salary_advance_payout_v1: {
        Args: { p_note: string; p_reference?: string; p_task_id: string }
        Returns: Json
      }
      complete_hr_salary_advance_payout_v2: {
        Args: {
          p_note: string
          p_reference?: string
          p_source_account_id: string
          p_source_kind: string
          p_task_id: string
        }
        Returns: Json
      }
      complete_operations_task: {
        Args: { p_note: string; p_task_id: string }
        Returns: Json
      }
      complete_push_delivery_v2: {
        Args: {
          p_error?: string
          p_metadata?: Json
          p_provider_reference?: string
          p_queue_id: string
          p_state: string
        }
        Returns: boolean
      }
      complete_refund_transfer_task: {
        Args: { p_provider_reference: string; p_task_id: string }
        Returns: Json
      }
      configure_customer_credit_v1: {
        Args: {
          p_branch_id: string
          p_credit_limit: number
          p_customer_id: string
          p_enabled: boolean
          p_note?: string
        }
        Returns: Json
      }
      configure_employee_wallet_v1: {
        Args: {
          p_active?: boolean
          p_benefit_monthly_allowance: number
          p_branch_id: string
          p_credit_limit: number
          p_employee_id: string
          p_payroll_deduction_enabled?: boolean
        }
        Returns: Json
      }
      confirm_ai_action_proposal_v1: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      confirm_finance_transfer_handover_v2: {
        Args: { p_note: string; p_task_id: string }
        Returns: Json
      }
      confirm_finance_transfer_receipt_v2: {
        Args: { p_note: string; p_task_id: string }
        Returns: Json
      }
      confirm_hr_treasury_payout_v1: {
        Args: { p_note: string; p_reference?: string; p_task_id: string }
        Returns: Json
      }
      confirm_hr_treasury_payroll_v1: {
        Args: { p_note: string; p_reference?: string; p_task_id: string }
        Returns: Json
      }
      confirm_online_refund: {
        Args: { p_provider_reference?: string; p_refund_id: string }
        Returns: Json
      }
      confirm_order_fulfillment_item_v1: {
        Args: { p_item_id: string; p_quantity?: number }
        Returns: Json
      }
      confirm_payment_settlement_receipt_v3: {
        Args: { p_note: string; p_task_id: string }
        Returns: Json
      }
      confirm_pos_card_refund: {
        Args: { p_provider_reference: string; p_refund_id: string }
        Returns: Json
      }
      confirm_pos_payment_refund_v3: {
        Args: { p_provider_reference: string; p_refund_id: string }
        Returns: Json
      }
      consume_customer_smart_ai_quota_v1: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      consume_edge_rate_limit_v1: {
        Args: {
          p_endpoint: string
          p_key_hash: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: Json
      }
      create_ai_action_proposal_v1: {
        Args: {
          p_action_type: string
          p_branch_id: string
          p_conversation_id: string
          p_description?: string
          p_evidence?: Json
          p_model?: string
          p_payload?: Json
          p_priority?: string
          p_provider?: string
          p_title: string
        }
        Returns: Json
      }
      create_branch_expense_atomic: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_date?: string
          p_description: string
          p_receipt_url?: string
          p_source?: string
          p_type: string
        }
        Returns: Json
      }
      create_branch_group_v1: {
        Args: {
          p_code: string
          p_group_type?: string
          p_merchant_id?: string
          p_metadata?: Json
          p_name: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_branch_schema: {
        Args: { p_branch_code: string; p_branch_id: string }
        Returns: string
      }
      create_branch_staff_record_v1: {
        Args: {
          p_actor_id: string
          p_branch_id: string
          p_codes: string[]
          p_name: string
          p_phone: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      create_branch_staff_with_pin_v1: {
        Args: {
          p_actor_id: string
          p_branch_id: string
          p_codes: string[]
          p_name: string
          p_phone: string
          p_pin: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      create_bucket_if_not_exists: {
        Args: { bucket_name: string }
        Returns: undefined
      }
      create_customer_followup: {
        Args: {
          p_assigned_to?: string
          p_branch_id?: string
          p_customer_id: string
          p_description?: string
          p_priority?: string
          p_scheduled_at?: string
          p_subject: string
          p_type: string
        }
        Returns: Json
      }
      create_customer_followup_from_opportunity: {
        Args: {
          p_assigned_to?: string
          p_branch_id?: string
          p_customer_id: string
          p_note?: string
          p_opportunity_key: string
          p_priority?: string
          p_scheduled_at: string
          p_type: string
        }
        Returns: Json
      }
      create_customer_return_request: {
        Args: {
          p_images?: string[]
          p_items: Json
          p_order_id: string
          p_reason: string
        }
        Returns: string
      }
      create_employee_advance_request_v2: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_due_date?: string
          p_employee_id: string
          p_notes?: string
          p_purpose: string
          p_request_id: string
        }
        Returns: Json
      }
      create_expense_request_v2: {
        Args: {
          p_amount: number
          p_beneficiary_name?: string
          p_branch_id: string
          p_category_id: string
          p_description: string
          p_incurred_at?: string
          p_invoice_number?: string
          p_notes?: string
          p_receipt_url?: string
          p_request_id: string
          p_submit?: boolean
          p_tax_amount?: number
        }
        Returns: Json
      }
      create_external_partner_store_v1: {
        Args: { p_commercial?: Json; p_hub_branch_id: string; p_store: Json }
        Returns: Json
      }
      create_finance_bank_account_v2: {
        Args: {
          p_branch_id: string
          p_custodian_user_id?: string
          p_name: string
        }
        Returns: Json
      }
      create_finance_transfer_v2: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_destination_account_id: string
          p_destination_ledger_kind: string
          p_note: string
          p_reference?: string
          p_source_account_id: string
          p_source_ledger_kind: string
        }
        Returns: Json
      }
      create_franchise_account_invitation_v1: {
        Args: { p_email: string; p_merchant_id: string; p_role: string }
        Returns: Json
      }
      create_franchise_branch_v1: {
        Args: { p_branch: Json; p_merchant_id: string }
        Returns: Json
      }
      create_franchise_operator_v1: {
        Args: {
          p_agreement: Json
          p_branch: Json
          p_owner_user_id?: string
          p_profile: Json
          p_tenant_id: string
        }
        Returns: Json
      }
      create_franchise_settlement_v1: {
        Args: {
          p_merchant_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      create_inventory_audit_session_v2: {
        Args: {
          p_assignee_id?: string
          p_audit_kind: string
          p_branch_id: string
          p_description?: string
          p_due_at?: string
          p_scope_filter?: Json
          p_scope_type?: string
          p_title?: string
        }
        Returns: Json
      }
      create_inventory_transfer_v2: {
        Args: {
          p_expected_arrival_date?: string
          p_from_branch_id: string
          p_items: Json
          p_notes?: string
          p_request_id: string
          p_to_branch_id: string
        }
        Returns: Json
      }
      create_loyalty_voucher: { Args: { p_points: number }; Returns: Json }
      create_marketplace_partner_v1: {
        Args: {
          p_address?: string
          p_branch_code?: string
          p_branch_name: string
          p_contact_name?: string
          p_email?: string
          p_latitude?: number
          p_longitude?: number
          p_merchant_name: string
          p_owner_user_id?: string
          p_phone?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_marketplace_partner_v2: {
        Args: {
          p_address?: string
          p_branch_code?: string
          p_branch_name: string
          p_business_profile?: string
          p_contact_name?: string
          p_email?: string
          p_merchant_name: string
          p_phone?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_marketplace_settlement_v2: {
        Args: { p_merchant_id: string; p_period_end?: string }
        Returns: Json
      }
      create_merchant_settlement_v1: {
        Args: { p_merchant_id: string; p_period_end?: string }
        Returns: Json
      }
      create_my_partner_product_v2: {
        Args: {
          p_alert_enabled?: boolean
          p_barcode: string
          p_branch_id: string
          p_description?: string
          p_image_urls?: string[]
          p_is_offer?: boolean
          p_merchant_id: string
          p_min_stock_level?: number
          p_name: string
          p_offer_price?: number
          p_purchase_price: number
          p_quantity: number
          p_sale_price: number
          p_unit_of_measure?: string
        }
        Returns: Json
      }
      create_my_partner_team_invitation_v1: {
        Args: {
          p_branch_ids?: string[]
          p_email: string
          p_merchant_id: string
          p_role: string
        }
        Returns: Json
      }
      create_partner_account_invitation_v1: {
        Args: { p_email: string; p_merchant_id: string; p_role: string }
        Returns: Json
      }
      create_payment_settlement_v3: {
        Args: {
          p_branch_id: string
          p_fee_amount?: number
          p_gross_amount: number
          p_note?: string
          p_provider_reference?: string
          p_request_id: string
          p_source_account_id: string
          p_target_account_id: string
          p_target_kind: string
        }
        Returns: Json
      }
      create_pos_sale: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_return: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_items: Json
          p_reason?: string
          p_request_id: string
          p_sale_id: string
        }
        Returns: Json
      }
      create_pos_sale_return_v3: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_items: Json
          p_reason?: string
          p_request_id: string
          p_sale_id: string
        }
        Returns: Json
      }
      create_pos_sale_return_v4: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_items: Json
          p_reason?: string
          p_request_id: string
          p_sale_id: string
        }
        Returns: Json
      }
      create_pos_sale_return_v5: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_items: Json
          p_reason?: string
          p_request_id: string
          p_sale_id: string
        }
        Returns: Json
      }
      create_pos_sale_return_v6: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_items: Json
          p_reason?: string
          p_request_id: string
          p_sale_id: string
        }
        Returns: Json
      }
      create_pos_sale_return_v7: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_items: Json
          p_reason?: string
          p_request_id: string
          p_sale_id: string
        }
        Returns: Json
      }
      create_pos_sale_v2: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v3: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v4: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v5: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v6: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v6_core: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v7: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v8: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_pos_sale_v9: {
        Args: { p_branch_id: string; p_request_id: string; p_sale: Json }
        Returns: Json
      }
      create_purchase_v2: {
        Args: {
          p_actual_fee?: number
          p_branch_id: string
          p_date: string
          p_description: string
          p_due_date: string
          p_initial_payment?: number
          p_invoice_number: string
          p_items: Json
          p_payment_note?: string
          p_payment_source_account_id?: string
          p_payment_source_kind?: string
          p_provider_reference?: string
          p_representative_id?: string
          p_request_id: string
          p_supplier_id: string
          p_update_sale_prices?: boolean
        }
        Returns: Json
      }
      create_retail_merchant_branch_v1: {
        Args: { p_merchant_id: string; p_name: string; p_phone?: string }
        Returns: Json
      }
      create_staff_device_pairing_v1: {
        Args: {
          p_branch_id: string
          p_device_type?: string
          p_employee_id: string
          p_expires_minutes?: number
        }
        Returns: Json
      }
      create_supplier_purchase_return_v2: {
        Args: {
          p_items: Json
          p_note?: string
          p_purchase_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      create_supplier_wallet_payment_v4: {
        Args: {
          p_actual_fee?: number
          p_amount: number
          p_apply_to_supplier?: boolean
          p_branch_id: string
          p_note?: string
          p_payment_account_id: string
          p_provider_reference?: string
          p_purchase_id?: string
          p_representative_id?: string
          p_request_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      create_verification_codes_table: { Args: never; Returns: undefined }
      create_wallet_expense_v4: {
        Args: {
          p_actual_fee?: number
          p_amount: number
          p_branch_id: string
          p_date?: string
          p_description?: string
          p_payment_account_id: string
          p_provider_reference?: string
          p_receipt_url?: string
          p_request_id: string
          p_type: string
        }
        Returns: Json
      }
      customer_search_arabic_key_v1: {
        Args: { value: string }
        Returns: string
      }
      decide_attendance_exception_v1: {
        Args: { p_decision: string; p_exception_id: string; p_note?: string }
        Returns: Json
      }
      decide_expense_request_v2: {
        Args: { p_decision: string; p_document_id: string; p_note?: string }
        Returns: Json
      }
      decide_finance_payroll_v2: {
        Args: { p_decision: string; p_note?: string; p_run_id: string }
        Returns: Json
      }
      decide_franchise_operation_v1: {
        Args: { p_decision: string; p_note: string; p_request_id: string }
        Returns: Json
      }
      decide_hr_payroll_v2: {
        Args: { p_decision: string; p_note?: string; p_run_id: string }
        Returns: Json
      }
      decide_hr_request_v1: {
        Args: {
          p_approved_payload?: Json
          p_decision: string
          p_note: string
          p_task_id: string
        }
        Returns: Json
      }
      decide_my_order_substitution_v1: {
        Args: { p_decision: string; p_substitution_id: string }
        Returns: Json
      }
      decide_order_fulfillment_substitution_v1: {
        Args: { p_decision: string; p_note?: string; p_substitution_id: string }
        Returns: Json
      }
      decline_my_delivery_order_v1: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      decline_my_delivery_route_v1: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      decline_my_picker_assignment_offer_v1: {
        Args: { p_offer_id: string; p_reason?: string }
        Returns: Json
      }
      delegate_hr_payroll_payment_v4: {
        Args: {
          p_note: string
          p_reference: string
          p_run_id: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      delegate_hr_salary_advance_payout_v3: {
        Args: {
          p_note: string
          p_reference?: string
          p_source_account_id: string
          p_source_kind: string
          p_task_id: string
        }
        Returns: Json
      }
      delegate_legacy_hr_salary_advance_source_v1: {
        Args: {
          p_advance_id: string
          p_note: string
          p_reference?: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      delete_pos_payment_method: {
        Args: { p_branch_id: string; p_method_id: string }
        Returns: Json
      }
      delete_product_v2: {
        Args: {
          p_branch_id: string
          p_product_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      delivery_can_manage_branch_v1: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      deposit_online_cash_to_safe: {
        Args: { p_amount: number; p_branch_id: string; p_note?: string }
        Returns: Json
      }
      disable_push_device_token_v2: {
        Args: { p_error?: string; p_token: string }
        Returns: boolean
      }
      disburse_employee_advance_v2: {
        Args: {
          p_actual_fee?: number
          p_amount: number
          p_document_id: string
          p_note?: string
          p_provider_reference?: string
          p_request_id: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      dispatch_inventory_transfer_v2: {
        Args: { p_note?: string; p_transfer_id: string }
        Returns: Json
      }
      distribute_inventory_audit_session_v1: {
        Args: { p_session_id: string }
        Returns: Json
      }
      end_it_session_v1: {
        Args: { p_branch_id?: string; p_reason?: string; p_session_id: string }
        Returns: Json
      }
      end_my_delivery_shift_v1: { Args: never; Returns: Json }
      ensure_daily_inventory_audit_tasks_v2: {
        Args: {
          p_audit_date?: string
          p_branch_id: string
          p_items_per_employee?: number
        }
        Returns: Json
      }
      ensure_daily_inventory_audit_tasks_v3: {
        Args: { p_audit_date?: string; p_branch_id: string }
        Returns: Json
      }
      fail_operations_task: {
        Args: { p_reason: string; p_task_id: string }
        Returns: Json
      }
      finalize_attendance_exception_decision_v2: {
        Args: { p_exception_id: string }
        Returns: Json
      }
      finalize_order_staging_v1: {
        Args: { p_note?: string; p_order_id: string }
        Returns: Json
      }
      find_delivery_branch: {
        Args: { p_latitude: number; p_longitude: number }
        Returns: {
          branch_id: string
          branch_name: string
          delivery_fee: number
          delivery_radius_km: number
          distance_km: number
          estimated_delivery_minutes: number
          min_order_amount: number
        }[]
      }
      generate_hr_payroll_run_v2: {
        Args: { p_branch_id: string; p_month: number; p_year: number }
        Returns: Json
      }
      get_admin_role: { Args: never; Returns: string }
      get_ai_provider_secret: { Args: { p_name: string }; Returns: string }
      get_approval_center_v1: {
        Args: { p_branch_id: string; p_limit?: number; p_scope?: string }
        Returns: Json
      }
      get_attendance_exception_v1: {
        Args: { p_exception_id: string }
        Returns: Json
      }
      get_batch_picking_shadow_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_branch_business_profile_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_branch_cash_overview: { Args: { p_branch_id: string }; Returns: Json }
      get_branch_control_detail_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_branch_customer_debts_v1: {
        Args: {
          p_branch_id: string
          p_customer_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json
      }
      get_branch_delivery_policy_v2: {
        Args: { p_hub_branch_id: string }
        Returns: Json
      }
      get_branch_for_neighborhood: {
        Args: { p_neighborhood_id: string }
        Returns: {
          branch_address: string
          branch_id: string
          branch_name: string
          branch_phone: string
          branch_type: Database["public"]["Enums"]["branch_type"]
          category: Database["public"]["Enums"]["branch_category"]
          priority: number
          routing_reason: string
        }[]
      }
      get_branch_from_neighborhood: {
        Args: { p_neighborhood_id: string }
        Returns: {
          branch_address: string
          branch_id: string
          branch_name: string
          branch_phone: string
        }[]
      }
      get_branch_neighborhoods: {
        Args: { p_branch_id: string }
        Returns: {
          active: boolean
          area_name: string
          city_name: string
          estimated_time: string
          governorate_name: string
          neighborhood_id: string
          neighborhood_name: string
          price: number
        }[]
      }
      get_branch_open_customer_credit_v1: {
        Args: { p_branch_id: string; p_customer_id?: string }
        Returns: Json
      }
      get_branch_partner_network_v1: {
        Args: { p_tenant_id?: string }
        Returns: Json
      }
      get_branch_performance: {
        Args: {
          p_branch_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          avg_order_value: number
          completed_orders: number
          pending_orders: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_branch_pos_staff_status: {
        Args: { p_branch_id: string }
        Returns: {
          active: boolean
          has_pin: boolean
          name: string
          pos_enabled: boolean
          role_code: string
          role_name_ar: string
          user_id: string
          username: string
        }[]
      }
      get_branch_products: {
        Args: { p_branch_id: string }
        Returns: {
          product_id: string
        }[]
      }
      get_branches_by_category: {
        Args: { p_category: Database["public"]["Enums"]["branch_category"] }
        Returns: {
          active: boolean
          address: string
          branch_type: Database["public"]["Enums"]["branch_type"]
          category: Database["public"]["Enums"]["branch_category"]
          commission_rate: number
          franchise_code: string
          id: string
          name: string
          phone: string
        }[]
      }
      get_business_catalog_v1: {
        Args: {
          p_branch_id: string
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json
      }
      get_business_debts_workspace_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_business_structure_v1: {
        Args: { p_tenant_id?: string }
        Returns: Json
      }
      get_cached_delivery_road_quote_v1: {
        Args: {
          p_customer_latitude: number
          p_customer_longitude: number
          p_has_owned: boolean
          p_hub_branch_id: string
          p_partner_branch_ids: string[]
        }
        Returns: Json
      }
      get_cached_single_delivery_road_quote_v1: {
        Args: {
          p_customer_latitude: number
          p_customer_longitude: number
          p_hub_branch_id: string
          p_origin_branch_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      get_current_cash_balance: {
        Args: { p_branch_id?: string; p_register_type: string }
        Returns: number
      }
      get_customer_360_overview: {
        Args: { p_branch_id?: string; p_customer_id: string }
        Returns: Json
      }
      get_customer_branch_catalog: {
        Args: {
          p_barcode?: string
          p_branch_id: string
          p_company_id?: string
          p_limit?: number
          p_main_category_id?: string
          p_product_id?: string
          p_search?: string
          p_subcategory_id?: string
        }
        Returns: Json[]
      }
      get_customer_branch_catalog_core_v1: {
        Args: {
          p_barcode?: string
          p_branch_id: string
          p_company_id?: string
          p_limit?: number
          p_main_category_id?: string
          p_product_id?: string
          p_search?: string
          p_subcategory_id?: string
        }
        Returns: Json[]
      }
      get_customer_branch_favorite_products_v1: {
        Args: { p_branch_id: string; p_product_ids: string[] }
        Returns: Json[]
      }
      get_customer_branch_product_any_stock_v1: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: Json
      }
      get_customer_branch_products_by_ids: {
        Args: { p_branch_id: string; p_product_ids: string[] }
        Returns: Json[]
      }
      get_customer_branch_runtime: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_customer_business_intelligence: {
        Args: { p_branch_id?: string; p_customer_id: string }
        Returns: Json
      }
      get_customer_coupon_conversion_dashboard: {
        Args: { p_branch_id?: string; p_days?: number; p_limit?: number }
        Returns: Json
      }
      get_customer_debts_dashboard_v53: {
        Args: {
          p_branch_id: string
          p_customer_id?: string
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json
      }
      get_customer_discovery_catalog_v1: {
        Args: {
          p_barcode?: string
          p_branch_id: string
          p_company_id?: string
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_main_category_id?: string
          p_product_id?: string
          p_search?: string
          p_subcategory_id?: string
        }
        Returns: Json[]
      }
      get_customer_followup_assignees: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      get_customer_followup_outcome_dashboard: {
        Args: { p_branch_id?: string; p_days?: number }
        Returns: Json
      }
      get_customer_followup_performance: {
        Args: { p_branch_id?: string; p_customer_id: string; p_days?: number }
        Returns: Json
      }
      get_customer_followup_team_workload: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      get_customer_id_from_user: { Args: never; Returns: string }
      get_customer_management_catalog: {
        Args: {
          p_branch_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_segment?: string
        }
        Returns: Json
      }
      get_customer_management_catalog_v2: {
        Args: {
          p_branch_id?: string
          p_filters?: Json
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_segment?: string
        }
        Returns: Json
      }
      get_customer_management_workspace: {
        Args: { p_branch_id?: string; p_customer_id: string }
        Returns: Json
      }
      get_customer_marketplace_store_catalog_v1: {
        Args: { p_branch_id: string; p_limit?: number; p_search?: string }
        Returns: Json[]
      }
      get_customer_marketplace_store_catalog_v2: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_product_id?: string
          p_search?: string
        }
        Returns: Json[]
      }
      get_customer_marketplace_stores_v1: {
        Args: {
          p_branch_id?: string
          p_latitude: number
          p_limit?: number
          p_longitude: number
        }
        Returns: Json[]
      }
      get_customer_multi_store_eligibility_v1: {
        Args: { p_latitude: number; p_limit?: number; p_longitude: number }
        Returns: Json[]
      }
      get_customer_operations_center: {
        Args: { p_branch_id?: string; p_days?: number; p_limit?: number }
        Returns: Json
      }
      get_customer_operations_center_v2: {
        Args: { p_branch_id?: string; p_days?: number; p_limit?: number }
        Returns: Json
      }
      get_customer_opportunity_board: {
        Args: { p_branch_id?: string; p_limit?: number }
        Returns: Json
      }
      get_customer_opportunity_queue_state: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      get_customer_order_group_operations_v1: {
        Args: { p_group_id: string }
        Returns: Json
      }
      get_customer_push_campaign_history_v1: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_customer_rfm_score: {
        Args: { p_branch_id?: string; p_customer_id: string }
        Returns: Json
      }
      get_customer_service_case_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_customer_service_search_v1: {
        Args: { p_branch_id?: string; p_limit?: number; p_query: string }
        Returns: Json
      }
      get_customer_smart_group_bundle_v1: {
        Args: { p_branch_id: string; p_slug: string }
        Returns: Json[]
      }
      get_daily_inventory_offer_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_delivery_assignment_workspace_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_delivery_campaigns_v1: {
        Args: { p_hub_branch_id?: string }
        Returns: Json
      }
      get_delivery_cash_handover_queue_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_delivery_handoff_performance_v1: {
        Args: { p_branch_id: string; p_days?: number }
        Returns: Json
      }
      get_delivery_price: {
        Args: { p_branch_id: string; p_neighborhood_id: string }
        Returns: {
          estimated_time: string
          price: number
        }[]
      }
      get_employee_advance_workspace_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_employee_staff_devices_v1: {
        Args: { p_branch_id?: string; p_employee_id: string }
        Returns: Json
      }
      get_employee_wallet_admin_v1: {
        Args: { p_branch_id: string; p_employee_id: string; p_limit?: number }
        Returns: Json
      }
      get_expense_anomalies_v2: {
        Args: { p_branch_id: string; p_days?: number }
        Returns: Json
      }
      get_expense_budget_workspace_v2: {
        Args: { p_branch_id: string; p_period_month?: string }
        Returns: Json
      }
      get_expense_recurring_workspace_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_expense_workspace_v2: {
        Args: { p_branch_id: string; p_limit?: number; p_status?: string }
        Returns: Json
      }
      get_finance_accounts_admin_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_finance_cash_handoff_workspace_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_control_center_base_v3: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_control_center_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_payout_sources_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_finance_payout_sources_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_finance_reconciliation_control_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_settlement_workspace_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_settlement_workspace_v3: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_transfer_options_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_finance_transfers_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_treasury_workspace_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_treasury_workspace_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_finance_wallet_workspace_v4: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_franchise_accounts_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_franchise_detail_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_franchise_finance_workspace_v1: {
        Args: {
          p_merchant_id: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      get_franchise_network_v1: { Args: { p_tenant_id: string }; Returns: Json }
      get_franchise_operation_request_v1: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_franchise_operations_workspace_v1: {
        Args: {
          p_branch_id?: string
          p_limit?: number
          p_merchant_id: string
          p_search?: string
        }
        Returns: Json
      }
      get_full_inventory_shelves_v1: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_full_inventory_workspace_v1: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_session_id: string
        }
        Returns: Json
      }
      get_full_inventory_workspace_v2: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_session_id: string
          p_shelf?: string
        }
        Returns: Json
      }
      get_growth_it_super_admin_v1: { Args: never; Returns: Json }
      get_growth_product_images_v1: {
        Args: {
          p_category_id?: string
          p_mode?: string
          p_page?: number
          p_search?: string
          p_source?: string
        }
        Returns: Json
      }
      get_home_recommendation_ids: {
        Args: { p_branch_id?: string; p_limit?: number }
        Returns: string[]
      }
      get_home_section_analytics: {
        Args: { p_days?: number }
        Returns: {
          add_to_cart_rate: number
          add_to_carts: number
          cancelled_orders: number
          clicks: number
          ctr: number
          delivered_orders: number
          experiment_key: string
          experiment_variant: string
          gross_order_value: number
          impressions: number
          order_conversion_rate: number
          orders: number
          performance_score: number
          revenue: number
          section_key: string
        }[]
      }
      get_hr_attendance_control_v1: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: Json
      }
      get_hr_cashier_performance_v1: {
        Args: {
          p_branch_id: string
          p_employee_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_hr_compensation_directory_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_hr_delivery_performance_v1: {
        Args: {
          p_branch_id: string
          p_employee_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_hr_employee_directory_v1: {
        Args: {
          p_branch_id?: string
          p_department_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      get_hr_employee_directory_v2: {
        Args: {
          p_branch_id: string
          p_department_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      get_hr_employee_performance_detail_v1: {
        Args: {
          p_branch_id: string
          p_employee_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_hr_employee_performance_detail_v2: {
        Args: {
          p_branch_id: string
          p_employee_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_hr_employee_performance_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_hr_employee_profile_v1: {
        Args: { p_branch_id?: string; p_employee_id: string }
        Returns: Json
      }
      get_hr_employee_profile_v2: {
        Args: { p_branch_id: string; p_employee_id: string }
        Returns: Json
      }
      get_hr_inventory_performance_v1: {
        Args: {
          p_branch_id: string
          p_employee_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_hr_leave_calendar_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_hr_manager_team_operations_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_hr_manager_team_period_comparison_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_hr_online_customer_service_performance_v1: {
        Args: {
          p_branch_id: string
          p_employee_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_hr_payroll_treasury_queue_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_hr_payroll_workspace_v2: {
        Args: { p_branch_id: string; p_month: number; p_year: number }
        Returns: Json
      }
      get_hr_request_for_review_v1: {
        Args: { p_task_id: string }
        Returns: Json
      }
      get_hr_shift_scheduler_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_hr_structure_v1: { Args: { p_branch_id?: string }; Returns: Json }
      get_hr_workspace_dashboard_v1: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: Json
      }
      get_inventory_audit_dashboard_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_inventory_audit_dashboard_v3: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_inventory_audit_setup_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_inventory_audit_task_v2: {
        Args: { p_task_id: string }
        Returns: Json
      }
      get_inventory_audit_task_v3: {
        Args: { p_task_id: string }
        Returns: Json
      }
      get_inventory_control_center_v2: {
        Args: {
          p_branch_id: string
          p_category_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      get_inventory_product_movements_v2: {
        Args: { p_branch_id: string; p_limit?: number; p_product_id: string }
        Returns: Json
      }
      get_inventory_transfer_smart_alerts_v2: {
        Args: { p_branch_id: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      get_inventory_transfer_workspace_v2: {
        Args: { p_branch_id: string; p_limit?: number; p_status?: string }
        Returns: Json
      }
      get_invoice_center_v3: {
        Args: {
          p_branch_id: string
          p_from?: string
          p_page?: number
          p_page_size?: number
          p_payment_kind?: string
          p_return_state?: string
          p_search?: string
          p_to?: string
        }
        Returns: Json
      }
      get_it_device_center_v1: { Args: { p_branch_id?: string }; Returns: Json }
      get_legacy_bulk_review_queue: {
        Args: { p_branch_id: string }
        Returns: Json[]
      }
      get_loyalty_financial_summary: {
        Args: { p_branch_id?: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      get_manager_pos_shift_reconciliation_preview: {
        Args: { p_shift_id: string }
        Returns: Json
      }
      get_marketplace_admin_dashboard_v1: {
        Args: { p_tenant_id?: string }
        Returns: Json
      }
      get_marketplace_merchant_detail_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_marketplace_settlement_control_v1: {
        Args: { p_limit?: number; p_merchant_id: string }
        Returns: Json
      }
      get_merchant_business_profile_v1: {
        Args: { p_merchant_id: string }
        Returns: string
      }
      get_merchant_retail_admin_v1: { Args: never; Returns: Json }
      get_merchant_retail_catalog_usage_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_merchant_retail_payment_channels_v1: { Args: never; Returns: Json }
      get_merchant_retail_payment_requests_v1: {
        Args: { p_merchant_id?: string }
        Returns: Json
      }
      get_merchant_retail_plans_v1: { Args: never; Returns: Json }
      get_merchant_retail_subscription_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_merged_cash_balance:
        | { Args: never; Returns: number }
        | { Args: { p_branch_id?: string }; Returns: number }
      get_multistore_admin_analytics_v1: {
        Args: {
          p_hub_branch_id?: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      get_my_attendance_v1: { Args: { p_branch_id?: string }; Returns: Json }
      get_my_back_in_stock_reminders_v1: {
        Args: { p_delivery_branch_id: string }
        Returns: Json
      }
      get_my_customer_followup_inbox: {
        Args: { p_branch_id?: string; p_upcoming_days?: number }
        Returns: Json
      }
      get_my_customer_receivables_v2: {
        Args: { p_limit?: number }
        Returns: Json
      }
      get_my_delivery_cash_handover_history_v1: {
        Args: { p_limit?: number }
        Returns: Json
      }
      get_my_delivery_cash_handover_state_v1: { Args: never; Returns: Json }
      get_my_delivery_cash_handover_targets_v1: { Args: never; Returns: Json }
      get_my_delivery_customer_phones_v1: { Args: never; Returns: Json }
      get_my_delivery_dispatch_workspace_v1: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      get_my_delivery_earnings_v1: { Args: { p_days?: number }; Returns: Json }
      get_my_delivery_eta_batch_v1: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      get_my_delivery_map_context_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_delivery_performance_v1: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_my_delivery_pickup_issues_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_delivery_portal_v1: { Args: never; Returns: Json }
      get_my_delivery_route_context_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_delivery_route_origin_v1: { Args: never; Returns: Json }
      get_my_delivery_shift_v1: { Args: never; Returns: Json }
      get_my_delivery_support_issues_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_delivery_workspace_v1: { Args: never; Returns: Json }
      get_my_delivery_workspace_v2: { Args: never; Returns: Json }
      get_my_employee_purchase_profile_v1: {
        Args: { p_branch_id?: string; p_ledger_limit?: number }
        Returns: Json
      }
      get_my_employee_wallet_v1: { Args: { p_limit?: number }; Returns: Json }
      get_my_finance_transfer_tasks_v2: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      get_my_franchise_portal_identity_v1: { Args: never; Returns: Json }
      get_my_franchise_portal_v1: {
        Args: {
          p_merchant_id?: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      get_my_hr_requests_v1: {
        Args: { p_branch_id?: string; p_limit?: number }
        Returns: Json
      }
      get_my_hr_treasury_payout_task_v1: {
        Args: { p_task_id: string }
        Returns: Json
      }
      get_my_hr_treasury_payroll_task_v1: {
        Args: { p_task_id: string }
        Returns: Json
      }
      get_my_loyalty_card: { Args: never; Returns: Json }
      get_my_loyalty_history: { Args: { p_limit?: number }; Returns: Json[] }
      get_my_loyalty_vouchers: { Args: { p_status?: string }; Returns: Json[] }
      get_my_merchant_cash_overview_v55: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_my_notification_center_v2: {
        Args: {
          p_branch_id?: string
          p_category?: string
          p_filter?: string
          p_limit?: number
        }
        Returns: Json
      }
      get_my_notification_preferences_v2: { Args: never; Returns: Json }
      get_my_open_pos_shift: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_my_order_delivery_pin_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_order_delivery_proof_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_order_eta_v1: { Args: { p_order_id: string }; Returns: Json }
      get_my_order_etas_v1: { Args: never; Returns: Json }
      get_my_order_fulfillment_workspace_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_my_order_operations_snapshot_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_order_picking_session_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_order_picking_session_v2: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_order_staging_session_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_order_substitutions_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_my_partner_analytics_v1: {
        Args: {
          p_branch_id: string
          p_from: string
          p_merchant_id: string
          p_to: string
        }
        Returns: Json
      }
      get_my_partner_finance_ledger_v1: {
        Args: {
          p_limit?: number
          p_merchant_id: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      get_my_partner_finance_overview_v1: {
        Args: {
          p_merchant_id: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      get_my_partner_marketplace_readiness_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_my_partner_order_details_v1: {
        Args: { p_branch_id: string; p_merchant_id: string; p_order_id: string }
        Returns: Json
      }
      get_my_partner_order_queue_v1: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_merchant_id: string
          p_status?: string
        }
        Returns: Json
      }
      get_my_partner_portal_identity_v1: { Args: never; Returns: Json }
      get_my_partner_portal_identity_v2: { Args: never; Returns: Json }
      get_my_partner_product_details_v1: {
        Args: {
          p_branch_id: string
          p_merchant_id: string
          p_product_id: string
        }
        Returns: Json
      }
      get_my_partner_settlement_details_v1: {
        Args: { p_merchant_id: string; p_settlement_id: string }
        Returns: Json
      }
      get_my_partner_settlement_list_v1: {
        Args: { p_limit?: number; p_merchant_id: string }
        Returns: Json
      }
      get_my_partner_store_settings_v1: {
        Args: { p_branch_id: string; p_merchant_id: string }
        Returns: Json
      }
      get_my_partner_team_v1: { Args: { p_merchant_id: string }; Returns: Json }
      get_my_payment_settlement_tasks_v3: {
        Args: { p_limit?: number }
        Returns: Json
      }
      get_my_pending_franchise_invitations_v1: { Args: never; Returns: Json }
      get_my_pending_partner_invitations_v1: { Args: never; Returns: Json }
      get_my_picker_assignment_offer_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_my_picker_assignment_shadow_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_my_pos_cash_summary: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_my_pos_cash_summary_v3: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_my_pos_delivery_cash_handovers_v1: { Args: never; Returns: Json }
      get_my_pos_expenses_v2: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_my_pos_shift_reconciliation_preview: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_my_pos_workspace: { Args: { p_branch_id: string }; Returns: Json }
      get_my_purchase_history: { Args: { p_limit?: number }; Returns: Json[] }
      get_my_push_device_status_v2: { Args: never; Returns: Json }
      get_my_return_request_items_v1: {
        Args: { p_return_request_id: string }
        Returns: Json[]
      }
      get_my_staff_app_pin_status_v1: { Args: never; Returns: Json }
      get_my_staff_branches: {
        Args: never
        Returns: {
          branch_code: string
          branch_id: string
          branch_name: string
          is_primary: boolean
          permissions: string[]
          pos_enabled: boolean
          role_code: string
          role_name_ar: string
        }[]
      }
      get_my_staff_identity: { Args: never; Returns: Json }
      get_my_staff_self_service_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_my_tenant_runtime_v1: { Args: never; Returns: Json }
      get_next_invoice_number: {
        Args: { p_branch_id: string }
        Returns: string
      }
      get_notification_campaign_details_v3: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      get_notification_campaign_history_v3: {
        Args: { p_branch_id?: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_notification_recipient_options_v3: {
        Args: {
          p_branch_id?: string
          p_limit?: number
          p_scope: string
          p_search?: string
        }
        Returns: Json
      }
      get_online_money_overview: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_online_order_final_receipt_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_online_order_final_receipt_v2: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_online_order_sla_policy_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_online_orders_page_v1: {
        Args: {
          p_branch_id: string
          p_filter?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
        }
        Returns: Json
      }
      get_online_outside_settlements_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_online_outside_settlements_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_operations_task_dashboard_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_operations_task_events: { Args: { p_task_id: string }; Returns: Json }
      get_order_delivery_proof_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_order_group_control_tower_v1: {
        Args: { p_hub_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_order_group_dispatch_board_v1: {
        Args: { p_hub_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_order_group_dispatch_health_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_order_group_dispatch_policy_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_order_group_dispatch_recommendation_v1: {
        Args: { p_group_id: string }
        Returns: Json
      }
      get_order_group_financial_adjustment_v1: {
        Args: { p_adjustment_id: string }
        Returns: Json
      }
      get_order_group_pickup_issue_board_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_order_group_reprice_context_v1: {
        Args: { p_group_id: string }
        Returns: Json
      }
      get_order_intake_dashboard_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_order_intake_policy_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_order_shortage_financial_adjustment_v1: {
        Args: { p_adjustment_id: string }
        Returns: Json
      }
      get_order_substitution_financial_adjustment_v1: {
        Args: { p_adjustment_id: string }
        Returns: Json
      }
      get_partner_accounts_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_partner_delivery_settings_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_partner_marketplace_requests_v1: {
        Args: { p_status?: string; p_tenant_id?: string }
        Returns: Json
      }
      get_partner_portal_workspace_v1: {
        Args: {
          p_branch_id?: string
          p_limit?: number
          p_merchant_id?: string
          p_period_end?: string
          p_period_start?: string
          p_search?: string
        }
        Returns: Json
      }
      get_partner_portal_workspace_v2: {
        Args: {
          p_branch_id?: string
          p_limit?: number
          p_merchant_id?: string
          p_period_end?: string
          p_period_start?: string
          p_search?: string
        }
        Returns: Json
      }
      get_partner_pos_invoice_v1: { Args: { p_sale_id: string }; Returns: Json }
      get_partner_store_activation_readiness_v1: {
        Args: { p_branch_id: string; p_merchant_id: string }
        Returns: Json
      }
      get_pending_online_refunds: {
        Args: { p_branch_id: string }
        Returns: {
          amount: number
          created_at: string
          order_id: string
          payment_method: string
          provider_reference: string
          refund_id: string
          return_id: string
          status: string
        }[]
      }
      get_pharmacy_workspace_v1: {
        Args: {
          p_branch_id: string
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json
      }
      get_picker_assignment_policy_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_pos_branch_catalog: {
        Args: {
          p_barcode?: string
          p_branch_id: string
          p_limit?: number
          p_search?: string
        }
        Returns: Json[]
      }
      get_pos_checkout_policy_v1: {
        Args: { p_branch_id: string; p_customer_id?: string }
        Returns: Json
      }
      get_pos_drawer_setup_v56: {
        Args: { p_branch_id: string; p_device_id: string }
        Returns: Json
      }
      get_pos_expense_categories_v2: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_pos_invoice_snapshot: { Args: { p_sale_id: string }; Returns: Json }
      get_pos_online_order_inbox_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_pos_payment_methods: { Args: { p_branch_id: string }; Returns: Json }
      get_pos_runtime_status: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      get_pos_sale_return_preview: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_sale_return_preview_v3: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_sale_return_preview_v4: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_sale_return_preview_v5: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_sale_return_preview_v6: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_sale_return_preview_v6_core: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_sale_return_preview_v7: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      get_pos_stock_shortfalls_v51: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_product_delete_preview_v2: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: Json
      }
      get_product_details_pro: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: Json
      }
      get_product_management_catalog: {
        Args: {
          p_branch_id: string
          p_category_id?: string
          p_company_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json[]
      }
      get_product_management_stats: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_product_price: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: {
          is_offer: boolean
          offer_price: number
          purchase_price: number
          sale_price: number
        }[]
      }
      get_public_home_page:
        | { Args: { p_branch_id?: string }; Returns: Json }
        | {
            Args: { p_branch_id: string; p_experiment_seed: string }
            Returns: Json
          }
      get_push_operational_status_v1: { Args: never; Returns: Json }
      get_push_provider_secret_v1: {
        Args: { p_worker_secret: string }
        Returns: string
      }
      get_push_provider_status_v1: { Args: never; Returns: Json }
      get_reporting_activity_heatmap_v1: {
        Args: {
          p_branch_id: string
          p_channel?: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_reporting_costs_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_customers_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_debts_v1: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_insights_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_inventory_transfers_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_inventory_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_online_profit_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_online_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_overview_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_payments_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_peak_hours_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_products_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_profitability_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_returns_v2: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_sales_v2: {
        Args: {
          p_branch_id: string
          p_cashier_id?: string
          p_channel?: string
          p_from: string
          p_limit?: number
          p_offset?: number
          p_payment_code?: string
          p_search?: string
          p_to: string
        }
        Returns: Json
      }
      get_reporting_shift_reconciliations_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_shifts_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_staff_coverage_v1: {
        Args: { p_branch_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      get_reporting_top_products_v2: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_reporting_waste_v1: {
        Args: {
          p_branch_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: Json
      }
      get_restaurant_kitchen_ticket_v1: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_restaurant_listing_modifiers_v1: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: Json
      }
      get_retail_branch_receipt_language_v1: {
        Args: { p_branch_id: string }
        Returns: string
      }
      get_retail_daily_operations_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_retail_entitlements_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_retail_market_settings_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_retail_registration_catalog_v1: { Args: never; Returns: Json }
      get_retail_registration_status_v1: { Args: never; Returns: Json }
      get_retail_setup_activity_v1: {
        Args: { p_merchant_id: string }
        Returns: string
      }
      get_retail_subscription_activity_v3: {
        Args: { p_limit?: number; p_merchant_id: string }
        Returns: Json
      }
      get_retail_subscriptions_admin_v3: { Args: never; Returns: Json }
      get_saas_control_center_v1: { Args: never; Returns: Json }
      get_saas_control_center_v2: { Args: never; Returns: Json }
      get_staff_customer_loyalty_profile: {
        Args: { p_branch_id?: string; p_customer_id: string }
        Returns: Json
      }
      get_supplier_ledger_v1: {
        Args: { p_branch_id?: string; p_limit?: number; p_supplier_id: string }
        Returns: Json
      }
      get_supplier_purchase_center_v2: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      get_supplier_purchase_reminder_v1: {
        Args: { p_branch_id: string; p_purchase_id: string }
        Returns: Json
      }
      get_tenant_public_runtime_v1: {
        Args: { p_subdomain: string }
        Returns: Json
      }
      growth_add_product_image_v1: {
        Args: {
          p_expected_images: string[]
          p_product_id: string
          p_url: string
        }
        Returns: string[]
      }
      growth_assign_product_categories_v1: {
        Args: {
          p_category_id: string
          p_product_ids: string[]
          p_subcategory_id?: string
        }
        Returns: number
      }
      growth_reorder_categories_v1: {
        Args: {
          p_expected: Json
          p_ids: string[]
          p_level: string
          p_parent: string
        }
        Returns: number
      }
      has_branch_access: {
        Args: { _branch: string; _user: string }
        Returns: boolean
      }
      has_merchant_access: { Args: { p_merchant_id: string }; Returns: boolean }
      has_my_pos_pin: { Args: { p_branch_id: string }; Returns: boolean }
      has_tenant_access: { Args: { p_tenant_id: string }; Returns: boolean }
      heartbeat_it_device_v1: {
        Args: {
          p_app_version?: string
          p_branch_id?: string
          p_browser?: string
          p_capabilities?: Json
          p_current_route?: string
          p_device_key?: string
          p_device_name?: string
          p_platform?: string
          p_staff_device_id?: string
          p_visibility_state?: string
        }
        Returns: Json
      }
      import_product_rows: {
        Args: { p_branch_id: string; p_mode?: string; p_rows: Json }
        Returns: Json
      }
      initialize_branch_safe: {
        Args: { p_amount: number; p_branch_id: string; p_note?: string }
        Returns: Json
      }
      initialize_external_branch: {
        Args: { p_branch_code: string; p_branch_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_delivery_available: {
        Args: { p_branch_id: string; p_neighborhood_id: string }
        Returns: boolean
      }
      is_elmadawy_master_product_v1: {
        Args: { p_product_id: string }
        Returns: boolean
      }
      is_external_branch: { Args: { p_branch_id: string }; Returns: boolean }
      is_growth_it_super_admin_v1: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_branch_pending_pos_card_refunds: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      list_branch_pos_operational_events: {
        Args: { p_branch_id: string; p_limit?: number; p_severity?: string }
        Returns: Json[]
      }
      list_branch_pos_shifts: {
        Args: { p_branch_id: string; p_limit?: number; p_status?: string }
        Returns: Json[]
      }
      list_inventory_work_tasks_v1: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_offset?: number
          p_scope?: string
          p_task_id?: string
        }
        Returns: Json
      }
      list_marketplace_business_profiles_v1: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      list_merchant_customers_v1: {
        Args: { p_branch_id: string }
        Returns: {
          address: string | null
          area_id: string | null
          city_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          governorate_id: string | null
          id: string
          last_name: string | null
          management_status: string
          name: string
          neighborhood_id: string | null
          notes: string | null
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
          user_id: string | null
          verified: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_my_attendance_verification_orphans_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      list_operations_tasks: {
        Args: { p_branch_id: string; p_limit?: number; p_scope?: string }
        Returns: Json
      }
      list_order_substitution_approvals_v1: {
        Args: { p_branch_id: string; p_limit?: number }
        Returns: Json
      }
      list_partner_pos_invoices_v1: {
        Args: { p_branch_id: string; p_limit?: number; p_search?: string }
        Returns: Json
      }
      list_pending_staff_device_approvals_v1: {
        Args: { p_limit?: number }
        Returns: Json
      }
      list_pos_devices: {
        Args: { p_branch_id: string }
        Returns: {
          active: boolean
          auto_lock_minutes: number
          cash_warning_threshold: number
          current_employee_name: string
          current_shift_id: string
          current_user_id: string
          device_code: string
          device_id: string
          device_name: string
          last_seen_at: string
          registered_at: string
          shift_opened_at: string
        }[]
      }
      list_pos_invoices_v2: {
        Args: { p_branch_id: string; p_limit?: number; p_search?: string }
        Returns: Json
      }
      list_pos_quick_staff: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: {
          name: string
          role_name_ar: string
          user_id: string
        }[]
      }
      list_pos_sale_pending_card_refunds: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      list_pos_sale_pending_payment_refunds_v3: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      list_restaurant_modifier_groups_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      list_retail_promotions_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      list_smart_delivery_time_rules_v1: {
        Args: { p_hub_branch_id: string }
        Returns: Json
      }
      log_pos_operational_event: {
        Args: {
          p_details?: Json
          p_device_id: string
          p_device_token: string
          p_event_type: string
          p_message_code?: string
          p_severity?: string
        }
        Returns: string
      }
      lookup_customer_loyalty: {
        Args: { p_branch_id: string; p_code: string }
        Returns: Json
      }
      lookup_employee_purchase_card_v1: {
        Args: { p_branch_id: string; p_code: string }
        Returns: Json
      }
      lookup_loyalty_voucher: {
        Args: { p_branch_id: string; p_code: string; p_customer_id?: string }
        Returns: Json
      }
      lookup_pos_customer_by_id_v52: {
        Args: { p_branch_id: string; p_customer_id: string }
        Returns: Json
      }
      lookup_pos_customer_by_phone: {
        Args: { p_branch_id: string; p_phone: string }
        Returns: Json
      }
      manager_close_pos_shift: {
        Args: { p_closing_cash: number; p_notes: string; p_shift_id: string }
        Returns: Json
      }
      manager_close_pos_shift_v2: {
        Args: { p_notes: string; p_reconciliation: Json; p_shift_id: string }
        Returns: Json
      }
      mark_all_notifications_read_v2: {
        Args: { p_branch_id?: string }
        Returns: number
      }
      mark_attendance_verification_photo_deleted_v1: {
        Args: { p_exception_id: string }
        Returns: Json
      }
      mark_franchise_settlement_paid_v1: {
        Args: {
          p_external_reference: string
          p_note?: string
          p_settlement_id: string
        }
        Returns: Json
      }
      mark_hr_payroll_paid_v2: {
        Args: { p_payment_reference: string; p_run_id: string }
        Returns: Json
      }
      mark_hr_payroll_paid_v3: {
        Args: {
          p_payment_reference: string
          p_run_id: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      mark_marketplace_settlement_paid_v1: {
        Args: {
          p_external_reference: string
          p_note?: string
          p_settlement_id: string
        }
        Returns: Json
      }
      mark_my_delivery_arrived_branch_v1: {
        Args: {
          p_accuracy_m?: number
          p_latitude?: number
          p_longitude?: number
          p_order_id: string
        }
        Returns: Json
      }
      mark_notification_read_v2: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_order_fulfillment_shortage_v1: {
        Args: {
          p_item_id: string
          p_note?: string
          p_shortage_quantity: number
        }
        Returns: Json
      }
      mark_order_fulfillment_shortage_v2: {
        Args: {
          p_item_id: string
          p_note?: string
          p_shortage_quantity: number
        }
        Returns: Json
      }
      mark_order_group_reprice_failed_v1: {
        Args: { p_error: string; p_group_id: string; p_request_id: string }
        Returns: Json
      }
      mark_order_ready_v1: {
        Args: { p_bags_count?: number; p_note?: string; p_order_id: string }
        Returns: Json
      }
      open_partner_pos_shift_v1: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_opening_cash?: number
        }
        Returns: Json
      }
      open_pos_shift: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_opening_cash?: number
        }
        Returns: Json
      }
      pay_expense_v2: {
        Args: {
          p_actual_fee?: number
          p_amount: number
          p_document_id: string
          p_note?: string
          p_provider_reference?: string
          p_request_id: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      pay_my_pos_expense_v2: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_document_id: string
          p_request_id: string
        }
        Returns: Json
      }
      pay_supplier_v2: {
        Args: {
          p_actual_fee?: number
          p_amount: number
          p_branch_id: string
          p_note?: string
          p_provider_reference?: string
          p_purchase_id: string
          p_representative_id?: string
          p_request_id: string
          p_source_account_id: string
          p_source_kind: string
          p_supplier_id: string
        }
        Returns: Json
      }
      place_combined_order_group_v1: {
        Args: {
          p_address_id: string
          p_group_id: string
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_sources: Json
        }
        Returns: Json
      }
      place_combined_order_group_v2: {
        Args: {
          p_address_id: string
          p_group_id: string
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_route_quote_id: string
          p_sources: Json
        }
        Returns: Json
      }
      place_combined_order_group_v3: {
        Args: {
          p_address_id: string
          p_group_id: string
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_route_quote_id: string
          p_sources: Json
          p_substitution_policy?: string
        }
        Returns: Json
      }
      place_customer_order: {
        Args: {
          p_address_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
        }
        Returns: Json
      }
      place_customer_order_with_voucher: {
        Args: {
          p_address_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
          p_voucher_amount?: number
          p_voucher_code?: string
        }
        Returns: Json
      }
      place_customer_order_with_voucher_v2: {
        Args: {
          p_address_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
          p_route_quote_id: string
          p_voucher_amount: number
          p_voucher_code: string
        }
        Returns: Json
      }
      place_customer_order_with_voucher_v3: {
        Args: {
          p_address_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
          p_route_quote_id: string
          p_substitution_policy?: string
          p_voucher_amount: number
          p_voucher_code: string
        }
        Returns: Json
      }
      place_marketplace_order_v1: {
        Args: {
          p_address_id: string
          p_branch_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
        }
        Returns: Json
      }
      place_marketplace_order_v2: {
        Args: {
          p_address_id: string
          p_branch_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
          p_route_quote_id: string
        }
        Returns: Json
      }
      place_marketplace_order_v3: {
        Args: {
          p_address_id: string
          p_branch_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
          p_route_quote_id: string
          p_substitution_policy?: string
        }
        Returns: Json
      }
      place_restaurant_order_v1: {
        Args: {
          p_address_id: string
          p_branch_id: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_quote_token: string
          p_request_id: string
          p_route_quote_id: string
          p_selections: Json
          p_substitution_policy?: string
        }
        Returns: Json
      }
      pos_mobile_link_ack_v1: {
        Args: { p_received: boolean; p_scan_id: number; p_session_id: string }
        Returns: boolean
      }
      pos_mobile_link_claim_v1: {
        Args: { p_limit?: number; p_session_id: string }
        Returns: Json
      }
      pos_mobile_link_close_v1: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      pos_mobile_link_join_v1: {
        Args: { p_code: string; p_session_id: string }
        Returns: Json
      }
      pos_mobile_link_open_v1: {
        Args: { p_branch_id: string; p_pos_device_id: string }
        Returns: Json
      }
      pos_mobile_link_receipts_v1: {
        Args: { p_session_id: string }
        Returns: Json
      }
      pos_mobile_link_send_v1: {
        Args: { p_barcode: string; p_nonce: string; p_session_id: string }
        Returns: Json
      }
      pos_mobile_link_state_v1: {
        Args: { p_session_id: string }
        Returns: Json
      }
      post_customer_receivable_v1: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_customer_id: string
          p_description: string
          p_entry_type: string
          p_idempotency_key: string
        }
        Returns: Json
      }
      post_employee_wallet_adjustment_v1: {
        Args: {
          p_benefit_delta: number
          p_branch_id: string
          p_description: string
          p_employee_id: string
          p_entry_type: string
          p_idempotency_key: string
          p_receivable_delta: number
        }
        Returns: Json
      }
      post_franchise_adjustment_v1: {
        Args: {
          p_branch_id: string
          p_idempotency_key: string
          p_merchant_id: string
          p_reason: string
          p_signed_amount: number
        }
        Returns: Json
      }
      post_merchant_order_financials_v1: {
        Args: {
          p_commission_basis: number
          p_delivery_contribution?: number
          p_main_category_id?: string
          p_merchant_gross: number
          p_order_id: string
          p_payment_fee?: number
          p_refund_amount?: number
        }
        Returns: Json
      }
      preflight_pos_sale: {
        Args: { p_branch_id: string; p_items: Json }
        Returns: Json
      }
      prepare_attendance_exception_decision_v2: {
        Args: { p_decision: string; p_exception_id: string; p_note?: string }
        Returns: Json
      }
      prepare_daily_inventory_audit_v1: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      prepare_franchise_password_reset_v1: {
        Args: { p_merchant_id: string; p_user_id: string }
        Returns: Json
      }
      prepare_inventory_audit_session_v1: {
        Args: {
          p_assignee_id?: string
          p_audit_kind: string
          p_branch_id: string
          p_description?: string
          p_due_at?: string
          p_scope_filter?: Json
          p_scope_type?: string
          p_title?: string
        }
        Returns: Json
      }
      prepare_my_partner_team_password_reset_v1: {
        Args: { p_merchant_id: string; p_user_id: string }
        Returns: Json
      }
      prepare_order_staging_bags_v1: {
        Args: { p_bags: Json; p_order_id: string }
        Returns: Json
      }
      prepare_partner_password_reset_v1: {
        Args: { p_merchant_id: string; p_user_id: string }
        Returns: Json
      }
      preview_combined_restaurant_modifiers_v1: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_restaurant_selections: Json
          p_route_quote_id?: string
          p_sources: Json
        }
        Returns: Json
      }
      preview_customer_push_audience_v1: {
        Args: { p_delivery_type?: string; p_target: Json }
        Returns: Json
      }
      preview_marketplace_settlement_v1: {
        Args: { p_merchant_id: string; p_period_end?: string }
        Returns: Json
      }
      preview_merchant_commission_v1: {
        Args: {
          p_at?: string
          p_commission_basis: number
          p_main_category_id?: string
          p_merchant_id: string
        }
        Returns: Json
      }
      preview_notification_audience_v2: {
        Args: { p_audience_type: string; p_branch_id?: string }
        Returns: Json
      }
      preview_notification_target_v3: {
        Args: { p_branch_id?: string; p_target: Json }
        Returns: Json
      }
      preview_restaurant_cart_modifiers_v1: {
        Args: {
          p_branch_id: string
          p_items: Json
          p_latitude: number
          p_longitude: number
          p_route_quote_id?: string
          p_selections: Json
        }
        Returns: Json
      }
      preview_smart_delivery_price_v1: {
        Args: {
          p_as_of?: string
          p_route_quote_id: string
          p_subtotal?: number
        }
        Returns: Json
      }
      process_online_order: {
        Args: {
          p_action: string
          p_expected_status?: string
          p_order_id: string
          p_payment_method?: string
          p_payment_reference?: string
          p_target_status?: string
        }
        Returns: Json
      }
      propose_order_fulfillment_substitution_v1: {
        Args: {
          p_item_id: string
          p_note?: string
          p_quantity?: number
          p_replacement_product_id: string
          p_replacement_variant_id?: string
        }
        Returns: Json
      }
      propose_order_fulfillment_substitution_v2: {
        Args: {
          p_item_id: string
          p_note?: string
          p_quantity?: number
          p_replacement_product_id: string
          p_replacement_variant_id?: string
        }
        Returns: Json
      }
      publish_home_page: { Args: { p_page_id: string }; Returns: Json }
      publish_marketplace_merchant_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      quick_trust_my_staff_device_v1: {
        Args: {
          p_branch_id?: string
          p_device_key?: string
          p_device_name?: string
          p_device_type?: string
          p_metadata?: Json
          p_platform?: string
        }
        Returns: Json
      }
      quote_combined_cart_v1: {
        Args: { p_latitude: number; p_longitude: number; p_sources: Json }
        Returns: Json
      }
      quote_combined_cart_v2: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_route_quote_id: string
          p_sources: Json
        }
        Returns: Json
      }
      quote_combined_order_v1: {
        Args: { p_address_id: string; p_sources: Json }
        Returns: Json
      }
      quote_combined_order_v2: {
        Args: {
          p_address_id: string
          p_route_quote_id: string
          p_sources: Json
        }
        Returns: Json
      }
      quote_customer_cart: {
        Args: { p_items: Json; p_latitude: number; p_longitude: number }
        Returns: Json
      }
      quote_customer_cart_v2: {
        Args: { p_items: Json; p_latitude: number; p_longitude: number }
        Returns: Json
      }
      quote_customer_cart_v3: {
        Args: { p_items: Json; p_latitude: number; p_longitude: number }
        Returns: Json
      }
      quote_customer_cart_v4: {
        Args: {
          p_items: Json
          p_latitude: number
          p_longitude: number
          p_route_quote_id: string
        }
        Returns: Json
      }
      quote_customer_order: {
        Args: { p_address_id: string; p_items: Json }
        Returns: Json
      }
      quote_customer_order_v2: {
        Args: { p_address_id: string; p_items: Json; p_route_quote_id: string }
        Returns: Json
      }
      quote_marketplace_cart_v1: {
        Args: {
          p_branch_id: string
          p_items: Json
          p_latitude: number
          p_longitude: number
        }
        Returns: Json
      }
      quote_marketplace_cart_v2: {
        Args: {
          p_branch_id: string
          p_items: Json
          p_latitude: number
          p_longitude: number
          p_route_quote_id: string
        }
        Returns: Json
      }
      quote_restaurant_cart_v1: {
        Args: {
          p_branch_id: string
          p_items: Json
          p_latitude: number
          p_longitude: number
          p_route_quote_id: string
          p_selections: Json
        }
        Returns: Json
      }
      quote_restaurant_modifiers_v1: {
        Args: { p_branch_id: string; p_picks?: Json; p_product_id: string }
        Returns: Json
      }
      quote_retail_promotion_preview_v1: {
        Args: { p_branch_id: string; p_campaign_id: string; p_cart: Json }
        Returns: Json
      }
      reassign_customer_followup: {
        Args: {
          p_assigned_to: string
          p_branch_id?: string
          p_interaction_id: string
        }
        Returns: Json
      }
      receive_delivery_cash_handover_v2: {
        Args: {
          p_handover_id: string
          p_note?: string
          p_received_amount: number
        }
        Returns: Json
      }
      receive_inventory_transfer_v2: {
        Args: { p_note?: string; p_receipt_items?: Json; p_transfer_id: string }
        Returns: Json
      }
      receive_pos_shift_cash_handoff_v2: {
        Args: {
          p_handoff_id: string
          p_received_amount: number
          p_variance_reason?: string
        }
        Returns: Json
      }
      reconcile_customer_checkout_attempt: {
        Args: { p_request_id: string }
        Returns: Json
      }
      reconcile_hr_salary_advance_payout_source_v1: {
        Args: {
          p_advance_id: string
          p_note: string
          p_reference?: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      record_customer_whatsapp_consent_v2: {
        Args: {
          p_branch_id?: string
          p_customer_id: string
          p_evidence?: Json
          p_opt_in: boolean
          p_source: string
        }
        Returns: Json
      }
      record_it_peripheral_test_v1: {
        Args: {
          p_branch_id: string
          p_error?: string
          p_id: string
          p_status: string
        }
        Returns: Json
      }
      record_merged_cash_transaction:
        | {
            Args: {
              p_amount: number
              p_created_by?: string
              p_notes: string
              p_transaction_type: string
            }
            Returns: number
          }
        | {
            Args: {
              p_amount: number
              p_branch_id?: string
              p_created_by?: string
              p_notes: string
              p_transaction_type: string
            }
            Returns: number
          }
      record_my_delivery_location_v1: {
        Args: {
          p_accuracy_m?: number
          p_heading?: number
          p_latitude: number
          p_longitude: number
          p_speed_mps?: number
        }
        Returns: Json
      }
      record_online_gateway_settlement: {
        Args: {
          p_branch_id: string
          p_fee?: number
          p_gross: number
          p_note?: string
          p_payment_method: string
          p_provider_reference?: string
        }
        Returns: Json
      }
      recover_customer_checkout_v1: {
        Args: { p_kind: string; p_request_id: string }
        Returns: Json
      }
      recover_existing_pos_device_v56: {
        Args: { p_branch_id: string; p_device_code: string }
        Returns: Json
      }
      recover_my_staff_app_pin_google_v1: {
        Args: { p_new_pin: string }
        Returns: Json
      }
      recover_my_staff_app_pin_v2: {
        Args: { p_new_pin: string }
        Returns: Json
      }
      recover_my_staff_device_v2: {
        Args: {
          p_branch_id: string
          p_device_key: string
          p_device_name?: string
          p_metadata?: Json
          p_platform?: string
        }
        Returns: Json
      }
      redeem_staff_device_pairing_v1: {
        Args: {
          p_device_key: string
          p_device_name: string
          p_device_type?: string
          p_metadata?: Json
          p_pairing_code: string
          p_pairing_token: string
          p_platform?: string
        }
        Returns: Json
      }
      register_operational_push_device_v1: {
        Args: {
          p_app_kind: string
          p_device_key?: string
          p_locale?: string
          p_token: string
        }
        Returns: Json
      }
      register_partner_pos_device_v1: {
        Args: { p_branch_id: string; p_name: string }
        Returns: Json
      }
      register_pos_device: {
        Args: { p_branch_id: string; p_name: string }
        Returns: Json
      }
      register_pos_push_device_v1: {
        Args: { p_branch_id: string; p_device_key?: string; p_token: string }
        Returns: Json
      }
      register_push_device_v2: {
        Args: {
          p_app_kind?: string
          p_device_key?: string
          p_locale?: string
          p_platform: string
          p_token: string
        }
        Returns: Json
      }
      register_retail_merchant_v1: {
        Args: {
          p_business_kind?: string
          p_owner_name: string
          p_phone: string
          p_store_name: string
          p_username: string
        }
        Returns: Json
      }
      reject_ai_action_proposal_v1: {
        Args: { p_note?: string; p_proposal_id: string }
        Returns: Json
      }
      reject_finance_transfer_handover_v2: {
        Args: { p_reason: string; p_task_id: string }
        Returns: Json
      }
      reject_finance_transfer_receipt_v2: {
        Args: { p_reason: string; p_task_id: string }
        Returns: Json
      }
      reject_hr_treasury_payout_v1: {
        Args: { p_reason: string; p_task_id: string }
        Returns: Json
      }
      reject_hr_treasury_payroll_v1: {
        Args: { p_reason: string; p_task_id: string }
        Returns: Json
      }
      reject_inventory_adjustment_v2: {
        Args: { p_note: string; p_reason_code: string; p_task_id: string }
        Returns: Json
      }
      reject_payment_settlement_receipt_v3: {
        Args: { p_reason: string; p_task_id: string }
        Returns: Json
      }
      reject_staff_device_v1: {
        Args: { p_device_id: string; p_reason?: string }
        Returns: Json
      }
      release_operations_task: {
        Args: { p_note?: string; p_task_id: string }
        Returns: Json
      }
      remove_merchant_customer_v1: {
        Args: { p_branch_id: string; p_customer_id: string }
        Returns: boolean
      }
      repair_online_order_financial_ledger_v1: {
        Args: { p_note?: string; p_order_id: string }
        Returns: Json
      }
      replace_customer_cart: {
        Args: { p_expected_user_id: string; p_items: Json }
        Returns: undefined
      }
      report_my_delivery_pickup_issue_v1: {
        Args: {
          p_accuracy_m?: number
          p_issue_type: string
          p_latitude?: number
          p_longitude?: number
          p_note: string
          p_order_id: string
          p_stop_id: string
        }
        Returns: Json
      }
      report_my_delivery_support_issue_v1: {
        Args: { p_issue_type: string; p_note: string; p_order_id: string }
        Returns: Json
      }
      request_franchise_branch_settings_v1: {
        Args: {
          p_branch_id: string
          p_merchant_id: string
          p_note?: string
          p_settings: Json
        }
        Returns: Json
      }
      request_franchise_catalog_change_v1: {
        Args: {
          p_action: string
          p_branch_id: string
          p_merchant_id: string
          p_note?: string
          p_product_id: string
          p_sale_price?: number
        }
        Returns: Json
      }
      request_merchant_retail_plan_v1: {
        Args: {
          p_billing_cycle: string
          p_merchant_id: string
          p_plan_code: string
          p_transfer_method?: string
          p_transfer_reference?: string
        }
        Returns: Json
      }
      request_merchant_retail_plan_v2: {
        Args: {
          p_billing_cycle: string
          p_branches: number
          p_merchant_id: string
          p_plan_code: string
          p_transfer_method?: string
          p_transfer_reference?: string
        }
        Returns: Json
      }
      request_my_delivery_cash_handover_v1: { Args: never; Returns: Json }
      request_my_delivery_cash_handover_v2: {
        Args: { p_target_shift_id?: string }
        Returns: Json
      }
      request_my_partner_marketplace_review_v1: {
        Args: { p_merchant_id: string; p_request_type: string }
        Returns: Json
      }
      request_my_staff_device_approval_v1: {
        Args: {
          p_branch_id: string
          p_device_key: string
          p_device_name?: string
          p_metadata?: Json
          p_platform?: string
        }
        Returns: Json
      }
      request_pos_expense_v2: {
        Args: {
          p_amount: number
          p_beneficiary_name?: string
          p_category_id: string
          p_description: string
          p_device_id: string
          p_device_token: string
          p_receipt_url?: string
          p_request_id: string
        }
        Returns: Json
      }
      resend_notification_campaign_v3: {
        Args: { p_campaign_id: string; p_unread_only?: boolean }
        Returns: Json
      }
      reset_staff_app_pin_v1: {
        Args: { p_branch_id?: string; p_user_id: string }
        Returns: Json
      }
      reset_staff_pos_pin: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: undefined
      }
      resolve_order_group_pickup_issue_v1: {
        Args: { p_issue_id: string; p_note?: string }
        Returns: Json
      }
      restore_home_version_to_draft: {
        Args: { p_draft_page_id: string; p_source_page_id: string }
        Returns: Json
      }
      resume_my_pos_shift_on_new_device_v55: {
        Args: { p_branch_id: string; p_device_name: string }
        Returns: Json
      }
      retry_finance_transfer_receipt_v2: {
        Args: { p_note: string; p_transfer_id: string }
        Returns: Json
      }
      retry_payment_settlement_receipt_v3: {
        Args: { p_note: string; p_settlement_id: string }
        Returns: Json
      }
      reverse_employee_advance_settlement_v2: {
        Args: {
          p_reason: string
          p_request_id: string
          p_settlement_id: string
        }
        Returns: Json
      }
      reverse_expense_payment_v2: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      review_delivery_cash_handover_v1: {
        Args: { p_action: string; p_handover_id: string; p_note?: string }
        Returns: Json
      }
      review_merchant_retail_payment_v1: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: Json
      }
      review_partner_marketplace_request_v1: {
        Args: { p_decision: string; p_reason?: string; p_request_id: string }
        Returns: Json
      }
      revoke_franchise_account_invitation_v1: {
        Args: { p_invitation_id: string; p_reason?: string }
        Returns: Json
      }
      revoke_my_partner_team_invitation_v1: {
        Args: { p_invitation_id: string; p_reason?: string }
        Returns: Json
      }
      revoke_partner_account_invitation_v1: {
        Args: { p_invitation_id: string; p_reason?: string }
        Returns: Json
      }
      revoke_pos_device: { Args: { p_device_id: string }; Returns: undefined }
      revoke_staff_device_v1: {
        Args: { p_device_id: string; p_reason?: string }
        Returns: undefined
      }
      run_due_recurring_expenses_v2: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      sales_summary_by_branch: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          branch_id: string
          branch_name: string
          sales_count: number
          total_profit: number
          total_sales: number
        }[]
      }
      save_business_catalog_item_v1: {
        Args: {
          p_branch_id: string
          p_changes?: Json
          p_expected_revision?: number
          p_product_id?: string
        }
        Returns: Json
      }
      save_hr_compensation_profile_v1: {
        Args: {
          p_base_salary: number
          p_branch_id: string
          p_effective_from?: string
          p_employee_id: string
        }
        Returns: Json
      }
      save_hr_department_v1: {
        Args: {
          p_active?: boolean
          p_code: string
          p_department_id: string
          p_description?: string
          p_name_ar: string
          p_parent_department_id?: string
          p_sort_order?: number
        }
        Returns: Json
      }
      save_hr_employee_profile_v1: {
        Args: { p_branch_id: string; p_employee_id: string; p_profile: Json }
        Returns: Json
      }
      save_hr_job_title_v1: {
        Args: {
          p_active?: boolean
          p_code: string
          p_default_work_mode?: string
          p_department_id: string
          p_grade?: string
          p_job_title_id: string
          p_name_ar: string
        }
        Returns: Json
      }
      save_hr_shift_assignment_v1: {
        Args: {
          p_active?: boolean
          p_assignment_id: string
          p_branch_id: string
          p_effective_from: string
          p_effective_to?: string
          p_employee_id: string
          p_shift_template_id: string
          p_weekdays: number[]
        }
        Returns: Json
      }
      save_hr_shift_template_v1: {
        Args: {
          p_active?: boolean
          p_branch_id: string
          p_break_minutes?: number
          p_early_departure_grace_minutes?: number
          p_end_time: string
          p_late_grace_minutes?: number
          p_name_ar: string
          p_start_time: string
          p_template_id: string
        }
        Returns: Json
      }
      save_hr_team_v1: {
        Args: {
          p_active?: boolean
          p_branch_id: string
          p_department_id: string
          p_description?: string
          p_manager_user_id?: string
          p_name_ar: string
          p_team_id: string
        }
        Returns: Json
      }
      save_merchant_customer_v1: {
        Args: { p_branch_id: string; p_customer: Json; p_customer_id: string }
        Returns: {
          address: string | null
          area_id: string | null
          city_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          governorate_id: string | null
          id: string
          last_name: string | null
          management_status: string
          name: string
          neighborhood_id: string | null
          notes: string | null
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_my_pos_workspace: {
        Args: {
          p_active_tab_id?: string
          p_branch_id: string
          p_device_id: string
          p_tabs: Json
        }
        Returns: undefined
      }
      save_pos_payment_method: {
        Args: { p_branch_id: string; p_method: Json }
        Returns: Json
      }
      save_product_editor: {
        Args: {
          p_alert?: Json
          p_branch_id: string
          p_inventory?: Json
          p_product: Json
          p_product_id?: string
        }
        Returns: Json
      }
      save_product_variant: {
        Args: {
          p_branch_id: string
          p_parent_product_id: string
          p_variant: Json
          p_variant_id?: string
        }
        Returns: Json
      }
      save_restaurant_modifier_group_v1: {
        Args: {
          p_branch_id: string
          p_group_id: string
          p_is_active?: boolean
          p_max_choices: number
          p_min_choices: number
          p_name: string
          p_options: Json
          p_position?: number
        }
        Returns: Json
      }
      save_retail_promotion_draft_v1: {
        Args: {
          p_branch_id: string
          p_config: Json
          p_ends_at: string
          p_id?: string
          p_kind: string
          p_name: string
          p_starts_at: string
        }
        Returns: Json
      }
      save_smart_delivery_time_rule_v1: {
        Args: {
          p_active?: boolean
          p_end: string
          p_hub_branch_id: string
          p_iso_weekday: number
          p_label: string
          p_multiplier: number
          p_start: string
        }
        Returns: string
      }
      save_supplier_representative_v1: {
        Args: {
          p_active?: boolean
          p_branch_id: string
          p_can_receive_payments?: boolean
          p_name: string
          p_notes?: string
          p_payment_limit?: number
          p_payout_destination?: string
          p_payout_method?: string
          p_phone?: string
          p_representative_id?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      save_supplier_representative_v2: {
        Args: {
          p_active?: boolean
          p_branch_id: string
          p_can_receive_payments?: boolean
          p_is_primary?: boolean
          p_name: string
          p_notes?: string
          p_payment_limit?: number
          p_payout_destination?: string
          p_payout_method?: string
          p_phone?: string
          p_representative_id: string
          p_role_title?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      save_supplier_v2: {
        Args: {
          p_active?: boolean
          p_address?: string
          p_branch_id: string
          p_code?: string
          p_commercial_registration?: string
          p_contact_person?: string
          p_credit_limit?: number
          p_email?: string
          p_name: string
          p_notes?: string
          p_payment_terms_days?: number
          p_phone?: string
          p_supplier_id: string
          p_tax_number?: string
        }
        Returns: Json
      }
      scan_order_fulfillment_barcode_v1: {
        Args: { p_barcode: string; p_order_id: string; p_quantity?: number }
        Returns: Json
      }
      search_business_debt_parties_v1: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_party_type: string
          p_search?: string
        }
        Returns: Json
      }
      search_customer_branch_catalog_v1: {
        Args: {
          p_barcode?: string
          p_branch_id: string
          p_limit?: number
          p_search?: string
        }
        Returns: Json[]
      }
      search_customer_smart_catalog_v1: {
        Args: { p_branch_id: string; p_limit?: number; p_search: string }
        Returns: Json[]
      }
      search_franchise_catalog_v1: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_merchant_id: string
          p_search: string
        }
        Returns: Json
      }
      search_inventory_audit_products_v2: {
        Args: { p_branch_id: string; p_limit?: number; p_search?: string }
        Returns: Json
      }
      search_inventory_transfer_products_v2: {
        Args: { p_branch_id: string; p_limit?: number; p_search?: string }
        Returns: Json[]
      }
      search_marketplace_product_master_v1: {
        Args: { p_limit?: number; p_merchant_id: string; p_query?: string }
        Returns: Json
      }
      search_order_fulfillment_substitution_candidates_v1: {
        Args: { p_item_id: string; p_limit?: number; p_query?: string }
        Returns: Json
      }
      search_order_fulfillment_substitution_candidates_v2: {
        Args: { p_item_id: string; p_limit?: number; p_query?: string }
        Returns: Json
      }
      search_partner_master_catalog_v1: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_merchant_id: string
          p_search?: string
        }
        Returns: Json
      }
      search_pos_customers_by_name_v1: {
        Args: { p_branch_id: string; p_query: string }
        Returns: Json
      }
      send_customer_push_campaign_v1: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_body: string
          p_category?: string
          p_delivery_type?: string
          p_severity?: string
          p_target: Json
          p_title: string
        }
        Returns: Json
      }
      send_notification_campaign_v2: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_audience_type: string
          p_body: string
          p_branch_id: string
          p_category?: string
          p_channels?: string[]
          p_delivery_type?: string
          p_severity?: string
          p_title: string
        }
        Returns: Json
      }
      send_notification_campaign_v3: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_body: string
          p_branch_id: string
          p_category?: string
          p_severity?: string
          p_target: Json
          p_title: string
        }
        Returns: Json
      }
      service_log_franchise_password_reset_v1: {
        Args: {
          p_actor_user_id: string
          p_error_code?: string
          p_merchant_id: string
          p_success: boolean
          p_target_user_id: string
        }
        Returns: undefined
      }
      service_log_partner_password_reset_v1: {
        Args: {
          p_actor_user_id: string
          p_error_code?: string
          p_merchant_id: string
          p_success: boolean
          p_target_user_id: string
        }
        Returns: undefined
      }
      service_mark_franchise_invitation_delivery_v1: {
        Args: {
          p_actor_user_id: string
          p_auth_user_id: string
          p_delivery_kind: string
          p_error_code?: string
          p_invitation_id: string
          p_success: boolean
        }
        Returns: Json
      }
      service_mark_partner_invitation_delivery_v1: {
        Args: {
          p_actor_user_id: string
          p_auth_user_id: string
          p_delivery_kind: string
          p_error_code?: string
          p_invitation_id: string
          p_success: boolean
        }
        Returns: Json
      }
      service_resolve_auth_user_by_email_v1: {
        Args: { p_email: string }
        Returns: Json
      }
      set_back_in_stock_reminder_v1: {
        Args: {
          p_delivery_branch_id: string
          p_enabled: boolean
          p_product_id: string
          p_variant_id: string
        }
        Returns: Json
      }
      set_branch_active_v1: {
        Args: { p_active: boolean; p_branch_id: string; p_reason?: string }
        Returns: Json
      }
      set_branch_channel_v1: {
        Args: {
          p_branch_id: string
          p_channel: string
          p_enabled: boolean
          p_message_ar?: string
          p_reason?: string
        }
        Returns: Json
      }
      set_branch_default_pos_drawer_v56: {
        Args: { p_branch_id: string; p_drawer_account_id: string }
        Returns: Json
      }
      set_branch_group_members_v1: {
        Args: { p_branch_ids: string[]; p_group_id: string }
        Returns: Json
      }
      set_branch_open_customer_credit_v1: {
        Args: { p_branch_id: string; p_enabled: boolean }
        Returns: Json
      }
      set_branch_staff_permissions_v1: {
        Args: {
          p_actor_id: string
          p_branch_id: string
          p_codes: string[]
          p_user_id: string
        }
        Returns: Json
      }
      set_customer_favorite: {
        Args: { p_favorite: boolean; p_product_id: string }
        Returns: undefined
      }
      set_customer_favorite_unit: {
        Args: {
          p_favorite: boolean
          p_product_id: string
          p_variant_id: string
        }
        Returns: undefined
      }
      set_customer_management_status: {
        Args: {
          p_branch_id?: string
          p_customer_id: string
          p_reason: string
          p_status: string
        }
        Returns: Json
      }
      set_customer_management_tag: {
        Args: {
          p_assigned: boolean
          p_branch_id?: string
          p_customer_id: string
          p_tag_name: string
        }
        Returns: Json
      }
      set_customer_opportunity_queue_action: {
        Args: {
          p_action_type: string
          p_branch_id?: string
          p_customer_id: string
          p_note?: string
          p_snooze_hours?: number
        }
        Returns: Json
      }
      set_default_customer_address: {
        Args: { p_address_id: string }
        Returns: undefined
      }
      set_delivery_campaign_active_v1: {
        Args: { p_active: boolean; p_campaign_id: string }
        Returns: Json
      }
      set_delivery_order_assignment_v1: {
        Args: {
          p_delivery_user_id: string
          p_order_id: string
          p_reason?: string
          p_tracking_number?: string
        }
        Returns: Json
      }
      set_finance_account_custodian_v1: {
        Args: {
          p_account_id: string
          p_account_kind: string
          p_branch_id: string
          p_user_id: string
        }
        Returns: Json
      }
      set_franchise_member_active_v1: {
        Args: {
          p_active: boolean
          p_merchant_id: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      set_franchise_price_v1: {
        Args: {
          p_branch_id: string
          p_is_offer?: boolean
          p_merchant_id: string
          p_note?: string
          p_offer_price?: number
          p_product_id: string
          p_sale_price: number
        }
        Returns: Json
      }
      set_hr_payroll_pay_day_v1: {
        Args: { p_branch_id: string; p_pay_day: number }
        Returns: Json
      }
      set_inventory_stock_policy_v2: {
        Args: {
          p_alert_enabled?: boolean
          p_branch_id: string
          p_max_stock_level?: number
          p_min_stock_level: number
          p_product_id: string
        }
        Returns: Json
      }
      set_it_peripheral_active_v1: {
        Args: { p_active: boolean; p_branch_id: string; p_id: string }
        Returns: Json
      }
      set_merchant_business_profile_v1: {
        Args: { p_business_profile: string; p_merchant_id: string }
        Returns: Json
      }
      set_merchant_retail_payment_channel_v1: {
        Args: {
          p_account_identifier: string
          p_account_name: string
          p_active: boolean
          p_method: string
        }
        Returns: Json
      }
      set_my_delivery_availability_v1: {
        Args: { p_available: boolean }
        Returns: Json
      }
      set_my_notification_preferences_v2: {
        Args: {
          p_email_enabled?: boolean
          p_in_app_enabled?: boolean
          p_marketing_enabled?: boolean
          p_push_enabled?: boolean
          p_quiet_hours_enabled?: boolean
          p_quiet_hours_end?: string
          p_quiet_hours_start?: string
          p_whatsapp_marketing_opt_in?: boolean
          p_whatsapp_marketing_opt_in_source?: string
          p_whatsapp_transactional_enabled?: boolean
        }
        Returns: Json
      }
      set_my_pos_pin: {
        Args: { p_branch_id: string; p_pin: string }
        Returns: undefined
      }
      set_my_staff_app_pin_v1: { Args: { p_pin: string }; Returns: Json }
      set_my_whatsapp_marketing_consent_v2: {
        Args: { p_opt_in: boolean; p_source?: string }
        Returns: Json
      }
      set_online_order_sla_policy_v1: {
        Args: {
          p_branch_id: string
          p_enabled: boolean
          p_first_response_target_minutes: number
          p_preparation_target_minutes: number
        }
        Returns: Json
      }
      set_order_group_dispatch_policy_v1: {
        Args: { p_branch_id: string; p_mode: string }
        Returns: Json
      }
      set_order_intake_policy_v1: {
        Args: {
          p_branch_id: string
          p_first_response_minutes?: number
          p_mode: string
        }
        Returns: Json
      }
      set_picker_assignment_policy_v1: {
        Args: {
          p_branch_id: string
          p_mode: string
          p_offer_ttl_seconds?: number
        }
        Returns: Json
      }
      set_product_variant_active: {
        Args: { p_active: boolean; p_branch_id: string; p_variant_id: string }
        Returns: Json
      }
      set_push_worker_enabled_v1: {
        Args: { p_enabled: boolean }
        Returns: Json
      }
      set_restaurant_listing_groups_v1: {
        Args: {
          p_branch_id: string
          p_group_ids: string[]
          p_product_id: string
        }
        Returns: Json
      }
      set_retail_receipt_language_v1: {
        Args: { p_language: string; p_merchant_id: string }
        Returns: Json
      }
      set_staff_pos_access: {
        Args: { p_branch_id: string; p_enabled: boolean; p_user_id: string }
        Returns: undefined
      }
      set_staff_pos_pin: {
        Args: { p_branch_id: string; p_pin: string; p_user_id: string }
        Returns: undefined
      }
      set_supplier_purchase_reminder_v1: {
        Args: {
          p_branch_id: string
          p_purchase_id: string
          p_remind_on?: string
        }
        Returns: Json
      }
      set_tenant_platform_controls_v1: {
        Args: {
          p_admin_enabled?: boolean
          p_app_access_enabled?: boolean
          p_block_message_ar?: string
          p_block_reason?: string
          p_block_reason_code?: string
          p_customer_app_enabled?: boolean
          p_delivery_enabled?: boolean
          p_online_sales_enabled?: boolean
          p_pos_enabled?: boolean
          p_tenant_id: string
        }
        Returns: Json
      }
      set_tenant_subscription_status_v1: {
        Args: {
          p_grace_ends_at?: string
          p_reason?: string
          p_status: string
          p_tenant_id: string
        }
        Returns: Json
      }
      settle_employee_advance_expense_v2: {
        Args: {
          p_amount: number
          p_category_id: string
          p_description: string
          p_document_id: string
          p_invoice_number?: string
          p_note?: string
          p_receipt_url: string
          p_request_id: string
        }
        Returns: Json
      }
      settle_employee_advance_return_v2: {
        Args: {
          p_amount: number
          p_document_id: string
          p_note?: string
          p_provider_reference?: string
          p_request_id: string
          p_source_account_id: string
          p_source_kind: string
        }
        Returns: Json
      }
      settle_order_group_financial_adjustment_v1: {
        Args: {
          p_adjustment_id: string
          p_note: string
          p_provider_reference: string
        }
        Returns: Json
      }
      settle_order_shortage_financial_adjustment_v1: {
        Args: {
          p_adjustment_id: string
          p_note: string
          p_provider_reference: string
        }
        Returns: Json
      }
      settle_order_substitution_financial_adjustment_v1: {
        Args: {
          p_adjustment_id: string
          p_note: string
          p_provider_reference: string
        }
        Returns: Json
      }
      setup_branch_tables: {
        Args: { p_schema_name: string }
        Returns: undefined
      }
      smart_reorder_home_draft: {
        Args: { p_days?: number; p_page_id: string }
        Returns: Json
      }
      sms_gateway_rpc: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      sms_gateway_rpc_legacy: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      staff_attendance_check_in_v1: {
        Args: {
          p_accuracy_m?: number
          p_attendance_mode?: string
          p_branch_id: string
          p_device_id: string
          p_device_token: string
          p_exception_reason?: string
          p_latitude?: number
          p_longitude?: number
        }
        Returns: Json
      }
      staff_attendance_check_in_v2: {
        Args: {
          p_accuracy_m?: number
          p_attendance_mode?: string
          p_branch_id: string
          p_device_id: string
          p_device_token: string
          p_exception_reason?: string
          p_latitude?: number
          p_longitude?: number
          p_verification_photo_path?: string
          p_verification_photo_sha256?: string
        }
        Returns: Json
      }
      staff_attendance_check_out_v1: {
        Args: {
          p_accuracy_m?: number
          p_device_id: string
          p_device_token: string
          p_latitude?: number
          p_longitude?: number
          p_session_id: string
        }
        Returns: Json
      }
      staff_has_any_branch_permission: {
        Args: { p_permission_code: string }
        Returns: boolean
      }
      staff_has_permission: {
        Args: { p_branch_id?: string; p_permission_code: string }
        Returns: boolean
      }
      stage_order_bag_v1: {
        Args: {
          p_bag_code: string
          p_location_code: string
          p_order_id: string
        }
        Returns: Json
      }
      start_my_delivery_shift_v1: { Args: never; Returns: Json }
      start_operations_task: { Args: { p_task_id: string }; Returns: Json }
      start_order_packing_v1: {
        Args: { p_bags_count?: number; p_order_id: string }
        Returns: Json
      }
      start_order_picking_v1: { Args: { p_order_id: string }; Returns: Json }
      store_delivery_road_quote_v1: {
        Args: {
          p_baseline_distance_km: number
          p_baseline_duration_minutes: number
          p_customer_latitude: number
          p_customer_longitude: number
          p_degraded: boolean
          p_detour_km: number
          p_has_owned: boolean
          p_hub_branch_id: string
          p_metadata?: Json
          p_ordered_partner_branch_ids: string[]
          p_partner_branch_ids: string[]
          p_provider: string
          p_route_distance_km: number
          p_route_duration_minutes: number
          p_stops: Json
          p_ttl_seconds?: number
        }
        Returns: Json
      }
      submit_expense_draft_v3: {
        Args: { p_document_id: string; p_note?: string; p_receipt_url?: string }
        Returns: Json
      }
      submit_hr_payroll_for_review_v2: {
        Args: { p_run_id: string }
        Returns: Json
      }
      submit_inventory_count_v2: {
        Args: { p_actual_count: number; p_note?: string; p_task_id: string }
        Returns: Json
      }
      submit_inventory_recount_v2: {
        Args: { p_actual_count: number; p_note?: string; p_task_id: string }
        Returns: Json
      }
      submit_my_hr_request_v1: {
        Args: {
          p_branch_id: string
          p_payload: Json
          p_reason: string
          p_request_type: string
        }
        Returns: Json
      }
      super_admin_set_staff_app_pin_v2: {
        Args: { p_new_pin: string; p_user_id: string }
        Returns: Json
      }
      sync_my_notification_center_v2: {
        Args: { p_branch_id?: string }
        Returns: Json
      }
      top_products_by_branch: {
        Args: {
          p_branch?: string
          p_end?: string
          p_limit?: number
          p_start?: string
        }
        Returns: {
          branch_id: string
          branch_name: string
          product_id: string
          product_name: string
          qty_sold: number
          total_sales: number
        }[]
      }
      track_home_event: {
        Args: {
          p_branch_id: string
          p_event_type: string
          p_home_page_id: string
          p_metadata?: Json
          p_section_id: string
          p_session_key: string
        }
        Returns: boolean
      }
      transfer_payment_settlement_v2: {
        Args: {
          p_branch_id: string
          p_fee_amount?: number
          p_gross_amount: number
          p_note?: string
          p_provider_reference?: string
          p_request_id: string
          p_source_account_id: string
          p_target_account_id: string
          p_target_kind: string
        }
        Returns: Json
      }
      transition_franchise_agreement_v1: {
        Args: { p_action: string; p_merchant_id: string; p_reason?: string }
        Returns: Json
      }
      transition_my_delivery_order_v1: {
        Args: {
          p_accuracy_m?: number
          p_action: string
          p_collected_amount?: number
          p_latitude?: number
          p_longitude?: number
          p_note?: string
          p_order_id: string
          p_payment_reference?: string
          p_pin?: string
        }
        Returns: Json
      }
      transition_my_delivery_order_v2: {
        Args: {
          p_accuracy_m?: number
          p_action: string
          p_collected_amount?: number
          p_latitude?: number
          p_longitude?: number
          p_note?: string
          p_order_id: string
          p_payment_reference?: string
          p_pin?: string
        }
        Returns: Json
      }
      transition_my_delivery_route_v1: {
        Args: {
          p_accuracy_m?: number
          p_action: string
          p_collected_amount?: number
          p_latitude?: number
          p_longitude?: number
          p_note?: string
          p_order_id: string
          p_payment_reference?: string
          p_pin?: string
          p_stop_id?: string
        }
        Returns: Json
      }
      transition_my_delivery_route_v2: {
        Args: {
          p_accuracy_m?: number
          p_action: string
          p_collected_amount?: number
          p_latitude?: number
          p_longitude?: number
          p_note?: string
          p_order_id: string
          p_payment_reference?: string
          p_pin?: string
          p_stop_id?: string
        }
        Returns: Json
      }
      transition_my_partner_order_v1: {
        Args: {
          p_action: string
          p_branch_id: string
          p_merchant_id: string
          p_order_id: string
          p_reason?: string
        }
        Returns: Json
      }
      transition_partner_store_v1: {
        Args: {
          p_action: string
          p_branch_id: string
          p_merchant_id: string
          p_reason?: string
        }
        Returns: Json
      }
      unblock_it_session_v1: {
        Args: { p_branch_id?: string; p_session_id: string }
        Returns: Json
      }
      unpublish_marketplace_merchant_v1: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      unregister_push_device_v2: { Args: { p_token: string }; Returns: boolean }
      unstage_order_bag_v1: {
        Args: { p_bag_code: string; p_order_id: string }
        Returns: Json
      }
      update_branch_delivery_policy_v2: {
        Args: { p_hub_branch_id: string; p_policy: Json }
        Returns: Json
      }
      update_branch_staff_identity_v1: {
        Args: {
          p_actor_id: string
          p_branch_id: string
          p_name: string
          p_phone: string
          p_user_id: string
        }
        Returns: Json
      }
      update_finance_bank_account_v2: {
        Args: {
          p_account_id: string
          p_active: boolean
          p_custodian_user_id: string
          p_name: string
        }
        Returns: Json
      }
      update_franchise_agreement_v1: {
        Args: { p_agreement: Json; p_merchant_id: string }
        Returns: Json
      }
      update_franchise_member_role_v1: {
        Args: {
          p_merchant_id: string
          p_reason?: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
      update_franchise_profile_v1: {
        Args: { p_merchant_id: string; p_profile: Json }
        Returns: Json
      }
      update_marketplace_branch_profile_v1: {
        Args: {
          p_address: string
          p_branch_id: string
          p_delivery_fee?: number
          p_email?: string
          p_estimated_delivery_minutes?: number
          p_latitude?: number
          p_longitude?: number
          p_merchant_id: string
          p_min_order_amount?: number
          p_phone?: string
        }
        Returns: Json
      }
      update_my_partner_pickup_location_v1: {
        Args: {
          p_address: string
          p_branch_id: string
          p_latitude: number
          p_longitude: number
          p_merchant_id: string
        }
        Returns: Json
      }
      update_my_partner_store_settings_v1: {
        Args: { p_branch_id: string; p_merchant_id: string; p_settings: Json }
        Returns: Json
      }
      update_my_partner_team_member_v1: {
        Args: {
          p_branch_ids?: string[]
          p_is_active: boolean
          p_merchant_id: string
          p_reason?: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
      update_order_fulfillment_progress_v1: {
        Args: {
          p_bags_count?: number
          p_items_picked: number
          p_note?: string
          p_order_id: string
          p_shortage_count?: number
          p_substitution_count?: number
        }
        Returns: Json
      }
      update_partner_delivery_settings_v2: {
        Args: { p_branch_id: string; p_settings: Json }
        Returns: Json
      }
      update_pos_device_runtime_settings: {
        Args: {
          p_auto_lock_minutes: number
          p_cash_warning_threshold?: number
          p_device_id: string
        }
        Returns: Json
      }
      upsert_delivery_campaign_v1: {
        Args: { p_campaign: Json; p_campaign_id: string }
        Returns: Json
      }
      upsert_expense_budget_v2: {
        Args: {
          p_alert_100?: boolean
          p_alert_80?: boolean
          p_branch_id: string
          p_budget_amount: number
          p_category_id: string
          p_id: string
          p_notes?: string
          p_period_month: string
        }
        Returns: Json
      }
      upsert_expense_category_v2: {
        Args: {
          p_accounting_treatment: string
          p_active: boolean
          p_approval_required: boolean
          p_auto_approve_limit: number
          p_branch_id: string
          p_category_id: string
          p_code: string
          p_group_name_ar: string
          p_name_ar: string
          p_notes?: string
          p_receipt_required_above: number
          p_require_independent_approval: boolean
        }
        Returns: Json
      }
      upsert_expense_recurring_rule_v2: {
        Args: {
          p_active: boolean
          p_amount: number
          p_auto_submit: boolean
          p_beneficiary_name: string
          p_branch_id: string
          p_cadence: string
          p_category_id: string
          p_description: string
          p_end_date: string
          p_id: string
          p_next_run_date: string
          p_notes?: string
          p_tax_amount: number
        }
        Returns: Json
      }
      upsert_it_peripheral_v1: {
        Args: {
          p_branch_id?: string
          p_config?: Json
          p_connection_type?: string
          p_device_key?: string
          p_id?: string
          p_name?: string
          p_peripheral_type?: string
          p_product_id?: number
          p_serial_number?: string
          p_staff_device_id?: string
          p_vendor_id?: number
        }
        Returns: Json
      }
      upsert_marketplace_commission_rule_v1: {
        Args: {
          p_calculation_basis?: string
          p_commission_percent: number
          p_effective_from?: string
          p_fixed_fee?: number
          p_merchant_id: string
          p_name: string
          p_priority?: number
        }
        Returns: Json
      }
      upsert_marketplace_listing_v1: {
        Args: {
          p_branch_id: string
          p_is_offer?: boolean
          p_merchant_id: string
          p_merchant_sku?: string
          p_offer_price?: number
          p_preparation_minutes?: number
          p_product_id: string
          p_purchase_price: number
          p_quantity: number
          p_requested_status?: string
          p_sale_price: number
        }
        Returns: Json
      }
      upsert_my_partner_product_v1: {
        Args: {
          p_alert_enabled?: boolean
          p_branch_id: string
          p_is_offer?: boolean
          p_merchant_id: string
          p_min_stock_level?: number
          p_offer_price?: number
          p_product_id: string
          p_purchase_price: number
          p_quantity: number
          p_sale_price: number
        }
        Returns: Json
      }
      upsert_saas_plan_v1: {
        Args: {
          p_code?: string
          p_currency?: string
          p_description_ar?: string
          p_features?: Json
          p_is_active?: boolean
          p_limits?: Json
          p_monthly_price?: number
          p_name_ar?: string
          p_name_en?: string
          p_plan_id?: string
          p_yearly_price?: number
        }
        Returns: Json
      }
      validate_my_staff_device_v1: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: Json
      }
      verify_legacy_staff_password_v1: {
        Args: { p_password: string; p_user_id: string }
        Returns: boolean
      }
      verify_my_staff_app_pin_v1: { Args: { p_pin: string }; Returns: Json }
      verify_notification_worker_secret_v2: {
        Args: { p_secret: string }
        Returns: boolean
      }
      verify_pos_quick_login: {
        Args: {
          p_device_id: string
          p_device_token: string
          p_pin: string
          p_user_id: string
        }
        Returns: Json
      }
      void_branch_expense_atomic: {
        Args: { p_expense_id: string; p_reason?: string }
        Returns: Json
      }
      void_expense_request_v2: {
        Args: { p_document_id: string; p_reason: string }
        Returns: Json
      }
      void_purchase_v2: {
        Args: { p_purchase_id: string; p_reason: string }
        Returns: Json
      }
      void_supplier_payment_v2: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      void_supplier_wallet_payment_v4: {
        Args: { p_operation_id: string; p_reason?: string }
        Returns: Json
      }
    }
    Enums: {
      branch_category:
        | "main_hub"
        | "franchise"
        | "internal"
        | "retail"
        | "warehouse"
      branch_type: "internal" | "external"
      order_payment_status: "pending" | "paid" | "failed" | "refunded"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "shipped"
        | "delivered"
        | "cancelled"
      register_type: "store" | "online"
      return_request_status: "pending" | "approved" | "rejected"
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
    Enums: {
      branch_category: [
        "main_hub",
        "franchise",
        "internal",
        "retail",
        "warehouse",
      ],
      branch_type: ["internal", "external"],
      order_payment_status: ["pending", "paid", "failed", "refunded"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "shipped",
        "delivered",
        "cancelled",
      ],
      register_type: ["store", "online"],
      return_request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
