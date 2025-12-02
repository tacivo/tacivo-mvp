# Supabase Database Setup

## Setup Instructions

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

2. **Initialize Supabase** (if not already done):
```bash
supabase init
```

3. **Start local Supabase** (for development):
```bash
supabase start
```

4. **Apply migrations**:
```bash
supabase db reset  # This will apply all migrations
```

## OR: Manual Setup on Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the content from `migrations/001_initial_schema.sql`
4. Click "Run" to execute the migration

## Database Structure

### Tables

1. **profiles** - User profile information
   - Automatically created when a new user signs up
   - Extends Supabase auth.users

2. **interviews** - Interview sessions
   - Stores metadata about each interview
   - Links to user and tracks status

3. **interview_messages** - Chat messages
   - All messages exchanged during an interview
   - Ordered by sequence_number

4. **documents** - Generated documents
   - Final markdown/PDF documents
   - Links to the interview that generated them

5. **uploaded_files** - User uploaded files
   - Metadata for files uploaded during interview setup
   - Actual files stored in Supabase Storage

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Proper cascading deletes
- Secure data isolation

### Storage Buckets Needed

Create these buckets in Supabase Storage:

1. **interview-uploads** - For user uploaded files
   - Policy: Users can upload/read their own files

2. **generated-documents** - For generated PDFs
   - Policy: Users can read their own documents

## Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Useful Queries

### Get user's interview history:
```sql
SELECT * FROM interviews
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Get interview with all messages:
```sql
SELECT
  i.*,
  json_agg(
    json_build_object(
      'id', m.id,
      'role', m.role,
      'content', m.content,
      'sequence_number', m.sequence_number
    ) ORDER BY m.sequence_number
  ) as messages
FROM interviews i
LEFT JOIN interview_messages m ON i.id = m.interview_id
WHERE i.id = 'interview_id_here'
GROUP BY i.id;
```

### Get user statistics:
```sql
SELECT
  COUNT(DISTINCT i.id) as total_interviews,
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_interviews
FROM interviews i
LEFT JOIN documents d ON d.user_id = i.user_id
WHERE i.user_id = auth.uid();
```
