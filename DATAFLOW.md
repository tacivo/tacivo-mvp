# Tacivo Data Flow Documentation

This document explains the core data flows in the Tacivo platform for new collaborators.

## Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Invitation System](#invitation-system)
3. [Interview Management](#interview-management)
4. [Document System](#document-system)
5. [AI Features](#ai-features)
6. [Database Schema Overview](#database-schema-overview)

---

## Authentication & User Management

### User Registration Flow
```
┌─────────────────┐
│ Sign Up Page    │
│ /signup         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Supabase Auth                   │
│ - Creates auth.users record     │
│ - Triggers profile creation     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Database Trigger                │
│ - create_profile_for_new_user() │
│ - Creates profiles record       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ /platform       │
│ (Dashboard)     │
└─────────────────┘
```

**Key Files:**
- `/app/signup/page.tsx` - Sign up UI
- `/supabase/migrations/003_create_profiles.sql` - Profile table & trigger

### Profile Structure
```typescript
{
  id: uuid (references auth.users)
  email: string
  full_name: string
  organization_id: uuid
  role: string
  is_admin: boolean
  is_expert: boolean
  is_super_admin: boolean
  years_of_experience: number
  area_of_expertise: string
  goal: string
}
```

---

## Invitation System

### Overview
Tacivo has two types of invitations:
1. **Regular Invitations** - For users joining existing organizations
2. **Admin Invitations** - For new admins creating their own organizations

### Regular Invitation Flow

```
┌──────────────────────┐
│ Admin Dashboard      │
│ Creates invitation   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/invitations/create     │
│ - Generates secure token         │
│ - Stores in `invitations` table  │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/invitations/send       │
│ - Uses Resend API                │
│ - Sends branded email            │
│ - Link: /invite/{token}          │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ User clicks email link           │
│ Opens: /invite/{token}           │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/invitations/verify     │
│ - Uses service role key          │
│ - Bypasses RLS policies          │
│ - Returns invitation details     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ User creates account             │
│ - Sets password                  │
│ - Supabase creates auth user     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/invitations/accept     │
│ - Marks invitation as accepted   │
│ - Updates profile with role info │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────┐
│ Redirect to      │
│ /platform        │
└──────────────────┘
```

**Key Files:**
- `/app/platform/admin/page.tsx` - Admin creates invitations
- `/app/api/invitations/create/route.ts` - Creates invitation record
- `/app/api/invitations/send/route.ts` - Sends email via Resend
- `/app/api/invitations/verify/route.ts` - Verifies token (service role)
- `/app/invite/[token]/page.tsx` - Invitation acceptance page
- `/app/api/invitations/accept/route.ts` - Marks invitation accepted

### Admin Invitation Flow

```
┌──────────────────────┐
│ Super Admin          │
│ Creates admin invite │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ POST /api/admin-invitations/create │
│ - Stores in `admin_invitations`    │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ POST /api/admin-invitations/send   │
│ - Sends admin invitation email     │
│ - Link: /admin-invite/{token}      │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ User clicks email link             │
│ Opens: /admin-invite/{token}       │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ POST /api/invitations/verify       │
│ - type: 'admin'                    │
│ - Returns admin invitation         │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ 3-Step Onboarding Process          │
│ Step 1: Create password            │
│ Step 2: Profile info               │
│ Step 3: Organization setup         │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ POST /api/admin-invitations/          │
│      complete-signup                   │
│ - Creates organization                 │
│ - Links profile to organization        │
│ - Sets is_admin = true                 │
└──────────┬─────────────────────────────┘
           │
           ▼
┌──────────────────┐
│ Redirect to      │
│ /platform/admin  │
└──────────────────┘
```

**Key Files:**
- `/app/api/admin-invitations/create/route.ts` - Creates admin invitation
- `/app/api/admin-invitations/send/route.ts` - Sends admin email
- `/app/admin-invite/[token]/page.tsx` - 3-step onboarding UI
- `/app/api/admin-invitations/complete-signup/route.ts` - Finalizes setup

### Security Architecture

**Problem:** Invitations need to be accessible to unauthenticated users, but RLS policies require authentication.

**Solution:** API-based verification using service role key

```
┌────────────────────┐
│ Frontend (Public)  │
│ No authentication  │
└─────────┬──────────┘
          │ POST /api/invitations/verify
          │ { token: "abc123" }
          ▼
┌──────────────────────────────┐
│ API Route (Server-side)      │
│ - Has SUPABASE_SERVICE_ROLE  │
│ - Bypasses RLS policies      │
│ - Validates token            │
│ - Checks expiration          │
│ - Returns invitation data    │
└──────────┬───────────────────┘
          │
          ▼
┌────────────────┐
│ Supabase DB    │
│ invitations    │
│ (RLS bypassed) │
└────────────────┘
```

**Why This Approach?**
1. ✅ Prevents enumeration - Can't query all invitations
2. ✅ Server-side only - Service key never exposed to client
3. ✅ Token-based access - Only valid tokens return data
4. ✅ Rate limiting ready - Can add at API level
5. ✅ Audit trail - All access logged server-side

**Migration:** `/supabase/migrations/015_allow_public_invitation_lookup.sql`

---

## Interview Management

### Interview Creation Flow

```
┌──────────────────────┐
│ Admin Dashboard      │
│ Schedules interview  │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────┐
│ Database: interviews table     │
│ {                              │
│   id, title, description,      │
│   organization_id,             │
│   interviewer_id,              │
│   expert_id,                   │
│   function_area,               │
│   scheduled_at,                │
│   status: 'scheduled'          │
│ }                              │
└────────────────────────────────┘
```

### Interview Execution Flow

```
┌────────────────────┐
│ /platform/         │
│ interviews/[id]    │
└─────────┬──────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Voice Recording                  │
│ - ElevenLabs TTS                 │
│ - Browser MediaRecorder API      │
│ - Real-time transcription        │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ POST /api/interviews/process     │
│ - Receives audio blob            │
│ - Sends to Claude API            │
│ - Gets AI-generated questions    │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ AI Response                      │
│ - Stored in interview_messages   │
│ - TTS conversion via ElevenLabs  │
│ - Played back to user            │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Interview Completion             │
│ - Status: 'completed'            │
│ - Generates summary document     │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────┐
│ Document created │
│ in documents     │
│ table            │
└──────────────────┘
```

**Key Files:**
- `/app/platform/interviews/[id]/page.tsx` - Interview UI
- `/app/api/interviews/process/route.ts` - AI processing
- `/lib/elevenlabs/text-to-speech.ts` - Voice synthesis

---

## Document System

### Document Storage

Documents can be stored in two formats:
1. **Markdown** (legacy) - Plain text markdown
2. **BlockNote** (new) - Rich structured JSON format

```typescript
// Document structure
{
  id: uuid
  title: string
  content: string | null          // Markdown format
  blocknote_content: json | null  // BlockNote format
  organization_id: uuid
  created_by: uuid
  interview_id: uuid | null
  is_public: boolean
  created_at: timestamp
}
```

### Document Viewing Flow

```
┌────────────────────┐
│ /documents/[id]    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────────┐
│ Check format                   │
│ - BlockNote JSON exists?       │
│   → Use BlockNoteView          │
│ - Only markdown?               │
│   → Use ReactMarkdown          │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ Display with features:         │
│ - Edit mode (admins)           │
│ - AI suggestions               │
│ - PDF export                   │
│ - Public sharing               │
│ - Copy link                    │
└────────────────────────────────┘
```

### Document AI Features

```
┌────────────────────────────────┐
│ User selects text              │
│ Opens AI toolbar               │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ POST /api/blocknote-ai         │
│ {                              │
│   operation: "improve" |       │
│              "fix" |           │
│              "professional" |  │
│              "simplify" |      │
│              "expand",         │
│   selectedText: string         │
│ }                              │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ Claude API (Sonnet 4)          │
│ - Applies transformation       │
│ - Returns enhanced text        │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ AI Suggestion UI               │
│ - Shows diff view              │
│ - Accept / Reject buttons      │
└────────────────────────────────┘
```

**Key Files:**
- `/app/documents/[id]/page.tsx` - Document viewer/editor
- `/app/api/blocknote-ai/route.ts` - AI text enhancement

### Document Sharing

```
┌────────────────────────────────┐
│ Admin clicks "Share"           │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ Updates document:              │
│ is_public = true               │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ RLS Policy allows:             │
│ - Anyone can read if public    │
│ - No auth required             │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ Public URL:                    │
│ /documents/[id]                │
│ (accessible without login)     │
└────────────────────────────────┘
```

---

## AI Features

### AI Service Integration

Tacivo integrates two AI services:

#### 1. Anthropic Claude API
**Usage:** Text generation, interview processing, document enhancement

```typescript
// Configuration
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Model: claude-sonnet-4-20250514
// Used for:
// - Interview question generation
// - Document text improvement
// - Content summarization
```

**Endpoints using Claude:**
- `/api/interviews/process` - Interview AI
- `/api/blocknote-ai` - Document AI

#### 2. ElevenLabs API
**Usage:** Text-to-speech for interview voice synthesis

```typescript
// Voice synthesis
const client = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY
})

// Features:
// - Natural voice output
// - Real-time streaming
// - Multiple voice options
```

**Files:**
- `/lib/elevenlabs/text-to-speech.ts` - TTS implementation

---

## Database Schema Overview

### Core Tables

```sql
-- Authentication & Profiles
auth.users              -- Supabase managed auth
profiles                -- User profiles (1:1 with auth.users)
organizations           -- Organization/company data

-- Invitations
invitations             -- Regular user invitations
admin_invitations       -- Admin user invitations

-- Interviews
interviews              -- Interview records
interview_messages      -- AI conversation history

-- Documents
documents               -- Interview summaries & docs
```

### Key Relationships

```
organizations
    ↓ (1:many)
profiles
    ↓ (1:many)
interviews
    ↓ (1:1)
documents

profiles → invitations (created_by)
profiles → interviews (interviewer_id, expert_id)
```

### Row Level Security (RLS)

All tables use RLS policies to enforce access control:

**Organizations:**
- Users can only see their own organization
- Admins can modify their organization

**Profiles:**
- Users can read profiles in their organization
- Only self can update own profile
- Admins can update profiles in their org

**Invitations:**
- Only admins can create/read invitations
- **Exception:** Public verification via API endpoint

**Documents:**
- Public documents: anyone can read
- Private documents: org members only
- Only creator/admins can edit

**Migration Files:**
All policies defined in `/supabase/migrations/*.sql`

---

## Environment Variables

### Required Variables

```bash
# Anthropic API (AI Features)
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=...

# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only!

# Resend (Email Service)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App Configuration
NEXT_PUBLIC_APP_URL=https://app.tacivo.com
# Or for Vercel previews, uses VERCEL_URL automatically
```

### Security Notes

⚠️ **SUPABASE_SERVICE_ROLE_KEY**
- **Never** expose to client
- **Only** use in API routes
- Bypasses all RLS policies

✅ **NEXT_PUBLIC_** prefix
- Safe to expose to browser
- Used for client-side Supabase
- Has RLS restrictions

---

## Common Development Tasks

### Running Locally

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.template .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Apply database migrations
# (Run in Supabase SQL Editor or via CLI)
```

### Creating a New Migration

```bash
# Create new migration file
# /supabase/migrations/016_your_feature.sql

-- Example migration
CREATE TABLE your_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can read own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);
```

### Testing Invitations Locally

```bash
# 1. Create invitation via admin UI
# 2. Check database for token
# 3. Open: http://localhost:3000/invite/{token}
# 4. Complete signup flow
```

### Debugging RLS Issues

```sql
-- Check current user
SELECT auth.uid();

-- Test query as specific user
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM your_table;

-- View active policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## Architecture Decisions

### Why API Routes for Invitations?

**Decision:** Use server-side API routes with service role instead of public RLS policies.

**Reasoning:**
1. **Security:** Prevents enumeration of all invitations
2. **Control:** Server-side validation & logging
3. **Flexibility:** Easy to add rate limiting, analytics
4. **Maintainability:** Single source of truth for verification logic

### Why Two Document Formats?

**Decision:** Support both Markdown and BlockNote JSON.

**Reasoning:**
1. **Migration:** Existing documents in Markdown
2. **Features:** BlockNote enables rich editing + AI
3. **Backwards Compatibility:** Don't break old docs
4. **Future-Ready:** Can fully migrate when ready

### Why Service Role Key?

**Decision:** Use service role key in specific API endpoints.

**Reasoning:**
1. **Invitation Verification:** Bypass RLS for unauthenticated users
2. **Email Sending:** Access any invitation to send email
3. **Admin Operations:** Bulk operations, analytics
4. **Controlled Access:** Only in trusted server-side code

---

## Getting Help

### Documentation
- **Supabase:** https://supabase.com/docs
- **Next.js:** https://nextjs.org/docs
- **BlockNote:** https://www.blocknotejs.org/docs
- **Anthropic API:** https://docs.anthropic.com/

### Code Structure
```
/app
  /api              # API routes (server-side)
  /platform         # Authenticated app pages
  /invite           # Public invitation pages
  /documents        # Document viewer
  /signup           # Public signup

/lib
  /supabase         # Database utilities
  /elevenlabs       # TTS integration

/supabase
  /migrations       # Database schema & RLS policies

/types              # TypeScript definitions
```

### Common Pitfalls

1. **RLS Errors:** Check policies match user's auth.uid()
2. **Environment Variables:** Ensure all keys are set
3. **API Routes:** Remember service role for privileged ops
4. **Migrations:** Run in order, don't skip numbers
5. **Client vs Server:** Use appropriate Supabase client

---

*Last Updated: 2025*
*For questions or updates, contact the development team.*
