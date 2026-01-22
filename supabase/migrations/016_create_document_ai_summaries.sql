-- Create document_ai_summaries table for AI-optimized document summaries
-- This table stores intelligent summaries of documents for efficient playbook generation
-- It references the existing documents table

create table public.document_ai_summaries (
  id uuid not null default extensions.uuid_generate_v4(),
  document_id uuid not null,

  -- Multi-level summaries
  executive_summary text not null,      -- ~500 chars: What happened?
  key_insights text not null,           -- ~1000 chars: Critical nuances & lessons
  tactical_details text not null,       -- ~1500 chars: How they did it
  challenges_solutions text not null,   -- ~1000 chars: Problems & resolutions

  -- Metadata for smart retrieval
  topics text[] default '{}',           -- ['champion-departure', 'stakeholder-mapping']
  skill_areas text[] default '{}',      -- ['relationship-building', 'crisis-management']
  importance_scores jsonb default '{}'::jsonb,  -- { 'nuance_density': 0.9, 'actionability': 0.8 }

  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),

  constraint document_ai_summaries_pkey primary key (id),
  constraint document_ai_summaries_document_id_fkey foreign key (document_id) references public.documents(id) on delete cascade
) tablespace pg_default;

-- Create index on document_id for fast lookups
create index if not exists idx_document_ai_summaries_document_id
  on public.document_ai_summaries using btree (document_id) tablespace pg_default;

-- Create unique constraint to ensure one summary per document
create unique index if not exists idx_document_ai_summaries_unique_document
  on public.document_ai_summaries(document_id) tablespace pg_default;

-- Add RLS policies
alter table public.document_ai_summaries enable row level security;

-- Users can view summaries for documents they own
create policy "Users can view their own document summaries"
  on public.document_ai_summaries for select
  using (
    exists (
      select 1 from public.documents
      where documents.id = document_ai_summaries.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Users can view summaries for documents shared with their organization
create policy "Users can view shared document summaries"
  on public.document_ai_summaries for select
  using (
    exists (
      select 1 from public.documents
      join public.profiles on documents.user_id = profiles.id
      where documents.id = document_ai_summaries.document_id
      and documents.is_shared = true
      and profiles.organization_id = (
        select organization_id from public.profiles where id = auth.uid()
      )
      and profiles.organization_id is not null
    )
  );

-- Users can insert summaries for their own documents
create policy "Users can create summaries for their own documents"
  on public.document_ai_summaries for insert
  with check (
    exists (
      select 1 from public.documents
      where documents.id = document_ai_summaries.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Users can update summaries for their own documents
create policy "Users can update their own document summaries"
  on public.document_ai_summaries for update
  using (
    exists (
      select 1 from public.documents
      where documents.id = document_ai_summaries.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Users can delete summaries for their own documents
create policy "Users can delete their own document summaries"
  on public.document_ai_summaries for delete
  using (
    exists (
      select 1 from public.documents
      where documents.id = document_ai_summaries.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at (reusing existing function)
create trigger update_document_ai_summaries_updated_at
  before update on public.document_ai_summaries
  for each row
  execute function update_updated_at_column();

-- Add comment to table
comment on table public.document_ai_summaries is 'AI-generated summaries of documents optimized for playbook generation. Contains multi-level summaries that preserve nuances while reducing token usage.';
