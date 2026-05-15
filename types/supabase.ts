export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          street: string
          postal_code: string
          city: string
          country: string
          email: string
          phone: string | null
          tax_number: string | null
          vat_id: string | null
          bank_name: string | null
          iban: string | null
          bic: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          street: string
          postal_code: string
          city: string
          country?: string
          email: string
          phone?: string | null
          tax_number?: string | null
          vat_id?: string | null
          bank_name?: string | null
          iban?: string | null
          bic?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          street?: string
          postal_code?: string
          city?: string
          country?: string
          email?: string
          phone?: string | null
          tax_number?: string | null
          vat_id?: string | null
          bank_name?: string | null
          iban?: string | null
          bic?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          company_id: string | null
          company_name: string
          contact_person: string | null
          email: string
          phone: string | null
          street: string
          postal_code: string
          city: string
          country: string
          customer_number: string
          bank_name: string | null
          iban: string | null
          bic: string | null
          auth_user_id: string | null
          onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          company_name: string
          contact_person?: string | null
          email: string
          phone?: string | null
          street: string
          postal_code: string
          city: string
          country?: string
          customer_number: string
          bank_name?: string | null
          iban?: string | null
          bic?: string | null
          auth_user_id?: string | null
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          company_name?: string
          contact_person?: string | null
          email?: string
          phone?: string | null
          street?: string
          postal_code?: string
          city?: string
          country?: string
          customer_number?: string
          bank_name?: string | null
          iban?: string | null
          bic?: string | null
          auth_user_id?: string | null
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          invoice_number: string
          invoice_date: string
          service_date: string | null
          due_date: string
          status: 'created' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          currency: string
          notes: string | null
          terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id: string
          invoice_number: string
          invoice_date?: string
          service_date?: string | null
          due_date: string
          status?: 'created' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          currency?: string
          notes?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string
          invoice_number?: string
          invoice_date?: string
          service_date?: string | null
          due_date?: string
          status?: 'created' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          currency?: string
          notes?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          price: number
          total: number
          unit: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          price?: number
          total?: number
          unit?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          price?: number
          total?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          company_id: string | null
          name: string
          description: string | null
          price: number
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          description?: string | null
          price: number
          unit?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          description?: string | null
          price?: number
          unit?: string
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_method: string
          payment_date: string
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          payment_method: string
          payment_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          payment_method?: string
          payment_date?: string
          stripe_payment_intent_id?: string | null
          created_at?: string
        }
      }
      invoice_sequences: {
        Row: {
          id: string
          company_id: string
          year: number
          last_number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          year: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          year?: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          contract_number: string
          contract_type: 'booking_offer' | 'booking_confirmation' | 'booking_rejection' | 'custom'
          title: string
          event_date: string | null
          event_location: string | null
          event_description: string | null
          fee: number
          deposit: number | null
          currency: string
          deposit_due: string | null
          final_payment_due: string | null
          cancellation_terms: string | null
          technical_requirements: string | null
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
          valid_until: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id: string
          contract_number: string
          contract_type: 'booking_offer' | 'booking_confirmation' | 'booking_rejection' | 'custom'
          title: string
          event_date?: string | null
          event_location?: string | null
          event_description?: string | null
          fee?: number
          deposit?: number | null
          currency?: string
          deposit_due?: string | null
          final_payment_due?: string | null
          cancellation_terms?: string | null
          technical_requirements?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
          valid_until?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string
          contract_number?: string
          contract_type?: 'booking_offer' | 'booking_confirmation' | 'booking_rejection' | 'custom'
          title?: string
          event_date?: string | null
          event_location?: string | null
          event_description?: string | null
          fee?: number
          deposit?: number | null
          currency?: string
          deposit_due?: string | null
          final_payment_due?: string | null
          cancellation_terms?: string | null
          technical_requirements?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
          valid_until?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          customer_id: string | null
          dj_id: string | null
          title: string
          description: string | null
          status: 'open' | 'in_progress' | 'completed' | 'cancelled'
          total_budget: number | null
          dj_rider_filled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          customer_id?: string | null
          dj_id?: string | null
          title: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled'
          total_budget?: number | null
          dj_rider_filled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          customer_id?: string | null
          dj_id?: string | null
          title?: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled'
          total_budget?: number | null
          dj_rider_filled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      dj_rider_templates: {
        Row: {
          id: string
          name: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      dj_rider_template_sections: {
        Row: {
          id: string
          template_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          sort_order?: number
          created_at?: string
        }
      }
      dj_rider_template_fields: {
        Row: {
          id: string
          section_id: string
          label: string
          field_type: string
          placeholder: string | null
          required: boolean
          sort_order: number
          options: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          section_id: string
          label: string
          field_type?: string
          placeholder?: string | null
          required?: boolean
          sort_order?: number
          options?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          section_id?: string
          label?: string
          field_type?: string
          placeholder?: string | null
          required?: boolean
          sort_order?: number
          options?: Json | null
          created_at?: string
        }
      }
      dj_riders: {
        Row: {
          id: string
          order_id: string
          template_id: string
          status: 'draft' | 'active' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          template_id: string
          status?: 'draft' | 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          template_id?: string
          status?: 'draft' | 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      dj_rider_values: {
        Row: {
          id: string
          rider_id: string
          field_id: string
          value: string | null
          confirmed_by_agency: boolean
          confirmed_by_customer: boolean
          last_modified_by: string | null
          last_modified_at: string
          created_at: string
        }
        Insert: {
          id?: string
          rider_id: string
          field_id: string
          value?: string | null
          confirmed_by_agency?: boolean
          confirmed_by_customer?: boolean
          last_modified_by?: string | null
          last_modified_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          rider_id?: string
          field_id?: string
          value?: string | null
          confirmed_by_agency?: boolean
          confirmed_by_customer?: boolean
          last_modified_by?: string | null
          last_modified_at?: string
          created_at?: string
        }
      }
      dj_rider_changelog: {
        Row: {
          id: string
          rider_id: string
          field_id: string | null
          changed_by: string | null
          old_value: string | null
          new_value: string | null
          created_at: string
          confirmed_by: string | null
          confirmed_at: string | null
          status: 'pending' | 'confirmed' | 'modified_after_confirmation'
        }
        Insert: {
          id?: string
          rider_id: string
          field_id?: string | null
          changed_by?: string | null
          old_value?: string | null
          new_value?: string | null
          created_at?: string
          confirmed_by?: string | null
          confirmed_at?: string | null
          status?: 'pending' | 'confirmed' | 'modified_after_confirmation'
        }
        Update: {
          id?: string
          rider_id?: string
          field_id?: string | null
          changed_by?: string | null
          old_value?: string | null
          new_value?: string | null
          created_at?: string
          confirmed_by?: string | null
          confirmed_at?: string | null
          status?: 'pending' | 'confirmed' | 'modified_after_confirmation'
        }
      }
      dj_rider_messages: {
        Row: {
          id: string
          rider_id: string
          user_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          rider_id: string
          user_id?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          rider_id?: string
          user_id?: string | null
          content?: string
          created_at?: string
        }
      }
      order_customer_access: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          can_view_rider: boolean
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          customer_id: string
          can_view_rider?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          customer_id?: string
          can_view_rider?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      get_next_invoice_number: {
        Args: {
          p_company_id: string
          p_year: number
        }
        Returns: string
      }
      get_next_contract_number: {
        Args: {
          p_company_id: string
          p_year: number
        }
        Returns: string
      }
    }
  }
}
