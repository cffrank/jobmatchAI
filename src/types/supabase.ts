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
      canonical_job_metadata: {
        Row: {
          calculated_at: string
          completeness_score: number
          description_length: number | null
          duplicate_count: number | null
          field_count: number | null
          freshness_score: number
          has_salary_range: boolean | null
          has_url: boolean | null
          is_canonical: boolean | null
          job_id: string
          overall_quality_score: number
          source_reliability_score: number
          source_type: string | null
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          completeness_score?: number
          description_length?: number | null
          duplicate_count?: number | null
          field_count?: number | null
          freshness_score?: number
          has_salary_range?: boolean | null
          has_url?: boolean | null
          is_canonical?: boolean | null
          job_id: string
          overall_quality_score?: number
          source_reliability_score?: number
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          completeness_score?: number
          description_length?: number | null
          duplicate_count?: number | null
          field_count?: number | null
          freshness_score?: number
          has_salary_range?: boolean | null
          has_url?: boolean | null
          is_canonical?: boolean | null
          job_id?: string
          overall_quality_score?: number
          source_reliability_score?: number
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_job_metadata_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
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
      job_compatibility_analyses: {
        Row: {
          analysis: Json
          created_at: string | null
          id: string
          job_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis: Json
          created_at?: string | null
          id?: string
          job_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json
          created_at?: string | null
          id?: string
          job_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_compatibility_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_compatibility_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_duplicates: {
        Row: {
          canonical_job_id: string
          company_similarity: number
          confidence_level: string
          confidence_score: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          description_similarity: number
          detected_at: string | null
          detection_date: string
          detection_method: string
          duplicate_job_id: string
          id: string
          location_similarity: number
          manually_confirmed: boolean | null
          matched_fields: string[] | null
          merged_at: string | null
          merged_by: string | null
          overall_similarity: number
          title_similarity: number
          updated_at: string
        }
        Insert: {
          canonical_job_id: string
          company_similarity: number
          confidence_level: string
          confidence_score?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description_similarity: number
          detected_at?: string | null
          detection_date?: string
          detection_method: string
          duplicate_job_id: string
          id?: string
          location_similarity: number
          manually_confirmed?: boolean | null
          matched_fields?: string[] | null
          merged_at?: string | null
          merged_by?: string | null
          overall_similarity: number
          title_similarity: number
          updated_at?: string
        }
        Update: {
          canonical_job_id?: string
          company_similarity?: number
          confidence_level?: string
          confidence_score?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description_similarity?: number
          detected_at?: string | null
          detection_date?: string
          detection_method?: string
          duplicate_job_id?: string
          id?: string
          location_similarity?: number
          manually_confirmed?: boolean | null
          matched_fields?: string[] | null
          merged_at?: string | null
          merged_by?: string | null
          overall_similarity?: number
          title_similarity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_duplicates_canonical_job_id_fkey"
            columns: ["canonical_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_duplicates_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_duplicates_duplicate_job_id_fkey"
            columns: ["duplicate_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_feedback: {
        Row: {
          comment: string | null
          context: Json | null
          created_at: string
          feedback_type: Database["public"]["Enums"]["job_feedback_type"]
          id: string
          job_id: string
          rating: number | null
          reasons: string[] | null
          training_batch_id: string | null
          updated_at: string
          used_for_training: boolean | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          context?: Json | null
          created_at?: string
          feedback_type: Database["public"]["Enums"]["job_feedback_type"]
          id?: string
          job_id: string
          rating?: number | null
          reasons?: string[] | null
          training_batch_id?: string | null
          updated_at?: string
          used_for_training?: boolean | null
          user_id: string
        }
        Update: {
          comment?: string | null
          context?: Json | null
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["job_feedback_type"]
          id?: string
          job_id?: string
          rating?: number | null
          reasons?: string[] | null
          training_batch_id?: string | null
          updated_at?: string
          used_for_training?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          all_sources: Json | null
          archived: boolean | null
          canonical_hash: string | null
          canonical_job_id: string | null
          company: string
          company_tsv: unknown
          created_at: string
          dedup_confidence: number | null
          dedup_status: Database["public"]["Enums"]["dedup_status"] | null
          description: string | null
          description_tsv: unknown
          embedding: Json | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          expires_at: string | null
          id: string
          is_closed: boolean | null
          job_type: Database["public"]["Enums"]["job_type"] | null
          last_seen_at: string | null
          location: string | null
          match_algorithm_version: string | null
          match_computed_at: string | null
          match_explanation: Json | null
          match_score: number | null
          posted_at: string | null
          quality_score: number | null
          salary_max: number | null
          salary_min: number | null
          saved: boolean | null
          source: string | null
          spam_analyzed_at: string | null
          spam_categories: string[] | null
          spam_detected: boolean | null
          spam_flags: Json | null
          spam_metadata: Json | null
          spam_probability: number | null
          spam_score: number | null
          spam_status: Database["public"]["Enums"]["spam_status"] | null
          title: string
          title_tsv: unknown
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          all_sources?: Json | null
          archived?: boolean | null
          canonical_hash?: string | null
          canonical_job_id?: string | null
          company: string
          company_tsv?: unknown
          created_at?: string
          dedup_confidence?: number | null
          dedup_status?: Database["public"]["Enums"]["dedup_status"] | null
          description?: string | null
          description_tsv?: unknown
          embedding?: Json | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          expires_at?: string | null
          id?: string
          is_closed?: boolean | null
          job_type?: Database["public"]["Enums"]["job_type"] | null
          last_seen_at?: string | null
          location?: string | null
          match_algorithm_version?: string | null
          match_computed_at?: string | null
          match_explanation?: Json | null
          match_score?: number | null
          posted_at?: string | null
          quality_score?: number | null
          salary_max?: number | null
          salary_min?: number | null
          saved?: boolean | null
          source?: string | null
          spam_analyzed_at?: string | null
          spam_categories?: string[] | null
          spam_detected?: boolean | null
          spam_flags?: Json | null
          spam_metadata?: Json | null
          spam_probability?: number | null
          spam_score?: number | null
          spam_status?: Database["public"]["Enums"]["spam_status"] | null
          title: string
          title_tsv?: unknown
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          all_sources?: Json | null
          archived?: boolean | null
          canonical_hash?: string | null
          canonical_job_id?: string | null
          company?: string
          company_tsv?: unknown
          created_at?: string
          dedup_confidence?: number | null
          dedup_status?: Database["public"]["Enums"]["dedup_status"] | null
          description?: string | null
          description_tsv?: unknown
          embedding?: Json | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          expires_at?: string | null
          id?: string
          is_closed?: boolean | null
          job_type?: Database["public"]["Enums"]["job_type"] | null
          last_seen_at?: string | null
          location?: string | null
          match_algorithm_version?: string | null
          match_computed_at?: string | null
          match_explanation?: Json | null
          match_score?: number | null
          posted_at?: string | null
          quality_score?: number | null
          salary_max?: number | null
          salary_min?: number | null
          saved?: boolean | null
          source?: string | null
          spam_analyzed_at?: string | null
          spam_categories?: string[] | null
          spam_detected?: boolean | null
          spam_flags?: Json | null
          spam_metadata?: Json | null
          spam_probability?: number | null
          spam_score?: number | null
          spam_status?: Database["public"]["Enums"]["spam_status"] | null
          title?: string
          title_tsv?: unknown
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_canonical_job_id_fkey"
            columns: ["canonical_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_quality_metrics: {
        Row: {
          algorithm_version: string
          apply_rate: number | null
          avg_match_score_applied: number | null
          avg_match_score_clicked: number | null
          avg_match_score_hidden: number | null
          click_through_rate: number | null
          created_at: string
          id: string
          jobs_applied: number | null
          jobs_clicked: number | null
          jobs_hidden: number | null
          jobs_saved: number | null
          period_end: string
          period_start: string
          positive_feedback_rate: number | null
          save_rate: number | null
          thumbs_down_count: number | null
          thumbs_up_count: number | null
          total_jobs_shown: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm_version: string
          apply_rate?: number | null
          avg_match_score_applied?: number | null
          avg_match_score_clicked?: number | null
          avg_match_score_hidden?: number | null
          click_through_rate?: number | null
          created_at?: string
          id?: string
          jobs_applied?: number | null
          jobs_clicked?: number | null
          jobs_hidden?: number | null
          jobs_saved?: number | null
          period_end: string
          period_start: string
          positive_feedback_rate?: number | null
          save_rate?: number | null
          thumbs_down_count?: number | null
          thumbs_up_count?: number | null
          total_jobs_shown?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm_version?: string
          apply_rate?: number | null
          avg_match_score_applied?: number | null
          avg_match_score_clicked?: number | null
          avg_match_score_hidden?: number | null
          click_through_rate?: number | null
          created_at?: string
          id?: string
          jobs_applied?: number | null
          jobs_clicked?: number | null
          jobs_hidden?: number | null
          jobs_saved?: number | null
          period_end?: string
          period_start?: string
          positive_feedback_rate?: number | null
          save_rate?: number | null
          thumbs_down_count?: number | null
          thumbs_up_count?: number | null
          total_jobs_shown?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_quality_metrics_user_id_fkey"
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
      spam_reports: {
        Row: {
          action_taken: string | null
          created_at: string
          details: Json | null
          id: string
          job_id: string
          reason: string | null
          report_type: string
          reporter_user_id: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          job_id: string
          reason?: string | null
          report_type: string
          reporter_user_id?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          job_id?: string
          reason?: string | null
          report_type?: string
          reporter_user_id?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spam_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spam_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
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
          resume_embedding: Json | null
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
          resume_embedding?: Json | null
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
          resume_embedding?: Json | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      work_experience: {
        Row: {
          accomplishments: string[] | null
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
          accomplishments?: string[] | null
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
          accomplishments?: string[] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_job_canonical_hash: {
        Args: {
          p_company: string
          p_location: string
          p_salary_max: number
          p_salary_min: number
          p_title: string
        }
        Returns: string
      }
      calculate_job_quality_score: {
        Args: { p_job_id: string }
        Returns: number
      }
      cleanup_expired_lockouts: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_old_failed_logins: { Args: never; Returns: number }
      clear_failed_login_attempts: {
        Args: { user_email: string }
        Returns: undefined
      }
      find_job_duplicates: {
        Args: { p_job_id: string; p_min_confidence?: number }
        Returns: {
          confidence_score: number
          duplicate_job_id: string
          matched_fields: string[]
        }[]
      }
      get_active_session_count: { Args: { p_user_id: string }; Returns: number }
      get_canonical_jobs_only: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          added_at: string
          archived: boolean
          company: string
          created_at: string
          description: string
          duplicate_count: number
          experience_level: Database["public"]["Enums"]["experience_level"]
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          match_score: number
          salary_max: number
          salary_min: number
          saved: boolean
          source: string
          title: string
          updated_at: string
          url: string
          user_id: string
        }[]
      }
      get_job_feedback_summary: { Args: { p_job_id: string }; Returns: Json }
      initialize_user_limits: {
        Args: { p_plan: string; p_user_id: string }
        Returns: undefined
      }
      is_account_locked: { Args: { user_email: string }; Returns: boolean }
      mark_as_canonical: { Args: { p_job_id: string }; Returns: undefined }
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
      dedup_status: "canonical" | "duplicate" | "merged" | "unique" | "pending"
      device_type: "desktop" | "mobile" | "tablet" | "unknown"
      email_status: "pending" | "sent" | "delivered" | "failed" | "bounced"
      experience_level: "entry" | "mid" | "senior" | "lead" | "executive"
      job_feedback_type:
        | "thumbs_up"
        | "thumbs_down"
        | "not_interested"
        | "applied"
        | "saved"
        | "hidden"
        | "reported_spam"
        | "reported_scam"
        | "reported_expired"
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
      spam_status:
        | "clean"
        | "suspicious"
        | "spam"
        | "scam"
        | "expired"
        | "pending_review"
        | "manually_approved"
        | "manually_rejected"
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
      dedup_status: ["canonical", "duplicate", "merged", "unique", "pending"],
      device_type: ["desktop", "mobile", "tablet", "unknown"],
      email_status: ["pending", "sent", "delivered", "failed", "bounced"],
      experience_level: ["entry", "mid", "senior", "lead", "executive"],
      job_feedback_type: [
        "thumbs_up",
        "thumbs_down",
        "not_interested",
        "applied",
        "saved",
        "hidden",
        "reported_spam",
        "reported_scam",
        "reported_expired",
      ],
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
      spam_status: [
        "clean",
        "suspicious",
        "spam",
        "scam",
        "expired",
        "pending_review",
        "manually_approved",
        "manually_rejected",
      ],
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
