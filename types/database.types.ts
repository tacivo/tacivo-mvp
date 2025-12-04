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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company: string | null
          role: string | null
          years_of_experience: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company?: string | null
          role?: string | null
          years_of_experience?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company?: string | null
          role?: string | null
          years_of_experience?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      interviews: {
        Row: {
          id: string
          user_id: string
          document_type: 'case-study' | 'best-practices'
          title: string | null
          function_area: string | null
          description: string
          status: 'in_progress' | 'completed' | 'draft'
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: 'case-study' | 'best-practices'
          title?: string | null
          function_area?: string | null
          description: string
          status?: 'in_progress' | 'completed' | 'draft'
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: 'case-study' | 'best-practices'
          title?: string | null
          function_area?: string | null
          description?: string
          status?: 'in_progress' | 'completed' | 'draft'
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      interview_messages: {
        Row: {
          id: string
          interview_id: string
          role: 'user' | 'assistant'
          content: string
          sequence_number: number
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          role: 'user' | 'assistant'
          content: string
          sequence_number: number
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          role?: 'user' | 'assistant'
          content?: string
          sequence_number?: number
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          interview_id: string
          user_id: string
          title: string
          content: string
          document_type: 'case-study' | 'best-practices'
          format: 'markdown' | 'pdf'
          file_url: string | null
          is_shared: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          user_id: string
          title: string
          content: string
          document_type: 'case-study' | 'best-practices'
          format?: 'markdown' | 'pdf'
          file_url?: string | null
          is_shared?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          user_id?: string
          title?: string
          content?: string
          document_type?: 'case-study' | 'best-practices'
          format?: 'markdown' | 'pdf'
          file_url?: string | null
          is_shared?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      uploaded_files: {
        Row: {
          id: string
          interview_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          uploaded_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for common operations
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Interview = Database['public']['Tables']['interviews']['Row']
export type InterviewMessage = Database['public']['Tables']['interview_messages']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']

export type InsertInterview = Database['public']['Tables']['interviews']['Insert']
export type InsertInterviewMessage = Database['public']['Tables']['interview_messages']['Insert']
export type InsertDocument = Database['public']['Tables']['documents']['Insert']

// Extended types with relations
export interface InterviewWithProfile extends Interview {
  profile: Profile
}

export interface InterviewWithMessages extends Interview {
  messages: InterviewMessage[]
  profile?: Profile
}

export interface InterviewWithDocument extends Interview {
  document: Document | null
  profile?: Profile
}

export interface InterviewComplete extends Interview {
  messages: InterviewMessage[]
  document: Document | null
  uploaded_files: UploadedFile[]
  profile: Profile
}
