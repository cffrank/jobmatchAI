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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          email: string
          failed_attempt_count: number
          id: string
          locked_at: string | null
          locked_until: string
          reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          email: string
          failed_attempt_count: number
          id?: string
          locked_at?: string | null
          locked_until: string
          reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          email?: string
          failed_attempt_count?: number
          id?: string
          locked_at?: string | null
          locked_until?: string
          reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          company: string | null
          cover_letter: string | null
          created_at: string
          custom_resume: string | null
          id: string
          job_id: string | null
          job_title: string | null
          selected_variant_id: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string
          user_id: string
          variants: Json | null
        }
        Insert: {
          company?: string | null
          cover_letter?: string | null
          created_at?: string
          custom_resume?: string | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          selected_variant_id?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string
          user_id: string
          variants?: Json | null
        }
        Update: {
          company?: string | null
          cover_letter?: string | null
          created_at?: string
          custom_resume?: string | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          selected_variant_id?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string
          user_id?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          degree: string | null
          description: string | null
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          is_current: boolean | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution: string
          is_current?: boolean | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          is_current?: boolean | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"] | null
          subject: string
          to_address: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject: string
          to_address: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string
          to_address?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      gap_analyses: {
        Row: {
          created_at: string
          gap_count: number
          id: string
          identified_gaps_and_flags: Json
          next_steps: Json
          overall_assessment: string
          red_flag_count: number
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gap_count?: number
          id?: string
          identified_gaps_and_flags?: Json
          next_steps?: Json
          overall_assessment: string
          red_flag_count?: number
          updated_at?: string
          urgency: string
          user_id: string
        }
        Update: {
          created_at?: string
          gap_count?: number
          id?: string
          identified_gaps_and_flags?: Json
          next_steps?: Json
          overall_assessment?: string
          red_flag_count?: number
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gap_analysis_answers: {
        Row: {
          answer: string | null
          context: string
          created_at: string
          expected_outcome: string
          gap_addressed: string
          gap_analysis_id: string
          id: string
          priority: string
          question: string
          question_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          context: string
          created_at?: string
          expected_outcome: string
          gap_addressed: string
          gap_analysis_id: string
          id?: string
          priority: string
          question: string
          question_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          context?: string
          created_at?: string
          expected_outcome?: string
          gap_addressed?: string
          gap_analysis_id?: string
          id?: string
          priority?: string
          question?: string
          question_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_analysis_answers_gap_analysis_id_fkey"
            columns: ["gap_analysis_id"]
            isOneToOne: false
            referencedRelation: "gap_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_analysis_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_experience_narratives: {
        Row: {
          created_at: string
          id: string
          narrative: string
          updated_at: string
          user_id: string
          work_experience_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          narrative: string
          updated_at?: string
          user_id: string
          work_experience_id: string
        }
        Update: {
          created_at?: string
          id?: string
          narrative?: string
          updated_at?: string
          user_id?: string
          work_experience_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_experience_narratives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_experience_narratives_work_experience_id_fkey"
            columns: ["work_experience_id"]
            isOneToOne: true
            referencedRelation: "work_experience"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string | null
          currency: string | null
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          invoice_pdf_url: string | null
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_preferences: {
        Row: {
          auto_search_enabled: boolean | null
          benefits: string[] | null
          company_sizes: string[] | null
          created_at: string
          desired_locations: string[] | null
          desired_titles: string[]
          exclude_keywords: string[] | null
          experience_levels: string[] | null
          id: string
          industries: string[] | null
          job_types: string[] | null
          keywords: string[] | null
          notification_frequency: string | null
          salary_max: number | null
          salary_min: number | null
          updated_at: string
          user_id: string
          work_arrangement: string[] | null
        }
        Insert: {
          auto_search_enabled?: boolean | null
          benefits?: string[] | null
          company_sizes?: string[] | null
          created_at?: string
          desired_locations?: string[] | null
          desired_titles?: string[]
          exclude_keywords?: string[] | null
          experience_levels?: string[] | null
          id?: string
          industries?: string[] | null
          job_types?: string[] | null
          keywords?: string[] | null
          notification_frequency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string
          user_id: string
          work_arrangement?: string[] | null
        }
        Update: {
          auto_search_enabled?: boolean | null
          benefits?: string[] | null
          company_sizes?: string[] | null
          created_at?: string
          desired_locations?: string[] | null
          desired_titles?: string[]
          exclude_keywords?: string[] | null
          experience_levels?: string[] | null
          id?: string
          industries?: string[] | null
          job_types?: string[] | null
          keywords?: string[] | null
          notification_frequency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string
          user_id?: string
          work_arrangement?: string[] | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          added_at: string
          archived: boolean | null
          company: string
          company_logo: string | null
          compatibility_breakdown: Json | null
          created_at: string
          description: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"] | null
          location: string | null
          match_score: number | null
          missing_skills: string[] | null
          recommendations: string[] | null
          required_skills: string[] | null
          salary_max: number | null
          salary_min: number | null
          saved: boolean | null
          source: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
          work_arrangement: string | null
        }
        Insert: {
          added_at?: string
          archived?: boolean | null
          company: string
          company_logo?: string | null
          compatibility_breakdown?: Json | null
          created_at?: string
          description?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"] | null
          location?: string | null
          match_score?: number | null
          missing_skills?: string[] | null
          recommendations?: string[] | null
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          saved?: boolean | null
          source?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
          work_arrangement?: string | null
        }
        Update: {
          added_at?: string
          archived?: boolean | null
          company?: string
          company_logo?: string | null
          compatibility_breakdown?: Json | null
          created_at?: string
          description?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"] | null
          location?: string | null
          match_score?: number | null
          missing_skills?: string[] | null
          recommendations?: string[] | null
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          saved?: boolean | null
          source?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          work_arrangement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_text: string | null
          action_url: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          state: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          redirect_uri: string
          state: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          state?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          added_at: string | null
          brand: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last4: string | null
          stripe_payment_method_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          endpoint: string
          id: string
          updated_at: string
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          endpoint: string
          id?: string
          updated_at?: string
          user_id?: string | null
          window_end: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string
          endpoint?: string
          id?: string
          updated_at?: string
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string
          formats: string[] | null
          id: string
          sections: Json
          title: string
          type: Database["public"]["Enums"]["resume_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formats?: string[] | null
          id?: string
          sections?: Json
          title: string
          type?: Database["public"]["Enums"]["resume_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formats?: string[] | null
          id?: string
          sections?: Json
          title?: string
          type?: Database["public"]["Enums"]["resume_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          action: string
          browser: string | null
          device: string | null
          id: string
          ip_address: unknown
          location: string | null
          metadata: Json | null
          os: string | null
          status: Database["public"]["Enums"]["security_event_status"]
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          browser?: string | null
          device?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          metadata?: Json | null
          os?: string | null
          status: Database["public"]["Enums"]["security_event_status"]
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          browser?: string | null
          device?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          metadata?: Json | null
          os?: string | null
          status?: Database["public"]["Enums"]["security_event_status"]
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          device_type: Database["public"]["Enums"]["device_type"] | null
          expires_at: string
          id: string
          ip_address: unknown
          last_active: string
          location: string | null
          os: string | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          device_type?: Database["public"]["Enums"]["device_type"] | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_active?: string
          location?: string | null
          os?: string | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          device_type?: Database["public"]["Enums"]["device_type"] | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_active?: string
          location?: string | null
          os?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          endorsed_count: number | null
          id: string
          name: string
          proficiency_level:
            | Database["public"]["Enums"]["skill_proficiency"]
            | null
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          endorsed_count?: number | null
          id?: string
          name: string
          proficiency_level?:
            | Database["public"]["Enums"]["skill_proficiency"]
            | null
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          endorsed_count?: number | null
          id?: string
          name?: string
          proficiency_level?:
            | Database["public"]["Enums"]["skill_proficiency"]
            | null
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tracked_applications: {
        Row: {
          activity_log: Json | null
          application_id: string | null
          applied_date: string | null
          archived: boolean | null
          company: string
          created_at: string
          follow_up_actions: Json | null
          hiring_manager: Json | null
          id: string
          interviews: Json | null
          job_id: string | null
          job_title: string
          last_updated: string
          location: string | null
          match_score: number | null
          next_action: string | null
          next_action_date: string | null
          next_interview_date: string | null
          notes: string | null
          offer_details: Json | null
          recruiter: Json | null
          status: Database["public"]["Enums"]["tracked_application_status"]
          status_history: Json | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_log?: Json | null
          application_id?: string | null
          applied_date?: string | null
          archived?: boolean | null
          company: string
          created_at?: string
          follow_up_actions?: Json | null
          hiring_manager?: Json | null
          id?: string
          interviews?: Json | null
          job_id?: string | null
          job_title: string
          last_updated?: string
          location?: string | null
          match_score?: number | null
          next_action?: string | null
          next_action_date?: string | null
          next_interview_date?: string | null
          notes?: string | null
          offer_details?: Json | null
          recruiter?: Json | null
          status?: Database["public"]["Enums"]["tracked_application_status"]
          status_history?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_log?: Json | null
          application_id?: string | null
          applied_date?: string | null
          archived?: boolean | null
          company?: string
          created_at?: string
          follow_up_actions?: Json | null
          hiring_manager?: Json | null
          id?: string
          interviews?: Json | null
          job_id?: string | null
          job_title?: string
          last_updated?: string
          location?: string | null
          match_score?: number | null
          next_action?: string | null
          next_action_date?: string | null
          next_interview_date?: string | null
          notes?: string | null
          offer_details?: Json | null
          recruiter?: Json | null
          status?: Database["public"]["Enums"]["tracked_application_status"]
          status_history?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_applications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          ai_generations_limit: number | null
          ai_generations_used: number | null
          created_at: string | null
          emails_sent_limit: number | null
          emails_sent_used: number | null
          id: string
          job_searches_limit: number | null
          job_searches_used: number | null
          period_end: string | null
          period_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generations_limit?: number | null
          ai_generations_used?: number | null
          created_at?: string | null
          emails_sent_limit?: number | null
          emails_sent_used?: number | null
          id?: string
          job_searches_limit?: number | null
          job_searches_used?: number | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generations_limit?: number | null
          ai_generations_used?: number | null
          created_at?: string | null
          emails_sent_limit?: number | null
          emails_sent_used?: number | null
          id?: string
          job_searches_limit?: number | null
          job_searches_used?: number | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          current_title: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          photo_url: string | null
          professional_summary: string | null
          two_factor_enabled: boolean | null
          updated_at: string
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          current_title?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          photo_url?: string | null
          professional_summary?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          current_title?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          photo_url?: string | null
          professional_summary?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      work_experience: {
        Row: {
          company: string
          created_at: string
          description: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          location: string | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_lockouts: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_old_failed_logins: { Args: never; Returns: number }
      clear_failed_login_attempts: {
        Args: { user_email: string }
        Returns: undefined
      }
      get_active_session_count: { Args: { p_user_id: string }; Returns: number }
      initialize_user_limits: {
        Args: { p_plan: string; p_user_id: string }
        Returns: undefined
      }
      is_account_locked: { Args: { user_email: string }; Returns: boolean }
      record_failed_login: {
        Args: {
          client_ip: unknown
          user_agent_string?: string
          user_email: string
        }
        Returns: Json
      }
      unlock_account: {
        Args: { admin_user_id: string; user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status:
        | "draft"
        | "ready"
        | "submitted"
        | "interviewing"
        | "offered"
        | "accepted"
        | "rejected"
        | "withdrawn"
      device_type: "desktop" | "mobile" | "tablet" | "unknown"
      email_status: "pending" | "sent" | "delivered" | "failed" | "bounced"
      experience_level: "entry" | "mid" | "senior" | "lead" | "executive"
      job_type:
        | "full-time"
        | "part-time"
        | "contract"
        | "internship"
        | "temporary"
        | "remote"
      resume_type: "master" | "tailored"
      security_event_status: "success" | "failed"
      skill_proficiency: "beginner" | "intermediate" | "advanced" | "expert"
      tracked_application_status:
        | "applied"
        | "screening"
        | "interview_scheduled"
        | "interview_completed"
        | "offer"
        | "accepted"
        | "rejected"
        | "withdrawn"
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
      application_status: [
        "draft",
        "ready",
        "submitted",
        "interviewing",
        "offered",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      device_type: ["desktop", "mobile", "tablet", "unknown"],
      email_status: ["pending", "sent", "delivered", "failed", "bounced"],
      experience_level: ["entry", "mid", "senior", "lead", "executive"],
      job_type: [
        "full-time",
        "part-time",
        "contract",
        "internship",
        "temporary",
        "remote",
      ],
      resume_type: ["master", "tailored"],
      security_event_status: ["success", "failed"],
      skill_proficiency: ["beginner", "intermediate", "advanced", "expert"],
      tracked_application_status: [
        "applied",
        "screening",
        "interview_scheduled",
        "interview_completed",
        "offer",
        "accepted",
        "rejected",
        "withdrawn",
      ],
    },
  },
} as const
