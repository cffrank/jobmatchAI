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
      skills: {
        Row: {
          created_at: string
          endorsed_count: number | null
          id: string
          name: string
          proficiency_level: "beginner" | "intermediate" | "advanced" | "expert" | null
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          endorsed_count?: number | null
          id?: string
          name: string
          proficiency_level?: "beginner" | "intermediate" | "advanced" | "expert" | null
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          endorsed_count?: number | null
          id?: string
          name?: string
          proficiency_level?: "beginner" | "intermediate" | "advanced" | "expert" | null
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
      }
    }
  }
}
