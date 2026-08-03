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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          new_data: Json | null
          notes: string | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          notes?: string | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          notes?: string | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          archived_at: string | null
          brand_code: string
          client_id: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          main_category: string | null
          name: string
          notes: string | null
          status: string
          target_market: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          brand_code: string
          client_id: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          main_category?: string | null
          name: string
          notes?: string | null
          status?: string
          target_market?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          brand_code?: string
          client_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          main_category?: string | null
          name?: string
          notes?: string | null
          status?: string
          target_market?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_fee_payments: {
        Row: {
          amount: number
          broker_fee_id: string
          company_id: string
          created_at: string
          id: string
          method: string
          notes: string | null
          payment_date: string
          proof_url: string | null
        }
        Insert: {
          amount: number
          broker_fee_id: string
          company_id: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          proof_url?: string | null
        }
        Update: {
          amount?: number
          broker_fee_id?: string
          company_id?: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          proof_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_fee_payments_broker_fee_id_fkey"
            columns: ["broker_fee_id"]
            isOneToOne: false
            referencedRelation: "broker_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_fee_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_fees: {
        Row: {
          broker_id: string
          client_id: string | null
          company_id: string
          created_at: string
          due_date: string | null
          fee_amount: number
          fee_base: number
          fee_percentage: number
          fee_type: string
          id: string
          notes: string | null
          order_id: string | null
          paid_amount: number
          remaining_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          client_id?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          fee_amount?: number
          fee_base?: number
          fee_percentage?: number
          fee_type?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          fee_amount?: number
          fee_base?: number
          fee_percentage?: number
          fee_type?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_fees_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_fees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_fees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_fees_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          address: string | null
          agreement_file_url: string | null
          archived_at: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          business_name: string | null
          city: string | null
          company_id: string
          created_at: string
          default_fee_type: string
          default_fee_value: number
          email: string | null
          id: string
          joined_at: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          agreement_file_url?: string | null
          archived_at?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          business_name?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          default_fee_type?: string
          default_fee_value?: number
          email?: string | null
          id?: string
          joined_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          agreement_file_url?: string | null
          archived_at?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          business_name?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          default_fee_type?: string
          default_fee_value?: number
          email?: string | null
          id?: string
          joined_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brokers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived_at: string | null
          broker_id: string | null
          business_name: string | null
          city: string | null
          client_code: string
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          joined_at: string | null
          logo_url: string | null
          nib: string | null
          notes: string | null
          npwp: string | null
          owner_name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          broker_id?: string | null
          business_name?: string | null
          city?: string | null
          client_code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          joined_at?: string | null
          logo_url?: string | null
          nib?: string | null
          notes?: string | null
          npwp?: string | null
          owner_name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          broker_id?: string | null
          business_name?: string | null
          city?: string | null
          client_code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          joined_at?: string | null
          logo_url?: string | null
          nib?: string | null
          notes?: string | null
          npwp?: string | null
          owner_name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_broker_fk"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          business_type: string | null
          code: string
          created_at: string
          default_payment_terms: string | null
          default_quotation_validity_days: number
          email: string | null
          id: string
          invoice_footer_note: string | null
          is_active: boolean
          logo_url: string | null
          minimum_margin: number
          name: string
          phone: string | null
          primary_color: string | null
          quotation_footer_note: string | null
          secondary_color: string | null
          soft_color: string | null
          tax_number: string | null
          theme_key: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          business_type?: string | null
          code: string
          created_at?: string
          default_payment_terms?: string | null
          default_quotation_validity_days?: number
          email?: string | null
          id?: string
          invoice_footer_note?: string | null
          is_active?: boolean
          logo_url?: string | null
          minimum_margin?: number
          name: string
          phone?: string | null
          primary_color?: string | null
          quotation_footer_note?: string | null
          secondary_color?: string | null
          soft_color?: string | null
          tax_number?: string | null
          theme_key?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          business_type?: string | null
          code?: string
          created_at?: string
          default_payment_terms?: string | null
          default_quotation_validity_days?: number
          email?: string | null
          id?: string
          invoice_footer_note?: string | null
          is_active?: boolean
          logo_url?: string | null
          minimum_margin?: number
          name?: string
          phone?: string | null
          primary_color?: string | null
          quotation_footer_note?: string | null
          secondary_color?: string | null
          soft_color?: string | null
          tax_number?: string | null
          theme_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      costing_items: {
        Row: {
          category: string
          company_id: string
          costing_version_id: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          sort_order: number
          subtotal: number
          supplier: string | null
          total: number
          unit: string | null
          unit_cost: number
          waste_percentage: number
        }
        Insert: {
          category: string
          company_id: string
          costing_version_id: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          subtotal?: number
          supplier?: string | null
          total?: number
          unit?: string | null
          unit_cost?: number
          waste_percentage?: number
        }
        Update: {
          category?: string
          company_id?: string
          costing_version_id?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          subtotal?: number
          supplier?: string | null
          total?: number
          unit?: string | null
          unit_cost?: number
          waste_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "costing_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costing_items_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "costing_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      costing_versions: {
        Row: {
          change_reason: string | null
          company_id: string
          created_at: string
          created_by: string | null
          effective_at: string | null
          formula_version_id: string | null
          good_units: number
          id: string
          is_estimated: boolean
          notes: string | null
          planned_quantity: number
          product_id: string
          rejected_units: number
          shrinkage_units: number
          status: string
          total_batch_cost: number
          unit_hpp: number
          updated_at: string
          version_name: string | null
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_at?: string | null
          formula_version_id?: string | null
          good_units?: number
          id?: string
          is_estimated?: boolean
          notes?: string | null
          planned_quantity?: number
          product_id: string
          rejected_units?: number
          shrinkage_units?: number
          status?: string
          total_batch_cost?: number
          unit_hpp?: number
          updated_at?: string
          version_name?: string | null
          version_number: number
        }
        Update: {
          change_reason?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string | null
          formula_version_id?: string | null
          good_units?: number
          id?: string
          is_estimated?: boolean
          notes?: string | null
          planned_quantity?: number
          product_id?: string
          rejected_units?: number
          shrinkage_units?: number
          status?: string
          total_batch_cost?: number
          unit_hpp?: number
          updated_at?: string
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "costing_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costing_versions_formula_version_id_fkey"
            columns: ["formula_version_id"]
            isOneToOne: false
            referencedRelation: "product_formula_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costing_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          company_id: string
          current_value: number
          doc_type: string
          id: string
          period: string
        }
        Insert: {
          company_id: string
          current_value?: number
          doc_type: string
          id?: string
          period?: string
        }
        Update: {
          company_id?: string
          current_value?: number
          doc_type?: string
          id?: string
          period?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          batch_id: string | null
          brand_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          order_id: string | null
          product_id: string | null
          storage_path: string
          uploaded_by: string | null
          valid_from: string | null
        }
        Insert: {
          archived_at?: string | null
          batch_id?: string | null
          brand_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          valid_from?: string | null
        }
        Update: {
          archived_at?: string | null
          batch_id?: string | null
          brand_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          valid_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          discount: number
          due_date: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          order_id: string | null
          paid_amount: number
          remaining_amount: number
          shipping_cost: number
          status: string
          subtotal: number
          tax: number
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          discount?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          shipping_cost?: number
          status?: string
          subtotal?: number
          tax?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          discount?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          shipping_cost?: number
          status?: string
          subtotal?: number
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          priority: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          priority?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          priority?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          actual_margin: number
          broker_fee: number
          company_id: string
          costing_version_id: string | null
          created_at: string
          discount: number
          estimated_profit: number
          formula_version_id: string | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          quantity: number
          subtotal: number
          unit: string | null
          unit_hpp_snapshot: number
          unit_price_snapshot: number
        }
        Insert: {
          actual_margin?: number
          broker_fee?: number
          company_id: string
          costing_version_id?: string | null
          created_at?: string
          discount?: number
          estimated_profit?: number
          formula_version_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit?: string | null
          unit_hpp_snapshot?: number
          unit_price_snapshot?: number
        }
        Update: {
          actual_margin?: number
          broker_fee?: number
          company_id?: string
          costing_version_id?: string | null
          created_at?: string
          discount?: number
          estimated_profit?: number
          formula_version_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit?: string | null
          unit_hpp_snapshot?: number
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "costing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_formula_version_id_fkey"
            columns: ["formula_version_id"]
            isOneToOne: false
            referencedRelation: "product_formula_versions"
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          attachment_url: string | null
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string | null
        }
        Insert: {
          attachment_url?: string | null
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status?: string | null
        }
        Update: {
          attachment_url?: string | null
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          brand_id: string | null
          broker_fee: number
          broker_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          client_notes: string | null
          company_id: string
          created_at: string
          created_by: string | null
          discount: number
          grand_total: number
          id: string
          internal_notes: string | null
          order_date: string
          order_number: string
          paid_amount: number
          payment_status: string
          pic: string | null
          priority: string
          production_status: string
          quotation_id: string | null
          remaining_amount: number
          shipping_address: string | null
          shipping_cost: number
          status: string
          subtotal: number
          target_completion_date: string | null
          tax: number
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          broker_fee?: number
          broker_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          client_notes?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          discount?: number
          grand_total?: number
          id?: string
          internal_notes?: string | null
          order_date?: string
          order_number: string
          paid_amount?: number
          payment_status?: string
          pic?: string | null
          priority?: string
          production_status?: string
          quotation_id?: string | null
          remaining_amount?: number
          shipping_address?: string | null
          shipping_cost?: number
          status?: string
          subtotal?: number
          target_completion_date?: string | null
          tax?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          broker_fee?: number
          broker_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          client_notes?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          discount?: number
          grand_total?: number
          id?: string
          internal_notes?: string | null
          order_date?: string
          order_number?: string
          paid_amount?: number
          payment_status?: string
          pic?: string | null
          priority?: string
          production_status?: string
          quotation_id?: string | null
          remaining_amount?: number
          shipping_address?: string | null
          shipping_cost?: number
          status?: string
          subtotal?: number
          target_completion_date?: string | null
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_destination: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          order_id: string | null
          payment_date: string
          proof_url: string | null
          reference_number: string | null
          verification_status: string
        }
        Insert: {
          amount: number
          bank_destination?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          proof_url?: string | null
          reference_number?: string | null
          verification_status?: string
        }
        Update: {
          amount?: number
          bank_destination?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          proof_url?: string | null
          reference_number?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_formula_versions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          effective_at: string | null
          file_url: string | null
          id: string
          notes: string | null
          product_id: string
          status: string
          version_name: string | null
          version_number: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          product_id: string
          status?: string
          version_name?: string | null
          version_number: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          status?: string
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_formula_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_formula_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          actual_margin: number
          base_price: number
          broker_fee_per_unit: number
          client_price: number
          company_id: string
          costing_version_id: string | null
          created_at: string
          effective_at: string | null
          id: string
          is_active: boolean
          markup_percentage: number
          minimum_price: number
          notes: string | null
          override_reason: string | null
          pricing_method: string
          product_id: string
          recommended_retail_price: number
          target_margin_percentage: number
        }
        Insert: {
          actual_margin?: number
          base_price?: number
          broker_fee_per_unit?: number
          client_price?: number
          company_id: string
          costing_version_id?: string | null
          created_at?: string
          effective_at?: string | null
          id?: string
          is_active?: boolean
          markup_percentage?: number
          minimum_price?: number
          notes?: string | null
          override_reason?: string | null
          pricing_method?: string
          product_id: string
          recommended_retail_price?: number
          target_margin_percentage?: number
        }
        Update: {
          actual_margin?: number
          base_price?: number
          broker_fee_per_unit?: number
          client_price?: number
          company_id?: string
          costing_version_id?: string | null
          created_at?: string
          effective_at?: string | null
          id?: string
          is_active?: boolean
          markup_percentage?: number
          minimum_price?: number
          notes?: string | null
          override_reason?: string | null
          pricing_method?: string
          product_id?: string
          recommended_retail_price?: number
          target_margin_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "costing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          actual_end: string | null
          actual_quantity: number
          actual_start: string | null
          batch_number: string
          company_id: string
          costing_version_id: string | null
          created_at: string
          expiry_date: string | null
          formula_version_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          passed_quantity: number
          pic: string | null
          planned_quantity: number
          product_id: string | null
          production_date: string | null
          progress_percentage: number
          rejected_quantity: number
          scheduled_end: string | null
          scheduled_start: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_quantity?: number
          actual_start?: string | null
          batch_number: string
          company_id: string
          costing_version_id?: string | null
          created_at?: string
          expiry_date?: string | null
          formula_version_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          passed_quantity?: number
          pic?: string | null
          planned_quantity?: number
          product_id?: string | null
          production_date?: string | null
          progress_percentage?: number
          rejected_quantity?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_quantity?: number
          actual_start?: string | null
          batch_number?: string
          company_id?: string
          costing_version_id?: string | null
          created_at?: string
          expiry_date?: string | null
          formula_version_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          passed_quantity?: number
          pic?: string | null
          planned_quantity?: number
          product_id?: string | null
          production_date?: string | null
          progress_percentage?: number
          rejected_quantity?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "costing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_formula_version_id_fkey"
            columns: ["formula_version_id"]
            isOneToOne: false
            referencedRelation: "product_formula_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          attachment_url: string | null
          batch_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          pic: string | null
          progress_percentage: number
          sort_order: number
          stage_name: string
          started_at: string | null
          status: string
        }
        Insert: {
          attachment_url?: string | null
          batch_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pic?: string | null
          progress_percentage?: number
          sort_order?: number
          stage_name: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attachment_url?: string | null
          batch_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pic?: string | null
          progress_percentage?: number
          sort_order?: number
          stage_name?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          brand_id: string | null
          category_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          first_produced_at: string | null
          id: string
          main_image_url: string | null
          moq: number
          name: string
          net_content: number | null
          notes: string | null
          packaging_type: string | null
          regulatory_data: Json
          shelf_life_months: number | null
          sku: string
          specifications: Json
          standard_batch_quantity: number | null
          status: string
          subcategory: string | null
          unit: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          archived_at?: string | null
          brand_id?: string | null
          category_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          first_produced_at?: string | null
          id?: string
          main_image_url?: string | null
          moq?: number
          name: string
          net_content?: number | null
          notes?: string | null
          packaging_type?: string | null
          regulatory_data?: Json
          shelf_life_months?: number | null
          sku: string
          specifications?: Json
          standard_batch_quantity?: number | null
          status?: string
          subcategory?: string | null
          unit?: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          archived_at?: string | null
          brand_id?: string | null
          category_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          first_produced_at?: string | null
          id?: string
          main_image_url?: string | null
          moq?: number
          name?: string
          net_content?: number | null
          notes?: string | null
          packaging_type?: string | null
          regulatory_data?: Json
          shelf_life_months?: number | null
          sku?: string
          specifications?: Json
          standard_batch_quantity?: number | null
          status?: string
          subcategory?: string | null
          unit?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quality_checks: {
        Row: {
          aroma_result: string | null
          attachment_url: string | null
          batch_id: string
          company_id: string
          created_at: string
          decision: string | null
          failed_quantity: number
          id: string
          inspection_date: string
          inspector: string | null
          notes: string | null
          packaging_result: string | null
          passed_quantity: number
          result: string
          sample_size: number
          taste_result: string | null
          visual_result: string | null
          weight_volume_result: string | null
        }
        Insert: {
          aroma_result?: string | null
          attachment_url?: string | null
          batch_id: string
          company_id: string
          created_at?: string
          decision?: string | null
          failed_quantity?: number
          id?: string
          inspection_date?: string
          inspector?: string | null
          notes?: string | null
          packaging_result?: string | null
          passed_quantity?: number
          result?: string
          sample_size?: number
          taste_result?: string | null
          visual_result?: string | null
          weight_volume_result?: string | null
        }
        Update: {
          aroma_result?: string | null
          attachment_url?: string | null
          batch_id?: string
          company_id?: string
          created_at?: string
          decision?: string | null
          failed_quantity?: number
          id?: string
          inspection_date?: string
          inspector?: string | null
          notes?: string | null
          packaging_result?: string | null
          passed_quantity?: number
          result?: string
          sample_size?: number
          taste_result?: string | null
          visual_result?: string | null
          weight_volume_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_checks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          broker_fee: number
          company_id: string
          costing_version_id: string | null
          created_at: string
          description: string | null
          discount: number
          estimated_margin: number
          estimated_profit: number
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          quotation_id: string
          subtotal: number
          unit: string | null
          unit_hpp_snapshot: number
          unit_price: number
        }
        Insert: {
          broker_fee?: number
          company_id: string
          costing_version_id?: string | null
          created_at?: string
          description?: string | null
          discount?: number
          estimated_margin?: number
          estimated_profit?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id: string
          subtotal?: number
          unit?: string | null
          unit_hpp_snapshot?: number
          unit_price?: number
        }
        Update: {
          broker_fee?: number
          company_id?: string
          costing_version_id?: string | null
          created_at?: string
          description?: string | null
          discount?: number
          estimated_margin?: number
          estimated_profit?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          subtotal?: number
          unit?: string | null
          unit_hpp_snapshot?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "costing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          brand_id: string | null
          broker_fee: number
          broker_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          discount: number
          grand_total: number
          id: string
          notes: string | null
          payment_terms: string | null
          quotation_date: string
          quotation_number: string
          shipping_cost: number
          status: string
          subtotal: number
          tax: number
          terms: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          brand_id?: string | null
          broker_fee?: number
          broker_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          discount?: number
          grand_total?: number
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_date?: string
          quotation_number: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          tax?: number
          terms?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          brand_id?: string | null
          broker_fee?: number
          broker_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          discount?: number
          grand_total?: number
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_date?: string
          quotation_number?: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          tax?: number
          terms?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      samples: {
        Row: {
          approval_file_url: string | null
          approved_date: string | null
          client_feedback: string | null
          company_id: string
          created_at: string
          created_by: string | null
          created_date: string | null
          formula_version_id: string | null
          id: string
          image_url: string | null
          internal_notes: string | null
          order_id: string | null
          product_id: string | null
          sample_number: string
          sent_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_file_url?: string | null
          approved_date?: string | null
          client_feedback?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          created_date?: string | null
          formula_version_id?: string | null
          id?: string
          image_url?: string | null
          internal_notes?: string | null
          order_id?: string | null
          product_id?: string | null
          sample_number: string
          sent_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_file_url?: string | null
          approved_date?: string | null
          client_feedback?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_date?: string | null
          formula_version_id?: string | null
          id?: string
          image_url?: string | null
          internal_notes?: string | null
          order_id?: string | null
          product_id?: string | null
          sample_number?: string
          sent_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "samples_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_formula_version_id_fkey"
            columns: ["formula_version_id"]
            isOneToOne: false
            referencedRelation: "product_formula_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_access: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_access: { Args: { _company_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_document_number: {
        Args: { _company_id: string; _doc_type: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin"
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
      app_role: ["super_admin", "admin"],
    },
  },
} as const
