# Supabase Setup Guide for Tacivo Interview MVP

This guide will walk you through setting up Supabase for authentication and database storage.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed

## Step 1: Install Supabase Package

```bash
npm install @supabase/supabase-js
```

## Step 2: Create a New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: tacivo-interview-mvp
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 3: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 4: Configure Environment Variables

1. Copy `.env.local.template` to `.env.local`:
```bash
cp .env.local.template .env.local
```

2. Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 5: Set Up the Database

### Option A: Using Supabase Dashboard (Recommended)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire content from `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration
6. You should see "Success. No rows returned"

### Option B: Using Supabase CLI (Advanced)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

3. Push migrations:
```bash
supabase db push
```

## Step 6: Configure Storage Buckets

1. In Supabase dashboard, go to **Storage**
2. Create two new buckets:

### Bucket 1: `interview-uploads`
- **Name**: interview-uploads
- **Public**: No
- **File size limit**: 10 MB
- **Allowed MIME types**: application/pdf, application/vnd.*, text/*, application/msword

**Policies** (Create these in the Policies tab):
```sql
-- Select: Users can read their own uploads
CREATE POLICY "Users can read own uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert: Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Delete: Users can delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Bucket 2: `generated-documents`
- **Name**: generated-documents
- **Public**: No
- **File size limit**: 10 MB
- **Allowed MIME types**: application/pdf

**Policies**:
```sql
-- Select: Users can read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert: Users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 7: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (enabled by default)
3. Configure email settings:
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and reset password emails with your branding

### Optional: Configure OAuth Providers

If you want to add social login (Google, GitHub, etc.):

1. Go to **Authentication** → **Providers**
2. Enable desired providers
3. Follow the setup instructions for each provider

## Step 8: Verify Setup

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - profiles
   - interviews
   - interview_messages
   - documents
   - uploaded_files

3. Go to **Authentication** → **Policies**
4. Verify all tables have RLS enabled

## Step 9: Test the Application

1. Start your development server:
```bash
npm run dev
```

2. Navigate to http://localhost:3000
3. Try signing up with a new account
4. Verify you're redirected to the dashboard
5. Check Supabase dashboard → **Table Editor** → **profiles** to see your new profile

## Database Schema Overview

### Tables

1. **profiles** - User profiles (auto-created on signup)
2. **interviews** - Interview sessions
3. **interview_messages** - Chat messages during interviews
4. **documents** - Generated documents
5. **uploaded_files** - User-uploaded files metadata

### Key Features

- **Row Level Security (RLS)**: All tables are secured so users can only access their own data
- **Automatic Triggers**: Profile creation on user signup, timestamp updates
- **Cascading Deletes**: Deleting an interview removes all related messages, documents, and files
- **Indexes**: Optimized for common queries

## Next Steps

Now that Supabase is set up, you'll need to:

1. Update the authentication pages to use Supabase Auth
2. Modify the interview page to save data to the database
3. Update the dashboard to fetch real data from Supabase
4. Implement file upload to Supabase Storage

See the implementation guide for detailed instructions on integrating these features into your application.

## Troubleshooting

### Issue: "Failed to fetch"
- Check that your environment variables are correct
- Verify your Supabase project is active
- Check browser console for CORS errors

### Issue: "Row Level Security policy violation"
- Ensure you're logged in when making requests
- Verify RLS policies are correctly set up
- Check that the user ID matches in queries

### Issue: "relation does not exist"
- The migration hasn't been run
- Re-run the migration SQL in SQL Editor

### Issue: Storage upload fails
- Verify storage buckets are created
- Check storage policies are set up correctly
- Ensure file size is within limits

## Support

For Supabase-specific issues:
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase

For project-specific issues, contact your development team.
