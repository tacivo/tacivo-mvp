-- Create playbooks table
create table public.playbooks (
  id uuid not null default extensions.uuid_generate_v4(),
  title text not null,
  content text not null,
  type text not null check (type in ('sales-playbook', 'customer-success-guide', 'operational-procedures', 'strategic-planning-document')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  is_shared boolean default false,
  document_ids text[] default '{}',
  content_sections text[] default '{}',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint playbooks_pkey primary key (id)
);

-- Create index on user_id for faster queries
create index playbooks_user_id_idx on public.playbooks(user_id);

-- Create index on organization_id for faster queries
create index playbooks_organization_id_idx on public.playbooks(organization_id);

-- Create index on is_shared for faster queries
create index playbooks_is_shared_idx on public.playbooks(is_shared);

-- Enable RLS
alter table public.playbooks enable row level security;

-- Policy: Users can view their own playbooks
create policy "Users can view their own playbooks"
  on public.playbooks
  for select
  using (auth.uid() = user_id);

-- Policy: Users can view shared playbooks from their organization
create policy "Users can view shared playbooks from their organization"
  on public.playbooks
  for select
  using (
    is_shared = true
    and organization_id in (
      select organization_id
      from public.profiles
      where id = auth.uid()
    )
  );

-- Policy: Users can insert their own playbooks
create policy "Users can insert their own playbooks"
  on public.playbooks
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own playbooks
create policy "Users can update their own playbooks"
  on public.playbooks
  for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own playbooks
create policy "Users can delete their own playbooks"
  on public.playbooks
  for delete
  using (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
create trigger update_playbooks_updated_at
  before update on public.playbooks
  for each row
  execute function public.update_updated_at_column();
