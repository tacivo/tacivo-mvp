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
      organizations: {
        Row: {
          id: string
          name: string
          website: string | null
          logo_url: string | null
          description: string | null
          industry: string | null
          size: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          logo_url?: string | null
          description?: string | null
          industry?: string | null
          size?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          logo_url?: string | null
          description?: string | null
          industry?: string | null
          size?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company: string | null
          organization_id: string | null
          role: string | null
          years_of_experience: number | null
          is_admin: boolean
          is_expert: boolean
          is_super_admin: boolean
          goal: string | null
          area_of_expertise: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company?: string | null
          organization_id?: string | null
          role?: string | null
          years_of_experience?: number | null
          is_admin?: boolean
          is_expert?: boolean
          is_super_admin?: boolean
          goal?: string | null
          area_of_expertise?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company?: string | null
          organization_id?: string | null
          role?: string | null
          years_of_experience?: number | null
          is_admin?: boolean
          is_expert?: boolean
          is_super_admin?: boolean
          goal?: string | null
          area_of_expertise?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          invited_by: string
          email: string
          full_name: string
          role: string | null
          years_of_experience: number | null
          area_of_expertise: string | null
          goal: string | null
          is_admin: boolean
          is_expert: boolean
          status: string
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          invited_by: string
          email: string
          full_name: string
          role?: string | null
          years_of_experience?: number | null
          area_of_expertise?: string | null
          goal?: string | null
          is_admin?: boolean
          is_expert?: boolean
          status?: string
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          invited_by?: string
          email?: string
          full_name?: string
          role?: string | null
          years_of_experience?: number | null
          area_of_expertise?: string | null
          goal?: string | null
          is_admin?: boolean
          is_expert?: boolean
          status?: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
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
          organization_id: string | null
          title: string
          content: string
          document_type: 'case-study' | 'best-practices'
          format: 'markdown' | 'pdf'| 'blocknote'
          file_url: string | null
          is_shared: boolean
          plain_text: string | null
          function_area: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          user_id: string
          organization_id?: string | null
          title: string
          content: string
          document_type: 'case-study' | 'best-practices'
          format?: 'markdown' | 'pdf'| 'blocknote'
          file_url?: string | null
          is_shared?: boolean
          plain_text?: string | null
          function_area?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          user_id?: string
          organization_id?: string | null
          title?: string
          content?: string
          document_type?: 'case-study' | 'best-practices'
          format?: 'markdown' | 'pdf'| 'blocknote'
          file_url?: string | null
          is_shared?: boolean
          plain_text?: string | null
          function_area?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      playbooks: {
        Row: {
          id: string
          title: string
          content: string
          type: 'sales-playbook' | 'customer-success-guide' | 'operational-procedures' | 'strategic-planning-document'
          user_id: string
          organization_id: string | null
          is_shared: boolean
          document_ids: string[]
          content_sections: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type: 'sales-playbook' | 'customer-success-guide' | 'operational-procedures' | 'strategic-planning-document'
          user_id: string
          organization_id?: string | null
          is_shared?: boolean
          document_ids?: string[]
          content_sections?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'sales-playbook' | 'customer-success-guide' | 'operational-procedures' | 'strategic-planning-document'
          user_id?: string
          organization_id?: string | null
          is_shared?: boolean
          document_ids?: string[]
          content_sections?: string[]
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
      admin_invitations: {
        Row: {
          id: string
          invited_by: string | null
          email: string
          full_name: string | null
          token: string
          status: 'pending' | 'accepted' | 'expired'
          expires_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          email: string
          full_name?: string | null
          token?: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          email?: string
          full_name?: string | null
          token?: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
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
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
export type AdminInvitation = Database['public']['Tables']['admin_invitations']['Row']
export type Interview = Database['public']['Tables']['interviews']['Row']
export type InterviewMessage = Database['public']['Tables']['interview_messages']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
export type Playbook = Database['public']['Tables']['playbooks']['Row']

export type InsertOrganization = Database['public']['Tables']['organizations']['Insert']
export type InsertInvitation = Database['public']['Tables']['invitations']['Insert']
export type InsertAdminInvitation = Database['public']['Tables']['admin_invitations']['Insert']
export type InsertInterview = Database['public']['Tables']['interviews']['Insert']
export type InsertInterviewMessage = Database['public']['Tables']['interview_messages']['Insert']
export type InsertDocument = Database['public']['Tables']['documents']['Insert']
export type InsertPlaybook = Database['public']['Tables']['playbooks']['Insert']

// Extended types with relations
export interface ProfileWithOrganization extends Profile {
  organization: Organization | null
}

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
