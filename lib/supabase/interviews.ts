import { supabase } from './client'
import {
  InsertInterview,
  InsertInterviewMessage,
  InsertDocument,
  InterviewWithMessages,
  Interview,
  InterviewMessage,
  Document
} from '@/types/database.types'

/**
 * Create a new interview
 */
export async function createInterview(data: InsertInterview) {
  const { data: interview, error } = await supabase
    .from('interviews')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return interview as Interview
}

/**
 * Get interview by ID
 */
export async function getInterview(interviewId: string) {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', interviewId)
    .single()

  if (error) throw error
  return data as Interview
}

/**
 * Get interview with all messages and profile
 */
export async function getInterviewWithMessages(interviewId: string): Promise<InterviewWithMessages> {
  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('id', interviewId)
    .single()

  if (interviewError) throw interviewError

  const { data: messages, error: messagesError } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('interview_id', interviewId)
    .order('sequence_number', { ascending: true })

  if (messagesError) throw messagesError

  return {
    ...(interview as any),
    messages: messages || [],
    profile: (interview as any).profile
  } as InterviewWithMessages
}

/**
 * Get all interviews for current user
 */
export async function getUserInterviews() {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Interview[]
}

/**
 * Update interview status
 */
export async function updateInterviewStatus(
  interviewId: string,
  status: 'in_progress' | 'completed' | 'draft',
  completedAt?: string
) {
  const updateData: Record<string, any> = {
    status,
    ...(completedAt ? { completed_at: completedAt } : {})
  }

  const { data, error } = await supabase
    .from('interviews')
    // @ts-ignore - Supabase type inference issue with update
    .update(updateData)
    .eq('id', interviewId)
    .select()
    .single()

  if (error) throw error
  return data as Interview
}

/**
 * Add message to interview
 */
export async function addInterviewMessage(data: InsertInterviewMessage) {
  const { data: message, error } = await supabase
    .from('interview_messages')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return message as InterviewMessage
}

/**
 * Add multiple messages to interview (batch)
 */
export async function addInterviewMessages(messages: InsertInterviewMessage[]) {
  const { data, error } = await supabase
    .from('interview_messages')
    .insert(messages as any)
    .select()

  if (error) throw error
  return data as InterviewMessage[]
}

/**
 * Get interview messages
 */
export async function getInterviewMessages(interviewId: string) {
  const { data, error } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('interview_id', interviewId)
    .order('sequence_number', { ascending: true })

  if (error) throw error
  return (data || []) as InterviewMessage[]
}

/**
 * Create document and trigger AI summary generation
 */
export async function createDocument(data: InsertDocument) {
  const { data: document, error } = await supabase
    .from('documents')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error

  // Trigger AI summary generation in the background (don't wait for it)
  const doc = document as Document;
  if (doc) {
    fetch('/api/generate-ai-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id })
    }).catch(err => {
      console.warn('Failed to trigger AI summary generation:', err);
      // Don't throw - summary generation is optional background task
    });
  }

  return doc
}

/**
 * Get document by interview ID
 */
export async function getDocumentByInterviewId(interviewId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('interview_id', interviewId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows returned
    throw error
  }
  return data as Document
}

/**
 * Get all documents for current user
 */
export async function getUserDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Document[]
}

/**
 * Update document
 */
export async function updateDocument(documentId: string, content: string) {
  const updateData: Record<string, any> = {
    content,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('documents')
    // @ts-ignore - Supabase type inference issue with update
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data as Document
}

/**
 * Delete interview (cascades to messages and documents)
 */
export async function deleteInterview(interviewId: string) {
  const { error } = await supabase
    .from('interviews')
    .delete()
    .eq('id', interviewId)

  if (error) throw error
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  const { data: interviews, error: interviewsError } = await supabase
    .from('interviews')
    .select('id, status')

  if (interviewsError) throw interviewsError

  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('id')

  if (documentsError) throw documentsError

  const completedInterviews = interviews?.filter((i: any) => i.status === 'completed').length || 0
  const totalInterviews = interviews?.length || 0
  const totalDocuments = documents?.length || 0

  return {
    totalInterviews,
    completedInterviews,
    totalDocuments,
    hoursEstimated: completedInterviews * 0.5 // Rough estimate: 30 min per interview
  }
}

/**
 * Share document with company
 */
export async function shareDocument(documentId: string) {
  const { data, error } = await supabase
    .from('documents')
    // @ts-ignore - Supabase type inference issue with update
    .update({ is_shared: true, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data as Document
}

/**
 * Unshare document (make it private again)
 */
export async function unshareDocument(documentId: string) {
  const { data, error } = await supabase
    .from('documents')
    // @ts-ignore - Supabase type inference issue with update
    .update({ is_shared: false, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single()

  if (error) throw error
  return data as Document
}

/**
 * Get shared documents from company
 */
export async function getSharedCompanyDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        role,
        company
      ),
      interviews:interview_id (
        function_area
      )
    `)
    .eq('is_shared', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as any[]
}

/**
 * Get all experts in the organization with their shared document counts
 */
export async function getOrganizationExperts() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current user's organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError) {
    // If error getting profile, just get all experts
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_expert', true)
      .order('full_name', { ascending: true })

    if (error) throw error
    return (data || []) as any[]
  }

  const profileData = profile as { organization_id: string | null } | null

  if (!profileData?.organization_id) {
    // If no organization, just get all experts
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_expert', true)
      .order('full_name', { ascending: true })

    if (error) throw error
    return (data || []) as any[]
  }

  // Get experts from the same organization
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', profileData.organization_id)
    .eq('is_expert', true)
    .order('full_name', { ascending: true })

  if (error) throw error
  return (data || []) as any[]
}

/**
 * Get all documents accessible to the current user (shared company docs + user's own docs)
 */
export async function getAccessibleDocuments() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get shared documents from company
  const { data: sharedDocs, error: sharedError } = await supabase
    .from('documents')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        role,
        company
      ),
      interviews:interview_id (
        function_area
      )
    `)
    .eq('is_shared', true)
    .order('created_at', { ascending: false })

  if (sharedError) throw sharedError

  // Get user's own documents (both shared and private)
  const { data: ownDocs, error: ownError } = await supabase
    .from('documents')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        role,
        company
      ),
      interviews:interview_id (
        function_area
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (ownError) throw ownError

  // Combine and deduplicate (in case user's shared docs appear in both)
  const allDocs = [...(sharedDocs || []), ...(ownDocs || [])]
  const uniqueDocs = allDocs.filter((doc: any, index: number, self: any[]) =>
    self.findIndex((d: any) => d.id === doc.id) === index
  )

  return uniqueDocs as any[]
}

/**
 * Get shared documents by a specific expert
 */
export async function getExpertDocuments(expertId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', expertId)
    .eq('is_shared', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as any[]
}
